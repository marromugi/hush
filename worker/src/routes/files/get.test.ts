import { reset } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";

import { create, put, send } from "@/lib/testRequest";

const ENTRY = "/entries/2026-11-03";
const IMAGE = "/images/0123456789abcdef0123456789abcdef";

afterEach(() => reset());

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
