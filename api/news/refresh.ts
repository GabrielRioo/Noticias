import { refreshBriefing } from '../../server/briefing.js';
import { loadEnvFile } from '../../server/env.js';
import { parseReadIds } from '../../server/readIds.js';

loadEnvFile();

const MAX_BODY_BYTES = 32_768;

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

function readBody(body: unknown): unknown {
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      throw new Error('Corpo grande demais');
    }
    if (!body) {
      return {};
    }
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new Error('JSON inválido');
    }
  }

  const serialized = JSON.stringify(body ?? {});
  if (Buffer.byteLength(serialized) > MAX_BODY_BYTES) {
    throw new Error('Corpo grande demais');
  }
  return body ?? {};
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== 'POST') {
    response.status(404).json({ error: 'Rota não encontrada' });
    return;
  }

  try {
    const readIds = parseReadIds(readBody(request.body));
    response.status(200).json(await refreshBriefing(readIds));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao atualizar o briefing';
    const invalidBody =
      message === 'readIds inválido' || message === 'JSON inválido' || message === 'Corpo grande demais';
    response.status(invalidBody ? 400 : 500).json({ error: message });
  }
}
