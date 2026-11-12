import { NEWS_TOPICS, type GlossaryTerm, type NewsItem, type NewsTopic } from '../src/types/news.ts';
import { getGeminiConfig } from './env.ts';
import { extractLeadNumbers, missingNumbers } from './text.ts';
import type { ArticleCluster } from './cluster.ts';
import { longestText } from './cluster.ts';

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

const SYSTEM_PROMPT = `Você escreve um briefing denso, em português do Brasil, para alguém que quer ficar por dentro da notícia sem abrir o site — mas ainda precisa de fatos, não de telegrama.

keep é true se uma pessoa bem informada precisaria saber daquilo — mesmo que a matéria tenha semanas ou meses. Guerra em curso, conflito dos EUA, sanção, tarifa, retaliação comercial, ocupação e crise diplomática entram, ainda que não sejam “de hoje”.
keep é false para crime comum, homicídio local, término, briga de famoso, fofoca, polêmica de rede, esporte, bairro, trânsito, clima cotidiano e chamada de telejornal, salvo consequência pública clara.

Regras:
- não invente fato, número, nome, data, lugar, citação ou causa
- preserve quem decidiu, o que mudou, quando, onde, por quê, números e o que vem depois, se isso estiver no texto
- ignore WhatsApp, leia mais, legendas e anexos repetidos
- se o texto for curto demais, keep false
- título direto, sem clickbait
- briefing: 2 a 4 parágrafos curtos, separados por \\n\\n, cobrindo contexto, o fato, reação e consequência. Não corte o que muda o sentido.
- bullets: 5 a 8 itens factuais (nomes, números, prazos, órgãos)
- whyItMatters: uma ou duas frases
- topic: politica, conflitos, economia, tecnologia, ciencia ou mundo
- importance: 1 a 5
- ongoing: true se o fato ainda está em curso (guerra, sanção, tarifa, retaliação, cerco diplomático), mesmo com matéria mais antiga
- terms: 3 a 8 itens { term, explanation }. Só palavras ou expressões do próprio texto que um leitor leigo pode não conhecer (órgão, sigla, partido, indicador, tecnologia). Explicação em uma frase, em português, sem inventar. Não explique palavras óbvias.

Responda só JSON com keep, title, briefing, bullets, whyItMatters, terms, topic, importance, ongoing.`;

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
    .slice(0, 8);
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
      ? parsed.bullets.map(String).filter(Boolean).slice(0, 8)
      : [];
    const briefing = String(parsed.briefing ?? '').trim();

    if (!parsed.title || !briefing || bullets.length === 0 || !parsed.whyItMatters) {
      return null;
    }

    const importance = Math.min(5, Math.max(1, Number(parsed.importance) || 3));
    const terms = parseTerms(parsed.terms);
    return {
      keep: true,
      title: String(parsed.title),
      briefing,
      bullets,
      whyItMatters: String(parsed.whyItMatters),
      terms,
      topic,
      importance,
      ongoing: Boolean(parsed.ongoing),
    };
  } catch {
    return null;
  }
}

async function callGemini(prompt: string): Promise<string> {
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
      },
    }),
  });

  if (!response.ok) {
    await response.text();
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

function buildPrompt(cluster: ArticleCluster, extra?: string): string {
  const article = longestText(cluster);
  const sources = cluster.articles
    .map((item) => `${item.outlet}: ${item.url}`)
    .join('\n');

  return [
    extra ?? '',
    `Título original: ${article.title}`,
    `Publicado: ${article.publishedAt}`,
    `Fontes:\n${sources}`,
    `Texto:\n${article.text.slice(0, 9000)}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function summarizeCluster(cluster: ArticleCluster): Promise<NewsItem | null> {
  const article = longestText(cluster);
  const leadNumbers = extractLeadNumbers(article.text);
  let parsed = parseModelJson(await callGemini(buildPrompt(cluster)));

  if (!parsed) {
    return null;
  }

  if (!parsed.keep) {
    return null;
  }

  let numbersUnverified = false;
  const summaryText = `${parsed.title} ${parsed.briefing} ${parsed.bullets.join(' ')} ${parsed.whyItMatters}`;
  const missing = missingNumbers(leadNumbers, summaryText);
  if (missing.length > 0) {
    const retry = parseModelJson(
      await callGemini(
        buildPrompt(
          cluster,
          `Inclua estes números do texto original no resumo, se ainda forem do trecho principal: ${missing.join(', ')}`,
        ),
      ),
    );
    if (retry?.keep) {
      parsed = retry;
      numbersUnverified =
        missingNumbers(
          leadNumbers,
          `${retry.title} ${retry.briefing} ${retry.bullets.join(' ')} ${retry.whyItMatters}`,
        ).length > 0;
    } else {
      numbersUnverified = true;
    }
  }

  return {
    id: cluster.id,
    title: parsed.title,
    briefing: parsed.briefing,
    bullets: parsed.bullets,
    whyItMatters: parsed.whyItMatters,
    terms: parsed.terms,
    ongoing: parsed.ongoing,
    topic: parsed.topic,
    importance: parsed.importance,
    publishedAt: article.publishedAt,
    sources: cluster.articles.map((item) => ({ outlet: item.outlet, url: item.url })),
    numbersUnverified,
  };
}
