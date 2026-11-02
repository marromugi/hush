import { Editor } from "@tiptap/react";
import { expect, test } from "vitest";

import { entryExtensions } from "./entryExtensions";
import { insertEntryImage } from "./lib/entryImageNode";

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
