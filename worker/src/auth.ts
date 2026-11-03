import { createMiddleware } from "hono/factory";

const SHA256_HEX = /^[0-9a-f]{64}$/;

export type AuthResult = "allowed" | "denied" | "misconfigured";

/**
 * Checks the request's `Authorization: Bearer <sync key>` against
 * `keyHash`, the hex SHA-256 of the sync key. Only the hash lives on the
 * server, so a leaked configuration does not hand out the key.
 */
export async function authorize(
  request: Request,
  keyHash: string | undefined,
): Promise<AuthResult> {
  if (keyHash === undefined || !SHA256_HEX.test(keyHash)) return "misconfigured";

  const header = request.headers.get("Authorization");
  if (header === null || !header.startsWith("Bearer ")) return "denied";
  const key = header.slice("Bearer ".length);
  if (key === "") return "denied";

  const presented = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)),
  );
  return crypto.subtle.timingSafeEqual(presented, hexToBytes(keyHash)) ? "allowed" : "denied";
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Lets a request through only with the sync key. */
export const requireSyncKey = createMiddleware<{ Bindings: Cloudflare.Env }>(async (c, next) => {
  switch (await authorize(c.req.raw, c.env.SYNC_KEY_HASH)) {
    case "misconfigured":
      return c.json({ error: "SYNC_KEY_HASH is not set to a hex SHA-256 of the sync key." }, 500);
    case "denied":
      return c.json({ error: "Send the sync key as Authorization: Bearer <key>." }, 401);
    case "allowed":
      return next();
  }
});
