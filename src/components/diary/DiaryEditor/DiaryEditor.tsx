import { EditorContent } from "@tiptap/react";

import { useDiaryEditor } from "./hooks/useDiaryEditor";
import type { DiaryEditorProps } from "./type";

export function DiaryEditor({
  initialBody,
  onChange,
  disabled,
  keepClear,
  fontFamily,
}: DiaryEditorProps) {
  const editor = useDiaryEditor(initialBody, onChange, disabled, keepClear);

  return <EditorContent editor={editor} style={{ fontFamily }} />;
}
