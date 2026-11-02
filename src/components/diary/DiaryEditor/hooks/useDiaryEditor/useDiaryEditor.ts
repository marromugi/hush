import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { clsx } from "clsx";
import { useEffect } from "react";

import { entryProse } from "../../../../../lib/diary/entryProse";
import type { KeepClear } from "../../type";

/** Room the cursor keeps from the window's edges when the page scrolls to it, beyond `keepClear`. */
const CURSOR_ROOM = 16;

/**
 * An editor that starts with `initialBody` and reports every change as HTML.
 * When typing or moving the cursor would take it into `keepClear`, the page
 * scrolls so it stays in view.
 */
export function useDiaryEditor(
  initialBody: string,
  onChange: (body: string) => void,
  disabled: boolean,
  keepClear: KeepClear = { top: 0, bottom: 0 },
) {
  const edges = { left: 0, right: 0, top: keepClear.top, bottom: keepClear.bottom };
  const editor = useEditor({
    extensions: [StarterKit],
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

  // useEditor keeps the editable state it was created with, so a later
  // change is pushed to the editor here.
  useEffect(() => {
    editor.setEditable(!disabled, false);
  }, [editor, disabled]);

  return editor;
}
