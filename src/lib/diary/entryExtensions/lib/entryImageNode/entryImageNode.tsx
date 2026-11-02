import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { Editor, ReactNodeViewProps } from "@tiptap/react";

import { EntryImage } from "@/components/diary/EntryImage";
import { parseAlign } from "@/lib/diary/imageAlign";
import type { ImageAlign } from "@/lib/diary/imageAlign";
import { parseWidth } from "@/lib/diary/imageWidth";

const NAME = "entryImage";

/** The attribute that holds the image's id in an entry's HTML: `<img data-image="…">`. */
const ID_ATTRIBUTE = "data-image";

/** The attribute that holds the image's width, in percent of the entry's width: `data-width="60"`. */
const WIDTH_ATTRIBUTE = "data-width";

/** The attribute that holds where the image sits, when not on the left: `data-align="center"`. */
const ALIGN_ATTRIBUTE = "data-align";

function EntryImageView({ node, selected, editor, updateAttributes }: ReactNodeViewProps) {
  const width = typeof node.attrs.width === "number" ? node.attrs.width : null;
  return (
    <NodeViewWrapper>
      <EntryImage
        id={String(node.attrs.id)}
        selected={selected}
        width={width}
        align={parseAlign(typeof node.attrs.align === "string" ? node.attrs.align : null)}
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
 * A picture on a line of its own. The entry's HTML keeps the image's id, and
 * the width and alignment it was given, if any; the picture is read from its
 * encrypted file when shown.
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
      align: {
        default: "left",
        parseHTML: (element) => parseAlign(element.getAttribute(ALIGN_ATTRIBUTE)),
        renderHTML: (attributes) =>
          attributes.align === "left" ? {} : { [ALIGN_ATTRIBUTE]: String(attributes.align) },
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

/** Whether the selection is an image that can be changed. */
export function isImageSelected(editor: Editor): boolean {
  return editor.isEditable && editor.isActive(NAME);
}

/** Where the selected image sits; `left` when no image is selected. */
export function selectedImageAlign(editor: Editor): ImageAlign {
  const align: unknown = editor.getAttributes(NAME).align;
  return parseAlign(typeof align === "string" ? align : null);
}

/** Moves the selected image to `align`, keeping it selected. */
export function alignSelectedImage(editor: Editor, align: ImageAlign): void {
  editor.chain().focus().updateAttributes(NAME, { align }).run();
}

/**
 * The selected image's picture, for placing things over it: the node's own
 * box spans the entry's width, wider than a narrowed or aligned picture.
 * `null` when no image is selected.
 */
export function selectedImageBox(editor: Editor): { getBoundingClientRect: () => DOMRect } | null {
  if (!editor.isActive(NAME)) return null;
  const node = editor.view.nodeDOM(editor.state.selection.from);
  const picture = node instanceof HTMLElement ? node.querySelector("img") : null;
  return picture ? { getBoundingClientRect: () => picture.getBoundingClientRect() } : null;
}
