import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { Editor, JSONContent } from "@tiptap/react";

/**
 * Puts `block`, one that holds no text, where the cursor is, and leaves the
 * cursor on the line after it, so a second block goes after the first
 * instead of replacing it. The cursor is brought into view, and kept there
 * while the entry changes height, as a picture or a post does once it is
 * read, until the cursor moves, the editor loses focus, or the window is
 * resized.
 */
export function insertAtomBlock(editor: Editor, block: JSONContent): void {
  editor
    .chain()
    .focus()
    .insertContent(block)
    .command(({ tr }) => {
      // At the end of the entry the block is left selected, with no line after it to type on.
      if (!(tr.selection instanceof NodeSelection)) return true;
      const after = tr.selection.to;
      if (!tr.doc.resolve(after).nodeAfter?.isTextblock) {
        tr.insert(after, editor.schema.nodes.paragraph.create());
      }
      tr.setSelection(TextSelection.create(tr.doc, after + 1));
      return true;
    })
    // `focus` scrolls only when the editor did not have focus yet.
    .scrollIntoView()
    .run();
  followCursor(editor);
}

/**
 * Brings the cursor back into view each time the entry changes height,
 * until the cursor moves, the editor loses focus or is gone, or the window
 * is resized. A window resized by hand leaves the page where it is; the
 * keyboard's own moves reveal the cursor in `useDiaryEditor`.
 */
function followCursor(editor: Editor): void {
  const observer = new ResizeObserver(() => editor.commands.scrollIntoView());
  const stop = () => {
    observer.disconnect();
    editor.off("selectionUpdate", stop);
    editor.off("blur", stop);
    editor.off("destroy", stop);
    window.removeEventListener("resize", stop);
  };
  editor.on("selectionUpdate", stop);
  editor.on("blur", stop);
  editor.on("destroy", stop);
  window.addEventListener("resize", stop);
  observer.observe(editor.view.dom);
}
