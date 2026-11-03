import type { Context } from "hono";
import type { DescribeRouteOptions } from "hono-openapi";
import { resolver, validator } from "hono-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { VaultFile, WriteCondition } from "@/lib/bucket";
import { readFile, writeFile } from "@/lib/bucket";
import type { Env } from "@/lib/factory";
import { Problem, WriteHeaders } from "@/lib/schemas";

/** Answers a request whose part does not fit its schema with `status`. */
export function refuse(status: ContentfulStatusCode) {
  return (
    result: { success: true } | { success: false; error: readonly { message: string }[] },
    c: Context<Env>,
  ) =>
    result.success
      ? undefined
      : c.json({ error: result.error.map((issue) => issue.message).join(" ") }, status);
}

/** Reads the write's condition, answering 428 when it states none or more than one. */
export const writeHeaders = validator("header", WriteHeaders, refuse(428));

export const problem = (description: string) => ({
  description,
  content: { "application/json": { schema: resolver(Problem) } },
});

const binary = {
  "application/octet-stream": { schema: { type: "string", format: "binary" } },
} as const;

const etag = { ETag: { schema: { type: "string" } } } as const;

export function readRoute(name: string): DescribeRouteOptions {
  return {
    summary: `Reads ${name}.`,
    responses: {
      200: { description: `${name}, its version in ETag.`, headers: etag, content: binary },
      400: problem("The path does not name a file."),
      404: problem("The file does not exist."),
    },
  };
}

export function writeRoute(name: string): DescribeRouteOptions {
  return {
    summary: `Writes ${name}.`,
    requestBody: { required: true, content: binary },
    responses: {
      204: { description: "Stored. The new version is in ETag.", headers: etag },
      400: problem("The path does not name a file, or the body is empty."),
      412: problem("The file changed since the version read, or already exists."),
      428: problem("The write states no condition, or more than one."),
    },
  };
}

export async function getFile(c: Context<Env>, file: VaultFile, name: string) {
  const stored = await readFile(c.env.FILES, file);
  if (stored === null) return c.json({ error: `${name} does not exist.` }, 404);
  return c.body(stored.body, 200, {
    "Content-Type": "application/octet-stream",
    ETag: stored.httpEtag,
  });
}

export async function putFile(
  c: Context<Env>,
  file: VaultFile,
  name: string,
  headers: WriteHeaders,
) {
  const condition: WriteCondition =
    headers["if-match"] === undefined ? { creates: true } : { replaces: headers["if-match"] };
  const body = await c.req.arrayBuffer();
  // Every file the app writes is encrypted, so it is never empty.
  if (body.byteLength === 0) return c.json({ error: `${name} was sent with no body.` }, 400);
  const version = await writeFile(c.env.FILES, file, body, condition);
  if (version === null) {
    const error =
      "replaces" in condition
        ? `${name} has changed since that version was read.`
        : `${name} already exists.`;
    return c.json({ error }, 412);
  }
  return c.body(null, 204, { ETag: version });
}
