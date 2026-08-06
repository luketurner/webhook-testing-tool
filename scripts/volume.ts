/**
 * Volume test script.
 *
 * Sends many sample requests to the webhook server, each with a unique URL
 * (/request1, /request2, ...), to populate the database for testing the
 * dashboard under load.
 *
 * Usage:
 *   bun run scripts/volume.ts [count] [baseUrl]
 *
 * Examples:
 *   bun run scripts/volume.ts                 # 2000 requests -> http://localhost:3000
 *   bun run scripts/volume.ts 500             # 500 requests
 *   bun run scripts/volume.ts 2000 http://localhost:3000
 *
 * Environment overrides (args take precedence):
 *   WTT_VOLUME_COUNT        default 2000
 *   WTT_VOLUME_BASE_URL     default http://localhost:3000
 *   WTT_VOLUME_CONCURRENCY  default 50
 */

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

interface VolumeOptions {
  count: number;
  baseUrl: string;
  concurrency: number;
}

function parseOptions(argv: string[]): VolumeOptions {
  const count = Number(argv[0] ?? process.env.WTT_VOLUME_COUNT ?? 2000);
  const baseUrl = (
    argv[1] ??
    process.env.WTT_VOLUME_BASE_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
  const concurrency = Number(process.env.WTT_VOLUME_CONCURRENCY ?? 50);

  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(`Invalid count: ${argv[0]} (expected a positive integer)`);
  }
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new Error(`Invalid concurrency: ${concurrency}`);
  }

  return { count, baseUrl, concurrency };
}

async function sendRequest(baseUrl: string, index: number): Promise<boolean> {
  const method = METHODS[index % METHODS.length];
  const url = `${baseUrl}/request${index}?n=${index}`;
  const hasBody = method !== "GET" && method !== "DELETE";

  try {
    const response = await fetch(url, {
      method,
      headers: hasBody
        ? {
            "Content-Type": "application/json",
            "X-Volume-Index": String(index),
          }
        : { "X-Volume-Index": String(index) },
      body: hasBody
        ? JSON.stringify({ index, message: `sample request ${index}` })
        : undefined,
    });
    // Drain the body so the connection can be reused.
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Runs `count` requests with at most `concurrency` in flight at once, using a
 * shared cursor so workers pull the next index as they finish.
 */
async function sendVolume(options: VolumeOptions): Promise<void> {
  const { count, baseUrl, concurrency } = options;
  console.log(
    `Sending ${count} requests to ${baseUrl}/request1..${count} (concurrency ${concurrency})`,
  );

  const start = Date.now();
  let next = 1;
  let succeeded = 0;
  let failed = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = next++;
      if (index > count) return;

      const ok = await sendRequest(baseUrl, index);
      if (ok) {
        succeeded++;
      } else {
        failed++;
      }

      const done = succeeded + failed;
      if (done % 100 === 0 || done === count) {
        console.log(`  ${done}/${count} sent (${failed} failed)`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, count) }, () =>
    worker(),
  );
  await Promise.all(workers);

  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Done: ${succeeded} succeeded, ${failed} failed in ${seconds}s`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  const options = parseOptions(process.argv.slice(2));
  await sendVolume(options);
}
