import { reset } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";

import { create, put, read, send } from "@/test/request";

const ENTRY = "/entries/2026-11-03";

afterEach(() => reset());

describe("writing an entry", () => {
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

  it("refuses an empty file", async () => {
    expect((await put(ENTRY, "", { "If-None-Match": "*" })).status).toBe(400);
    expect((await env.FILES.list()).objects).toHaveLength(0);
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
