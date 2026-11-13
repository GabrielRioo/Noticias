import type { NewsItem, SearchHit } from '../types/news';

export type NewsListResponse = {
  items: NewsItem[];
  updatedAt: string | null;
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? 'Não foi possível falar com o servidor local');
  }
  return (await response.json()) as T;
}

export async function listNews(): Promise<NewsListResponse> {
  const response = await fetch('/api/news');
  return parseJson<NewsListResponse>(response);
}

export type SearchResponse = {
  query: string;
  items: SearchHit[];
};

export async function searchNews(query: string): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/news/search?${params.toString()}`);
  return parseJson<SearchResponse>(response);
}

export async function refreshNews(
  readIds: readonly string[],
  items: readonly NewsItem[] = [],
): Promise<NewsListResponse> {
  const response = await fetch('/api/news/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ readIds, items }),
  });
  return parseJson<NewsListResponse>(response);
}
