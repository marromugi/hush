import { factory } from "@/lib/factory";

/** Every write counts against one limit: the vault has one owner. */
const KEY = "writes";

/** Refuses a write once WRITE_LIMIT's count for the minute is used up. */
export const limitWrites = factory.createMiddleware(async (c, next) => {
  const { success } = await c.env.WRITE_LIMIT.limit({ key: KEY });
  if (success) return next();
  return c.json({ error: "Too many writes. Try again in a minute." }, 429, {
    "Retry-After": "60",
  });
});
