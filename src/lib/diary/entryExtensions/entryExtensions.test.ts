import { Editor } from "@tiptap/react";
import { expect, test } from "vitest";

import { entryExtensions } from "./entryExtensions";
import {
  alignSelectedImage,
  insertEntryImage,
  isImageSelected,
  selectedImageAlign,
} from "./entryImageNode";

test("an image in an entry's HTML is read back and written as the same HTML", () => {
  const body =
    '<p>海へ行った。</p><img data-image="0123456789abcdef0123456789abcdef"><p>また行きたい。</p>';
  const editor = new Editor({ extensions: entryExtensions, content: body });
  expect(editor.getHTML()).toBe(body);
  editor.destroy();
});

test("an image with no id in the entry is not kept", () => {
  const editor = new Editor({ extensions: entryExtensions, content: '<p>a</p><img src="x.png">' });
  expect(editor.getHTML()).toBe("<p>a</p>");
  editor.destroy();
});

test("images inserted one after another all stay, in order", () => {
  const editor = new Editor({ extensions: entryExtensions, content: "<p>海</p>" });
  editor.commands.setTextSelection(2);
  insertEntryImage(editor, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  insertEntryImage(editor, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  expect(editor.getHTML()).toBe(
    '<p>海</p><img data-image="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"><img data-image="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"><p></p>',
  );
  editor.destroy();
});

test("an image put inside a line splits it and leaves the cursor before the rest", () => {
  const editor = new Editor({ extensions: entryExtensions, content: "<p>海へ</p>" });
  editor.commands.setTextSelection(2);
  insertEntryImage(editor, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  editor.commands.insertContent("x");
  expect(editor.getHTML()).toBe(
    '<p>海</p><img data-image="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"><p>xへ</p>',
  );
  editor.destroy();
});

test("an image's width is read back and written as the same HTML", () => {
  const body = '<img data-image="0123456789abcdef0123456789abcdef" data-width="60"><p>海</p>';
  const editor = new Editor({ extensions: entryExtensions, content: body });
  expect(editor.getHTML()).toBe(body);
  editor.destroy();
});

test("a width out of range is dropped, leaving the image at its own size", () => {
  const editor = new Editor({
    extensions: entryExtensions,
    content: '<img data-image="0123456789abcdef0123456789abcdef" data-width="500">',
  });
  expect(editor.getHTML()).toBe('<img data-image="0123456789abcdef0123456789abcdef">');
  editor.destroy();
});

test("an image's alignment is read back and written as the same HTML", () => {
  const body =
    '<img data-image="0123456789abcdef0123456789abcdef" data-width="60" data-align="center"><p>海</p>';
  const editor = new Editor({ extensions: entryExtensions, content: body });
  expect(editor.getHTML()).toBe(body);
  editor.destroy();
});

test("aligning the selected image writes it, and moving it back to the left writes nothing", () => {
  const id = "0123456789abcdef0123456789abcdef";
  const editor = new Editor({
    extensions: entryExtensions,
    content: `<img data-image="${id}"><p>海</p>`,
  });
  editor.commands.setNodeSelection(0);
  alignSelectedImage(editor, "right");
  expect(selectedImageAlign(editor)).toBe("right");
  expect(editor.getHTML()).toBe(`<img data-image="${id}" data-align="right"><p>海</p>`);
  alignSelectedImage(editor, "left");
  expect(editor.getHTML()).toBe(`<img data-image="${id}"><p>海</p>`);
  editor.destroy();
});

test("a selected image can be changed only while the entry can be written", () => {
  const id = "0123456789abcdef0123456789abcdef";
  const editor = new Editor({
    extensions: entryExtensions,
    content: `<img data-image="${id}"><p>海</p>`,
  });
  editor.commands.setNodeSelection(0);
  expect(isImageSelected(editor)).toBe(true);
  editor.setEditable(false, false);
  expect(isImageSelected(editor)).toBe(false);
  alignSelectedImage(editor, "center");
  expect(editor.getHTML()).toBe(`<img data-image="${id}"><p>海</p>`);
  editor.destroy();
});

test("text that is selected is not an image", () => {
  const editor = new Editor({ extensions: entryExtensions, content: "<p>海</p>" });
  editor.commands.selectAll();
  expect(isImageSelected(editor)).toBe(false);
  editor.destroy();
});

/** Presses Enter in the editor, as the keyboard would. */
function pressEnter(editor: Editor): void {
  editor.view.someProp("handleKeyDown", (handle) =>
    handle(editor.view, new KeyboardEvent("keydown", { key: "Enter" })),
  );
}

test("a code block in an entry's HTML is read back and written as the same HTML", () => {
  const body = '<pre><code class="language-typescript">const a = 1;</code></pre><p>海</p>';
  const editor = new Editor({ extensions: entryExtensions, content: body });
  expect(editor.getHTML()).toBe(body);
  editor.destroy();
});

test("a fence and Enter turn the line into a code block of that language", () => {
  const editor = new Editor({ extensions: entryExtensions, content: "<p>```ts</p>" });
  editor.commands.focus("end");
  pressEnter(editor);
  editor.commands.insertContent("x");
  expect(editor.getHTML()).toBe('<pre><code class="language-typescript">x</code></pre><p></p>');
  editor.destroy();
});

test("a fence alone and Enter make a code block with no language", () => {
  const editor = new Editor({ extensions: entryExtensions, content: "<p>```</p>" });
  editor.commands.focus("end");
  pressEnter(editor);
  expect(editor.getHTML()).toBe("<pre><code></code></pre><p></p>");
  editor.destroy();
});

test("a language with capitals or signs after the fence is read too", () => {
  const editor = new Editor({ extensions: entryExtensions, content: "<p>```C++</p>" });
  editor.commands.focus("end");
  pressEnter(editor);
  expect(editor.getHTML()).toBe('<pre><code class="language-cpp"></code></pre><p></p>');
  editor.destroy();
});

test("a fence and Enter in a list item leave the list whole", () => {
  const body = "<ul><li><p>a</p></li><li><p>```</p></li><li><p>b</p></li></ul>";
  const editor = new Editor({ extensions: entryExtensions, content: body });
  editor.commands.setTextSelection(11);
  expect(editor.state.selection.$from.parent.textContent).toBe("```");
  pressEnter(editor);
  expect(editor.getHTML()).not.toContain("<pre>");
  expect(editor.getHTML().match(/<ul>/g)).toHaveLength(1);
  editor.destroy();
});

test("Enter on a line with more than a fence splits the line as usual", () => {
  const editor = new Editor({ extensions: entryExtensions, content: "<p>```ts は</p>" });
  editor.commands.focus("end");
  pressEnter(editor);
  expect(editor.getHTML()).toBe("<p>```ts は</p><p></p>");
  editor.destroy();
});

test("a fence and a space also start a code block, with the language under shiki's id", () => {
  const editor = new Editor({ extensions: entryExtensions, content: "<p></p>" });
  editor.commands.focus("end");
  editor.commands.insertContent("```py");
  const { from } = editor.state.selection;
  editor.view.someProp("handleTextInput", (handle) =>
    handle(editor.view, from, from, " ", () => editor.state.tr.insertText(" ", from, from)),
  );
  expect(editor.getHTML()).toBe('<pre><code class="language-python"></code></pre><p></p>');
  editor.destroy();
});
