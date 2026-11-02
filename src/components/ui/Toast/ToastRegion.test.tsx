import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "react-hot-toast";
import { afterEach, expect, test } from "vitest";

import { toastError, toastNotice } from "@/lib/ui/toast";

import { ToastRegion } from "./ToastRegion";

afterEach(() => {
  act(() => toast.remove());
  cleanup();
});

test("an error shows once however often it is raised, is announced at once, and can be put away", async () => {
  render(<ToastRegion />);
  act(() => {
    toastError("保存できませんでした。");
    toastError("保存できませんでした。");
  });
  const shown = await screen.findAllByText("保存できませんでした。");
  expect(shown).toHaveLength(1);
  expect(shown[0]?.getAttribute("role")).toBe("alert");
  fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
  await waitFor(() =>
    expect(screen.getByText("保存できませんでした。").parentElement?.className).toContain(
      "opacity-0",
    ),
  );
});

test("a notice is announced politely", async () => {
  render(<ToastRegion />);
  act(() => toastNotice("新しい版があります。"));
  expect((await screen.findByText("新しい版があります。")).getAttribute("role")).toBe("status");
});
