import http from 'node:http';
import https from 'node:https';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';
import Parser from 'rss-parser';
import type { NewsTopic, SearchHit } from '../src/types/news.js';
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
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 15_000;

function decompressBody(buf: Buffer, contentEncoding?: string): Buffer {
  const encoding = (contentEncoding ?? '').toLowerCase();
  const looksGzip = buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;

  if (encoding.includes('gzip') || looksGzip) {
    return gunzipSync(buf);
  }
  if (encoding.includes('br')) {
    return brotliDecompressSync(buf);
  }
  if (encoding.includes('deflate')) {
    try {
      return inflateSync(buf);
    } catch {
      return buf;
    }
  }
  return buf;
}

function resolveNodeEncoding(label: string): BufferEncoding {
  const normalized = label.trim().toLowerCase().replace(/['"]/g, '');
  if (normalized === 'utf-8' || normalized === 'utf8') {
    return 'utf8';
  }
  if (
    normalized === 'iso-8859-1' ||
    normalized === 'latin1' ||
    normalized === 'windows-1252' ||
    normalized === 'cp1252'
  ) {
    return 'latin1';
  }
  if (normalized === 'utf-16le' || normalized === 'utf16le') {
    return 'utf16le';
  }
  return 'utf8';
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/** Prefer decodes with real Portuguese accents and almost no U+FFFD. */
function scoreDecodedXml(text: string): number {
  const fffd = countMatches(text, /\uFFFD/g);
  const accents = countMatches(
    text,
    /[áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ]/g,
  );
  const mojibake = countMatches(text, /Ã.|Â.|â€|ðŸ/g);
  return accents * 4 - fffd * 80 - mojibake * 8;
}

function uniqueEncodings(values: BufferEncoding[]): BufferEncoding[] {
  const seen = new Set<BufferEncoding>();
  const unique: BufferEncoding[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    unique.push(value);
  }
  return unique;
}

/**
 * Folha and others often declare ISO-8859-1 in XML while a proxy lies with
 * Content-Type charset=utf-8. Trust the XML declaration first, then pick the
 * decode with the best accent/FFFD score.
 */
function decodeXmlBuffer(buf: Buffer, contentType?: string): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString('utf8');
  }

  const head = buf.subarray(0, 256).toString('latin1');
  const xmlMatch = head.match(/encoding\s*=\s*["']?\s*([a-z0-9\-]+)/i);
  const charsetMatch = (contentType ?? '').match(/charset\s*=\s*([^\s;]+)/i);

  const candidates = uniqueEncodings([
    ...(xmlMatch?.[1] ? [resolveNodeEncoding(xmlMatch[1])] : []),
    ...(charsetMatch?.[1] ? [resolveNodeEncoding(charsetMatch[1])] : []),
    'utf8',
    'latin1',
  ]);

  let bestText = buf.toString(candidates[0] ?? 'utf8');
  let bestScore = scoreDecodedXml(bestText);

  for (const encoding of candidates.slice(1)) {
    const text = buf.toString(encoding);
    const score = scoreDecodedXml(text);
    if (score > bestScore) {
      bestText = text;
      bestScore = score;
    }
  }

  return bestText;
}

function fetchFeedXml(feedUrl: string, redirectCount = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = feedUrl.startsWith('https') ? https : http;
    const req = client.get(
      feedUrl,
      {
        headers: {
          'User-Agent': 'BriefingPessoal/1.0 (leitor RSS local)',
          Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          if (redirectCount >= MAX_REDIRECTS) {
            reject(new Error(`Too many redirects for ${feedUrl}`));
            return;
          }
          const next = new URL(res.headers.location, feedUrl).toString();
          resolve(fetchFeedXml(next, redirectCount + 1));
          return;
        }

        if (!res.statusCode || res.statusCode >= 400) {
          res.resume();
          reject(new Error(`Feed HTTP ${res.statusCode ?? 0} for ${feedUrl}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        res.on('end', () => {
          try {
            const raw = Buffer.concat(chunks);
            const body = decompressBody(raw, res.headers['content-encoding']);
            resolve(decodeXmlBuffer(body, res.headers['content-type']));
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    req.setTimeout(FETCH_TIMEOUT_MS, () => {
      req.destroy(new Error(`Feed timed out after ${FETCH_TIMEOUT_MS}ms`));
    });
    req.on('error', reject);
  });
}

async function parseFeedUrl(url: string) {
  const xml = await fetchFeedXml(url);
  return parser.parseString(xml);
}

async function fetchFeed(feed: FeedConfig): Promise<RawArticle[]> {
  let lastError: unknown;

  for (const url of feed.urls) {
    try {
      const parsed = await parseFeedUrl(url);
      return (parsed.items ?? [])
        .map((item) => {
          const title = cleanArticleText(item.title ?? '');
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
          if (!item.title || !item.url || item.text.length < minLength) {
            return false;
          }
          // Never publish mojibake / replacement-character garbage.
          return !/\uFFFD/.test(`${item.title} ${item.text}`);
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
    parsed = await parseFeedUrl(googleNewsSearchUrl(query));
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
    const rawTitle = cleanArticleText(item.title ?? '');
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

function feedsForTopic(topic?: NewsTopic): FeedConfig[] {
  if (!topic) {
    return FEEDS;
  }

  return FEEDS.filter((feed) => {
    if (feed.topic === topic) {
      return true;
    }
    // Conflitos also borrows from mundo feeds.
    return topic === 'conflitos' && feed.topic === 'mundo';
  });
}

export async function collectArticles(topic?: NewsTopic): Promise<RawArticle[]> {
  const batches = await Promise.all(feedsForTopic(topic).map((feed) => fetchFeed(feed)));
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
