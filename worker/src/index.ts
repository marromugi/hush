import type { Context } from "hono";
import { Hono } from "hono";
import type { DescribeRouteOptions } from "hono-openapi";
import { describeRoute, openAPIRouteHandler, resolver, validator } from "hono-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { requireSyncKey } from "./auth";
import type { VaultFile, WriteCondition } from "./files";
import { listFiles, readFile, writeFile } from "./files";
import { EntryParams, FileList, ImageParams, Problem, WriteHeaders } from "./schemas";

type Env = { Bindings: Cloudflare.Env };

/**
 * Stores a vault's encrypted files for the app's devices. The files are
 * encrypted on the device; this only checks the sync key and refuses a
 * write made against a version that is no longer the newest. The routes
 * are described at `/openapi.json`.
 */
const app = new Hono<Env>();

app.use("*", requireSyncKey);

app.onError((error, c) => c.json({ error: error.message }, 500));

/** Answers a request whose `target` does not fit its schema with `status`. */
function refuse(status: ContentfulStatusCode) {
  return (
    result: { success: true } | { success: false; error: readonly { message: string }[] },
    c: Context<Env>,
  ) =>
    result.success
      ? undefined
      : c.json({ error: result.error.map((issue) => issue.message).join(" ") }, status);
}

const problem = (description: string) => ({
  description,
  content: { "application/json": { schema: resolver(Problem) } },
});

const binary = {
  "application/octet-stream": { schema: { type: "string", format: "binary" } },
} as const;

const etag = { ETag: { schema: { type: "string" } } } as const;

function readRoute(name: string): DescribeRouteOptions {
  return {
    summary: `Reads ${name}.`,
    responses: {
      200: { description: `${name}, its version in ETag.`, headers: etag, content: binary },
      400: problem("The path does not name a file."),
      404: problem("The file does not exist."),
    },
  };
}

function writeRoute(name: string): DescribeRouteOptions {
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

const writeHeaders = validator("header", WriteHeaders, refuse(428));

app.get(
  "/files",
  describeRoute({
    summary: "Lists every file with its newest version.",
    responses: {
      200: {
        description: "The files.",
        content: { "application/json": { schema: resolver(FileList) } },
      },
    },
  }),
  async (c) => c.json(await listFiles(c.env.FILES)),
);

app.get("/vault", describeRoute(readRoute("the vault")), (c) =>
  getFile(c, { kind: "vault" }, "The vault"),
);
app.put("/vault", describeRoute(writeRoute("the vault")), writeHeaders, (c) =>
  putFile(c, { kind: "vault" }, "The vault", c.req.valid("header")),
);

const entryParams = validator("param", EntryParams, refuse(400));
app.get("/entries/:date", describeRoute(readRoute("an entry")), entryParams, (c) =>
  getFile(c, { kind: "entry", ...c.req.valid("param") }, "The entry"),
);
app.put("/entries/:date", describeRoute(writeRoute("an entry")), entryParams, writeHeaders, (c) =>
  putFile(c, { kind: "entry", ...c.req.valid("param") }, "The entry", c.req.valid("header")),
);

const imageParams = validator("param", ImageParams, refuse(400));
app.get("/images/:id", describeRoute(readRoute("an image")), imageParams, (c) =>
  getFile(c, { kind: "image", ...c.req.valid("param") }, "The image"),
);
app.put("/images/:id", describeRoute(writeRoute("an image")), imageParams, writeHeaders, (c) =>
  putFile(c, { kind: "image", ...c.req.valid("param") }, "The image", c.req.valid("header")),
);

app.get(
  "/openapi.json",
  openAPIRouteHandler(app, {
    documentation: {
      info: { title: "Hush sync", version: "1" },
      components: {
        securitySchemes: {
          syncKey: { type: "http", scheme: "bearer", description: "The sync key." },
        },
      },
      security: [{ syncKey: [] }],
    },
    defaultValidationErrorResponse: false,
  }),
);

async function getFile(c: Context<Env>, file: VaultFile, name: string) {
  const stored = await readFile(c.env.FILES, file);
  if (stored === null) return c.json({ error: `${name} does not exist.` }, 404);
  return c.body(stored.body, 200, {
    "Content-Type": "application/octet-stream",
    ETag: stored.httpEtag,
  });
}

async function putFile(c: Context<Env>, file: VaultFile, name: string, headers: WriteHeaders) {
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

export default app;
