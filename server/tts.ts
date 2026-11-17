import { getGeminiTtsConfig } from './env.js';
import { enqueueGemini } from './geminiQueue.js';
import { GeminiUnavailableError } from './summarize.js';

export const SPEECH_TEXT_MAX_LENGTH = 6_000;

export function normalizeSpeechText(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Texto inválido');
  }
  const text = value.trim();
  if (text.length < 1) {
    throw new Error('Texto inválido');
  }
  if (text.length > SPEECH_TEXT_MAX_LENGTH) {
    throw new Error('Texto longo demais');
  }
  return text;
}

export function parseSpeakBody(body: unknown): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('JSON inválido');
  }
  const record = body as Record<string, unknown>;
  const allowed = new Set(['text']);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new Error('JSON inválido');
    }
  }
  return normalizeSpeechText(record.text);
}

function pcmToWav(
  pcm: Buffer,
  sampleRate = 24_000,
  channels = 1,
  bitDepth = 16,
): Buffer {
  const header = Buffer.alloc(44);
  const dataSize = pcm.length;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
  header.writeUInt16LE(channels * (bitDepth / 8), 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

function parseSampleRate(mimeType: string | undefined): number {
  const match = mimeType?.match(/rate=(\d+)/i);
  if (!match) {
    return 24_000;
  }
  const rate = Number(match[1]);
  return Number.isFinite(rate) && rate > 0 ? rate : 24_000;
}

async function callGeminiTts(text: string): Promise<Buffer> {
  const { apiKey, model, voice } = getGeminiTtsConfig();
  if (!apiKey) {
    throw new GeminiUnavailableError('GEMINI_API_KEY ausente no arquivo .env');
  }

  const prompt = [
    'Leia o briefing a seguir em português do Brasil,',
    'com tom de âncora de telejornal: calmo, claro e natural.',
    'Recite apenas o conteúdo, sem prefácio.',
    '',
    text,
  ].join('\n');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (
      response.status === 429 ||
      /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(body)
    ) {
      throw new GeminiUnavailableError(
        `Cota do Gemini esgotada (${response.status})`,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new GeminiUnavailableError(
        `Gemini recusou a chave (${response.status})`,
      );
    }
    throw new Error(`Gemini TTS recusou a chamada (${response.status})`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string; mimeType?: string };
        }>;
      };
    }>;
  };

  const inline = payload.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  const data = inline?.data;
  if (!data) {
    throw new Error('Gemini TTS não devolveu áudio');
  }

  const audio = Buffer.from(data, 'base64');
  const mime = inline.mimeType?.toLowerCase() ?? '';
  if (mime.includes('wav')) {
    return audio;
  }
  return pcmToWav(audio, parseSampleRate(inline.mimeType));
}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  return enqueueGemini(() => callGeminiTts(text));
}
