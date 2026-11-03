import { CodeBlock, backtickInputRegex, tildeInputRegex } from "@tiptap/extension-code-block";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  textblockTypeInputRule,
} from "@tiptap/react";
import type { Editor, ReactNodeViewProps } from "@tiptap/react";
import { createHighlightPlugin } from "prosemirror-highlight";

import { EntryCodeBlock } from "@/components/diary/EntryCodeBlock";
import { resolveCodeLanguage } from "@/lib/diary/codeLanguage";

import { shikiParser } from "./lib/shikiParser";

/** A line that is only a fence and an optional language: "```", "```ts". */
const FENCE = /^```([^\s`]*)$/;

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
 * Turns the line the cursor ends into a code block when the line is only a
 * fence, as "```ts" and then Enter. Does nothing, and lets Enter go on, for
 * any other line.
 */
function startCodeBlock(editor: Editor, name: string): boolean {
  const { $from, empty } = editor.state.selection;
  if (!empty || $from.parent.type.name !== "paragraph") return false;
  if ($from.parentOffset !== $from.parent.content.size) return false;
  const fence = FENCE.exec($from.parent.textContent);
  if (!fence) return false;
  return editor
    .chain()
    .command(({ tr }) => {
      tr.delete($from.start(), $from.end());
      return true;
    })
    .setNode(name, { language: resolveCodeLanguage(fence[1] ?? "") })
    .run();
}

/**
 * Code on lines of its own, colored by its language with shiki. The entry's
 * HTML keeps it as `<pre><code class="language-…">`, the language under
 * shiki's id; the colors are drawn when shown and never saved.
 */
export const EntryCodeBlockNode = CodeBlock.extend({
  addKeyboardShortcuts() {
    const shortcuts = this.parent?.() ?? {};
    return {
      ...shortcuts,
      Enter: (props) =>
        startCodeBlock(props.editor, this.name) || (shortcuts.Enter?.(props) ?? false),
    };
  },

  addInputRules() {
    return [backtickInputRegex, tildeInputRegex].map((find) =>
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
