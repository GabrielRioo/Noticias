import Parser from 'rss-parser';
import type { SearchHit } from '../src/types/news.js';
import { FEEDS, type FeedConfig } from './feeds.js';
import { cleanArticleText } from './text.js';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'BriefingPessoal/1.0 (leitor RSS local)',
  },
  customFields: {
    item: [['atom:subtitle', 'subtitle']],
  },
});

export type RawArticle = {
  id: string;
  feedId: string;
  outlet: string;
  title: string;
  url: string;
  text: string;
  publishedAt: string;
};

const MIN_TEXT_LENGTH = 280;

async function fetchFeed(feed: FeedConfig): Promise<RawArticle[]> {
  let lastError: unknown;

  for (const url of feed.urls) {
    try {
      const parsed = await parser.parseURL(url);
      return (parsed.items ?? [])
        .map((item) => {
          const title = (item.title ?? '').trim();
          const link = (item.link ?? '').trim();
          const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
          const extra = item as { subtitle?: string };
          const raw = `${extra.subtitle ?? ''} ${item.contentSnippet ?? ''} ${item.content ?? ''} ${item.summary ?? ''}`;
          const text = cleanArticleText(raw);

          return {
            id: link || `${feed.id}:${title}`,
            feedId: feed.id,
            outlet: feed.outlet,
            title,
            url: link,
            text,
            publishedAt: new Date(publishedAt).toISOString(),
          };
        })
        .filter((item) => {
            const minLength = feed.minTextLength ?? MIN_TEXT_LENGTH;
            return item.title && item.url && item.text.length >= minLength;
          });
    } catch (error) {
      lastError = error;
    }
  }

  console.warn(`Feed ${feed.id} failed`, lastError);
  return [];
}

const SEARCH_RESULT_LIMIT = 12;

function googleNewsSearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: `${query} when:30d`,
    hl: 'pt-BR',
    gl: 'BR',
    ceid: 'BR:pt-419',
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

function splitGoogleTitle(title: string): { title: string; outlet: string } {
  const separator = title.lastIndexOf(' - ');
  if (separator < 1) {
    return { title: title.trim(), outlet: 'Google Notícias' };
  }

  const headline = title.slice(0, separator).trim();
  const outlet = title.slice(separator + 3).trim();
  if (headline.length < 2 || outlet.length < 2 || outlet.length > 48) {
    return { title: title.trim(), outlet: 'Google Notícias' };
  }

  return { title: headline, outlet };
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIso(value: string | undefined): string {
  const time = new Date(value ?? '').getTime();
  return Number.isNaN(time) ? new Date().toISOString() : new Date(time).toISOString();
}

export async function collectSearchArticles(query: string): Promise<SearchHit[]> {
  let parsed;
  try {
    parsed = await parser.parseURL(googleNewsSearchUrl(query));
  } catch (error) {
    console.warn('Search feed failed', error);
    throw new Error('Não foi possível buscar notícias agora.');
  }

  const seen = new Set<string>();
  const articles: SearchHit[] = [];

  for (const item of parsed.items ?? []) {
    if (articles.length >= SEARCH_RESULT_LIMIT) {
      break;
    }

    const link = (item.link ?? '').trim();
    const rawTitle = (item.title ?? '').trim();
    if (!link || !rawTitle) {
      continue;
    }

    const { title, outlet } = splitGoogleTitle(rawTitle);
    const key = normalizeTitle(title);
    if (!key || seen.has(key) || seen.has(link)) {
      continue;
    }

    seen.add(key);
    seen.add(link);
    articles.push({
      id: link,
      title,
      outlet,
      url: link,
      publishedAt: toIso(item.isoDate ?? item.pubDate),
    });
  }

  return articles;
}

export async function collectArticles(): Promise<RawArticle[]> {
  const batches = await Promise.all(FEEDS.map((feed) => fetchFeed(feed)));
  const byUrl = new Map<string, RawArticle>();

  for (const article of batches.flat()) {
    if (!byUrl.has(article.url)) {
      byUrl.set(article.url, article);
    }
  }

  return [...byUrl.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}
