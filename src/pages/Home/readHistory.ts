import { NEWS_TOPICS, type NewsItem, type NewsSource, type NewsTopic } from '../../types/news';

export const READ_HEADLINE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const READ_HISTORY_KEY = 'briefing-read-history';

export type ReadSnapshot = {
  id: string;
  title: string;
  topic: NewsTopic;
  publishedAt: string;
  readAt: string;
  sources: NewsSource[];
  bullets: string[];
  whyItMatters: string;
  importance: number;
  numbersUnverified: boolean;
  briefing?: string;
};

export type ReadHistory = Partial<Record<NewsTopic, ReadSnapshot>>;

function isTopic(value: unknown): value is NewsTopic {
  return typeof value === 'string' && (NEWS_TOPICS as readonly string[]).includes(value);
}

function parseSnapshot(value: unknown): ReadSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = value as Partial<ReadSnapshot>;
  if (
    typeof raw.id !== 'string' ||
    typeof raw.title !== 'string' ||
    !isTopic(raw.topic) ||
    typeof raw.publishedAt !== 'string' ||
    typeof raw.readAt !== 'string' ||
    !Array.isArray(raw.sources)
  ) {
    return null;
  }

  const sources = raw.sources.filter(
    (source): source is NewsSource =>
      Boolean(source) &&
      typeof source === 'object' &&
      typeof source.outlet === 'string' &&
      typeof source.url === 'string',
  );

  return {
    id: raw.id,
    title: raw.title,
    topic: raw.topic,
    publishedAt: raw.publishedAt,
    readAt: raw.readAt,
    sources,
    bullets: Array.isArray(raw.bullets) ? raw.bullets.filter((item) => typeof item === 'string') : [],
    whyItMatters: typeof raw.whyItMatters === 'string' ? raw.whyItMatters : '',
    importance: typeof raw.importance === 'number' ? raw.importance : 0,
    numbersUnverified: raw.numbersUnverified === true,
    briefing: typeof raw.briefing === 'string' ? raw.briefing : undefined,
  };
}

export function loadReadHistory(): ReadHistory {
  try {
    const raw = localStorage.getItem(READ_HISTORY_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const history: ReadHistory = {};
    for (const [topic, value] of Object.entries(parsed)) {
      if (!isTopic(topic)) {
        continue;
      }
      const snapshot = parseSnapshot(value);
      if (snapshot) {
        history[topic] = snapshot;
      }
    }
    return history;
  } catch {
    return {};
  }
}

function saveReadHistory(history: ReadHistory): void {
  localStorage.setItem(READ_HISTORY_KEY, JSON.stringify(history));
}

export function snapshotFromItem(item: NewsItem, readAt = new Date().toISOString()): ReadSnapshot {
  return {
    id: item.id,
    title: item.title,
    topic: item.topic,
    publishedAt: item.publishedAt,
    readAt,
    sources: item.sources,
    bullets: item.bullets,
    whyItMatters: item.whyItMatters,
    importance: item.importance,
    numbersUnverified: item.numbersUnverified,
    briefing: item.briefing,
  };
}

export function rememberReadItem(item: NewsItem, current: ReadHistory = loadReadHistory()): ReadHistory {
  const next: ReadHistory = {
    ...current,
    [item.topic]: snapshotFromItem(item),
  };
  saveReadHistory(next);
  return next;
}

export function isFreshRead(snapshot: ReadSnapshot, now = Date.now()): boolean {
  const readAt = new Date(snapshot.readAt).getTime();
  if (Number.isNaN(readAt) || readAt <= 0) {
    return false;
  }
  return now - readAt <= READ_HEADLINE_MAX_AGE_MS;
}

export function snapshotToNewsItem(snapshot: ReadSnapshot): NewsItem {
  return {
    id: snapshot.id,
    title: snapshot.title,
    topic: snapshot.topic,
    publishedAt: snapshot.publishedAt,
    sources: snapshot.sources,
    bullets: snapshot.bullets,
    whyItMatters: snapshot.whyItMatters,
    importance: snapshot.importance,
    numbersUnverified: snapshot.numbersUnverified,
    briefing: snapshot.briefing ?? ' ',
  };
}

/** Backfill snapshots from API items already marked read, when history is empty for a topic. */
export function hydrateReadHistory(
  items: readonly NewsItem[],
  readIds: ReadonlySet<string>,
  current: ReadHistory = loadReadHistory(),
): ReadHistory {
  let changed = false;
  const next: ReadHistory = { ...current };

  for (const topic of NEWS_TOPICS) {
    if (next[topic]) {
      continue;
    }

    const match = items
      .filter((item) => item.topic === topic && readIds.has(item.id))
      .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())[0];

    if (!match) {
      continue;
    }

    // Treat existing reads as fresh so they reappear after this feature ships.
    next[topic] = snapshotFromItem(match);
    changed = true;
  }

  if (changed) {
    saveReadHistory(next);
  }
  return next;
}
