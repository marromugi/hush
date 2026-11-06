import type { EntryHost } from "@/lib/diary/entryHost";
import { HushError } from "@/lib/vault/hushError";

/** A call that rejects, naming itself, for the ones a test did not fake. */
function unfaked(name: string) {
  return () => Promise.reject(new HushError("unknown", `${name} is not faked`));
}

/** A host for tests. Each call not given in `calls` rejects, naming itself. */
export function fakeEntryHost(calls: Partial<EntryHost> = {}): EntryHost {
  return {
    saveImage: unfaked("saveImage"),
    readImage: unfaked("readImage"),
    linkPage: unfaked("linkPage"),
    linkImage: unfaked("linkImage"),
    embedPagesOrigin: unfaked("embedPagesOrigin"),
    listenKeyboardMoves: unfaked("listenKeyboardMoves"),
    ...calls,
  };
}
