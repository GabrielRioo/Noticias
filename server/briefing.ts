import { readCache, writeCache } from './cache.ts';
import { clusterArticles, type ArticleCluster } from './cluster.ts';
import { getGeminiConfig } from './env.ts';
import { FEEDS } from './feeds.ts';
import { collectArticles } from './rss.ts';
import { summarizeCluster } from './summarize.ts';
import { NEWS_TOPICS, type NewsItem, type NewsTopic } from '../src/types/news.ts';

const KEPT_PER_TOPIC = 5;

const FEED_TOPIC = new Map<string, NewsTopic>(
  FEEDS.filter((feed) => feed.opensEdition !== false).map((feed) => [feed.id, feed.topic]),
);

function publishedTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function byRecency(items: NewsItem[]): NewsItem[] {
  return [...items].sort(
    (left, right) => publishedTime(right.publishedAt) - publishedTime(left.publishedAt),
  );
}

function latestPerTopic(items: NewsItem[], excluded: ReadonlySet<string>): NewsItem[] {
  const best = new Map<NewsTopic, NewsItem>();

  for (const item of items) {
    if (!item.briefing?.trim() || excluded.has(item.id)) {
      continue;
    }

    const current = best.get(item.topic);
    if (!current || publishedTime(item.publishedAt) > publishedTime(current.publishedAt)) {
      best.set(item.topic, item);
    }
  }

  return byRecency([...best.values()]);
}

function retainRecent(items: NewsItem[]): NewsItem[] {
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
  for (const bucket of grouped.values()) {
    kept.push(...byRecency(bucket).slice(0, KEPT_PER_TOPIC));
  }
  return kept;
}

function clusterTopic(cluster: ArticleCluster): NewsTopic | undefined {
  const feedId = cluster.articles[0]?.feedId;
  return feedId ? FEED_TOPIC.get(feedId) : undefined;
}

function clusterTime(cluster: ArticleCluster): number {
  return Math.max(...cluster.articles.map((article) => publishedTime(article.publishedAt)));
}

function pickClustersToSummarize(
  clusters: ArticleCluster[],
  known: ReadonlySet<string>,
  edition: readonly NewsItem[],
): ArticleCluster[] {
  const editionByTopic = new Map(edition.map((item) => [item.topic, item]));
  const picked: ArticleCluster[] = [];

  for (const topic of NEWS_TOPICS) {
    const newest = clusters
      .filter((cluster) => clusterTopic(cluster) === topic)
      .filter((cluster) =>
        cluster.articles.every((article) => !known.has(article.id) && !known.has(article.url)),
      )
      .sort((left, right) => clusterTime(right) - clusterTime(left))[0];

    if (!newest) {
      continue;
    }

    const current = editionByTopic.get(topic);
    if (current && clusterTime(newest) <= publishedTime(current.publishedAt)) {
      continue;
    }

    picked.push(newest);
  }

  return picked;
}

export async function refreshBriefing(
  readIds: readonly string[] = [],
): Promise<{ items: NewsItem[]; updatedAt: string }> {
  if (!getGeminiConfig().apiKey) {
    throw new Error('Coloque GEMINI_API_KEY no arquivo .env na raiz do projeto.');
  }

  const excluded = new Set(readIds);
  const cache = readCache();
  const items = cache.items.filter((item) => Boolean(item.briefing?.trim()));
  const known = new Set([
    ...items.flatMap((item) => [item.id, ...item.sources.map((source) => source.url)]),
    ...cache.skippedIds,
  ]);

  const articles = await collectArticles();
  const edition = latestPerTopic(items, excluded);
  const clusters = pickClustersToSummarize(clusterArticles(articles), known, edition);
  const skippedIds = [...cache.skippedIds];

  for (const cluster of clusters) {
    try {
      const summarized = await summarizeCluster(cluster);
      if (summarized) {
        items.push(summarized);
      } else {
        skippedIds.push(...cluster.articles.map((article) => article.id));
      }
    } catch (error) {
      console.warn('Falha ao resumir cluster', cluster.id, error);
    }
  }

  const next = {
    updatedAt: new Date().toISOString(),
    items: retainRecent(items),
    skippedIds: skippedIds.slice(-400),
  };
  writeCache(next);
  return { items: latestPerTopic(next.items, excluded), updatedAt: next.updatedAt };
}

export function listBriefing(): { items: NewsItem[]; updatedAt: string | null } {
  const cache = readCache();
  return { items: latestPerTopic(cache.items, new Set()), updatedAt: cache.updatedAt };
}
