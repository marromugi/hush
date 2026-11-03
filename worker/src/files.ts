import type { z } from "@hono/zod-openapi";

import type { FileList } from "./schemas";

/** Where the newest version of each file is kept. */
const CURRENT = "files/";

/** Where every version ever sent is kept, including ones that lost a conflict. */
const HISTORY = "history/";

/** A file of a vault. Its path is the one the app uses on disk (src-tauri/src/local_store.rs). */
export type VaultFile =
  | { kind: "vault" }
  | { kind: "entry"; date: string }
  | { kind: "image"; id: string };

export type WriteCondition = { replaces: string } | { creates: true };

function pathOf(file: VaultFile): string {
  if (file.kind === "vault") return "vault.json";
  if (file.kind === "entry") return `entries/${file.date.slice(0, 4)}/${file.date}.enc`;
  return `images/${file.id}.enc`;
}

const ENTRY_PATH = /^entries\/\d{4}\/(.+)\.enc$/;
const IMAGE_PATH = /^images\/(.+)\.enc$/;

export async function listFiles(bucket: R2Bucket): Promise<z.infer<typeof FileList>> {
  const list: z.infer<typeof FileList> = { vault: null, entries: [], images: [] };
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: CURRENT, cursor });
    for (const object of page.objects) {
      const path = object.key.slice(CURRENT.length);
      const version = object.httpEtag;
      const entry = ENTRY_PATH.exec(path)?.[1];
      const image = IMAGE_PATH.exec(path)?.[1];
      if (path === "vault.json") list.vault = version;
      else if (entry !== undefined) list.entries.push({ date: entry, version });
      else if (image !== undefined) list.images.push({ id: image, version });
      else throw new Error(`${object.key} in the bucket is not a vault file.`);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor !== undefined);
  return list;
}

export function readFile(bucket: R2Bucket, file: VaultFile): Promise<R2ObjectBody | null> {
  return bucket.get(CURRENT + pathOf(file));
}

/**
 * Stores `body` as the newest version of `file` if the condition holds, and
 * returns its version; returns null when another write got there first.
 * The body is kept in history before the condition is checked, so a write
 * that loses a conflict is not lost.
 */
export async function writeFile(
  bucket: R2Bucket,
  file: VaultFile,
  body: ArrayBuffer,
  condition: WriteCondition,
): Promise<string | null> {
  const path = pathOf(file);
  await bucket.put(`${HISTORY}${path}/${new Date().toISOString()}-${crypto.randomUUID()}`, body);

  const onlyIf = new Headers(
    "replaces" in condition ? { "If-Match": condition.replaces } : { "If-None-Match": "*" },
  );
  const stored = await bucket.put(CURRENT + path, body, { onlyIf });
  return stored === null ? null : stored.httpEtag;
}
