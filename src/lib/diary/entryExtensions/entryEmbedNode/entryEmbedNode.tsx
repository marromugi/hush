import { Plugin } from "@tiptap/pm/state";
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";

import { EntryEmbed } from "@/components/diary/EntryEmbed";
import { parseEmbed, parseEmbedLink } from "@/lib/diary/embedLink";
import { insertAtomBlock } from "@/lib/diary/insertAtomBlock";

const NAME = "entryEmbed";

/** The attribute that holds the site the embed comes from: `data-embed="youtube"`, `data-embed="x"`. */
const SITE_ATTRIBUTE = "data-embed";

/** The attribute that holds the video's or post's id on that site: `data-id="…"`. */
const ID_ATTRIBUTE = "data-id";

function EntryEmbedView({ node, selected }: ReactNodeViewProps) {
  const embed = parseEmbed(String(node.attrs.site), String(node.attrs.id));
  return (
    <NodeViewWrapper>
      {embed ? <EntryEmbed embed={embed} selected={selected} /> : null}
    </NodeViewWrapper>
  );
}

/**
 * A YouTube video or a post on X on a line of its own, made by pasting its
 * link on its own. The entry's HTML keeps only the site and the id; the
 * video or post is read from the site each time it is shown. Pasted into
 * code, the link stays text.
 */
export const EntryEmbedNode = Node.create({
  name: NAME,
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      site: {
        default: null,
        parseHTML: (element) => element.getAttribute(SITE_ATTRIBUTE),
        renderHTML: (attributes) => ({ [SITE_ATTRIBUTE]: attributes.site }),
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute(ID_ATTRIBUTE),
        renderHTML: (attributes) => ({ [ID_ATTRIBUTE]: attributes.id }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[${SITE_ATTRIBUTE}]`,
        getAttrs: (element) =>
          parseEmbed(element.getAttribute(SITE_ATTRIBUTE), element.getAttribute(ID_ATTRIBUTE))
            ? null
            : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EntryEmbedView);
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            if (view.state.selection.$from.parent.type.spec.code) return false;
            const embed = parseEmbedLink(event.clipboardData?.getData("text/plain") ?? "");
            if (!embed) return false;
            insertAtomBlock(editor, { type: NAME, attrs: { site: embed.site, id: embed.id } });
            return true;
          },
        },
      }),
    ];
  },
});
