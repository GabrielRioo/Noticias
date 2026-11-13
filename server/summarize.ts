import { NEWS_TOPICS, type GlossaryTerm, type NewsItem, type NewsTopic } from '../src/types/news.js';
import { getGeminiConfig } from './env.js';
import { extractLeadNumbers, missingNumbers } from './text.js';
import type { ArticleCluster } from './cluster.js';
import { heuristicScore, longestText } from './cluster.js';
import { enqueueGemini } from './geminiQueue.js';

export class GeminiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiUnavailableError';
  }
}

export function isGeminiUnavailableError(error: unknown): boolean {
  return error instanceof GeminiUnavailableError;
}

type ModelSummary = {
  keep: boolean;
  title: string;
  briefing: string;
  bullets: string[];
  whyItMatters: string;
  terms: GlossaryTerm[];
  topic: NewsTopic;
  importance: number;
  ongoing: boolean;
};

const SYSTEM_PROMPT = `Briefing em português do Brasil, factual e denso.

keep true só se importa para alguém bem informado (política, guerra, economia, ciência, tech, mundo). keep false para crime local, fofoca, esporte, trânsito e clima cotidiano.
Não invente fatos. Preserve nomes, números, datas e consequências do texto.
JSON somente: keep, title, briefing (2-3 parágrafos curtos separados por \\n\\n), bullets (4-6), whyItMatters, terms (0-5 {term, explanation}), topic (politica|conflitos|economia|tecnologia|ciencia|mundo), importance (1-5), ongoing.`;

function parseTerms(raw: unknown): GlossaryTerm[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const record = item as { term?: unknown; explanation?: unknown };
      const term = String(record.term ?? '').trim();
      const explanation = String(record.explanation ?? '').trim();
      if (term.length < 2 || explanation.length < 12) {
        return null;
      }
      return { term, explanation };
    })
    .filter((item): item is GlossaryTerm => item !== null)
    .slice(0, 5);
}

function parseModelJson(raw: string): ModelSummary | null {
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '');
  try {
    const parsed = JSON.parse(trimmed) as Partial<ModelSummary>;
    if (typeof parsed.keep !== 'boolean') {
      return null;
    }
    if (!parsed.keep) {
      return {
        keep: false,
        title: '',
        briefing: '',
        bullets: [],
        whyItMatters: '',
        terms: [],
        topic: 'mundo',
        importance: 1,
        ongoing: false,
      };
    }

    const topic = NEWS_TOPICS.includes(parsed.topic as NewsTopic)
      ? (parsed.topic as NewsTopic)
      : 'mundo';
    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets.map(String).filter(Boolean).slice(0, 6)
      : [];
    const briefing = String(parsed.briefing ?? '').trim();

    if (!parsed.title || !briefing || bullets.length === 0 || !parsed.whyItMatters) {
      return null;
    }

    const importance = Math.min(5, Math.max(1, Number(parsed.importance) || 3));
    return {
      keep: true,
      title: String(parsed.title),
      briefing,
      bullets,
      whyItMatters: String(parsed.whyItMatters),
      terms: parseTerms(parsed.terms),
      topic,
      importance,
      ongoing: Boolean(parsed.ongoing),
    };
  } catch {
    return null;
  }
}

async function callGeminiOnce(prompt: string): Promise<string> {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ausente no arquivo .env');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        maxOutputTokens: 1200,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (
      response.status === 429 ||
      /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(body)
    ) {
      throw new GeminiUnavailableError(
        `Cota do Gemini esgotada (${response.status})`,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new GeminiUnavailableError(
        `Gemini recusou a chave (${response.status})`,
      );
    }
    throw new Error(`Gemini recusou a chamada (${response.status})`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  if (!text) {
    throw new Error('Gemini devolveu resposta vazia');
  }
  return text;
}

function callGemini(prompt: string): Promise<string> {
  return enqueueGemini(() => callGeminiOnce(prompt));
}

function buildPrompt(cluster: ArticleCluster): string {
  const article = longestText(cluster);
  const sources = cluster.articles
    .slice(0, 3)
    .map((item) => `${item.outlet}: ${item.url}`)
    .join('\n');

  return [
    `Título: ${article.title}`,
    `Publicado: ${article.publishedAt}`,
    `Fontes:\n${sources}`,
    `Texto:\n${article.text.slice(0, 4500)}`,
  ].join('\n\n');
}

export async function summarizeCluster(
  cluster: ArticleCluster,
  topicOverride?: NewsTopic,
): Promise<NewsItem | null> {
  const article = longestText(cluster);
  const leadNumbers = extractLeadNumbers(article.text);
  const parsed = parseModelJson(await callGemini(buildPrompt(cluster)));

  if (!parsed?.keep) {
    return null;
  }

  const summaryText = `${parsed.title} ${parsed.briefing} ${parsed.bullets.join(' ')} ${parsed.whyItMatters}`;
  // Skip a second Gemini round-trip; flag numbers instead of burning another RPM.
  const numbersUnverified = missingNumbers(leadNumbers, summaryText).length > 0;

  const topic =
    topicOverride && NEWS_TOPICS.includes(topicOverride)
      ? topicOverride
      : NEWS_TOPICS.includes(parsed.topic as NewsTopic)
        ? (parsed.topic as NewsTopic)
        : 'mundo';

  return {
    id: cluster.id,
    title: parsed.title,
    briefing: parsed.briefing,
    bullets: parsed.bullets,
    whyItMatters: parsed.whyItMatters,
    terms: parsed.terms,
    ongoing: parsed.ongoing,
    topic,
    importance: parsed.importance,
    publishedAt: article.publishedAt,
    sources: cluster.articles.map((item) => ({ outlet: item.outlet, url: item.url })),
    numbersUnverified,
  };
}

/** Last-resort item so a topic is never blank when RSS still has something. */
export function draftFromCluster(cluster: ArticleCluster, topic: NewsTopic): NewsItem {
  const article = longestText(cluster);
  const paragraphs = article.text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 40);
  const briefing =
    paragraphs.slice(0, 3).join('\n\n').slice(0, 1400) ||
    article.text.slice(0, 900) ||
    article.title;
  const bullets = (paragraphs.length > 0 ? paragraphs : [article.text || article.title])
    .slice(0, 5)
    .map((part) => part.slice(0, 180));

  return {
    id: cluster.id,
    title: article.title,
    briefing,
    bullets,
    whyItMatters:
      'Texto do feed, sem resumo da IA. Confira a matéria original para o contexto completo.',
    topic,
    importance: Math.min(5, Math.max(1, heuristicScore(article))),
    publishedAt: article.publishedAt,
    sources: cluster.articles.map((item) => ({ outlet: item.outlet, url: item.url })),
    numbersUnverified: true,
    ongoing: topic === 'conflitos',
  };
}
