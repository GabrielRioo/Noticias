import { NEWS_TOPICS, type NewsTopic } from '../src/types/news.js';

export function parseTopic(body: unknown): NewsTopic | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return undefined;
  }

  const raw = (body as { topic?: unknown }).topic;
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }

  if (typeof raw !== 'string' || !(NEWS_TOPICS as readonly string[]).includes(raw)) {
    throw new Error('topic inválido');
  }

  return raw as NewsTopic;
}
