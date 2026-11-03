import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import type { Env } from "@/lib/factory";

import { limitWrites } from "./limitWrites";

const app = new Hono<Env>().use(limitWrites).put("/", (c) => c.text("stored"));

/** Sends a write to a Worker whose WRITE_LIMIT allows `allowed` writes in all. */
async function write(times: number, allowed: number): Promise<Response[]> {
  let used = 0;
  const WRITE_LIMIT = {
    limit: async () => ({ success: ++used <= allowed }),
  };
  const responses: Response[] = [];
  for (let i = 0; i < times; i++) {
    responses.push(await app.request("/", { method: "PUT" }, { WRITE_LIMIT }));
  }
  return responses;
}

describe("the write limit", () => {
  it("lets writes through while the limit allows them", async () => {
    const [response] = await write(1, 1);
    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe("stored");
  });

  it("refuses writes past the limit, saying when to retry", async () => {
    const responses = await write(3, 2);
    expect(responses.map((response) => response.status)).toEqual([200, 200, 429]);
    expect(responses[2]?.headers.get("Retry-After")).toBe("60");
  });
});
