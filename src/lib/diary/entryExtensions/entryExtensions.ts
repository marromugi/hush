import { StarterKit } from "@tiptap/starter-kit";

import type { EntryHost } from "@/lib/diary/entryHost";

import { EntryCodeBlockNode } from "./entryCodeBlock";
import { EntryEmbedNode } from "./entryEmbedNode";
import { EntryImageNode } from "./entryImageNode";
import { entryLinkCardNode } from "./entryLinkCardNode";

/**
 * What an entry's body can hold, the same whether it is written or read.
 * `host` reads the page of a link pasted as a card.
 */
export function entryExtensions(host: EntryHost) {
  return [
    StarterKit.configure({ codeBlock: false }),
    EntryCodeBlockNode,
    EntryImageNode,
    EntryEmbedNode,
    entryLinkCardNode(host),
  ];
}
