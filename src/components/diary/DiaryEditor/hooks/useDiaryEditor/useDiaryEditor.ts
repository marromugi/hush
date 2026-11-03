import { useEditor, useEditorState } from "@tiptap/react";
import { clsx } from "clsx";
import { useEffect, useMemo } from "react";

import type { KeepClear } from "@/components/diary/DiaryEditor/type";
import {
  alignSelectedImage,
  entryExtensions,
  insertEntryImage,
  isImageSelected,
  selectedImageAlign,
  selectedImageBox,
} from "@/lib/diary/entryExtensions";
import { entryProse } from "@/lib/diary/entryProse";
import type { ImageAlign } from "@/lib/diary/imageAlign";
import { preparePicture } from "@/lib/diary/preparePicture";
import { toastError } from "@/lib/ui/toast";
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
 * is once saved; one that fails is told in a toast. `imageAlign` is where the selected image sits, and `alignImage`
 * moves it; `imageMenu` is what the bubble menu over a selected image needs.
 */
export function useDiaryEditor(
  initialBody: string,
  onChange: (body: string) => void,
  disabled: boolean,
  keepClear: KeepClear = { top: 0, bottom: 0 },
) {
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
    for (const file of files) {
      let picture: Uint8Array;
      try {
        picture = await preparePicture(file);
      } catch {
        toastError("この画像は読み込めませんでした。");
        continue;
      }
      let id: string;
      try {
        id = await saveImage(picture);
      } catch (failure) {
        toastError(`画像を保存できませんでした。${failureText(failure)}`);
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

  // Built once per editor and edges: the bubble menu updates itself each time these change.
  const { top, bottom } = keepClear;
  const imageMenu = useMemo(() => {
    // Kept out of the bands in `keepClear`, which would cover it.
    const padding = { left: 0, right: 0, top, bottom };
    return {
      // Not over an image that is still being read or could not be read: there is no picture to place it by.
      shouldShow: ({ editor: shown }: { editor: typeof editor }) =>
        isImageSelected(shown) && selectedImageBox(shown) !== null,
      getReferencedVirtualElement: () => selectedImageBox(editor),
      options: { flip: { padding }, shift: { padding } },
    };
  }, [editor, top, bottom]);

  return {
    editor,
    imageAlign,
    imageMenu,
    alignImage: (align: ImageAlign) => alignSelectedImage(editor, align),
  };
}
