import { exports } from "cloudflare:workers";
import { expect } from "vitest";

/** The sync key whose hash vitest.config.ts gives the Worker. */
export const KEY = "test-sync-key";

/** Sends a request to the Worker, with the sync key unless `key` says otherwise. */
export function send(
  path: string,
  init: RequestInit = {},
  key: string | null = KEY,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (key !== null) headers.set("Authorization", `Bearer ${key}`);
  return exports.default.fetch(`https://sync.example${path}`, { ...init, headers });
}

export function put(
  path: string,
  body: string,
  condition: Record<string, string>,
): Promise<Response> {
  return send(path, { method: "PUT", body, headers: condition });
}

/** Creates a file and returns its version. */
export async function create(path: string, body: string): Promise<string> {
  const response = await put(path, body, { "If-None-Match": "*" });
  expect(response.status).toBe(204);
  const version = response.headers.get("ETag");
  expect(version).not.toBeNull();
  return version ?? "";
}

export async function read(path: string): Promise<string> {
  return (await send(path)).text();
}
