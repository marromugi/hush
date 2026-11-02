import { EditorContent } from "@tiptap/react";

import { fontLoadingStyle } from "@/lib/diary/entryProse";

import { useDiaryEditor } from "./hooks/useDiaryEditor";
import type { DiaryEditorProps } from "./type";

export function DiaryEditor({
  initialBody,
  onChange,
  disabled,
  keepClear,
  fontFamily,
  fontLoading = false,
}: DiaryEditorProps) {
  const editor = useDiaryEditor(initialBody, onChange, disabled, keepClear);

  return (
    <EditorContent
      editor={editor}
      className={fontLoadingStyle(fontLoading)}
      style={{ fontFamily }}
    />
  );
}
