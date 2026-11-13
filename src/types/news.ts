export const NEWS_TOPICS = [
  'politica',
  'conflitos',
  'economia',
  'tecnologia',
  'ciencia',
  'mundo',
  'btc',
  'fiis',
] as const;

export type NewsTopic = (typeof NEWS_TOPICS)[number];

export type NewsSource = {
  outlet: string;
  url: string;
};

export type GlossaryTerm = {
  term: string;
  explanation: string;
};

export const SEARCH_QUERY_MIN_LENGTH = 2;
export const SEARCH_QUERY_MAX_LENGTH = 80;

export type SearchHit = {
  id: string;
  title: string;
  outlet: string;
  url: string;
  publishedAt: string;
};

export type NewsItem = {
  id: string;
  title: string;
  briefing?: string;
  bullets: string[];
  whyItMatters: string;
  topic: NewsTopic;
  importance: number;
  publishedAt: string;
  sources: NewsSource[];
  numbersUnverified: boolean;
  terms?: GlossaryTerm[];
  ongoing?: boolean;
};
