import { listBriefing } from '../../server/briefing.js';
import { loadEnvFile } from '../../server/env.js';

loadEnvFile();

type ApiRequest = {
  method?: string;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

export default function handler(request: ApiRequest, response: ApiResponse): void {
  if (request.method !== 'GET') {
    response.status(404).json({ error: 'Rota não encontrada' });
    return;
  }

  response.status(200).json(listBriefing());
}
