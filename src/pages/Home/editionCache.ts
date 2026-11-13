import { NEWS_TOPICS, type NewsItem, type NewsTopic } from '../../types/news';

const EDITION_CACHE_KEY = 'briefing-edition-cache';
const MAX_ITEMS_PER_TOPIC = 8;
const MAX_TOTAL_ITEMS = NEWS_TOPICS.length * MAX_ITEMS_PER_TOPIC;

export type EditionCache = {
  updatedAt: string | null;
  items: NewsItem[];
  withoutAi: boolean;
};

function publishedTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function byRelevance(items: NewsItem[]): NewsItem[] {
  return [...items].sort((left, right) => {
    const importanceDiff = (right.importance ?? 0) - (left.importance ?? 0);
    if (importanceDiff !== 0) {
      return importanceDiff;
    }
    return publishedTime(right.publishedAt) - publishedTime(left.publishedAt);
  });
}

function isTopic(value: unknown): value is NewsTopic {
  return typeof value === 'string' && (NEWS_TOPICS as readonly string[]).includes(value);
}

function isNewsItem(value: unknown): value is NewsItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const item = value as Partial<NewsItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.briefing === 'string' &&
    item.briefing.trim().length > 0 &&
    Array.isArray(item.bullets) &&
    typeof item.whyItMatters === 'string' &&
    isTopic(item.topic) &&
    typeof item.importance === 'number' &&
    typeof item.publishedAt === 'string' &&
    Array.isArray(item.sources) &&
    typeof item.numbersUnverified === 'boolean'
  );
}

export function retainEditionItems(items: readonly NewsItem[]): NewsItem[] {
  const grouped = new Map<NewsTopic, NewsItem[]>();

  for (const item of items) {
    if (!item.briefing?.trim()) {
      continue;
    }
    const bucket = grouped.get(item.topic) ?? [];
    bucket.push(item);
    grouped.set(item.topic, bucket);
  }

  const kept: NewsItem[] = [];
  for (const topic of NEWS_TOPICS) {
    kept.push(...byRelevance(grouped.get(topic) ?? []).slice(0, MAX_ITEMS_PER_TOPIC));
  }
  return kept.slice(0, MAX_TOTAL_ITEMS);
}

export function mergeEditionItems(
  local: readonly NewsItem[],
  remote: readonly NewsItem[],
): NewsItem[] {
  const byId = new Map<string, NewsItem>();
  for (const item of local) {
    if (isNewsItem(item)) {
      byId.set(item.id, item);
    }
  }
  for (const item of remote) {
    if (isNewsItem(item)) {
      byId.set(item.id, item);
    }
  }
  return retainEditionItems([...byId.values()]);
}

export function loadEditionCache(): EditionCache | null {
  try {
    const raw = localStorage.getItem(EDITION_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<EditionCache>;
    if (!Array.isArray(parsed.items)) {
      return null;
    }

    const items = retainEditionItems(parsed.items.filter(isNewsItem));
    if (items.length === 0) {
      return null;
    }

    return {
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      items,
      withoutAi: parsed.withoutAi === true,
    };
  } catch {
    return null;
  }
}

export function saveEditionCache(
  items: readonly NewsItem[],
  updatedAt: string | null,
  withoutAi = false,
): void {
  const payload: EditionCache = {
    updatedAt,
    items: retainEditionItems(items.filter(isNewsItem)),
    withoutAi,
  };
  localStorage.setItem(EDITION_CACHE_KEY, JSON.stringify(payload));
}
