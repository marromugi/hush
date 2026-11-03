/** What a message from X's embed page asks of the page around it. */
export type TweetMessage = {
  /** The answer to post back, for a message that waits for one. */
  reply: object | null;
  /** The height, in pixels, the post needs to be shown whole. */
  height: number | null;
};

/**
 * Reads a message posted by X's embed page: JSON-RPC 2.0 under
 * `twttr.embed`, as an object or as JSON text. The page shows the post only
 * once its requests are answered, as X's own script answers them, and then
 * tells the height it needs. `null` for anything else.
 */
export function tweetMessage(data: unknown): TweetMessage | null {
  const call = field(parsed(data), "twttr.embed");
  const method = field(call, "method");
  if (typeof method !== "string") return null;

  const id = field(call, "id");
  const reply =
    typeof id === "string" || typeof id === "number"
      ? { "twttr.embed": { jsonrpc: "2.0", id } }
      : null;
  const params = field(call, "params");
  const height =
    method === "twttr.private.resize" && Array.isArray(params)
      ? Number(field(params[0], "height"))
      : NaN;
  return { reply, height: Number.isFinite(height) && height > 0 ? Math.ceil(height) : null };
}

/** `data` itself, or what it holds when it is JSON text; `undefined` for text that is not JSON. */
function parsed(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}

/** The field `key` of `value`, when `value` is an object that has it. */
function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
}
