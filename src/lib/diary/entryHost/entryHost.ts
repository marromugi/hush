/** What a card shows of the page a link points at. */
export type LinkPage = {
  /** `null` when the page names no title. */
  title: string | null;
  /** The page's picture, as an absolute URL; `null` when it names none. */
  imageUrl: string | null;
};

/**
 * What the app an entry is written and read in does for it: keeping its
 * pictures, reading the pages its links point at, serving the pages its
 * videos play in, and telling when the on-screen keyboard has moved. Every
 * failure is rejected as a `HushError`.
 */
export type EntryHost = {
  /** Saves `picture`, a JPEG, PNG, or GIF, as a new encrypted image and resolves with its id. */
  saveImage: (picture: Uint8Array) => Promise<string>;
  /** The picture saved as `id`: a JPEG, PNG, or GIF. */
  readImage: (id: string) => Promise<ArrayBuffer>;
  /** Reads the page at `url`, an `http` or `https` link, for its title and picture. */
  linkPage: (url: string) => Promise<LinkPage>;
  /** The picture at `url`, in whatever format the site sent it. */
  linkImage: (url: string) => Promise<ArrayBuffer>;
  /** Where the pages YouTube videos are shown in are served from, as `http://127.0.0.1:{port}`. */
  embedPagesOrigin: () => Promise<string>;
  /**
   * Calls `onMove` each time the on-screen keyboard has moved and the window
   * was resized to fit. Resolves with the function that stops listening.
   */
  listenKeyboardMoves: (onMove: () => void) => Promise<() => void>;
};
