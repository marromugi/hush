import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { clsx } from "clsx";

export function DiaryEditor() {
  const editor = useEditor({
    extensions: [StarterKit],
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

  return <EditorContent editor={editor} />;
}
