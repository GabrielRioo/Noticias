import {
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_QUERY_MIN_LENGTH,
  type SearchHit,
} from '../src/types/news.ts';
import { collectSearchArticles } from './rss.ts';

export function normalizeSearchQuery(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new Error('Consulta inválida');
  }

  const query = raw.trim().replace(/\s+/g, ' ');
  if (query.length < SEARCH_QUERY_MIN_LENGTH || query.length > SEARCH_QUERY_MAX_LENGTH) {
    throw new Error('Consulta inválida');
  }
  if (/[\u0000-\u001f]/.test(query) || !/[\p{L}\p{N}]/u.test(query)) {
    throw new Error('Consulta inválida');
  }

  return query;
}

export async function searchNews(query: string): Promise<{ query: string; items: SearchHit[] }> {
  const items = await collectSearchArticles(query);
  return { query, items };
}
