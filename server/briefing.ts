import { readCache, writeCache } from './cache.js';
import {
  clusterArticles,
  clusterRelevance,
  type ArticleCluster,
} from './cluster.js';
import { getGeminiConfig } from './env.js';
import { FEEDS } from './feeds.js';
import { collectArticles } from './rss.js';
import { draftFromCluster, summarizeCluster } from './summarize.js';
import { NEWS_TOPICS, type NewsItem, type NewsTopic } from '../src/types/news.js';

const KEPT_PER_TOPIC = 8;
/** How many RSS candidates to try with Gemini per empty topic. */
const FILL_ATTEMPTS_PER_TOPIC = 4;

const CONFLICT_HINT =
  /guerra|conflito|gaza|ucr[aâ]nia|israel|hamas|otan|m[ií]ssil|ataque|hezbollah|ir[aã]|taiwan|ciss[aã]o|ocupa/i;

const FEED_TOPIC = new Map<string, NewsTopic>(
  FEEDS.filter((feed) => feed.opensEdition !== false).map((feed) => [feed.id, feed.topic]),
);

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

function withBriefing(items: readonly NewsItem[]): NewsItem[] {
  return items.filter((item) => Boolean(item.briefing?.trim()));
}

function bestUnreadForTopic(
  items: readonly NewsItem[],
  topic: NewsTopic,
  excluded: ReadonlySet<string>,
): NewsItem | undefined {
  return byRelevance(
    withBriefing(items).filter((item) => item.topic === topic && !excluded.has(item.id)),
  )[0];
}

function hasTopicItem(items: readonly NewsItem[], topic: NewsTopic): boolean {
  return withBriefing(items).some((item) => item.topic === topic);
}

function retainRecent(items: NewsItem[]): NewsItem[] {
  const grouped = new Map<NewsTopic, NewsItem[]>();

  for (const item of withBriefing(items)) {
    const bucket = grouped.get(item.topic) ?? [];
    bucket.push(item);
    grouped.set(item.topic, bucket);
  }

  const kept: NewsItem[] = [];
  for (const topic of NEWS_TOPICS) {
    const bucket = grouped.get(topic) ?? [];
    kept.push(...byRelevance(bucket).slice(0, KEPT_PER_TOPIC));
  }
  return kept;
}

function clusterTopic(cluster: ArticleCluster): NewsTopic | undefined {
  const feedId = cluster.articles[0]?.feedId;
  return feedId ? FEED_TOPIC.get(feedId) : undefined;
}

function clusterLooksLikeConflict(cluster: ArticleCluster): boolean {
  const seed = cluster.articles[0];
  if (!seed) {
    return false;
  }
  return CONFLICT_HINT.test(`${seed.title} ${seed.text.slice(0, 400)}`);
}

function isUnknownCluster(cluster: ArticleCluster, known: ReadonlySet<string>): boolean {
  return cluster.articles.every(
    (article) => !known.has(article.id) && !known.has(article.url) && !known.has(cluster.id),
  );
}

function candidatesForTopic(
  clusters: readonly ArticleCluster[],
  topic: NewsTopic,
  known: ReadonlySet<string>,
): ArticleCluster[] {
  const direct = clusters
    .filter((cluster) => clusterTopic(cluster) === topic)
    .filter((cluster) => isUnknownCluster(cluster, known));

  const borrowed =
    topic === 'conflitos'
      ? clusters
          .filter((cluster) => clusterTopic(cluster) === 'mundo')
          .filter((cluster) => clusterLooksLikeConflict(cluster))
          .filter((cluster) => isUnknownCluster(cluster, known))
      : [];

  return [...direct, ...borrowed].sort(
    (left, right) => clusterRelevance(right) - clusterRelevance(left),
  );
}

/** Includes already-seen clusters so an empty topic can still get a draft fallback. */
function anyCandidatesForTopic(
  clusters: readonly ArticleCluster[],
  topic: NewsTopic,
  occupiedIds: ReadonlySet<string>,
): ArticleCluster[] {
  const direct = clusters.filter((cluster) => clusterTopic(cluster) === topic);
  const borrowed =
    topic === 'conflitos'
      ? clusters.filter(
          (cluster) => clusterTopic(cluster) === 'mundo' && clusterLooksLikeConflict(cluster),
        )
      : [];

  return [...direct, ...borrowed]
    .filter((cluster) => !occupiedIds.has(cluster.id))
    .sort((left, right) => clusterRelevance(right) - clusterRelevance(left));
}

function markClusterKnown(cluster: ArticleCluster, known: Set<string>): void {
  known.add(cluster.id);
  for (const article of cluster.articles) {
    known.add(article.id);
    known.add(article.url);
  }
}

/**
 * For every topic without an unread item, try candidates in relevance order until one sticks.
 * Ends with a hard RSS draft so no topic stays blank when the feed still has articles.
 */
async function fillTopics(
  clusters: ArticleCluster[],
  items: NewsItem[],
  known: Set<string>,
  excluded: ReadonlySet<string>,
  skippedIds: string[],
): Promise<void> {
  const summarizeOne = async (
    cluster: ArticleCluster,
    topic: NewsTopic,
  ): Promise<NewsItem | null> => {
    markClusterKnown(cluster, known);
    try {
      const summarized = await summarizeCluster(cluster, topic);
      if (summarized) {
        items.push(summarized);
        return summarized;
      }
      skippedIds.push(...cluster.articles.map((article) => article.id));
    } catch (error) {
      console.warn('Falha ao resumir cluster', cluster.id, error);
      skippedIds.push(...cluster.articles.map((article) => article.id));
    }
    return null;
  };

  // Wave 1: fill empty topics in parallel (one best candidate each).
  const emptyTopics = NEWS_TOPICS.filter((topic) => !bestUnreadForTopic(items, topic, excluded));
  await Promise.all(
    emptyTopics.map(async (topic) => {
      const [first] = candidatesForTopic(clusters, topic, known);
      if (!first) {
        return;
      }
      await summarizeOne(first, topic);
    }),
  );

  // Wave 2: topics still empty — try next candidates sequentially.
  for (const topic of NEWS_TOPICS) {
    if (bestUnreadForTopic(items, topic, excluded)) {
      continue;
    }

    const remaining = candidatesForTopic(clusters, topic, known).slice(0, FILL_ATTEMPTS_PER_TOPIC);
    for (const cluster of remaining) {
      const summarized = await summarizeOne(cluster, topic);
      if (summarized) {
        break;
      }
    }
  }

  // Wave 3: upgrade topics that already have unread when a newer story appears.
  await Promise.all(
    NEWS_TOPICS.map(async (topic) => {
      const current = bestUnreadForTopic(items, topic, excluded);
      if (!current) {
        return;
      }

      const [better] = candidatesForTopic(clusters, topic, known);
      if (!better) {
        return;
      }

      const betterTime = Math.max(
        ...better.articles.map((article) => publishedTime(article.publishedAt)),
      );
      if (betterTime <= publishedTime(current.publishedAt)) {
        return;
      }

      await summarizeOne(better, topic);
    }),
  );

  // Wave 4: hard guarantee — if a topic still has zero items, draft from RSS.
  const occupied = new Set(items.map((item) => item.id));
  for (const topic of NEWS_TOPICS) {
    if (hasTopicItem(items, topic)) {
      continue;
    }

    const [fallback] = anyCandidatesForTopic(clusters, topic, occupied);
    if (!fallback) {
      console.warn(`Sem RSS utilizável para preencher a editoria ${topic}`);
      continue;
    }

    const drafted = draftFromCluster(fallback, topic);
    items.push(drafted);
    occupied.add(drafted.id);
    markClusterKnown(fallback, known);
  }
}

export async function refreshBriefing(
  readIds: readonly string[] = [],
): Promise<{ items: NewsItem[]; updatedAt: string }> {
  if (!getGeminiConfig().apiKey) {
    throw new Error('Coloque GEMINI_API_KEY no arquivo .env na raiz do projeto.');
  }

  const excluded = new Set(readIds);
  const cache = readCache();
  const items = withBriefing(cache.items);
  // Do not block empty-topic refill with old skippedIds — only avoid re-summarizing
  // stories already kept in cache.
  const known = new Set(
    items.flatMap((item) => [item.id, ...item.sources.map((source) => source.url)]),
  );

  const articles = await collectArticles();
  const clusters = clusterArticles(articles);
  const skippedIds = [...cache.skippedIds];

  await fillTopics(clusters, items, known, excluded, skippedIds);

  const next = {
    updatedAt: new Date().toISOString(),
    items: retainRecent(items),
    skippedIds: skippedIds.slice(-400),
  };
  writeCache(next);

  // Always expose at least one item per topic when available
  // (unread preferred; otherwise the best retained story).
  const edition: NewsItem[] = [];
  for (const topic of NEWS_TOPICS) {
    const unread = bestUnreadForTopic(next.items, topic, excluded);
    if (unread) {
      edition.push(unread);
      continue;
    }
    const fallback = byRelevance(next.items.filter((item) => item.topic === topic))[0];
    if (fallback) {
      edition.push(fallback);
    }
  }

  const byId = new Map(next.items.map((item) => [item.id, item]));
  for (const item of edition) {
    byId.set(item.id, item);
  }

  return { items: [...byId.values()], updatedAt: next.updatedAt };
}

export function listBriefing(): { items: NewsItem[]; updatedAt: string | null } {
  const cache = readCache();
  return { items: withBriefing(cache.items), updatedAt: cache.updatedAt };
}
