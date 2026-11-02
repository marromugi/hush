import { EditorContent, useEditor } from "@tiptap/react";

import { entryExtensions } from "@/lib/diary/entryExtensions";
import { entryProse, fontLoadingStyle } from "@/lib/diary/entryProse";

import type { EntryReaderProps } from "./type";

/** An entry's body, shown as written and never editable. */
export function EntryReader({ body, fontFamily, fontLoading = false }: EntryReaderProps) {
  const editor = useEditor({
    extensions: entryExtensions,
    content: body,
    editable: false,
    editorProps: { attributes: { class: entryProse } },
  });

  return (
    <EditorContent
      editor={editor}
      className={fontLoadingStyle(fontLoading)}
      style={{ fontFamily }}
    />
  );
}
