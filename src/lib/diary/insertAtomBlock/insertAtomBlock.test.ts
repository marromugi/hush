import { Editor, Node } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, expect, test, vi } from "vitest";

import { insertAtomBlock } from "./insertAtomBlock";

const Box = Node.create({
  name: "box",
  group: "block",
  atom: true,
  parseHTML: () => [{ tag: "div[data-box]" }],
  renderHTML: () => ["div", { "data-box": "" }],
});

/** The entry's height changing, as the editor's resize observer would hear it. */
let resized: () => void = () => {};

afterEach(() => {
  vi.unstubAllGlobals();
  resized = () => {};
});

/** An editor on `content` that counts the times it is asked to bring the cursor into view. */
function editorOn(content: string) {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      private active = true;
      constructor(callback: () => void) {
        resized = () => {
          if (this.active) callback();
        };
      }
      observe() {}
      disconnect() {
        this.active = false;
      }
    },
  );
  const editor = new Editor({ extensions: [StarterKit, Box], content });
  const scrolls = { count: 0 };
  editor.on("transaction", ({ transaction }) => {
    if (transaction.scrolledIntoView) scrolls.count += 1;
  });
  return { editor, scrolls };
}

test("a block put in brings the cursor on the line after it into view", () => {
  const { editor, scrolls } = editorOn("<p>海</p>");
  editor.commands.setTextSelection(2);
  insertAtomBlock(editor, { type: "box" });
  expect(scrolls.count).toBe(1);
  editor.destroy();
});

test("while the cursor stays after the block, the entry changing height brings it back into view", () => {
  const { editor, scrolls } = editorOn("<p>海</p>");
  editor.commands.setTextSelection(2);
  insertAtomBlock(editor, { type: "box" });
  resized();
  resized();
  expect(scrolls.count).toBe(3);
  editor.destroy();
});

test.each([
  ["the cursor moves", (editor: Editor) => editor.commands.setTextSelection(1)],
  ["the editor loses focus", (editor: Editor) => editor.view.dom.dispatchEvent(new Event("blur"))],
  ["the window is resized", () => window.dispatchEvent(new Event("resize"))],
])("once %s, the entry changing height leaves the page where it is", (_, moveOn) => {
  const { editor, scrolls } = editorOn("<p>海</p>");
  editor.commands.setTextSelection(2);
  insertAtomBlock(editor, { type: "box" });
  moveOn(editor);
  const before = scrolls.count;
  resized();
  expect(scrolls.count).toBe(before);
  editor.destroy();
});

test("once the editor is gone, the entry changing height does nothing", () => {
  const { editor } = editorOn("<p>海</p>");
  editor.commands.setTextSelection(2);
  insertAtomBlock(editor, { type: "box" });
  editor.destroy();
  expect(() => resized()).not.toThrow();
});
