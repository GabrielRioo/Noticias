/** Free-tier Gemini is ~15 RPM per model. Keep a safe gap between calls. */
const MIN_INTERVAL_MS = 4_500;
const RATE_LIMIT_RETRY_MS = 20_000;
const MODEL_COOLDOWN_MS = 60_000;

let lastCallAt = 0;
let queue: Promise<void> = Promise.resolve();
const modelCooldownUntil = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSlot(): Promise<void> {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastCallAt);
  if (wait > 0) {
    await sleep(wait);
  }
  lastCallAt = Date.now();
}

export function markGeminiModelRateLimited(model: string): void {
  modelCooldownUntil.set(model, Date.now() + MODEL_COOLDOWN_MS);
}

export function isGeminiModelRateLimited(model: string): boolean {
  const until = modelCooldownUntil.get(model);
  if (!until) {
    return false;
  }
  if (Date.now() >= until) {
    modelCooldownUntil.delete(model);
    return false;
  }
  return true;
}

/**
 * Serializes Gemini calls across the process and spaces them for the free RPM cap.
 * Retries once after a short pause when every model in the chain hits 429.
 */
export function enqueueGemini<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    await waitForSlot();
    try {
      return await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('(429)') || /cota do gemini esgotada/i.test(message)) {
        await sleep(RATE_LIMIT_RETRY_MS);
        await waitForSlot();
        return task();
      }
      throw error;
    }
  });

  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
