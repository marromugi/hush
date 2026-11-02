import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { Editor, ReactNodeViewProps } from "@tiptap/react";

import { EntryImage } from "@/components/diary/EntryImage";
import { parseWidth } from "@/lib/diary/imageWidth";

const NAME = "entryImage";

/** The attribute that holds the image's id in an entry's HTML: `<img data-image="…">`. */
const ID_ATTRIBUTE = "data-image";

/** The attribute that holds the image's width, in percent of the entry's width: `data-width="60"`. */
const WIDTH_ATTRIBUTE = "data-width";

function EntryImageView({ node, selected, editor, updateAttributes }: ReactNodeViewProps) {
  const width = typeof node.attrs.width === "number" ? node.attrs.width : null;
  return (
    <NodeViewWrapper>
      <EntryImage
        id={String(node.attrs.id)}
        selected={selected}
        width={width}
        onResize={
          editor.isEditable
            ? (next) => {
                // Locking makes the editor read-only without drawing this again.
                if (editor.isEditable) updateAttributes({ width: next });
              }
            : undefined
        }
      />
    </NodeViewWrapper>
  );
}

/**
 * A picture on a line of its own. The entry's HTML keeps the image's id and
 * the width it was given, if any; the picture is read from its encrypted
 * file when shown.
 */
export const EntryImageNode = Node.create({
  name: NAME,
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute(ID_ATTRIBUTE),
        renderHTML: (attributes) => ({ [ID_ATTRIBUTE]: attributes.id }),
      },
      width: {
        default: null,
        parseHTML: (element) => parseWidth(element.getAttribute(WIDTH_ATTRIBUTE)),
        renderHTML: (attributes) =>
          typeof attributes.width === "number"
            ? { [WIDTH_ATTRIBUTE]: String(attributes.width) }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: `img[${ID_ATTRIBUTE}]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", HTMLAttributes];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EntryImageView);
  },
});

/**
 * Puts the image saved as `id` where the cursor is, and leaves the cursor on
 * the line after it, so a second image goes after the first instead of
 * replacing it.
 */
export function insertEntryImage(editor: Editor, id: string): void {
  editor
    .chain()
    .focus()
    .insertContent({ type: NAME, attrs: { id } })
    .command(({ tr }) => {
      // At the end of the entry the image is left selected, with no line after it to type on.
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
