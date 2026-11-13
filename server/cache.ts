import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { NewsItem } from '../src/types/news.js';

// Vercel can only write to /tmp, and that directory is not shared between instances.
const CACHE_PATH = process.env.VERCEL
  ? resolve('/tmp', 'news-cache.json')
  : resolve(process.cwd(), 'data', 'news-cache.json');

export type CacheFile = {
  updatedAt: string | null;
  items: NewsItem[];
  skippedIds: string[];
  withoutAi: boolean;
};

const emptyCache = (): CacheFile => ({
  updatedAt: null,
  items: [],
  skippedIds: [],
  withoutAi: false,
});

export function readCache(): CacheFile {
  if (!existsSync(CACHE_PATH)) {
    return emptyCache();
  }

  try {
    const parsed = JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as CacheFile;
    return {
      updatedAt: parsed.updatedAt ?? null,
      items: parsed.items ?? [],
      skippedIds: parsed.skippedIds ?? [],
      withoutAi: parsed.withoutAi === true,
    };
  } catch {
    return emptyCache();
  }
}

export function writeCache(cache: CacheFile): void {
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
}
