import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { ImageAlign } from "@/lib/diary/imageAlign";

import { ImageMenu } from "./ImageMenu";

test("shows where the image sits, and asks to move it to the one pressed", () => {
  const onAlign = vi.fn<(align: ImageAlign) => void>();
  render(<ImageMenu align="center" onAlign={onAlign} />);
  expect(screen.getByRole("button", { name: "中央に置く" }).getAttribute("aria-pressed")).toBe(
    "true",
  );
  expect(screen.getByRole("button", { name: "左に寄せる" }).getAttribute("aria-pressed")).toBe(
    "false",
  );
  fireEvent.click(screen.getByRole("button", { name: "右に寄せる" }));
  expect(onAlign.mock.calls).toEqual([["right"]]);
});
