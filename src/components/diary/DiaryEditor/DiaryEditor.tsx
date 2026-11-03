import { EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { clsx } from "clsx";

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
  const { editor, imageError, imageAlign, alignImage, imageMenu, imageMenuRef } = useDiaryEditor(
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
      {/* Over the sticky header and footer; shown and moved without the default delay. */}
      <BubbleMenu
        ref={imageMenuRef}
        editor={editor}
        updateDelay={0}
        className={clsx(
          // layout
          "z-10",
          // motion: the same pace as the image it follows (quickMove)
          "data-slide:transition-[left,top] data-slide:duration-180 data-slide:ease-in-out motion-reduce:transition-none",
        )}
        {...imageMenu}
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
