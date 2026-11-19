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

/** Primary + fallbacks. Free-tier RPM/RPD are per model, so another model can still work. */
const DEFAULT_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

function uniqueModels(models: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const model of models) {
    const trimmed = model.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique;
}

export function getGeminiConfig(): { apiKey: string; models: string[] } {
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? '';
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODELS[0];
  const explicitFallbacks = (process.env.GEMINI_MODEL_FALLBACKS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const fallbacks =
    explicitFallbacks.length > 0
      ? explicitFallbacks
      : DEFAULT_GEMINI_MODELS.filter((model) => model !== primary);

  return {
    apiKey,
    models: uniqueModels([primary, ...fallbacks]),
  };
}

export function getGeminiTtsConfig(): {
  apiKey: string;
  model: string;
  voice: string;
} {
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? '';
  const model =
    process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-2.5-flash-preview-tts';
  const voice = process.env.GEMINI_TTS_VOICE?.trim() || 'Charon';
  return { apiKey, model, voice };
}
