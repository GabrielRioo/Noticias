import { NEWS_TOPICS, type NewsItem, type NewsTopic } from '../../types/news';

export const READ_HEADLINE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type EditionEntry = {
  item: NewsItem;
  mode: 'full' | 'headline';
};

function publishedTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function byRecency(items: NewsItem[]): NewsItem[] {
  return [...items].sort(
    (left, right) => publishedTime(right.publishedAt) - publishedTime(left.publishedAt),
  );
}

function isWithinReadWindow(item: NewsItem, now: number): boolean {
  const published = publishedTime(item.publishedAt);
  if (published <= 0) {
    return false;
  }
  return now - published <= READ_HEADLINE_MAX_AGE_MS;
}

/**
 * One slot per topic: prefer newest unread (full story), else a recent read (headline only).
 * Guarantees a visible item whenever the cache still has something relevant.
 */
export function pickEditionEntries(
  items: readonly NewsItem[],
  readIds: ReadonlySet<string>,
  topic: NewsTopic | 'all',
  now = Date.now(),
): EditionEntry[] {
  const topics = topic === 'all' ? NEWS_TOPICS : [topic];
  const entries: EditionEntry[] = [];

  for (const currentTopic of topics) {
    const candidates = byRecency(
      items.filter((item) => item.topic === currentTopic && Boolean(item.briefing?.trim())),
    );
    if (candidates.length === 0) {
      continue;
    }

    const unread = candidates.find((item) => !readIds.has(item.id));
    if (unread) {
      entries.push({ item: unread, mode: 'full' });
      continue;
    }

    const recentRead = candidates.find(
      (item) => readIds.has(item.id) && isWithinReadWindow(item, now),
    );
    if (recentRead) {
      entries.push({ item: recentRead, mode: 'headline' });
    }
  }

  return entries.sort((left, right) => {
    if (left.mode !== right.mode) {
      return left.mode === 'full' ? -1 : 1;
    }
    return publishedTime(right.item.publishedAt) - publishedTime(left.item.publishedAt);
  });
}
