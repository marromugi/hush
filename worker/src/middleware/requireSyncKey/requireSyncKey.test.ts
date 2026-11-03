import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import type { Env } from "@/lib/factory";

import { requireSyncKey } from "./requireSyncKey";

/** The hash of "test-sync-key". */
const HASH = "053cbf2d9ded388bf3a57919d2679938f2d9e3fb1721f96e209db0c8522b0fde";

const app = new Hono<Env>().use(requireSyncKey).get("/", (c) => c.text("through"));

async function send(
  key: string | null,
  env: { SYNC_KEY_HASH?: string } = { SYNC_KEY_HASH: HASH },
): Promise<Response> {
  const headers: Record<string, string> = key === null ? {} : { Authorization: `Bearer ${key}` };
  const request = new Request("https://sync.example/", { headers });
  return app.request(request, undefined, env);
}

describe("the sync key", () => {
  it("lets the request through when it matches", async () => {
    const response = await send("test-sync-key");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("through");
  });

  it("is required", async () => {
    expect((await send(null)).status).toBe(401);
  });

  it("must match the configured hash", async () => {
    expect((await send("another-key")).status).toBe(401);
  });
});

describe("a Worker without SYNC_KEY_HASH", () => {
  it("refuses every request, even one with a key", async () => {
    for (const env of [{}, { SYNC_KEY_HASH: "not-a-hash" }]) {
      expect((await send("test-sync-key", env)).status).toBe(500);
    }
  });
});
