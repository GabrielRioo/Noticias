import { NEWS_TOPICS, type NewsItem, type NewsTopic } from '../../types/news';
import {
  isFreshRead,
  READ_HEADLINE_MAX_AGE_MS,
  snapshotToNewsItem,
  type ReadHistory,
} from './readHistory';

export { READ_HEADLINE_MAX_AGE_MS };

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

/**
 * Per topic: newest unread as full story when available.
 * Always keeps the last read as a headline when it was read within 1 week.
 * If there is no unread, falls back to a recent item from the API cache.
 */
export function pickEditionEntries(
  items: readonly NewsItem[],
  readIds: ReadonlySet<string>,
  readHistory: ReadHistory,
  topic: NewsTopic | 'all',
  now = Date.now(),
): EditionEntry[] {
  const topics = topic === 'all' ? NEWS_TOPICS : [topic];
  const entries: EditionEntry[] = [];

  for (const currentTopic of topics) {
    const candidates = byRecency(
      items.filter((item) => item.topic === currentTopic && Boolean(item.briefing?.trim())),
    );
    const unread = candidates.find((item) => !readIds.has(item.id));
    const lastRead = readHistory[currentTopic];
    const lastReadFresh = lastRead && isFreshRead(lastRead, now) ? lastRead : undefined;

    if (unread) {
      entries.push({ item: unread, mode: 'full' });
      if (lastReadFresh && lastReadFresh.id !== unread.id) {
        entries.push({ item: snapshotToNewsItem(lastReadFresh), mode: 'headline' });
      }
      continue;
    }

    if (lastReadFresh) {
      entries.push({ item: snapshotToNewsItem(lastReadFresh), mode: 'headline' });
      continue;
    }

    // Keep the category visible with something relevant from cache (even a few days old).
    const fallback = candidates[0];
    if (fallback) {
      entries.push({
        item: fallback,
        mode: readIds.has(fallback.id) ? 'headline' : 'full',
      });
    }
  }

  return entries.sort((left, right) => {
    if (left.mode !== right.mode) {
      return left.mode === 'full' ? -1 : 1;
    }
    return publishedTime(right.item.publishedAt) - publishedTime(left.item.publishedAt);
  });
}
