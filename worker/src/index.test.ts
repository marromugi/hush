import { reset } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";

import app from "./index";

const KEY = "test-sync-key";
const ENTRY = "/entries/2026-11-03";
const IMAGE = "/images/0123456789abcdef0123456789abcdef";

afterEach(() => reset());

function send(path: string, init: RequestInit = {}, key: string | null = KEY): Promise<Response> {
  const headers = new Headers(init.headers);
  if (key !== null) headers.set("Authorization", `Bearer ${key}`);
  return exports.default.fetch(`https://sync.example${path}`, { ...init, headers });
}

function put(path: string, body: string, condition: Record<string, string>): Promise<Response> {
  return send(path, { method: "PUT", body, headers: condition });
}

async function create(path: string, body: string): Promise<string> {
  const response = await put(path, body, { "If-None-Match": "*" });
  expect(response.status).toBe(204);
  const version = response.headers.get("ETag");
  expect(version).not.toBeNull();
  return version ?? "";
}

async function read(path: string): Promise<string> {
  return (await send(path)).text();
}

describe("the sync key", () => {
  it("is required", async () => {
    expect((await send("/files", {}, null)).status).toBe(401);
  });

  it("must match the configured hash", async () => {
    expect((await send("/files", {}, "another-key")).status).toBe(401);
  });

  it("guards writes and the API description too", async () => {
    const write = await send(
      ENTRY,
      { method: "PUT", body: "x", headers: { "If-None-Match": "*" } },
      "another-key",
    );
    expect(write.status).toBe(401);
    expect((await send(ENTRY)).status).toBe(404);
    expect((await send("/openapi.json", {}, null)).status).toBe(401);
  });
});

describe("a Worker without SYNC_KEY_HASH", () => {
  it("refuses every request, even one with a key", async () => {
    for (const hash of [undefined, "not-a-hash"]) {
      const request = new Request("https://sync.example/files", {
        headers: { Authorization: `Bearer ${KEY}` },
      });
      const response = await app.fetch(request, { ...env, SYNC_KEY_HASH: hash });
      expect(response.status).toBe(500);
    }
  });
});

describe("reading and writing a file", () => {
  it("returns what was written, with the version the write gave", async () => {
    const version = await create(ENTRY, "first");

    const response = await send(ENTRY);
    expect(response.status).toBe(200);
    expect(response.headers.get("ETag")).toBe(version);
    expect(await response.text()).toBe("first");
  });

  it("replaces a file when the version read is still the newest", async () => {
    const first = await create(ENTRY, "first");

    expect((await put(ENTRY, "second", { "If-Match": first })).status).toBe(204);
    expect(await read(ENTRY)).toBe("second");
  });

  it("refuses a replace made against an older version", async () => {
    const first = await create(ENTRY, "first");
    expect((await put(ENTRY, "from the Mac", { "If-Match": first })).status).toBe(204);

    expect((await put(ENTRY, "from the iPhone", { "If-Match": first })).status).toBe(412);
    expect(await read(ENTRY)).toBe("from the Mac");
  });

  it("refuses to create a file that exists", async () => {
    await create(ENTRY, "first");

    expect((await put(ENTRY, "again", { "If-None-Match": "*" })).status).toBe(412);
    expect(await read(ENTRY)).toBe("first");
  });

  it("refuses a write that states no condition, or both", async () => {
    const first = await create(ENTRY, "first");

    expect((await put(ENTRY, "over", {})).status).toBe(428);
    const both = { "If-Match": first, "If-None-Match": "*" };
    expect((await put(ENTRY, "over", both)).status).toBe(428);
    expect(await read(ENTRY)).toBe("first");
  });

  it("refuses a replace that does not name one version", async () => {
    const first = await create(ENTRY, "first");

    for (const ifMatch of ["*", first.slice(1, -1), `${first}, "other"`]) {
      expect((await put(ENTRY, "over", { "If-Match": ifMatch })).status).toBe(428);
    }
    expect(await read(ENTRY)).toBe("first");
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

  it("refuses an empty file", async () => {
    expect((await put(ENTRY, "", { "If-None-Match": "*" })).status).toBe(400);
    expect((await env.FILES.list()).objects).toHaveLength(0);
  });
});

describe("the file list", () => {
  it("lists every file with its newest version", async () => {
    const vault = await create("/vault", "{}");
    const image = await create(IMAGE, "picture");
    const first = await create(ENTRY, "first");
    const entry = (await put(ENTRY, "second", { "If-Match": first })).headers.get("ETag");

    const list = await send("/files");
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual({
      vault,
      entries: [{ date: "2026-11-03", version: entry }],
      images: [{ id: "0123456789abcdef0123456789abcdef", version: image }],
    });
  });

  it("says there is no vault yet", async () => {
    expect(await (await send("/files")).json()).toEqual({ vault: null, entries: [], images: [] });
  });

  it("stops and names a file in the bucket that is not a vault file", async () => {
    for (const key of [
      "files/entries/2026/notes.enc",
      "files/entries/2025/2026-01-01.enc",
      "files/README.md",
    ]) {
      await env.FILES.put(key, "x");
      const response = await send("/files");
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: `${key} in the bucket is not a vault file.` });
      await env.FILES.delete(key);
    }
  });

  it("lists files beyond the first page", async () => {
    const ids = Array.from({ length: 1001 }, (_, i) => i.toString(16).padStart(32, "0"));
    for (const id of ids) await env.FILES.put(`files/images/${id}.enc`, "x");

    const { images } = await (await send("/files")).json<{ images: { id: string }[] }>();
    expect(images.map((image) => image.id)).toEqual(ids);
  });
});

describe("the API description", () => {
  it("names every route", async () => {
    const response = await send("/openapi.json");
    expect(response.status).toBe(200);
    const { paths } = await response.json<{ paths: Record<string, Record<string, unknown>> }>();
    expect(
      Object.fromEntries(Object.entries(paths).map(([path, ops]) => [path, Object.keys(ops)])),
    ).toEqual({
      "/files": ["get"],
      "/vault": ["get", "put"],
      "/entries/{date}": ["get", "put"],
      "/images/{id}": ["get", "put"],
    });
  });
});

describe("history", () => {
  it("keeps every version sent, including one that lost a conflict", async () => {
    const first = await create(ENTRY, "first");
    await put(ENTRY, "from the Mac", { "If-Match": first });
    await put(ENTRY, "from the iPhone", { "If-Match": first });

    const kept = await env.FILES.list({ prefix: "history/entries/2026/2026-11-03.enc/" });
    const bodies = await Promise.all(
      kept.objects.map(async (object) => (await env.FILES.get(object.key))?.text() ?? null),
    );
    expect(bodies).toHaveLength(3);
    expect(new Set(bodies)).toEqual(new Set(["first", "from the Mac", "from the iPhone"]));
  });

  it("keeps nothing from a write that was refused before reaching the bucket", async () => {
    const first = await create(ENTRY, "first");
    await put(ENTRY, "over", { "If-Match": "*" });
    await put(ENTRY, "over", { "If-Match": first.slice(1, -1) });

    const kept = await env.FILES.list({ prefix: "history/" });
    expect(kept.objects).toHaveLength(1);
  });
});
