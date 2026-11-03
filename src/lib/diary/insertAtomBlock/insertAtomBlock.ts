import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { Editor, JSONContent } from "@tiptap/react";

/**
 * Puts `block`, one that holds no text, where the cursor is, and leaves the
 * cursor on the line after it, so a second block goes after the first
 * instead of replacing it.
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
    .run();
}
