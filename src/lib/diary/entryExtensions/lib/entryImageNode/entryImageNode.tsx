import { Node, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";

import { EntryImage } from "@/components/diary/EntryImage";

const NAME = "entryImage";

/** The attribute that holds the image's id in an entry's HTML: `<img data-image="…">`. */
const ID_ATTRIBUTE = "data-image";

function EntryImageView({ node, selected }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper>
      <EntryImage id={String(node.attrs.id)} selected={selected} />
    </NodeViewWrapper>
  );
}

/**
 * A picture on a line of its own. The entry's HTML keeps only the image's id;
 * the picture is read from its encrypted file when shown.
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

/** Content that inserts the image saved as `id`. */
export function entryImage(id: string) {
  return { type: NAME, attrs: { id } };
}
