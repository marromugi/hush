import { Plugin } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { Editor, ReactNodeViewProps } from "@tiptap/react";

import { EntryLinkCard } from "@/components/diary/EntryLinkCard";
import { fetchLinkCard } from "@/lib/diary/fetchLinkCard";
import type { LinkCardContent } from "@/lib/diary/fetchLinkCard";
import { insertAtomBlock } from "@/lib/diary/insertAtomBlock";
import { parseCardLink, parseCardUrl } from "@/lib/diary/linkCard";
import { toastError } from "@/lib/ui/toast";
import { failureText } from "@/lib/vault/errorText";

const NAME = "entryLinkCard";

/** The attribute that holds the card's link: `data-link-card="https://…"`. */
const URL_ATTRIBUTE = "data-link-card";

/** The attribute that holds the page's title, when it named one: `data-title="…"`. */
const TITLE_ATTRIBUTE = "data-title";

/** The attribute that holds the id the page's picture is saved as, when it has one: `data-image="…"`. */
const IMAGE_ATTRIBUTE = "data-image";

function EntryLinkCardView({ node, selected }: ReactNodeViewProps) {
  const url = parseCardUrl(typeof node.attrs.url === "string" ? node.attrs.url : null);
  return (
    <NodeViewWrapper>
      {url === null ? null : (
        <EntryLinkCard
          url={url}
          title={typeof node.attrs.title === "string" ? node.attrs.title : null}
          image={typeof node.attrs.image === "string" ? node.attrs.image : null}
          loading={typeof node.attrs.pending === "string"}
          selected={selected}
        />
      )}
    </NodeViewWrapper>
  );
}

/** The node's attribute `key`, written as the HTML attribute `name` only when it has a value. */
function optional(key: string, name: string) {
  return {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute(name),
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes[key];
      return typeof value === "string" ? { [name]: value } : {};
    },
  };
}

/**
 * A link on a line of its own, shown as a card with the page's title and
 * picture, made by pasting the link alone on an empty line. The title and
 * picture are read from the page once, when pasted, and kept in the entry:
 * the HTML holds the link, the title, and the id of the saved picture.
 */
export const EntryLinkCardNode = Node.create({
  name: NAME,
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (element) => element.getAttribute(URL_ATTRIBUTE),
        renderHTML: (attributes) => ({ [URL_ATTRIBUTE]: attributes.url }),
      },
      title: optional("title", TITLE_ATTRIBUTE),
      image: optional("image", IMAGE_ATTRIBUTE),
      // The paste a card is waiting on, while its page is read; never written to the entry.
      pending: { default: null, rendered: false, parseHTML: () => null },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[${URL_ATTRIBUTE}]`,
        getAttrs: (element) => (parseCardUrl(element.getAttribute(URL_ATTRIBUTE)) ? null : false),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EntryLinkCardView);
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const { selection } = view.state;
            const line = selection.$from.parent;
            if (!selection.empty || line.type.name !== "paragraph" || line.content.size > 0) {
              return false;
            }
            const url = parseCardLink(event.clipboardData?.getData("text/plain") ?? "");
            if (url === null) return false;
            const pending = crypto.randomUUID();
            insertAtomBlock(editor, { type: NAME, attrs: { url, pending } });
            void readPasted(editor, url, pending);
            return true;
          },
        },
        // A card brought back by redo after its page was read is filled here.
        appendTransaction: (_transactions, _old, state) =>
          editor.isEditable ? fillSettled(state) : null,
      }),
    ];
  },
});

/**
 * What each paste's page gave, by the paste. Kept for as long as the app
 * runs, since undo and redo can take a card away and bring it back.
 */
const settled = new Map<string, LinkCardContent>();

/**
 * Reads the page `url` points at for the card pasted as `pending`, and fills
 * the card. A page that cannot be read leaves the card with only its link,
 * and a toast says why.
 */
async function readPasted(editor: Editor, url: string, pending: string): Promise<void> {
  let content: LinkCardContent = { title: null, image: null };
  try {
    content = await fetchLinkCard(url);
  } catch (failure) {
    toastError(`リンク先を読み込めませんでした。${failureText(failure)}`);
  }
  settled.set(pending, content);
  // Gone once the day changes; read-only while locking. A saved picture stays unused.
  if (editor.isDestroyed || !editor.isEditable) return;
  const tr = fillSettled(editor.state);
  if (tr) editor.view.dispatch(tr);
}

/** Fills each card in `state` whose page has been read. Not a step of its own in undo. */
function fillSettled(state: EditorState): Transaction | null {
  if (settled.size === 0) return null;
  const { tr } = state;
  state.doc.descendants((node, pos) => {
    if (node.type.name !== NAME || typeof node.attrs.pending !== "string") return;
    const content = settled.get(node.attrs.pending);
    if (content) tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...content, pending: null });
  });
  return tr.docChanged ? tr.setMeta("addToHistory", false) : null;
}
