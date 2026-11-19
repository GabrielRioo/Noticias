import { readCache, writeCache } from './cache.js';
import {
  clusterArticles,
  clusterRelevance,
  type ArticleCluster,
} from './cluster.js';
import { getGeminiConfig } from './env.js';
import { FEEDS } from './feeds.js';
import { collectArticles } from './rss.js';
import {
  draftFromCluster,
  isFeedDraftItem,
  isGeminiUnavailableError,
  summarizeCluster,
} from './summarize.js';
import { NEWS_TOPICS, type NewsItem, type NewsTopic } from '../src/types/news.js';
import { hasBrokenEncoding } from './text.js';

export type BriefingPayload = {
  items: NewsItem[];
  updatedAt: string | null;
  withoutAi: boolean;
};

const KEPT_PER_TOPIC = 8;
/** Hard cap of Gemini calls per refresh (free tier ~15 RPM). */
const MAX_AI_CALLS_PER_REFRESH = 8;

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
  const candidates = byRelevance(
    withBriefing(items).filter((item) => item.topic === topic && !excluded.has(item.id)),
  );
  // Prefer a real AI briefing over a newer raw RSS draft.
  return candidates.find((item) => !isFeedDraftItem(item)) ?? candidates[0];
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

/**
 * Add an unread RSS draft for a topic that still lacks one.
 * Must run even when the topic already has read items — otherwise refresh
 * after reading never surfaces the next story without AI.
 */
function draftUnreadTopic(
  clusters: ArticleCluster[],
  items: NewsItem[],
  known: Set<string>,
  topic: NewsTopic,
  excluded: ReadonlySet<string>,
): boolean {
  if (bestUnreadForTopic(items, topic, excluded)) {
    return false;
  }

  const occupied = new Set(items.map((item) => item.id));
  const [fallback] = anyCandidatesForTopic(clusters, topic, occupied);
  if (!fallback) {
    console.warn(`Sem RSS utilizável para preencher a editoria ${topic}`);
    return false;
  }

  const drafted = draftFromCluster(fallback, topic);
  items.push(drafted);
  markClusterKnown(fallback, known);
  return true;
}

/**
 * Minimum AI: at most one Gemini call per topic that lacks an unread item,
 * never in parallel, never more than MAX_AI_CALLS_PER_REFRESH. Draft fills the rest.
 * When Gemini is unavailable (no key / quota), every gap is filled from RSS only.
 */
async function fillTopics(
  clusters: ArticleCluster[],
  items: NewsItem[],
  known: Set<string>,
  excluded: ReadonlySet<string>,
  skippedIds: string[],
  aiDisabled: boolean,
  topics: readonly NewsTopic[] = NEWS_TOPICS,
): Promise<boolean> {
  let aiCalls = 0;
  let withoutAi = aiDisabled;
  const maxAiCalls = Math.min(MAX_AI_CALLS_PER_REFRESH, Math.max(1, topics.length));

  for (const topic of topics) {
    if (bestUnreadForTopic(items, topic, excluded)) {
      continue;
    }

    if (withoutAi || aiCalls >= maxAiCalls) {
      draftUnreadTopic(clusters, items, known, topic, excluded);
      continue;
    }

    const [candidate] = candidatesForTopic(clusters, topic, known);
    if (!candidate) {
      draftUnreadTopic(clusters, items, known, topic, excluded);
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
      if (isGeminiUnavailableError(error)) {
        // All models in the chain failed for this call — draft this topic,
        // but keep trying AI on the next topics (another model may still work).
        items.push(draftFromCluster(candidate, topic));
        continue;
      }
      skippedIds.push(...candidate.articles.map((article) => article.id));
    }

    // One AI miss is enough — fall back to RSS draft instead of burning more RPM.
    draftUnreadTopic(clusters, items, known, topic, excluded);
  }

  // Hard guarantee: every requested topic without an unread item gets an RSS draft when possible.
  for (const topic of topics) {
    draftUnreadTopic(clusters, items, known, topic, excluded);
  }

  // Soft upgrade without AI only when the current unread item is already a feed draft.
  // Never bury an AI briefing under a newer raw RSS paste.
  for (const topic of topics) {
    const current = bestUnreadForTopic(items, topic, excluded);
    if (!current || !isFeedDraftItem(current)) {
      continue;
    }

    const [newer] = candidatesForTopic(clusters, topic, known);
    if (!newer) {
      continue;
    }

    const newerTime = Math.max(
      ...newer.articles.map((article) => publishedTime(article.publishedAt)),
    );
    if (newerTime <= publishedTime(current.publishedAt)) {
      continue;
    }

    const drafted = draftFromCluster(newer, topic);
    drafted.importance = Math.max(drafted.importance, current.importance);
    items.push(drafted);
    markClusterKnown(newer, known);
  }

  return withoutAi;
}

function isReadableItem(item: NewsItem): boolean {
  const blob = `${item.title}\n${item.briefing ?? ''}\n${item.bullets.join('\n')}`;
  return !hasBrokenEncoding(blob);
}

function mergeSeed(cacheItems: readonly NewsItem[], seedItems: readonly NewsItem[]): NewsItem[] {
  const byId = new Map<string, NewsItem>();
  for (const item of withBriefing(seedItems)) {
    if (isReadableItem(item)) {
      byId.set(item.id, item);
    }
  }
  for (const item of withBriefing(cacheItems)) {
    if (isReadableItem(item)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

export async function refreshBriefing(
  readIds: readonly string[] = [],
  seedItems: readonly NewsItem[] = [],
  topic?: NewsTopic,
): Promise<BriefingPayload> {
  const aiDisabled = !getGeminiConfig().apiKey;
  if (aiDisabled) {
    console.warn('GEMINI_API_KEY ausente — fechando edição só com feeds RSS.');
  }

  const topics = topic ? [topic] : NEWS_TOPICS;
  const excluded = new Set(readIds);
  const cache = readCache();
  // Topic refresh rebuilds that editoria from fresh RSS (drops stale/broken drafts).
  const merged = mergeSeed(cache.items, seedItems);
  const items = topic ? merged.filter((item) => item.topic !== topic) : merged;
  const known = new Set(
    items.flatMap((item) => [item.id, ...item.sources.map((source) => source.url)]),
  );

  const articles = await collectArticles(topic);
  const clusters = clusterArticles(articles);
  const skippedIds = [...cache.skippedIds];

  const withoutAi = await fillTopics(
    clusters,
    items,
    known,
    excluded,
    skippedIds,
    aiDisabled,
    topics,
  );

  const next = {
    updatedAt: new Date().toISOString(),
    items: retainRecent(items),
    skippedIds: skippedIds.slice(-400),
    withoutAi: topic ? cache.withoutAi || withoutAi : withoutAi,
  };
  writeCache(next);

  const edition: NewsItem[] = [];
  for (const editionTopic of NEWS_TOPICS) {
    const unread = bestUnreadForTopic(next.items, editionTopic, excluded);
    if (unread) {
      edition.push(unread);
      continue;
    }
    const fallback = byRelevance(next.items.filter((item) => item.topic === editionTopic))[0];
    if (fallback) {
      edition.push(fallback);
    }
  }

  const byId = new Map(next.items.map((item) => [item.id, item]));
  for (const item of edition) {
    byId.set(item.id, item);
  }

  return { items: [...byId.values()], updatedAt: next.updatedAt, withoutAi: next.withoutAi };
}

export function listBriefing(): BriefingPayload {
  const cache = readCache();
  return {
    items: withBriefing(cache.items),
    updatedAt: cache.updatedAt,
    withoutAi: cache.withoutAi,
  };
}
