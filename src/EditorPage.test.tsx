import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

/** The app around the page, answering every message with nothing. */
function fakeApp() {
  const postMessage = vi.fn<(message: unknown) => Promise<null>>(async () => null);
  window.webkit = { messageHandlers: { hushEditor: { postMessage } } };
  return postMessage;
}

/** Opens the page as the app does: the channel first, then what is shown. */
async function openPage() {
  const { installEditorChannel } = await import("@/lib/diary/editorChannel");
  const { EditorPage } = await import("./EditorPage");
  installEditorChannel();
  return render(<EditorPage />);
}

/** Pastes `text` where the cursor is, as from the clipboard. */
function paste(container: HTMLElement, text: string) {
  const body = container.querySelector(".ProseMirror");
  if (!(body instanceof HTMLElement)) throw new Error("the editor did not render");
  const data = new DataTransfer();
  data.setData("text/plain", text);
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: data });
  body.dispatchEvent(event);
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  cleanup();
  delete window.webkit;
  delete window.hushEditor;
});

test("the page shows the entry the app gives, and tells the app each change", async () => {
  const postMessage = fakeApp();
  const { container } = await openPage();
  expect(container.querySelector(".ProseMirror")).toBeNull();

  act(() => window.hushEditor?.load({ body: "<p>雪</p>" }));
  expect(await screen.findByText("雪")).toBeTruthy();
  paste(container, "海");

  await waitFor(() =>
    expect(postMessage).toHaveBeenCalledWith({ kind: "changed", body: "<p>海雪</p>" }),
  );
});

test("a new entry from the app takes the place of the one shown", async () => {
  fakeApp();
  await openPage();

  act(() => window.hushEditor?.load({ body: "<p>雪</p>" }));
  await screen.findByText("雪");
  act(() => window.hushEditor?.load({ body: "<p>雨</p>" }));

  expect(await screen.findByText("雨")).toBeTruthy();
  expect(screen.queryByText("雪")).toBeNull();
});
