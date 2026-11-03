import { CodeBlock } from "@tiptap/extension-code-block";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  textblockTypeInputRule,
} from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { createHighlightPlugin } from "prosemirror-highlight";

import { EntryCodeBlock } from "@/components/diary/EntryCodeBlock";
import { resolveCodeLanguage } from "@/lib/diary/codeLanguage";

import { shikiParser } from "./shikiParser";

/**
 * A line that is only a fence and an optional language, then a space or
 * Enter: "```", "```ts", "~~~c++". Tiptap runs input rules on Enter with
 * the text "\n".
 */
const FENCES = [/^```([^\s`]*)[\s\n]$/, /^~~~([^\s~]*)[\s\n]$/];

function EntryCodeBlockView({ node, editor, getPos, updateAttributes }: ReactNodeViewProps) {
  const language =
    typeof node.attrs.language === "string" ? resolveCodeLanguage(node.attrs.language) : null;
  return (
    <NodeViewWrapper>
      <EntryCodeBlock
        language={language}
        onLanguageChange={
          editor.isEditable
            ? (next) => {
                // Locking makes the editor read-only without drawing this again.
                if (!editor.isEditable) return;
                updateAttributes({ language: next });
                // Back to writing, at the end of the code.
                const pos = getPos();
                if (pos !== undefined) {
                  editor.commands.focus(pos + node.nodeSize - 1, { scrollIntoView: false });
                }
              }
            : undefined
        }
      >
        <pre>
          <NodeViewContent<"code"> as="code" />
        </pre>
      </EntryCodeBlock>
    </NodeViewWrapper>
  );
}

/**
 * Code on lines of its own, colored by its language with shiki. The entry's
 * HTML keeps it as `<pre><code class="language-…">`, the language under
 * shiki's id; the colors are drawn when shown and never saved.
 */
export const EntryCodeBlockNode = CodeBlock.extend({
  addInputRules() {
    return FENCES.map((find) =>
      textblockTypeInputRule({
        find,
        type: this.type,
        getAttributes: (match) => ({ language: resolveCodeLanguage(match[1] ?? "") }),
      }),
    );
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      createHighlightPlugin({ parser: shikiParser, nodeTypes: [this.name] }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EntryCodeBlockView);
  },
});
