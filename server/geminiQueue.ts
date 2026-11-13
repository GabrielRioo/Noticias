/** Free-tier Gemini is ~15 RPM. Keep a safe gap between calls. */
const MIN_INTERVAL_MS = 4_500;
const RATE_LIMIT_RETRY_MS = 20_000;

let lastCallAt = 0;
let queue: Promise<void> = Promise.resolve();

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

/**
 * Serializes Gemini calls across the process and spaces them for the free RPM cap.
 */
export function enqueueGemini<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    await waitForSlot();
    try {
      return await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('(429)')) {
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
