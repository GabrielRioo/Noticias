const MAX_READ_IDS = 200;
/** News item ids are source URLs (Google News links can be very long). */
const MAX_READ_ID_LENGTH = 4_000;

export function parseReadIds(body: unknown): string[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return [];
  }

  const readIds = (body as { readIds?: unknown }).readIds;
  if (readIds === undefined) {
    return [];
  }
  if (!Array.isArray(readIds)) {
    throw new Error('readIds inválido');
  }

  const cleaned: string[] = [];
  for (const id of readIds.slice(-MAX_READ_IDS)) {
    if (typeof id !== 'string') {
      continue;
    }
    const trimmed = id.trim();
    if (!trimmed || trimmed.length > MAX_READ_ID_LENGTH) {
      continue;
    }
    cleaned.push(trimmed);
  }
  return cleaned;
}
