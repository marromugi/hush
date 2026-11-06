import { afterEach, beforeEach, expect, test, vi } from "vitest";

/** The app's message handler, answering each message with `reply`. */
function fakeApp(reply: (message: { kind: string }) => Promise<unknown>) {
  const postMessage = vi.fn<(message: { kind: string }) => Promise<unknown>>(reply);
  window.webkit = { messageHandlers: { hushEditor: { postMessage } } };
  return postMessage;
}

/** A fresh copy of the channel, as on a page just opened. */
async function openPage() {
  return import("./editorChannel");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  delete window.webkit;
  delete window.hushEditor;
});

test("the page tells the app it is ready, and keeps each entry the app gives as a new one", async () => {
  const postMessage = fakeApp(async () => null);
  const channel = await openPage();
  const onLoad = vi.fn<() => void>();
  channel.subscribeLoaded(onLoad);
  channel.installEditorChannel();
  expect(postMessage.mock.calls).toEqual([[{ kind: "ready" }]]);
  expect(channel.loadedEntry()).toBeNull();

  window.hushEditor?.load({ body: "<p>雪</p>" });
  window.hushEditor?.load({ body: "<p>雨</p>" });

  expect(channel.loadedEntry()).toEqual({ entry: { body: "<p>雨</p>" }, count: 2 });
  expect(onLoad).toHaveBeenCalledTimes(2);
  // The app's own call, which the types here cannot hold to `{ body }`.
  const load = window.hushEditor?.load;
  if (!load) throw new Error("the page did not take the app's calls");
  expect(() => Reflect.apply(load, undefined, [{}])).toThrow(TypeError);
});

test("a picture goes to the app and comes back as base64", async () => {
  const postMessage = fakeApp(async (message) =>
    message.kind === "saveImage" ? "0123456789abcdef0123456789abcdef" : "AAH/",
  );
  const { editorChannelHost } = await openPage();

  await expect(editorChannelHost.saveImage(new Uint8Array([0, 1, 255]))).resolves.toBe(
    "0123456789abcdef0123456789abcdef",
  );
  const read = await editorChannelHost.readImage("0123456789abcdef0123456789abcdef");

  expect(postMessage.mock.calls).toEqual([
    [{ kind: "saveImage", picture: "AAH/" }],
    [{ kind: "readImage", id: "0123456789abcdef0123456789abcdef" }],
  ]);
  expect([...new Uint8Array(read)]).toEqual([0, 1, 255]);
});

test("a failure from the app arrives as the kind it names", async () => {
  fakeApp(async (message) => {
    throw new Error(message.kind === "readImage" ? "noImage" : "not a kind");
  });
  const { editorChannelHost } = await openPage();

  await expect(
    editorChannelHost.readImage("0123456789abcdef0123456789abcdef"),
  ).rejects.toMatchObject({ kind: "noImage" });
  await expect(editorChannelHost.embedPagesOrigin()).rejects.toMatchObject({ kind: "unknown" });
});

test("a reply that is not what was asked for is a failure", async () => {
  fakeApp(async () => ({ title: 1, imageUrl: null }));
  const { editorChannelHost } = await openPage();

  await expect(editorChannelHost.linkPage("https://example.com/")).rejects.toMatchObject({
    kind: "unknown",
  });
});

test("the app's word that the keyboard moved reaches the editor until it stops listening", async () => {
  fakeApp(async () => null);
  const channel = await openPage();
  channel.installEditorChannel();
  const onMove = vi.fn<() => void>();
  const stop = await channel.editorChannelHost.listenKeyboardMoves(onMove);

  window.hushEditor?.keyboardMoved();
  stop();
  window.hushEditor?.keyboardMoved();

  expect(onMove).toHaveBeenCalledTimes(1);
});
