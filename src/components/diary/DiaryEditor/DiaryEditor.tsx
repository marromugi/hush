import { EditorContent } from "@tiptap/react";

import { useDiaryEditor } from "./hooks/useDiaryEditor";
import type { DiaryEditorProps } from "./type";

export function DiaryEditor({ initialBody, onChange, disabled }: DiaryEditorProps) {
  const editor = useDiaryEditor(initialBody, onChange, disabled);

  return <EditorContent editor={editor} />;
}
