// @vitest-environment-options {"settings":{"disableIframePageLoading":true}}
import { act, render } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { EntryEmbed } from "./EntryEmbed";

const X_ORIGIN = "https://platform.twitter.com";

const resize = (height: number) =>
  JSON.stringify({
    "twttr.embed": {
      jsonrpc: "2.0",
      method: "twttr.private.resize",
      id: "embed-0",
      params: [{ height }],
    },
  });

/** Shows a post on X, with a stand-in for the page inside its frame. */
function showPost() {
  const { container } = render(<EntryEmbed embed={{ site: "x", id: "20" }} />);
  const frame = container.querySelector("iframe");
  if (!frame) throw new Error("no frame");
  const postMessage = vi.fn<(message: unknown, origin: string) => void>();
  const page = { postMessage };
  Object.defineProperty(frame, "contentWindow", { value: page });
  return { frame, page, postMessage };
}

/** A message posted to Hush's page, as from `source`. */
function send(data: string, origin: string, source: object | null) {
  const event = new Event("message");
  Object.defineProperties(event, {
    data: { value: data },
    origin: { value: origin },
    source: { value: source },
  });
  act(() => {
    window.dispatchEvent(event);
  });
}

test("a post on X takes the height its page tells, and the page is answered on X's origin", () => {
  const { frame, page, postMessage } = showPost();
  send(resize(300), X_ORIGIN, page);
  expect(frame.style.height).toBe("300px");
  expect(postMessage).toHaveBeenCalledWith(
    { "twttr.embed": { jsonrpc: "2.0", id: "embed-0" } },
    X_ORIGIN,
  );
});

test("a message from another origin, or from another frame, is neither taken nor answered", () => {
  const { frame, page, postMessage } = showPost();
  send(resize(300), "https://example.com", page);
  send(resize(300), X_ORIGIN, {});
  expect(frame.style.height).toBe("");
  expect(postMessage).not.toHaveBeenCalled();
});
