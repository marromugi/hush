import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, beforeAll, expect, test } from "vitest";

import { RadialMenu } from "./RadialMenu";

// What is tested is what opens and where the focus goes, not the motion.
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

afterEach(cleanup);

function renderMenu() {
  render(
    <div>
      <p>本文</p>
      <RadialMenu label="メニュー">
        <button type="button">項目</button>
      </RadialMenu>
    </div>,
  );
  return screen.getByRole("button", { name: "メニュー" });
}

const item = () => screen.queryByRole("button", { name: "項目" });

test("pressing the trigger opens the items, and pressing it again gathers them", async () => {
  const trigger = renderMenu();
  expect(item()).toBeNull();
  fireEvent.click(trigger);
  expect(item()).not.toBeNull();
  fireEvent.click(trigger);
  await act(async () => {});
  expect(item()).toBeNull();
});

test("pressing an item leaves the menu open", () => {
  fireEvent.click(renderMenu());
  const pressed = screen.getByRole("button", { name: "項目" });
  fireEvent.pointerDown(pressed);
  fireEvent.click(pressed);
  expect(item()).not.toBeNull();
});

test("a press outside closes the menu", async () => {
  fireEvent.click(renderMenu());
  fireEvent.pointerDown(screen.getByText("本文"));
  await act(async () => {});
  expect(item()).toBeNull();
});

test("Escape closes the menu and gives the focus back to the trigger", async () => {
  const trigger = renderMenu();
  fireEvent.click(trigger);
  const opened = screen.getByRole("button", { name: "項目" });
  opened.focus();
  fireEvent.keyDown(opened, { key: "Escape" });
  await act(async () => {});
  expect(item()).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test("the open items are named after the menu", () => {
  fireEvent.click(renderMenu());
  expect(screen.getByRole("dialog", { name: "メニュー" })).not.toBeNull();
});
