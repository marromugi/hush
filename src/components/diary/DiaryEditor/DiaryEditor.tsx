import { EditorContent } from "@tiptap/react";

import { useDiaryEditor } from "./hooks/useDiaryEditor";
import type { DiaryEditorProps } from "./type";

export function DiaryEditor({ initialBody, onChange }: DiaryEditorProps) {
  const editor = useDiaryEditor(initialBody, onChange);

  return <EditorContent editor={editor} />;
}
