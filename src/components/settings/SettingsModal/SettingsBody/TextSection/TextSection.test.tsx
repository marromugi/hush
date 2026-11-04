import { selectionFeedback } from "@tauri-apps/plugin-haptics";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { readSettings } from "@/lib/settings/settings";

import { TextSection } from "./TextSection";

vi.mock("@tauri-apps/plugin-haptics", () => ({
  selectionFeedback: vi.fn<typeof selectionFeedback>(),
}));

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
  windowWidth(true);
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

/** Whether the value shown under the sample for this setting is marked as the one being changed. */
const changing = (label: string) =>
  screen.getByText(label, { selector: "dt" }).parentElement?.hasAttribute("data-active");

test("dragging down spreads the lines and dragging left narrows the letters, with a tap a step", () => {
  windowWidth(false);
  render(<TextSection />);
  const sample = screen.getByText(/今日は晴れ/);

  // Down 32px: two steps more space between lines. Drifting sideways on the way does not switch.
  fireEvent.pointerDown(sample, touch(1, 100, 100));
  fireEvent.pointerMove(sample, touch(1, 100, 116));
  expect(changing("行間")).toBe(true);
  fireEvent.pointerMove(sample, touch(1, 110, 132));
  fireEvent.pointerMove(sample, touch(1, 160, 132));
  expect(readSettings().text).toEqual({ size: 18, lineHeight: 1.8, letterSpacing: 0.0 });
  expect(selectionFeedback).toHaveBeenCalledTimes(2);
  fireEvent.pointerUp(sample, touch(1, 160, 132));
  expect(changing("行間")).toBe(false);

  // Up 16px: one step less.
  fireEvent.pointerDown(sample, touch(2, 100, 100));
  fireEvent.pointerMove(sample, touch(2, 100, 84));
  fireEvent.pointerUp(sample, touch(2, 100, 84));
  expect(readSettings().text.lineHeight).toBe(1.7);

  // Right 48px, then back left 16px: two steps more space between letters.
  fireEvent.pointerDown(sample, touch(3, 100, 100));
  fireEvent.pointerMove(sample, touch(3, 148, 100));
  fireEvent.pointerMove(sample, touch(3, 132, 100));
  expect(changing("文字間")).toBe(true);
  fireEvent.pointerUp(sample, touch(3, 132, 100));
  expect(readSettings().text.letterSpacing).toBe(0.02);
});

test("after a pinch, the finger left down does not drag, and one landing beside it pinches again", () => {
  windowWidth(false);
  render(<TextSection />);
  const sample = screen.getByText(/今日は晴れ/);
  fireEvent.pointerDown(sample, touch(1, 100, 100));
  fireEvent.pointerDown(sample, touch(2, 200, 100));
  fireEvent.pointerMove(sample, touch(2, 216, 100));
  fireEvent.pointerUp(sample, touch(2, 216, 100));
  expect(changing("フォントサイズ")).toBe(false);

  fireEvent.pointerMove(sample, touch(1, 100, 300));
  expect(readSettings().text).toEqual({ size: 19, lineHeight: 1.6, letterSpacing: 0 });

  fireEvent.pointerDown(sample, touch(3, 200, 300));
  fireEvent.pointerMove(sample, touch(3, 232, 300));
  expect(readSettings().text.size).toBe(21);
});

test("a short touch changes nothing, and a mouse never does", () => {
  windowWidth(false);
  render(<TextSection />);
  const sample = screen.getByText(/今日は晴れ/);
  fireEvent.pointerDown(sample, touch(1, 100, 100));
  fireEvent.pointerMove(sample, touch(1, 104, 104));
  fireEvent.pointerUp(sample, touch(1, 104, 104));
  // Past the 8px that reads the direction, but short of a whole step.
  fireEvent.pointerDown(sample, touch(4, 100, 100));
  fireEvent.pointerMove(sample, touch(4, 109, 100));
  fireEvent.pointerUp(sample, touch(4, 109, 100));
  fireEvent.pointerDown(sample, touch(5, 100, 100));
  fireEvent.pointerMove(sample, touch(5, 91, 100));
  fireEvent.pointerUp(sample, touch(5, 91, 100));
  fireEvent.pointerDown(sample, { ...touch(2, 100, 100), pointerType: "mouse" });
  fireEvent.pointerMove(sample, { ...touch(2, 100, 300), pointerType: "mouse" });
  expect(readSettings().text).toEqual({ size: 18, lineHeight: 1.6, letterSpacing: 0 });
});

test("two fingers pinch the size, whatever their angle, even after a drag began", () => {
  windowWidth(false);
  render(<TextSection />);
  const sample = screen.getByText(/今日は晴れ/);
  fireEvent.pointerDown(sample, touch(1, 100, 100));
  fireEvent.pointerMove(sample, touch(1, 100, 116));
  expect(changing("行間")).toBe(true);
  fireEvent.pointerDown(sample, touch(2, 200, 116));
  expect(changing("フォントサイズ")).toBe(true);
  fireEvent.pointerMove(sample, touch(2, 232, 116));
  expect(readSettings().text.size).toBe(20);
});

test("a gesture the system cancels is over", () => {
  windowWidth(false);
  render(<TextSection />);
  const sample = screen.getByText(/今日は晴れ/);
  fireEvent.pointerDown(sample, touch(1, 100, 100));
  fireEvent.pointerMove(sample, touch(1, 120, 100));
  expect(changing("文字間")).toBe(true);
  fireEvent.pointerCancel(sample, touch(1, 120, 100));
  expect(changing("文字間")).toBe(false);
  fireEvent.pointerMove(sample, touch(1, 300, 100));
  expect(readSettings().text.letterSpacing).toBe(0.01);
});

test("from md up the sliders change the text, and the gestures do nothing", () => {
  windowWidth(true);
  render(<TextSection />);
  const sample = screen.getByText(/今日は晴れ/);
  fireEvent.pointerDown(sample, touch(1, 100, 100));
  fireEvent.pointerMove(sample, touch(1, 100, 200));
  fireEvent.pointerDown(sample, touch(2, 200, 200));
  fireEvent.pointerMove(sample, touch(2, 300, 300));
  expect(readSettings().text).toEqual({ size: 18, lineHeight: 1.6, letterSpacing: 0 });
  expect(selectionFeedback).not.toHaveBeenCalled();
});
