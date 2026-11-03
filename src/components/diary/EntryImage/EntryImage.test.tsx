import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { toastError } from "@/lib/ui/toast";

import { EntryImage } from "./EntryImage";

vi.mock("@/lib/ui/toast", () => ({ toastError: vi.fn<(text: string) => void>() }));

afterEach(clearMocks);

test("an image that cannot be read leaves a mark and tells why in one toast", async () => {
  mockIPC(() => {
    throw { kind: "noImage", message: "no image file with this id" };
  });
  render(<EntryImage id="0123456789abcdef0123456789abcdef" />);
  await screen.findByText("読み込めなかった画像");
  expect(vi.mocked(toastError).mock.calls).toEqual([
    [expect.stringMatching(/^画像を読み込めませんでした。/)],
  ]);
});
