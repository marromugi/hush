import { reset } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";

const KEY = "test-sync-key";
const ENTRY = "entries/2026/2026-11-03.enc";

afterEach(() => reset());

function send(path: string, init: RequestInit = {}, key: string | null = KEY): Promise<Response> {
  const headers = new Headers(init.headers);
  if (key !== null) headers.set("Authorization", `Bearer ${key}`);
  return exports.default.fetch(`https://sync.example${path}`, { ...init, headers });
}

function put(path: string, body: string, condition: Record<string, string>): Promise<Response> {
  return send(`/files/${path}`, { method: "PUT", body, headers: condition });
}

async function create(path: string, body: string): Promise<string> {
  const response = await put(path, body, { "If-None-Match": "*" });
  expect(response.status).toBe(204);
  const version = response.headers.get("ETag");
  expect(version).not.toBeNull();
  return version ?? "";
}

describe("the sync key", () => {
  it("is required", async () => {
    expect((await send("/files", {}, null)).status).toBe(401);
  });

  it("must match the configured hash", async () => {
    expect((await send("/files", {}, "another-key")).status).toBe(401);
  });

  it("guards writes too", async () => {
    const response = await send(
      `/files/${ENTRY}`,
      { method: "PUT", body: "x", headers: { "If-None-Match": "*" } },
      "another-key",
    );
    expect(response.status).toBe(401);
    expect((await send(`/files/${ENTRY}`)).status).toBe(404);
  });
});

describe("reading and writing a file", () => {
  it("returns what was written, with the version the write gave", async () => {
    const version = await create(ENTRY, "first");

    const response = await send(`/files/${ENTRY}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("ETag")).toBe(version);
    expect(await response.text()).toBe("first");
  });

  it("replaces a file when the version read is still the newest", async () => {
    const first = await create(ENTRY, "first");

    const response = await put(ENTRY, "second", { "If-Match": first });
    expect(response.status).toBe(204);
    expect(await (await send(`/files/${ENTRY}`)).text()).toBe("second");
  });

  it("refuses a replace made against an older version", async () => {
    const first = await create(ENTRY, "first");
    expect((await put(ENTRY, "from the Mac", { "If-Match": first })).status).toBe(204);

    const response = await put(ENTRY, "from the iPhone", { "If-Match": first });
    expect(response.status).toBe(412);
    expect(await (await send(`/files/${ENTRY}`)).text()).toBe("from the Mac");
  });

  it("refuses to create a file that exists", async () => {
    await create(ENTRY, "first");

    expect((await put(ENTRY, "again", { "If-None-Match": "*" })).status).toBe(412);
    expect(await (await send(`/files/${ENTRY}`)).text()).toBe("first");
  });

  it("refuses a write that states no condition", async () => {
    expect((await put(ENTRY, "x", {})).status).toBe(428);
    expect((await send(`/files/${ENTRY}`)).status).toBe(404);
  });

  it("refuses paths a vault is not made of", async () => {
    for (const path of [
      "notes.txt",
      "entries/2026/2025-11-03.enc",
      "images/XYZ.enc",
      "history/vault.json",
    ]) {
      expect((await put(path, "x", { "If-None-Match": "*" })).status).toBe(400);
    }
  });
});

describe("the file list", () => {
  it("lists every file with its newest version", async () => {
    const vault = await create("vault.json", "{}");
    const first = await create(ENTRY, "first");
    const response = await put(ENTRY, "second", { "If-Match": first });
    const entry = response.headers.get("ETag");

    const list = await send("/files");
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual({
      files: [
        { path: ENTRY, version: entry },
        { path: "vault.json", version: vault },
      ],
    });
  });
});

describe("history", () => {
  it("keeps every version sent, including one that lost a conflict", async () => {
    const first = await create(ENTRY, "first");
    await put(ENTRY, "from the Mac", { "If-Match": first });
    await put(ENTRY, "from the iPhone", { "If-Match": first });

    const kept = await env.FILES.list({ prefix: `history/${ENTRY}/` });
    const bodies = await Promise.all(
      kept.objects.map(async (object) => (await env.FILES.get(object.key))?.text() ?? null),
    );
    expect(bodies).toHaveLength(3);
    expect(new Set(bodies)).toEqual(new Set(["first", "from the Mac", "from the iPhone"]));
  });
});
