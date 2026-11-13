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
/** Hard cap of Gemini calls per refresh (free tier ~15 RPM). */
const MAX_AI_CALLS_PER_REFRESH = 6;

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

function draftTopic(
  clusters: ArticleCluster[],
  items: NewsItem[],
  known: Set<string>,
  topic: NewsTopic,
): void {
  if (hasTopicItem(items, topic)) {
    return;
  }

  const occupied = new Set(items.map((item) => item.id));
  const [fallback] = anyCandidatesForTopic(clusters, topic, occupied);
  if (!fallback) {
    console.warn(`Sem RSS utilizável para preencher a editoria ${topic}`);
    return;
  }

  const drafted = draftFromCluster(fallback, topic);
  items.push(drafted);
  markClusterKnown(fallback, known);
}

/**
 * Minimum AI: at most one Gemini call per topic that lacks an unread item,
 * never in parallel, never more than MAX_AI_CALLS_PER_REFRESH. Draft fills the rest.
 */
async function fillTopics(
  clusters: ArticleCluster[],
  items: NewsItem[],
  known: Set<string>,
  excluded: ReadonlySet<string>,
  skippedIds: string[],
): Promise<void> {
  let aiCalls = 0;

  for (const topic of NEWS_TOPICS) {
    if (bestUnreadForTopic(items, topic, excluded)) {
      continue;
    }

    if (aiCalls >= MAX_AI_CALLS_PER_REFRESH) {
      draftTopic(clusters, items, known, topic);
      continue;
    }

    const [candidate] = candidatesForTopic(clusters, topic, known);
    if (!candidate) {
      draftTopic(clusters, items, known, topic);
      continue;
    }

    markClusterKnown(candidate, known);
    aiCalls += 1;

    try {
      const summarized = await summarizeCluster(candidate, topic);
      if (summarized) {
        items.push(summarized);
        continue;
      }
      skippedIds.push(...candidate.articles.map((article) => article.id));
    } catch (error) {
      console.warn('Falha ao resumir cluster', candidate.id, error);
      skippedIds.push(...candidate.articles.map((article) => article.id));
    }

    // One AI miss is enough — fall back to RSS draft instead of burning more RPM.
    draftTopic(clusters, items, known, topic);
  }
}

function mergeSeed(cacheItems: readonly NewsItem[], seedItems: readonly NewsItem[]): NewsItem[] {
  const byId = new Map<string, NewsItem>();
  for (const item of withBriefing(seedItems)) {
    byId.set(item.id, item);
  }
  for (const item of withBriefing(cacheItems)) {
    byId.set(item.id, item);
  }
  return [...byId.values()];
}

export async function refreshBriefing(
  readIds: readonly string[] = [],
  seedItems: readonly NewsItem[] = [],
): Promise<{ items: NewsItem[]; updatedAt: string }> {
  if (!getGeminiConfig().apiKey) {
    throw new Error('Coloque GEMINI_API_KEY no arquivo .env na raiz do projeto.');
  }

  const excluded = new Set(readIds);
  const cache = readCache();
  const items = mergeSeed(cache.items, seedItems);
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
