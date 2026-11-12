const MAX_READ_IDS = 200;
const MAX_READ_ID_LENGTH = 500;

export function parseReadIds(body: unknown): string[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return [];
  }

  const readIds = (body as { readIds?: unknown }).readIds;
  if (readIds === undefined) {
    return [];
  }
  if (!Array.isArray(readIds) || readIds.length > MAX_READ_IDS) {
    throw new Error('readIds inválido');
  }

  return readIds.map((id) => {
    if (typeof id !== 'string' || id.length === 0 || id.length > MAX_READ_ID_LENGTH) {
      throw new Error('readIds inválido');
    }
    return id;
  });
}
