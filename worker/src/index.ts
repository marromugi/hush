import { authorize } from "./auth";
import { isFilePath } from "./filePath";
import type { WriteCondition } from "./files";
import { listFiles, readFile, writeFile } from "./files";

/**
 * Stores a vault's encrypted files for the app's devices. The files are
 * encrypted on the device; this only checks the sync key and refuses a
 * write made against a version that is no longer the newest.
 *
 * - `GET /files` lists every file with its version.
 * - `GET /files/<path>` returns a file, its version in `ETag`.
 * - `PUT /files/<path>` stores a file. It needs `If-Match: <version read>`
 *   to replace one, or `If-None-Match: *` to create one.
 */
export default {
  async fetch(request, env): Promise<Response> {
    switch (await authorize(request, env.SYNC_KEY_HASH)) {
      case "misconfigured":
        return text(500, "SYNC_KEY_HASH is not set to a hex SHA-256 of the sync key.");
      case "denied":
        return text(401, "Send the sync key as Authorization: Bearer <key>.");
      case "allowed":
        break;
    }

    const { pathname } = new URL(request.url);
    if (pathname === "/files") {
      if (request.method !== "GET") return methodNotAllowed("GET");
      return Response.json({ files: await listFiles(env.FILES) });
    }

    if (!pathname.startsWith("/files/")) return text(404, "Only /files and /files/<path> exist.");
    const path = pathname.slice("/files/".length);
    if (!isFilePath(path)) return text(400, `${path} is not a path a vault is made of.`);

    switch (request.method) {
      case "GET":
        return getFile(env.FILES, path);
      case "PUT":
        return putFile(env.FILES, path, request);
      default:
        return methodNotAllowed("GET, PUT");
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;

async function getFile(bucket: R2Bucket, path: string): Promise<Response> {
  const file = await readFile(bucket, path);
  if (file === null) return text(404, `${path} does not exist.`);
  return new Response(file.body, {
    headers: { "Content-Type": "application/octet-stream", ETag: file.httpEtag },
  });
}

async function putFile(bucket: R2Bucket, path: string, request: Request): Promise<Response> {
  const condition = writeCondition(request.headers);
  if (condition === null) {
    return text(428, "Send If-Match with the version you read, or If-None-Match: * to create.");
  }

  const version = await writeFile(bucket, path, await request.arrayBuffer(), condition);
  if (version === null) {
    return text(
      412,
      "replaces" in condition
        ? `${path} has changed since that version was read.`
        : `${path} already exists.`,
    );
  }
  return new Response(null, { status: 204, headers: { ETag: version } });
}

/** The one condition the request states, or null when it states none, both, or another. */
function writeCondition(headers: Headers): WriteCondition | null {
  const ifMatch = headers.get("If-Match");
  const ifNoneMatch = headers.get("If-None-Match");
  if (ifMatch !== null && ifNoneMatch === null) return { replaces: ifMatch };
  if (ifMatch === null && ifNoneMatch === "*") return { creates: true };
  return null;
}

function methodNotAllowed(allow: string): Response {
  return new Response(`Use ${allow}.`, { status: 405, headers: { Allow: allow } });
}

function text(status: number, message: string): Response {
  return new Response(message, { status });
}
