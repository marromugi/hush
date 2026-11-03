import { expect, test } from "vitest";

import { tweetMessage } from "./tweetMessage";

const message = (call: object) => JSON.stringify({ "twttr.embed": { jsonrpc: "2.0", ...call } });

test("a request from the embed is answered with its own id", () => {
  const read = tweetMessage(
    message({ method: "twttr.private.initialized", id: "embed-0", params: [{ data: {} }] }),
  );
  expect(read).toEqual({
    reply: { "twttr.embed": { jsonrpc: "2.0", id: "embed-0" } },
    height: null,
  });
});

test("a resize tells the height, rounded up to a whole pixel", () => {
  const read = tweetMessage(
    message({
      method: "twttr.private.resize",
      id: "embed-0",
      params: [{ width: 550, height: 224.5 }],
    }),
  );
  expect(read?.height).toBe(225);
});

test("a message posted as an object is read the same as one posted as JSON text", () => {
  const call = { method: "twttr.private.resize", id: "embed-0", params: [{ height: 300 }] };
  expect(tweetMessage({ "twttr.embed": { jsonrpc: "2.0", ...call } })).toEqual(
    tweetMessage(message(call)),
  );
});

test("a resize without a usable height tells none", () => {
  for (const params of [[{ height: "tall" }], [{ height: 0 }], [], undefined]) {
    expect(tweetMessage(message({ method: "twttr.private.resize", params }))?.height).toBeNull();
  }
});

test("a notice with no id needs no answer", () => {
  expect(tweetMessage(message({ method: "twttr.private.rendered" }))?.reply).toBeNull();
});

test("anything else is not read as a message from the embed", () => {
  for (const data of [
    { "twttr.embed": {} },
    "not json",
    "null",
    null,
    42,
    '{"settings":{}}',
    message({}),
  ]) {
    expect(tweetMessage(data)).toBeNull();
  }
});
