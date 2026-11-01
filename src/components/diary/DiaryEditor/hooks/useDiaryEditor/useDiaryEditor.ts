import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { clsx } from "clsx";

/** An editor that starts with `initialBody` and reports every change as HTML. */
export function useDiaryEditor(initialBody: string, onChange: (body: string) => void) {
  return useEditor({
    extensions: [StarterKit],
    content: initialBody,
    // Tiptap calls the handler from the newest render, so it never goes stale.
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
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
}
