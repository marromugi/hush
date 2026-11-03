import { StarterKit } from "@tiptap/starter-kit";

import { EntryCodeBlockNode } from "./lib/entryCodeBlock";
import { EntryImageNode } from "./lib/entryImageNode";

/** What an entry's body can hold, the same whether it is written or read. */
export const entryExtensions = [
  StarterKit.configure({ codeBlock: false }),
  EntryCodeBlockNode,
  EntryImageNode,
];
