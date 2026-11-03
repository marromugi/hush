/**
 * The paths a vault is made of, as the app lays them out on disk
 * (src-tauri/src/local_store.rs). Anything else is refused, so the bucket
 * holds only vault files.
 */
const FILE_PATHS = [
  /^vault\.json$/,
  /^entries\/(\d{4})\/\1-\d{2}-\d{2}\.enc$/,
  /^images\/[0-9a-f]{32}\.enc$/,
];

export function isFilePath(path: string): boolean {
  return FILE_PATHS.some((pattern) => pattern.test(path));
}
