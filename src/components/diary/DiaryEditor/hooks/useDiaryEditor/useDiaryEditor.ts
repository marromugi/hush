import { useEditor, useEditorState } from "@tiptap/react";
import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";

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
 * moves it; `imageMenu`, `imageMenuRef`, and `imageMenuShows` are what the
 * bubble menu over a selected image needs.
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

  // Counts each time the image menu appears, so its content can play its entrance again.
  const [imageMenuShows, setImageMenuShows] = useState(0);
  const imageMenuRef = useRef<HTMLDivElement>(null);

  // Built once per editor and edges: the bubble menu updates itself each time these change.
  const { top, bottom } = keepClear;
  const imageMenu = useMemo(() => {
    // Kept out of the bands in `keepClear`, which would cover it.
    const padding = { left: 0, right: 0, top, bottom };
    return {
      shouldShow: ({ editor: shown }: { editor: typeof editor }) => isImageSelected(shown),
      getReferencedVirtualElement: () => selectedImageBox(editor),
      options: {
        flip: { padding },
        shift: { padding },
        // The menu slides when it moves, but not from wherever it was last shown.
        onShow: () => {
          setImageMenuShows((shows) => shows + 1);
          imageMenuRef.current?.style.setProperty("transition", "none");
        },
        onUpdate: () => {
          const menu = imageMenuRef.current;
          if (!menu?.style.getPropertyValue("transition")) return;
          // Draw the first place before sliding is allowed again.
          void menu.offsetLeft;
          menu.style.removeProperty("transition");
        },
      },
    };
  }, [editor, top, bottom]);

  return {
    editor,
    imageError,
    imageAlign,
    imageMenu,
    imageMenuRef,
    imageMenuShows,
    alignImage: (align: ImageAlign) => alignSelectedImage(editor, align),
  };
}
