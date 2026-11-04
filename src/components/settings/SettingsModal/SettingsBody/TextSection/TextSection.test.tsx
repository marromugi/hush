import { selectionFeedback } from "@tauri-apps/plugin-haptics";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { readSettings } from "@/lib/settings/settings";

import { TextSection } from "./TextSection";

vi.mock("@tauri-apps/plugin-haptics", () => ({ selectionFeedback: vi.fn<typeof selectionFeedback>() }));

beforeEach(() => {
  vi.mocked(selectionFeedback).mockResolvedValue({ status: "ok", data: null });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

/** A window as wide as a phone (below md) or a desktop (md and up). */
class FakeWindow extends EventTarget implements MediaQueryList {
  media = "";
  onchange = null;
  constructor(public matches: boolean) {
    super();
  }
  addListener() {}
  removeListener() {}
}

function windowWidth(wide: boolean) {
  vi.spyOn(window, "matchMedia").mockReturnValue(new FakeWindow(wide));
}

test("each slider changes its own setting, and reset keeps the focus", () => {
  render(<TextSection />);
  fireEvent.change(screen.getByLabelText("フォントサイズ"), { target: { value: "20" } });
  fireEvent.change(screen.getByLabelText("行間"), { target: { value: "1.8" } });
  fireEvent.change(screen.getByLabelText("文字間"), { target: { value: "0.05" } });
  expect(readSettings().text).toEqual({ size: 20, lineHeight: 1.8, letterSpacing: 0.05 });
  expect(screen.getByLabelText("行間").getAttribute("aria-valuetext")).toBe("1.8 倍");

  const reset = screen.getByRole("button", { name: "元に戻す" });
  reset.focus();
  act(() => reset.click());
  expect(readSettings().text).toEqual({ size: 18, lineHeight: 1.6, letterSpacing: 0 });
  expect(reset.getAttribute("aria-disabled")).toBe("true");
  expect(document.activeElement).toBe(reset);
});

const touch = (id: number, x: number, y: number) => ({
  pointerId: id,
  pointerType: "touch",
  clientX: x,
  clientY: y,
});

/** Whether the value shown under the sample for this setting is marked as the one being pinched. */
const pinching = (label: string) =>
  screen.getByText(label, { selector: "dt" }).parentElement?.hasAttribute("data-active");

test("pinching the sample changes the setting the fingers' angle picks, with a tap a step", () => {
  windowWidth(false);
  render(<TextSection />);
  const sample = screen.getByText(/今日は晴れ/);

  // Upright fingers, moved 32px apart: two steps more space between lines.
  fireEvent.pointerDown(sample, touch(1, 100, 100));
  fireEvent.pointerDown(sample, touch(2, 105, 200));
  expect(pinching("行間")).toBe(true);
  fireEvent.pointerMove(sample, touch(2, 105, 216));
  fireEvent.pointerMove(sample, touch(2, 105, 232));
  expect(readSettings().text).toEqual({ size: 18, lineHeight: 1.8, letterSpacing: 0 });
  expect(selectionFeedback).toHaveBeenCalledTimes(2);

  // Tilting the fingers on the way does not switch to another setting.
  fireEvent.pointerMove(sample, touch(2, 260, 232));
  expect(readSettings().text).toEqual({ size: 18, lineHeight: 1.8, letterSpacing: 0 });

  // Once a finger lifts, the pinch is over; a mouse never starts one.
  fireEvent.pointerUp(sample, touch(2, 260, 232));
  expect(pinching("行間")).toBe(false);
  fireEvent.pointerDown(sample, { ...touch(3, 0, 0), pointerType: "mouse" });
  fireEvent.pointerMove(sample, touch(1, 300, 300));
  expect(readSettings().text).toEqual({ size: 18, lineHeight: 1.8, letterSpacing: 0 });
});

test("a pinch the system cancels is over", () => {
  windowWidth(false);
  render(<TextSection />);
  const sample = screen.getByText(/今日は晴れ/);
  fireEvent.pointerDown(sample, touch(1, 100, 100));
  fireEvent.pointerDown(sample, touch(2, 200, 105));
  expect(pinching("文字間")).toBe(true);
  fireEvent.pointerCancel(sample, touch(2, 200, 105));
  expect(pinching("文字間")).toBe(false);
  fireEvent.pointerMove(sample, touch(1, 0, 100));
  expect(readSettings().text.letterSpacing).toBe(0);
});

test("from md up the sliders change the text, and pinching does nothing", () => {
  windowWidth(true);
  render(<TextSection />);
  const sample = screen.getByText(/今日は晴れ/);
  fireEvent.pointerDown(sample, touch(1, 100, 100));
  fireEvent.pointerDown(sample, touch(2, 200, 200));
  fireEvent.pointerMove(sample, touch(2, 300, 300));
  expect(readSettings().text.size).toBe(18);
  expect(selectionFeedback).not.toHaveBeenCalled();
});
