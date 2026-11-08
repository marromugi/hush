import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";

import { ToolMenu } from "./ToolMenu";

// What is tested is what is shown and where the focus goes, not the motion.
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

afterEach(cleanup);

function renderTools(onUse: () => void = () => {}) {
  render(
    <div>
      <p>本文</p>
      <ToolMenu label="書く道具">
        <button type="button" onClick={onUse}>
          道具
        </button>
      </ToolMenu>
    </div>,
  );
  return screen.getByRole("button", { name: "書く道具" });
}

const tool = () => screen.queryByRole("button", { name: "道具" });

test("pressing the pill raises the tools, and pressing one uses it and puts them away", async () => {
  const onUse = vi.fn<() => void>();
  fireEvent.click(renderTools(onUse));
  const raised = screen.getByRole("button", { name: "道具" });
  fireEvent.click(raised);
  await act(async () => {});
  expect(onUse).toHaveBeenCalledTimes(1);
  expect(tool()).toBeNull();
});

test("pressing the pill again, or a press outside, puts the tools away", async () => {
  const pill = renderTools();
  fireEvent.click(pill);
  fireEvent.click(pill);
  await act(async () => {});
  expect(tool()).toBeNull();

  fireEvent.click(pill);
  fireEvent.pointerDown(screen.getByText("本文"));
  await act(async () => {});
  expect(tool()).toBeNull();
});

test("Escape puts the tools away and gives the focus back to the pill", async () => {
  const pill = renderTools();
  fireEvent.click(pill);
  const raised = screen.getByRole("button", { name: "道具" });
  raised.focus();
  fireEvent.keyDown(raised, { key: "Escape" });
  await act(async () => {});
  expect(tool()).toBeNull();
  expect(document.activeElement).toBe(pill);
});
