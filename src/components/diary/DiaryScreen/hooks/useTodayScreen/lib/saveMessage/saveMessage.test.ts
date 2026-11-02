import { expect, test } from "vitest";

import { HushError } from "../../../../../../../lib/vault/hushError";
import { saveMessage } from "./saveMessage";

const saved = { date: "2026-11-01", body: "<p>晴れ</p>", createdAtMs: 1, updatedAtMs: 2 };

test("says nothing before anything is written", () => {
  expect(saveMessage({ typed: null, entry: null, saving: false, saveError: null })).toBeNull();
});

test("is saving while typed text is not stored yet", () => {
  expect(
    saveMessage({ typed: "<p>晴れ。</p>", entry: saved, saving: false, saveError: null }),
  ).toEqual({ text: "保存中…", failed: false });
});

test("is saving while a save runs, even for text already stored", () => {
  expect(
    saveMessage({ typed: "<p>晴れ</p>", entry: saved, saving: true, saveError: null }),
  ).toEqual({
    text: "保存中…",
    failed: false,
  });
});

test("is saved once the typed text is stored", () => {
  expect(
    saveMessage({ typed: "<p>晴れ</p>", entry: saved, saving: false, saveError: null }),
  ).toEqual({
    text: "保存しました",
    failed: false,
  });
});

test("a failed save says why, even while more is typed", () => {
  const saveError = new HushError("io", "file access failed");
  expect(saveMessage({ typed: "<p>晴れ。</p>", entry: saved, saving: false, saveError })).toEqual({
    text: "ファイルの読み書きに失敗しました。",
    failed: true,
  });
});
