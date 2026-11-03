import { z } from "@hono/zod-openapi";

/** One version as `ETag` gives it: quoted, not `*` and not a list. */
export const Version = z
  .string()
  .regex(/^"[^",*]+"$/)
  .openapi({ example: '"9b2cf535f27731c974343645a3985328"' });

/** An entry's day, as the app names entry files (src-tauri/src/entry.rs). */
export const EntryDate = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  .openapi({ example: "2026-11-03" });

/** An image's id, as the app names image files (src-tauri/src/image.rs). */
export const ImageId = z
  .string()
  .regex(/^[0-9a-f]{32}$/)
  .openapi({ example: "0123456789abcdef0123456789abcdef" });

export const FileList = z
  .object({
    vault: Version.nullable(),
    entries: z.array(z.object({ date: EntryDate, version: Version })),
    images: z.array(z.object({ id: ImageId, version: Version })),
  })
  .openapi("FileList");

export const Problem = z.object({ error: z.string() }).openapi("Problem");

/**
 * A write states exactly one condition: the version it replaces, or that it
 * creates the file.
 */
export const WriteHeaders = z
  .object({
    "if-match": Version.optional().openapi({
      description: "The version read. The write is refused if the file has changed since.",
    }),
    "if-none-match": z.literal("*").optional().openapi({
      description: "Creates the file. The write is refused if it already exists.",
    }),
  })
  .refine(
    (headers) => (headers["if-match"] === undefined) !== (headers["if-none-match"] === undefined),
    {
      message: "Send If-Match with the one version you read, or If-None-Match: * to create.",
    },
  );
