import { useEditor, useEditorState } from "@tiptap/react";
import { clsx } from "clsx";
import { useEffect, useState } from "react";

import type { KeepClear } from "@/components/diary/DiaryEditor/type";
import {
  alignSelectedImage,
  entryExtensions,
  insertEntryImage,
  selectedImageAlign,
} from "@/lib/diary/entryExtensions";
import { entryProse } from "@/lib/diary/entryProse";
import type { ImageAlign } from "@/lib/diary/imageAlign";
import { preparePicture } from "@/lib/diary/preparePicture";
import { saveImage } from "@/lib/vault/commands";
import { failureText } from "@/lib/vault/errorText";

import { imageFiles } from "./lib/imageFiles";

/** Room the cursor keeps from the window's edges when the page scrolls to it, beyond `keepClear`. */
const CURSOR_ROOM = 16;

/**
 * An editor that starts with `initialBody` and reports every change as HTML.
 * When typing or moving the cursor would take it into `keepClear`, the page
 * scrolls so it stays in view. A pasted picture is prepared for saving
 * (`preparePicture`), saved as an encrypted image, and put where the cursor
 * is once saved; `imageError` says why the last one that failed did not
 * appear. `imageAlign` is where the selected image sits, and `alignImage`
 * moves it.
 */
export function useDiaryEditor(
  initialBody: string,
  onChange: (body: string) => void,
  disabled: boolean,
  keepClear: KeepClear = { top: 0, bottom: 0 },
) {
  const [imageError, setImageError] = useState<string | null>(null);
  const edges = { left: 0, right: 0, top: keepClear.top, bottom: keepClear.bottom };
  const editor = useEditor({
    extensions: entryExtensions,
    content: initialBody,
    // Tiptap calls the handler from the newest render, so it never goes stale.
    onUpdate: ({ editor: updated }) => onChange(updated.getHTML()),
    editorProps: {
      scrollThreshold: edges,
      scrollMargin: {
        ...edges,
        top: edges.top + CURSOR_ROOM,
        bottom: edges.bottom + CURSOR_ROOM,
      },
      handlePaste: (_view, event) => {
        const files = imageFiles(event.clipboardData);
        if (files.length === 0) return false;
        void addImages(files);
        return true;
      },
      attributes: {
        class: clsx(
          // size
          "min-h-[60vh]",
          // typography
          entryProse,
          // focus
          "outline-none",
        ),
      },
    },
  });

  async function addImages(files: File[]) {
    setImageError(null);
    for (const file of files) {
      let picture: Uint8Array;
      try {
        picture = await preparePicture(file);
      } catch {
        setImageError("この画像は読み込めませんでした。");
        continue;
      }
      let id: string;
      try {
        id = await saveImage(picture);
      } catch (failure) {
        setImageError(`画像を保存できませんでした。${failureText(failure)}`);
        continue;
      }
      // The editor is gone once the day changes or the vault locks; the image file stays unused.
      if (editor.isDestroyed) return;
      insertEntryImage(editor, id);
    }
  }

  // useEditor keeps the editable state it was created with, so a later
  // change is pushed to the editor here.
  useEffect(() => {
    editor.setEditable(!disabled, false);
  }, [editor, disabled]);

  const imageAlign = useEditorState({
    editor,
    selector: ({ editor: current }) => selectedImageAlign(current),
  });

  return {
    editor,
    imageError,
    imageAlign,
    alignImage: (align: ImageAlign) => alignSelectedImage(editor, align),
  };
}
