import { EditorContent, useEditor } from "@tiptap/react";
import { useState } from "react";

import { useEntryHost } from "@/hooks/diary/useEntryHost";
import { entryExtensions } from "@/lib/diary/entryExtensions";
import { entryProse, fontLoadingStyle } from "@/lib/diary/entryProse";

import type { EntryReaderProps } from "./type";

/** An entry's body, shown as written and never editable. */
export function EntryReader({ body, fontFamily, fontLoading = false }: EntryReaderProps) {
  const host = useEntryHost();
  const [extensions] = useState(() => entryExtensions(host));
  const editor = useEditor({
    extensions,
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
