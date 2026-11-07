import { DiaryEditor } from "@/components/diary/DiaryEditor";
import { EntryReader } from "@/components/diary/EntryReader";
import { EntryHostContext } from "@/hooks/diary/useEntryHost";
import { useLoadedEntry } from "@/hooks/diary/useLoadedEntry";
import { editorChannelHost, reportChange } from "@/lib/diary/editorChannel";

/**
 * An entry alone, to edit or to read, for the Swift app to show in a web
 * view. It shows nothing until the app gives it an entry, and shows each
 * one anew.
 */
export function EditorPage() {
  const loaded = useLoadedEntry();

  return (
    <EntryHostContext value={editorChannelHost}>
      <main className="px-5 py-6">
        {loaded === null ? null : loaded.shownAs === "reader" ? (
          <EntryReader key={loaded.count} body={loaded.entry.body} />
        ) : (
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
