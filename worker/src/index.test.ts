import { reset } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";

import { KEY, put, read, send } from "@/test/request";

import app from "./index";

const ENTRY = "/entries/2026-11-03";
const IMAGE = "/images/0123456789abcdef0123456789abcdef";

afterEach(() => reset());

describe("every route", () => {
  it("needs the sync key", async () => {
    const write = await send(
      ENTRY,
      { method: "PUT", body: "x", headers: { "If-None-Match": "*" } },
      "another-key",
    );
    expect(write.status).toBe(401);
    expect((await send(ENTRY)).status).toBe(404);
    expect((await send("/openapi.json", {}, null)).status).toBe(401);
  });

  it("accepts every kind of file a vault is made of", async () => {
    for (const path of ["/vault", ENTRY, IMAGE]) {
      expect((await put(path, path, { "If-None-Match": "*" })).status).toBe(204);
      expect(await read(path)).toBe(path);
    }
  });

  it("refuses names a vault's files do not have", async () => {
    for (const path of ["/entries/2026-13-01", "/entries/2026-1-3", "/images/XYZ"]) {
      expect((await put(path, "x", { "If-None-Match": "*" })).status).toBe(400);
      expect((await send(path)).status).toBe(400);
    }
    expect((await env.FILES.list()).objects).toHaveLength(0);
  });
});

/** Sends to the Worker with a WRITE_LIMIT that allows `allowed` writes in all. */
function limitedSender(allowed: number) {
  let used = 0;
  const limits = { ...env, WRITE_LIMIT: { limit: async () => ({ success: ++used <= allowed }) } };
  return (path: string, init: RequestInit = {}, key: string | null = KEY) => {
    const headers = new Headers(init.headers);
    if (key !== null) headers.set("Authorization", `Bearer ${key}`);
    return app.request(path, { ...init, headers }, limits);
  };
}

describe("the write limit", () => {
  it("is not used up by writes without the key", async () => {
    const sendLimited = limitedSender(1);
    const write = { method: "PUT", body: "x", headers: { "If-None-Match": "*" } };

    expect((await sendLimited(ENTRY, write, null)).status).toBe(401);
    expect((await sendLimited(ENTRY, write)).status).toBe(204);
    expect((await sendLimited(IMAGE, write)).status).toBe(429);
  });

  it("does not hold back reads", async () => {
    const sendLimited = limitedSender(0);

    expect((await sendLimited("/files")).status).toBe(200);
    expect((await sendLimited(ENTRY)).status).toBe(404);
  });
});
