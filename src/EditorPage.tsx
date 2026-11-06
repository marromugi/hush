import { DiaryEditor } from "@/components/diary/DiaryEditor";
import { EntryHostContext } from "@/hooks/diary/useEntryHost";
import { useLoadedEntry } from "@/hooks/diary/useLoadedEntry";
import { editorChannelHost, reportChange } from "@/lib/diary/editorChannel";

/**
 * The editor alone, for the Swift app to show in a web view. It shows
 * nothing until the app gives it an entry, and a new editor for each one.
 */
export function EditorPage() {
  const loaded = useLoadedEntry();

  return (
    <EntryHostContext value={editorChannelHost}>
      <main className="px-5 py-6">
        {loaded === null ? null : (
          <DiaryEditor
            key={loaded.count}
            initialBody={loaded.entry.body}
            onChange={reportChange}
            disabled={false}
          />
        )}
      </main>
    </EntryHostContext>
  );
}
