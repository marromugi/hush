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
  const { editor, imageError } = useDiaryEditor(initialBody, onChange, disabled, keepClear);

  return (
    <>
      {imageError ? (
        <p role="alert" className="mb-4 text-sm text-error">
          {imageError}
        </p>
      ) : null}
      <EditorContent
        editor={editor}
        className={fontLoadingStyle(fontLoading)}
        style={{ fontFamily }}
      />
    </>
  );
}
