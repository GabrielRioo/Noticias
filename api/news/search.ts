import { loadEnvFile } from '../../server/env.ts';
import { normalizeSearchQuery, searchNews } from '../../server/search.ts';

loadEnvFile();

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

function queryValue(request: ApiRequest): string | null {
  const value = request.query?.q;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== 'GET') {
    response.status(404).json({ error: 'Rota não encontrada' });
    return;
  }

  try {
    const query = normalizeSearchQuery(queryValue(request));
    response.status(200).json(await searchNews(query));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível buscar notícias agora.';
    const invalidQuery = message === 'Consulta inválida';
    response.status(invalidQuery ? 400 : 500).json({
      error: invalidQuery ? 'Escreva um assunto com pelo menos 2 caracteres.' : message,
    });
  }
}
