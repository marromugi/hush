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
