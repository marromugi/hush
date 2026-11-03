import { reset } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";

import { send } from "@/test/request";

afterEach(() => reset());

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
