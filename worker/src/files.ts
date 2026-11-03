/** Where the newest version of each file is kept. */
const CURRENT = "files/";

/** Where every version ever sent is kept, including ones that lost a conflict. */
const HISTORY = "history/";

export type FileVersion = { path: string; version: string };

export type WriteCondition = { replaces: string } | { creates: true };

export async function listFiles(bucket: R2Bucket): Promise<FileVersion[]> {
  const files: FileVersion[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: CURRENT, cursor });
    for (const object of page.objects) {
      files.push({ path: object.key.slice(CURRENT.length), version: object.httpEtag });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor !== undefined);
  return files.toSorted((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export function readFile(bucket: R2Bucket, path: string): Promise<R2ObjectBody | null> {
  return bucket.get(CURRENT + path);
}

/**
 * Stores `body` as the newest version of `path` if the condition holds, and
 * returns its version; returns null when another write got there first.
 * The body is kept in history before the condition is checked, so a write
 * that loses a conflict is not lost.
 */
export async function writeFile(
  bucket: R2Bucket,
  path: string,
  body: ArrayBuffer,
  condition: WriteCondition,
): Promise<string | null> {
  await bucket.put(`${HISTORY}${path}/${new Date().toISOString()}-${crypto.randomUUID()}`, body);

  const onlyIf = new Headers(
    "replaces" in condition ? { "If-Match": condition.replaces } : { "If-None-Match": "*" },
  );
  const stored = await bucket.put(CURRENT + path, body, { onlyIf });
  return stored === null ? null : stored.httpEtag;
}
