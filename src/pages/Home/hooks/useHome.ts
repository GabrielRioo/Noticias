import { useCallback, useEffect, useRef, useState } from 'react';
import { listNews, refreshNews, searchNews } from '../../../services/newsService';
import {
  NEWS_TOPICS,
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_QUERY_MIN_LENGTH,
  type NewsItem,
  type SearchHit,
} from '../../../types/news';
import {
  hydrateReadHistory,
  loadReadHistory,
  rememberReadItem,
  type ReadHistory,
} from '../readHistory';

const READ_KEY = 'briefing-read-ids';

type Status = 'loading' | 'error' | 'empty' | 'success';

export type SearchStatus = 'idle' | 'loading' | 'error' | 'empty' | 'success';

function readSearchParam(): string {
  const query = new URLSearchParams(window.location.search).get('q')?.trim().replace(/\s+/g, ' ') ?? '';
  if (query.length < SEARCH_QUERY_MIN_LENGTH || query.length > SEARCH_QUERY_MAX_LENGTH) {
    return '';
  }
  return query;
}

function writeSearchParam(query: string): void {
  const url = new URL(window.location.href);
  const current = url.searchParams.get('q');
  if (query) {
    url.searchParams.set('q', query);
  } else {
    url.searchParams.delete('q');
  }
  if ((current ?? '') === query) {
    window.history.replaceState({}, '', url);
    return;
  }
  window.history.pushState({}, '', url);
}

function readStoredIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function useHome() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(readStoredIds);
  const [readHistory, setReadHistory] = useState<ReadHistory>(loadReadHistory);
  const [searchQuery, setSearchQuery] = useState(readSearchParam);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>(readSearchParam() ? 'loading' : 'idle');
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRequest = useRef(0);

  const applyPayload = useCallback((payload: { items: NewsItem[]; updatedAt: string | null }) => {
    setItems(payload.items);
    setUpdatedAt(payload.updatedAt);
    setStatus(payload.items.length === 0 ? 'empty' : 'success');
    setReadHistory((current) => hydrateReadHistory(payload.items, readStoredIds(), current));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWithRetry(): Promise<void> {
      setStatus('loading');
      setError(null);
      let lastError: unknown;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          const payload = await listNews();
          if (!cancelled) {
            applyPayload(payload);
          }
          return;
        } catch (caught) {
          lastError = caught;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
      if (!cancelled) {
        setError(lastError instanceof Error ? lastError.message : 'Falha ao carregar');
        setStatus('error');
      }
    }

    void loadWithRetry();
    return () => {
      cancelled = true;
    };
  }, [applyPayload]);

  const runSearch = useCallback(async (raw: string, updateHistory: boolean) => {
    const query = raw.trim().replace(/\s+/g, ' ');
    if (query.length < SEARCH_QUERY_MIN_LENGTH || query.length > SEARCH_QUERY_MAX_LENGTH) {
      return;
    }

    const requestId = searchRequest.current + 1;
    searchRequest.current = requestId;
    setSearchQuery(query);
    setSearchStatus('loading');
    setSearchError(null);
    setHits([]);
    if (updateHistory) {
      writeSearchParam(query);
    }

    try {
      const payload = await searchNews(query);
      if (searchRequest.current !== requestId) {
        return;
      }
      setHits(payload.items);
      setSearchStatus(payload.items.length === 0 ? 'empty' : 'success');
    } catch (caught) {
      if (searchRequest.current !== requestId) {
        return;
      }
      setSearchError(caught instanceof Error ? caught.message : 'Falha ao buscar');
      setSearchStatus('error');
    }
  }, []);

  useEffect(() => {
    const initialQuery = readSearchParam();
    if (initialQuery) {
      void runSearch(initialQuery, false);
    }

    function onPopState(): void {
      const query = readSearchParam();
      if (!query) {
        searchRequest.current += 1;
        setSearchQuery('');
        setHits([]);
        setSearchError(null);
        setSearchStatus('idle');
        return;
      }
      void runSearch(query, false);
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [runSearch]);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      applyPayload(await listNews());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao carregar');
      setStatus('error');
    }
  }, [applyPayload]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      applyPayload(await refreshNews([...readIds].slice(-200)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao atualizar');
      setStatus((current) => (items.length === 0 ? 'error' : current));
    } finally {
      setRefreshing(false);
    }
  }, [applyPayload, items.length, readIds]);

  const clearSearch = useCallback(() => {
    searchRequest.current += 1;
    setSearchQuery('');
    setHits([]);
    setSearchError(null);
    setSearchStatus('idle');
    writeSearchParam('');
  }, []);

  const markRead = useCallback((item: NewsItem) => {
    setReadIds((current) => {
      const next = new Set(current);
      next.add(item.id);
      localStorage.setItem(READ_KEY, JSON.stringify([...next].slice(-200)));
      return next;
    });
    setReadHistory((current) => rememberReadItem(item, current));
  }, []);

  return {
    topics: NEWS_TOPICS,
    items,
    updatedAt,
    status,
    error,
    refreshing,
    readIds,
    readHistory,
    load,
    refresh,
    markRead,
    searchQuery,
    hits,
    searchStatus,
    searchError,
    search: (query: string) => runSearch(query, true),
    clearSearch,
  };
}
