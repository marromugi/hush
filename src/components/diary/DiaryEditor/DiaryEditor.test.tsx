import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { preparePicture } from "@/lib/diary/preparePicture";
import { toastError } from "@/lib/ui/toast";

import { DiaryEditor } from "./DiaryEditor";

vi.mock("@/lib/ui/toast", () => ({ toastError: vi.fn<(text: string) => void>() }));
vi.mock("@/lib/diary/preparePicture", () => ({
  preparePicture: vi.fn<(file: File) => Promise<Uint8Array>>(),
}));

afterEach(() => {
  clearMocks();
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
  mockIPC(() => {
    throw { kind: "io", message: "disk full" };
  });
  const onChange = vi.fn<(body: string) => void>();
  const { container } = render(
    <DiaryEditor initialBody="<p></p>" onChange={onChange} disabled={false} />,
  );
  paste(container, [shot, shot]);
  await waitFor(() => expect(vi.mocked(toastError)).toHaveBeenCalledTimes(2));
  expect(vi.mocked(toastError).mock.calls).toEqual([
    ["この画像は読み込めませんでした。"],
    [expect.stringMatching(/^画像を保存できませんでした。/)],
  ]);
  expect(onChange).not.toHaveBeenCalled();
});
