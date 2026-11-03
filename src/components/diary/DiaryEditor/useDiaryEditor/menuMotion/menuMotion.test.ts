import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { settle, slideNextMove, stopSliding } from "./menuMotion";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("a menu jumps when it moves, unless it was told to slide", () => {
  const menu = document.createElement("div");
  settle(menu);
  expect(menu.dataset.slide).toBeUndefined();
  slideNextMove(menu);
  expect(menu.dataset.slide).toBe("");
});

test("once moved, a sliding menu goes back to jumping after the move has had time to finish", () => {
  const menu = document.createElement("div");
  slideNextMove(menu);
  settle(menu);
  vi.advanceTimersByTime(100);
  expect(menu.dataset.slide).toBe("");
  vi.advanceTimersByTime(200);
  expect(menu.dataset.slide).toBeUndefined();
});

test("moves that keep coming, as while the window is resized, keep it sliding", () => {
  const menu = document.createElement("div");
  slideNextMove(menu);
  settle(menu);
  vi.advanceTimersByTime(150);
  slideNextMove(menu);
  settle(menu);
  vi.advanceTimersByTime(150);
  expect(menu.dataset.slide).toBe("");
});

test("a menu that appears jumps to its place, even if it was told to slide", () => {
  const menu = document.createElement("div");
  slideNextMove(menu);
  settle(menu);
  stopSliding(menu);
  expect(menu.dataset.slide).toBeUndefined();
  vi.advanceTimersByTime(500);
  expect(menu.dataset.slide).toBeUndefined();
});
