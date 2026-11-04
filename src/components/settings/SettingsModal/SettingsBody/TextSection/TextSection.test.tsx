import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { readSettings } from "@/lib/settings/settings";

import { TextSection } from "./TextSection";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

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

test("pinching the sample changes the setting the fingers' angle picks", () => {
  render(<TextSection />);
  const sample = screen.getByText(/今日は晴れ/);

  // Upright fingers, moved 32px apart: two steps more space between lines.
  fireEvent.pointerDown(sample, touch(1, 100, 100));
  fireEvent.pointerDown(sample, touch(2, 105, 200));
  expect(pinching("行間")).toBe(true);
  fireEvent.pointerMove(sample, touch(2, 105, 232));
  expect(readSettings().text).toEqual({ size: 18, lineHeight: 1.8, letterSpacing: 0 });

  // Once a finger lifts, the pinch is over; a mouse never starts one.
  fireEvent.pointerUp(sample, touch(2, 105, 232));
  expect(pinching("行間")).toBe(false);
  fireEvent.pointerDown(sample, { ...touch(3, 0, 0), pointerType: "mouse" });
  fireEvent.pointerMove(sample, touch(1, 300, 300));
  expect(readSettings().text).toEqual({ size: 18, lineHeight: 1.8, letterSpacing: 0 });
});
