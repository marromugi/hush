import { Editor } from "@tiptap/react";
import { expect, test } from "vitest";

import { entryExtensions } from "./entryExtensions";

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
