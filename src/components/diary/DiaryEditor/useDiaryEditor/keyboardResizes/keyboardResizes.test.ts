import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { keyboardResizes } from "./keyboardResizes";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** The keyboard's resizes, counting the calls they make. */
function counted() {
  const calls = { count: 0 };
  const keyboard = keyboardResizes(() => (calls.count += 1));
  return { keyboard, calls };
}

test("the keyboard's word, and a resize right after it, are each the keyboard's", () => {
  const { keyboard, calls } = counted();
  keyboard.keyboardMoved();
  keyboard.windowResized();
  expect(calls.count).toBe(2);
});

test("resizes that keep coming after the word are all the keyboard's, past 500 ms from the word", () => {
  const { keyboard, calls } = counted();
  keyboard.keyboardMoved();
  for (let step = 0; step < 4; step += 1) {
    vi.advanceTimersByTime(300);
    keyboard.windowResized();
  }
  expect(calls.count).toBe(5);
});

test("a resize more than 500 ms after the last one is made by hand", () => {
  const { keyboard, calls } = counted();
  keyboard.keyboardMoved();
  vi.advanceTimersByTime(300);
  keyboard.windowResized();
  vi.advanceTimersByTime(501);
  keyboard.windowResized();
  expect(calls.count).toBe(2);
});

test("a resize with no word from the keyboard is made by hand", () => {
  const { keyboard, calls } = counted();
  keyboard.windowResized();
  expect(calls.count).toBe(0);
});
