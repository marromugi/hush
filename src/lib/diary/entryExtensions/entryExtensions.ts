import { StarterKit } from "@tiptap/starter-kit";

import { EntryCodeBlockNode } from "./entryCodeBlock";
import { EntryEmbedNode } from "./entryEmbedNode";
import { EntryImageNode } from "./entryImageNode";

/** What an entry's body can hold, the same whether it is written or read. */
export const entryExtensions = [
  StarterKit.configure({ codeBlock: false }),
  EntryCodeBlockNode,
  EntryImageNode,
  EntryEmbedNode,
];
