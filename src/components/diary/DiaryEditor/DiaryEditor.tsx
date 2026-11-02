import { EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";

import { isImageSelected, selectedImageBox } from "@/lib/diary/entryExtensions";
import { fontLoadingStyle } from "@/lib/diary/entryProse";

import { ImageMenu } from "./components/ImageMenu";
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
  const { editor, imageError, imageAlign, alignImage } = useDiaryEditor(
    initialBody,
    onChange,
    disabled,
    keepClear,
  );

  return (
    <>
      {imageError ? (
        <p role="alert" className="mb-4 text-sm text-error">
          {imageError}
        </p>
      ) : null}
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: shown }) => isImageSelected(shown)}
        getReferencedVirtualElement={() => selectedImageBox(editor)}
      >
        <ImageMenu align={imageAlign} onAlign={alignImage} />
      </BubbleMenu>
      <EditorContent
        editor={editor}
        className={fontLoadingStyle(fontLoading)}
        style={{ fontFamily }}
      />
    </>
  );
}
