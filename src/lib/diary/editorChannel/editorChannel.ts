import type { EntryHost, LinkPage } from "@/lib/diary/entryHost";
import { HushError, toHushError } from "@/lib/vault/hushError";

/**
 * What the editor page and the Swift app around it say to each other.
 *
 * The page sends each message to the WebKit message handler `hushEditor`,
 * which the app adds with a reply. A call resolves with the app's reply;
 * the app fails it by replying with an error whose text is a `HushErrorKind`.
 * Bytes travel as base64 text.
 *
 * The app speaks to the page through `window.hushEditor`.
 */
type ToApp =
  /** The page can be given an entry. Sent once, when the page has started. */
  | { kind: "ready" }
  /** The body as HTML, after every change. */
  | { kind: "changed"; body: string }
  /** Replied with the new image's id. */
  | { kind: "saveImage"; picture: string }
  /** Replied with the picture, as base64. */
  | { kind: "readImage"; id: string }
  /** Replied with `{ title, imageUrl }`, each a string or `null`. */
  | { kind: "linkPage"; url: string }
  /** Replied with the picture, as base64. */
  | { kind: "linkImage"; url: string }
  /** Replied with the origin, as `http://127.0.0.1:{port}`. */
  | { kind: "embedPagesOrigin" };

/** An entry the app gives the page to edit. */
export type LoadedEntry = {
  /** The entry's body as HTML; empty for a day not written yet. */
  body: string;
};

/** What the app calls on the page. */
type FromApp = {
  /** Shows `entry` in a new editor, in place of the one shown before. */
  load: (entry: LoadedEntry) => void;
  /** The on-screen keyboard has moved, and the page was resized to fit. */
  keyboardMoved: () => void;
};

type MessageHandler = { postMessage: (message: ToApp) => Promise<unknown> };

declare global {
  interface Window {
    webkit?: { messageHandlers?: { hushEditor?: MessageHandler } };
    hushEditor?: FromApp;
  }
}

/** Sends `message` to the app and resolves with its reply. */
async function send(message: ToApp): Promise<unknown> {
  const handler = window.webkit?.messageHandlers?.hushEditor;
  if (!handler) {
    throw new HushError("unknown", "the editor page is not inside the app");
  }
  try {
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a WebKit message handler, not window.postMessage
    return await handler.postMessage(message);
  } catch (error) {
    const kind = error instanceof Error ? error.message : String(error);
    throw toHushError({ kind, message: kind });
  }
}

function malformed(kind: ToApp["kind"]): HushError {
  return new HushError("unknown", `the app replied to ${kind} with something else`);
}

async function sendForText(message: ToApp): Promise<string> {
  const reply = await send(message);
  if (typeof reply !== "string") throw malformed(message.kind);
  return reply;
}

async function sendForBytes(message: ToApp): Promise<ArrayBuffer> {
  return fromBase64(await sendForText(message)).buffer;
}

function toBase64(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function isTextOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

async function linkPage(url: string): Promise<LinkPage> {
  const reply = await send({ kind: "linkPage", url });
  if (
    typeof reply !== "object" ||
    reply === null ||
    !("title" in reply) ||
    !("imageUrl" in reply) ||
    !isTextOrNull(reply.title) ||
    !isTextOrNull(reply.imageUrl)
  ) {
    throw malformed("linkPage");
  }
  return { title: reply.title, imageUrl: reply.imageUrl };
}

const keyboardListeners = new Set<() => void>();

/** The app, doing for the entry on this page what its Rust core does. */
export const editorChannelHost: EntryHost = {
  saveImage: (picture) => sendForText({ kind: "saveImage", picture: toBase64(picture) }),
  readImage: (id) => sendForBytes({ kind: "readImage", id }),
  linkPage,
  linkImage: (url) => sendForBytes({ kind: "linkImage", url }),
  embedPagesOrigin: () => sendForText({ kind: "embedPagesOrigin" }),
  listenKeyboardMoves: async (onMove) => {
    keyboardListeners.add(onMove);
    return () => keyboardListeners.delete(onMove);
  },
};

/** The entry last given by the app, and how many have been given, so each is told apart. */
export type Loaded = { entry: LoadedEntry; count: number };

let loaded: Loaded | null = null;
const loadedListeners = new Set<() => void>();

/** The entry the app gave last; `null` until it gives one. */
export function loadedEntry(): Loaded | null {
  return loaded;
}

/** Calls `onLoad` each time the app gives an entry. Returns the function that stops it. */
export function subscribeLoaded(onLoad: () => void): () => void {
  loadedListeners.add(onLoad);
  return () => loadedListeners.delete(onLoad);
}

/** Tells the app the body changed. A failure to tell it is the app's to report. */
export function reportChange(body: string): void {
  void send({ kind: "changed", body }).catch(() => {});
}

/**
 * Lets the app speak to the page through `window.hushEditor`, then tells it
 * the page is ready. Call it once, before anything is shown.
 */
export function installEditorChannel(): void {
  window.hushEditor = {
    load: (entry) => {
      // The app's call fails with this, so a wrong call shows on its side.
      if (typeof entry?.body !== "string") throw new TypeError("load takes { body: string }");
      loaded = { entry: { body: entry.body }, count: (loaded?.count ?? 0) + 1 };
      for (const onLoad of loadedListeners) onLoad();
    },
    keyboardMoved: () => {
      for (const onMove of keyboardListeners) onMove();
    },
  };
  void send({ kind: "ready" }).catch(() => {});
}
