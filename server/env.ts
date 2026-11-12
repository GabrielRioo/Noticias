import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadEnvFile(): void {
  const filePath = resolve(process.cwd(), '.env');
  if (!existsSync(filePath)) {
    return;
  }

  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator < 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function getGeminiConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? '';
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';
  return { apiKey, model };
}
