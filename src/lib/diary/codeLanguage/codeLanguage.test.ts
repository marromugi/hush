import { expect, test } from "vitest";

import { codeLanguageName, resolveCodeLanguage } from "./codeLanguage";

test("an alias written after ``` becomes shiki's id", () => {
  expect(resolveCodeLanguage("ts")).toBe("typescript");
  expect(resolveCodeLanguage("Python")).toBe("python");
});

test("nothing, or plain text, means no language", () => {
  expect(resolveCodeLanguage("")).toBeNull();
  expect(resolveCodeLanguage("text")).toBeNull();
});

test("a name shiki does not know is kept, lowercased", () => {
  expect(resolveCodeLanguage("MyLang")).toBe("mylang");
});

test("a language is shown by its name, and an unknown one as written", () => {
  expect(codeLanguageName("typescript")).toBe("TypeScript");
  expect(codeLanguageName(null)).toBe("テキスト");
  expect(codeLanguageName("mylang")).toBe("mylang");
});
