import * as v from "valibot";

/** One version as `ETag` gives it: quoted, not `*` and not a list. */
export const Version = v.pipe(v.string(), v.regex(/^"[^",*]+"$/));

/** An entry's day, as the app names entry files (src-tauri/src/entry.rs). */
export const EntryDate = v.pipe(
  v.string(),
  v.regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/),
  v.description("YYYY-MM-DD"),
);

/** An image's id, as the app names image files (src-tauri/src/image.rs). */
export const ImageId = v.pipe(
  v.string(),
  v.regex(/^[0-9a-f]{32}$/),
  v.description("32 lowercase hex digits"),
);

export const EntryParams = v.object({ date: EntryDate });

export const ImageParams = v.object({ id: ImageId });

export const FileList = v.object({
  vault: v.nullable(Version),
  entries: v.array(v.object({ date: EntryDate, version: Version })),
  images: v.array(v.object({ id: ImageId, version: Version })),
});

export type FileList = v.InferOutput<typeof FileList>;

export const Problem = v.object({ error: v.string() });

/**
 * A write states exactly one condition: the version it replaces, or that it
 * creates the file.
 */
export const WriteHeaders = v.pipe(
  v.object({
    "if-match": v.optional(
      v.pipe(
        Version,
        v.description("The version read. The write is refused if the file has changed since."),
      ),
    ),
    "if-none-match": v.optional(
      v.pipe(
        v.literal("*"),
        v.description("Creates the file. The write is refused if it already exists."),
      ),
    ),
  }),
  v.check(
    (headers) => (headers["if-match"] === undefined) !== (headers["if-none-match"] === undefined),
    "Send If-Match with the one version you read, or If-None-Match: * to create.",
  ),
);

export type WriteHeaders = v.InferOutput<typeof WriteHeaders>;
