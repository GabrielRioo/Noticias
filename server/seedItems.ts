import { NEWS_TOPICS, type NewsItem, type NewsSource, type NewsTopic } from '../src/types/news.js';

const MAX_SEED_ITEMS = 48;
const MAX_STRING = 8_000;
const MAX_BULLETS = 12;
const MAX_SOURCES = 8;

function isTopic(value: unknown): value is NewsTopic {
  return typeof value === 'string' && (NEWS_TOPICS as readonly string[]).includes(value);
}

function parseSources(value: unknown): NewsSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, MAX_SOURCES)
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const source = entry as { outlet?: unknown; url?: unknown };
      if (typeof source.outlet !== 'string' || typeof source.url !== 'string') {
        return null;
      }
      if (!source.outlet.trim() || !source.url.trim() || source.url.length > 2_000) {
        return null;
      }
      return { outlet: source.outlet.trim().slice(0, 120), url: source.url.trim() };
    })
    .filter((entry): entry is NewsSource => entry !== null);
}

function parseOne(value: unknown): NewsItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = value as Partial<NewsItem>;
  if (
    typeof raw.id !== 'string' ||
    typeof raw.title !== 'string' ||
    typeof raw.briefing !== 'string' ||
    typeof raw.whyItMatters !== 'string' ||
    typeof raw.publishedAt !== 'string' ||
    typeof raw.importance !== 'number' ||
    typeof raw.numbersUnverified !== 'boolean' ||
    !isTopic(raw.topic) ||
    !Array.isArray(raw.bullets)
  ) {
    return null;
  }

  const briefing = raw.briefing.trim();
  if (!raw.id.trim() || !raw.title.trim() || !briefing) {
    return null;
  }
  if (
    raw.id.length > 500 ||
    raw.title.length > 500 ||
    briefing.length > MAX_STRING ||
    raw.whyItMatters.length > 2_000
  ) {
    return null;
  }

  const bullets = raw.bullets
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_BULLETS);
  if (bullets.length === 0) {
    return null;
  }

  const sources = parseSources(raw.sources);
  if (sources.length === 0) {
    return null;
  }

  return {
    id: raw.id,
    title: raw.title.trim(),
    briefing,
    bullets,
    whyItMatters: raw.whyItMatters.trim(),
    topic: raw.topic,
    importance: Math.min(5, Math.max(1, Math.round(raw.importance))),
    publishedAt: raw.publishedAt,
    sources,
    numbersUnverified: raw.numbersUnverified,
    ongoing: raw.ongoing === true,
    terms: Array.isArray(raw.terms)
      ? raw.terms
          .filter((term) => term && typeof term === 'object')
          .map((term) => {
            const entry = term as { term?: unknown; explanation?: unknown };
            if (typeof entry.term !== 'string' || typeof entry.explanation !== 'string') {
              return null;
            }
            return {
              term: entry.term.trim().slice(0, 80),
              explanation: entry.explanation.trim().slice(0, 400),
            };
          })
          .filter((term): term is { term: string; explanation: string } => Boolean(term))
          .slice(0, 8)
      : undefined,
  };
}

export function parseSeedItems(body: unknown): NewsItem[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return [];
  }

  const items = (body as { items?: unknown }).items;
  if (items === undefined) {
    return [];
  }
  if (!Array.isArray(items) || items.length > MAX_SEED_ITEMS) {
    throw new Error('items inválido');
  }

  return items.map((item) => {
    const parsed = parseOne(item);
    if (!parsed) {
      throw new Error('items inválido');
    }
    return parsed;
  });
}
