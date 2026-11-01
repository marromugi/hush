import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { clsx } from "clsx";
import { useEffect } from "react";

/** An editor that starts with `initialBody` and reports every change as HTML. */
export function useDiaryEditor(
  initialBody: string,
  onChange: (body: string) => void,
  disabled: boolean,
) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialBody,
    // Tiptap calls the handler from the newest render, so it never goes stale.
    onUpdate: ({ editor: updated }) => onChange(updated.getHTML()),
    editorProps: {
      attributes: {
        class: clsx(
          // size
          "min-h-[60vh]",
          // typography
          "prose prose-stone prose-lg dark:prose-invert",
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
