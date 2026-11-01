import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createAutoSaver } from "./createAutoSaver";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function recordingSave(result = true) {
  const saved: string[] = [];
  const save = async (body: string) => {
    saved.push(body);
    return result;
  };
  return { saved, save };
}

test("saves only the newest body, once typing pauses", () => {
  const { saved, save } = recordingSave();
  const saver = createAutoSaver(1000);
  saver.schedule("<p>今</p>", save);
  vi.advanceTimersByTime(600);
  saver.schedule("<p>今日</p>", save);
  vi.advanceTimersByTime(600);
  expect(saved).toEqual([]);
  vi.advanceTimersByTime(400);
  expect(saved).toEqual(["<p>今日</p>"]);
});

test("flush saves the waiting body at once and not again later", async () => {
  const { saved, save } = recordingSave();
  const saver = createAutoSaver(1000);
  saver.schedule("<p>今日</p>", save);
  expect(await saver.flush()).toBe(true);
  vi.advanceTimersByTime(1000);
  expect(saved).toEqual(["<p>今日</p>"]);
});

test("flush with nothing waiting reports whether the last save failed", async () => {
  const { save } = recordingSave(false);
  const saver = createAutoSaver(1000);
  saver.schedule("<p>今日</p>", save);
  vi.advanceTimersByTime(1000);
  expect(await saver.flush()).toBe(false);
});

test("flush tries a failed body again", async () => {
  const saved: string[] = [];
  const results = [false, true];
  const save = async (body: string) => {
    saved.push(body);
    return results.shift() ?? true;
  };
  const saver = createAutoSaver(1000);
  saver.schedule("<p>今日</p>", save);
  expect(await saver.flush()).toBe(false);
  expect(await saver.flush()).toBe(true);
  expect(saved).toEqual(["<p>今日</p>", "<p>今日</p>"]);
});
