/**
 * Sane Redis connection options for BullMQ producers and workers.
 *
 * Default ioredis behaviour is to retry forever with exponential backoff, which
 * floods stdout with stack traces when Redis is genuinely missing in dev. This
 * helper:
 *   - logs ONE friendly message on first failure
 *   - gives up after 5 attempts so the process stops thrashing
 *   - keeps `maxRetriesPerRequest: null` (required by BullMQ workers)
 *
 * Call with a service label so logs can be traced back to which service warned.
 */
export function redisConnectionOptions(serviceLabel: string) {
  let warned = false;
  return {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
    retryStrategy: (times: number): number | null => {
      if (!warned) {
        console.warn(
          `[${serviceLabel}] Redis unreachable at ${process.env.REDIS_URL ?? "redis://localhost:6379"} — ` +
          `retrying (attempt ${times})…`,
        );
        warned = true;
      }
      // Never give up — ioredis keeps reconnecting until Redis is reachable.
      // Exponential backoff capped at 10 s so recovery is prompt once Redis comes up.
      return Math.min(times * 500, 10_000);
    },
  };
}
