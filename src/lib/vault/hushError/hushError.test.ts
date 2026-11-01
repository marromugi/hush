import { describe, expect, test } from "vitest";

import { HushError, toHushError } from "./hushError";

describe("toHushError", () => {
  test("keeps the kind and message a command sent", () => {
    const error = toHushError({ kind: "wrongPassphrase", message: "wrong passphrase" });
    expect(error).toBeInstanceOf(HushError);
    expect(error.kind).toBe("wrongPassphrase");
    expect(error.message).toBe("wrong passphrase");
  });

  test("a kind this app does not know becomes unknown, keeping the message", () => {
    const error = toHushError({ kind: "somethingNew", message: "details" });
    expect(error.kind).toBe("unknown");
    expect(error.message).toBe("details");
  });

  test("the plain string Tauri sends for wrong arguments becomes unknown", () => {
    const error = toHushError("invalid args `passphrase` for command `unlock_vault`");
    expect(error.kind).toBe("unknown");
    expect(error.message).toContain("invalid args");
  });

  test("an Error thrown on the JavaScript side becomes unknown", () => {
    expect(toHushError(new Error("boom")).kind).toBe("unknown");
  });
});
