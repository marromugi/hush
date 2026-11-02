import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { watchIdle } from "./watchIdle";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("fires once the time passes with nothing happening, and again after as long", () => {
  const target = new EventTarget();
  let fired = 0;
  watchIdle(target, 1000, () => (fired += 1));
  vi.advanceTimersByTime(999);
  expect(fired).toBe(0);
  vi.advanceTimersByTime(1);
  expect(fired).toBe(1);
  vi.advanceTimersByTime(1000);
  expect(fired).toBe(2);
});

test.each(["keydown", "input", "pointerdown", "pointermove", "wheel"])(
  "%s starts the wait over",
  (type) => {
    const target = new EventTarget();
    let fired = 0;
    watchIdle(target, 1000, () => (fired += 1));
    vi.advanceTimersByTime(900);
    target.dispatchEvent(new Event(type));
    vi.advanceTimersByTime(900);
    expect(fired).toBe(0);
    vi.advanceTimersByTime(100);
    expect(fired).toBe(1);
  },
);

test("stopping ends the watch", () => {
  const target = new EventTarget();
  let fired = 0;
  const stop = watchIdle(target, 1000, () => (fired += 1));
  stop();
  vi.advanceTimersByTime(5000);
  expect(fired).toBe(0);
});
