import { act, render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, expect, test, vi } from "vitest";

import { EntryHostContext } from "@/hooks/diary/useEntryHost";
import { fakeEntryHost } from "@/lib/diary/fakeEntryHost";
import { preparePicture } from "@/lib/diary/preparePicture";
import { toastError } from "@/lib/ui/toast";
import { HushError } from "@/lib/vault/hushError";

import { DiaryEditor } from "./DiaryEditor";
import type { DiaryEditorHandle } from "./type";

vi.mock("@/lib/ui/toast", () => ({ toastError: vi.fn<(text: string) => void>() }));
vi.mock("@/lib/diary/preparePicture", () => ({
  preparePicture: vi.fn<(file: File) => Promise<Uint8Array>>(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

/** Pastes `files` into the editor, as from the clipboard. */
function paste(container: HTMLElement, files: File[]) {
  const body = container.querySelector(".ProseMirror");
  if (!(body instanceof HTMLElement)) throw new Error("the editor did not render");
  const data = new DataTransfer();
  for (const file of files) data.items.add(file);
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: data });
  body.dispatchEvent(event);
}

const shot = new File([], "shot.png", { type: "image/png" });

test("a pasted picture that cannot be read or saved is told in a toast and not put in", async () => {
  vi.mocked(preparePicture)
    .mockRejectedValueOnce(new Error("not a picture"))
    .mockResolvedValueOnce(new Uint8Array([1]));
  const host = fakeEntryHost({
    saveImage: () => Promise.reject(new HushError("io", "disk full")),
  });
  const onChange = vi.fn<(body: string) => void>();
  const { container } = render(
    <EntryHostContext value={host}>
      <DiaryEditor initialBody="<p></p>" onChange={onChange} disabled={false} />
    </EntryHostContext>,
  );
  paste(container, [shot, shot]);
  await waitFor(() => expect(vi.mocked(toastError)).toHaveBeenCalledTimes(2));
  expect(vi.mocked(toastError).mock.calls).toEqual([
    ["この画像は読み込めませんでした。"],
    [expect.stringMatching(/^画像を保存できませんでした。/)],
  ]);
  expect(onChange).not.toHaveBeenCalled();
});

test("a picture in the entry is read from the app the editor is in", async () => {
  const id = "0123456789abcdef0123456789abcdef";
  const reads: string[] = [];
  const host = fakeEntryHost({
    readImage: async (asked) => {
      reads.push(asked);
      return new Uint8Array([0xff, 0xd8, 0xff]).buffer;
    },
  });
  const { container } = render(
    <EntryHostContext value={host}>
      <DiaryEditor
        initialBody={`<p>海</p><img data-image="${id}">`}
        onChange={() => {}}
        disabled={false}
      />
    </EntryHostContext>,
  );
  await waitFor(() => expect(container.querySelector("img")?.getAttribute("src")).toBeTruthy());
  expect(reads).toEqual([id]);
});

/** Renders an editor of `initialBody` whose pictures are saved as `ids`, in turn, and hands back its handle and change log. */
function renderWithPictures(initialBody: string, ids: string[]) {
  vi.mocked(preparePicture).mockResolvedValue(new Uint8Array([1]));
  const host = fakeEntryHost({
    saveImage: async () => ids[vi.mocked(preparePicture).mock.calls.length - 1],
    readImage: async () => new Uint8Array([0xff, 0xd8, 0xff]).buffer,
  });
  const onChange = vi.fn<(body: string) => void>();
  const editor = createRef<DiaryEditorHandle>();
  render(
    <EntryHostContext value={host}>
      <DiaryEditor ref={editor} initialBody={initialBody} onChange={onChange} disabled={false} />
    </EntryHostContext>,
  );
  return { editor, onChange };
}

const A = "0123456789abcdef0123456789abcdef";
const B = "fedcba9876543210fedcba9876543210";

test("pictures given from outside, before the entry has had focus, go after what is written", async () => {
  const { editor, onChange } = renderWithPictures("<p>朝</p><p>夜</p>", [A, B]);
  act(() => editor.current?.addImages([shot, shot]));
  await waitFor(() =>
    expect(onChange).toHaveBeenLastCalledWith(
      `<p>朝</p><p>夜</p><img data-image="${A}"><img data-image="${B}"><p></p>`,
    ),
  );
});

test("a picture given from outside goes after a picture that ends the entry, not in its place", async () => {
  const { editor, onChange } = renderWithPictures(`<img data-image="${A}">`, [B]);
  act(() => editor.current?.addImages([shot]));
  await waitFor(() =>
    expect(onChange).toHaveBeenLastCalledWith(
      `<img data-image="${A}"><img data-image="${B}"><p></p>`,
    ),
  );
});
