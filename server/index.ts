import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { listBriefing, refreshBriefing } from './briefing.ts';
import { loadEnvFile } from './env.ts';
import { parseReadIds } from './readIds.ts';
import { normalizeSearchQuery, searchNews } from './search.ts';

loadEnvFile();

const HOST = '127.0.0.1';
const PORT = 8787;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

const MAX_BODY_BYTES = 32_768;

function readUrl(request: IncomingMessage): URL {
  return new URL(request.url ?? '/', `http://${HOST}:${PORT}`);
}

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Corpo grande demais'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown);
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    request.on('error', reject);
  });
}

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = readUrl(request);

  if (request.method === 'GET' && url.pathname === '/api/news') {
    sendJson(response, 200, listBriefing());
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/news/search') {
    try {
      const query = normalizeSearchQuery(url.searchParams.get('q'));
      sendJson(response, 200, await searchNews(query));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível buscar notícias agora.';
      const invalidQuery = message === 'Consulta inválida';
      sendJson(response, invalidQuery ? 400 : 500, {
        error: invalidQuery ? 'Escreva um assunto com pelo menos 2 caracteres.' : message,
      });
    }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/news/refresh') {
    try {
      const readIds = parseReadIds(await readJsonBody(request));
      const payload = await refreshBriefing(readIds);
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar o briefing';
      const invalidBody =
        message === 'readIds inválido' || message === 'JSON inválido' || message === 'Corpo grande demais';
      sendJson(response, invalidBody ? 400 : 500, { error: message });
    }
    return;
  }

  sendJson(response, 404, { error: 'Rota não encontrada' });
}

createServer((request, response) => {
  void handle(request, response).catch(() => {
    sendJson(response, 500, { error: 'Erro interno' });
  });
}).listen(PORT, HOST, () => {
  console.log(`API local em http://${HOST}:${PORT}`);
});
