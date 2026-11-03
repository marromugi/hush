import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Context } from "hono";

import { requireSyncKey } from "./auth";
import type { VaultFile, WriteCondition } from "./files";
import { listFiles, readFile, writeFile } from "./files";
import { EntryDate, FileList, ImageId, Problem, WriteHeaders } from "./schemas";

type Env = { Bindings: Cloudflare.Env };

/**
 * Stores a vault's encrypted files for the app's devices. The files are
 * encrypted on the device; this only checks the sync key and refuses a
 * write made against a version that is no longer the newest. The routes
 * are described at `/openapi.json`.
 */
const app = new OpenAPIHono<Env>({
  defaultHook: (result, c) => {
    if (result.success) return undefined;
    // A missing or malformed condition is the one way a write's headers fail.
    const status = result.target === "header" ? 428 : 400;
    return c.json({ error: z.prettifyError(result.error) }, status);
  },
});

app.use("*", requireSyncKey);

app.openAPIRegistry.registerComponent("securitySchemes", "syncKey", {
  type: "http",
  scheme: "bearer",
  description: "The sync key.",
});

app.doc31("/openapi.json", {
  openapi: "3.1.0",
  info: { title: "Hush sync", version: "1" },
  security: [{ syncKey: [] }],
});

const problem = (description: string) => ({
  description,
  content: { "application/json": { schema: Problem } },
});

app.openapi(
  createRoute({
    method: "get",
    path: "/files",
    summary: "Lists every file with its newest version.",
    responses: {
      200: { description: "The files.", content: { "application/json": { schema: FileList } } },
    },
  }),
  async (c) => c.json(await listFiles(c.env.FILES), 200),
);

const binary = {
  "application/octet-stream": { schema: { type: "string", format: "binary" } },
} as const;
const etag = { ETag: { schema: { type: "string" } } } as const;

function readRoute<Params extends string>(path: Params, name: string) {
  return {
    method: "get",
    path,
    summary: `Reads ${name}.`,
    responses: {
      200: { description: `${name}, its version in ETag.`, headers: etag, content: binary },
      400: problem("The path does not name a file."),
      404: problem("The file does not exist."),
    },
  } as const;
}

function writeRoute<Params extends string>(path: Params, name: string) {
  return {
    method: "put",
    path,
    summary: `Writes ${name}.`,
    responses: {
      204: { description: "Stored. The new version is in ETag.", headers: etag },
      400: problem("The path does not name a file."),
      412: problem("The file changed since the version read, or already exists."),
      428: problem("The write states no condition, or more than one."),
    },
  } as const;
}

const writeRequest = { headers: WriteHeaders, body: { required: true, content: binary } };

app.openapi(createRoute(readRoute("/vault", "the vault")), (c) =>
  getFile(c, { kind: "vault" }, "The vault"),
);
app.openapi(createRoute({ ...writeRoute("/vault", "the vault"), request: writeRequest }), (c) =>
  putFile(c, { kind: "vault" }, "The vault", c.req.valid("header")),
);

const entryParams = z.object({ date: EntryDate });
app.openapi(
  createRoute({ ...readRoute("/entries/{date}", "an entry"), request: { params: entryParams } }),
  (c) => getFile(c, { kind: "entry", ...c.req.valid("param") }, "The entry"),
);
app.openapi(
  createRoute({
    ...writeRoute("/entries/{date}", "an entry"),
    request: { params: entryParams, ...writeRequest },
  }),
  (c) => putFile(c, { kind: "entry", ...c.req.valid("param") }, "The entry", c.req.valid("header")),
);

const imageParams = z.object({ id: ImageId });
app.openapi(
  createRoute({ ...readRoute("/images/{id}", "an image"), request: { params: imageParams } }),
  (c) => getFile(c, { kind: "image", ...c.req.valid("param") }, "The image"),
);
app.openapi(
  createRoute({
    ...writeRoute("/images/{id}", "an image"),
    request: { params: imageParams, ...writeRequest },
  }),
  (c) => putFile(c, { kind: "image", ...c.req.valid("param") }, "The image", c.req.valid("header")),
);

async function getFile(c: Context<Env>, file: VaultFile, name: string) {
  const stored = await readFile(c.env.FILES, file);
  if (stored === null) return c.json({ error: `${name} does not exist.` }, 404);
  return c.body(stored.body, 200, {
    "Content-Type": "application/octet-stream",
    ETag: stored.httpEtag,
  });
}

async function putFile(
  c: Context<Env>,
  file: VaultFile,
  name: string,
  headers: z.infer<typeof WriteHeaders>,
) {
  const condition: WriteCondition =
    headers["if-match"] === undefined ? { creates: true } : { replaces: headers["if-match"] };
  const version = await writeFile(c.env.FILES, file, await c.req.arrayBuffer(), condition);
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
