import type { RawArticle } from './rss.js';
import { titleSimilarity } from './text.js';

const WINDOW_MS = 36 * 60 * 60 * 1000;
const SIMILARITY_THRESHOLD = 0.38;

export type ArticleCluster = {
  id: string;
  articles: RawArticle[];
};

export function heuristicScore(article: RawArticle): number {
  const haystack = `${article.title} ${article.text.slice(0, 400)}`.toLowerCase();
  const signals = [
    'governo',
    'presidente',
    'congresso',
    'senado',
    'stf',
    'guerra',
    'israel',
    'ucrania',
    'russia',
    'china',
    'eua',
    ' inflacao',
    'juros',
    'selic',
    'pib',
    'eleicao',
    'onu',
    'otan',
    'inteligencia artificial',
    'clima',
    'tarif',
    'sanc',
    'retalia',
    'gaza',
    'ira',
    'irã',
    'hamas',
    'taiwan',
    'ucrania',
    'ucrânia',
    'comercial',
    'bitcoin',
    ' btc',
    'criptomoeda',
    'fii',
    'fundo imobili',
    'recr11',
    'knip11',
    'urpr11',
    'xpml11',
    'hgre11',
    'btlg11',
    'mcre11',
    'mxrf11',
    'vgia11',
    'vghf11',
    'bthf11',
    'cpts11',
    'visc11',
    'gare11',
    'brco11',
    'ggrc11',
    'rbrr11',
  ];
  return signals.reduce((score, word) => (haystack.includes(word) ? score + 1 : score), 0);
}

export function clusterArticles(articles: RawArticle[]): ArticleCluster[] {
  const clusters: ArticleCluster[] = [];

  for (const article of articles) {
    const published = new Date(article.publishedAt).getTime();
    const match = clusters.find((cluster) => {
      const seed = cluster.articles[0];
      if (!seed) {
        return false;
      }
      const seedTime = new Date(seed.publishedAt).getTime();
      if (Math.abs(published - seedTime) > WINDOW_MS) {
        return false;
      }
      return titleSimilarity(article.title, seed.title) >= SIMILARITY_THRESHOLD;
    });

    if (match) {
      match.articles.push(article);
    } else {
      clusters.push({ id: article.id, articles: [article] });
    }
  }

  return clusters.sort((left, right) => {
    const rightSeed = right.articles[0];
    const leftSeed = left.articles[0];
    if (!rightSeed || !leftSeed) {
      return 0;
    }
    const scoreDiff = heuristicScore(rightSeed) - heuristicScore(leftSeed);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return new Date(rightSeed.publishedAt).getTime() - new Date(leftSeed.publishedAt).getTime();
  });
}

export function pickDiverseClusters(
  clusters: ArticleCluster[],
  maxCount: number,
  perFeed = 5,
): ArticleCluster[] {
  const buckets = new Map<string, ArticleCluster[]>();

  for (const cluster of clusters) {
    const feedId = cluster.articles[0]?.feedId ?? 'other';
    const bucket = buckets.get(feedId) ?? [];
    if (bucket.length < perFeed) {
      bucket.push(cluster);
      buckets.set(feedId, bucket);
    }
  }

  const queues = [...buckets.values()];
  const picked: ArticleCluster[] = [];
  let index = 0;
  while (picked.length < maxCount && queues.some((queue) => queue.length > 0)) {
    const queue = queues[index % queues.length];
    index += 1;
    const next = queue?.shift();
    if (next) {
      picked.push(next);
    }
  }

  return picked;
}

export function longestText(cluster: ArticleCluster): RawArticle {
  const first = cluster.articles[0];
  if (!first) {
    throw new Error('Cluster sem artigos');
  }
  return cluster.articles.reduce(
    (best, current) => (current.text.length > best.text.length ? current : best),
    first,
  );
}

export function clusterRelevance(cluster: ArticleCluster): number {
  const seed = longestText(cluster);
  const published = new Date(seed.publishedAt).getTime();
  const time = Number.isNaN(published) ? 0 : published;
  return heuristicScore(seed) * 1e15 + time;
}
