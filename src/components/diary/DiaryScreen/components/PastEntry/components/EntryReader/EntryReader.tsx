import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";

import { entryProse, fontLoadingBlur } from "../../../../../../../lib/diary/entryProse";
import type { EntryReaderProps } from "./type";

/** An entry's body, shown as written and never editable. */
export function EntryReader({ body, fontFamily, fontLoading = false }: EntryReaderProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: body,
    editable: false,
    editorProps: { attributes: { class: entryProse } },
  });

  return (
    <EditorContent
      editor={editor}
      className={fontLoadingBlur(fontLoading)}
      style={{ fontFamily }}
    />
  );
}
