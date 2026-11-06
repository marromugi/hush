import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { EntryHostContext } from "@/hooks/diary/useEntryHost";
import { fakeEntryHost } from "@/lib/diary/fakeEntryHost";
import { toastError } from "@/lib/ui/toast";
import { HushError } from "@/lib/vault/hushError";

import { EntryImage } from "./EntryImage";

vi.mock("@/lib/ui/toast", () => ({ toastError: vi.fn<(text: string) => void>() }));

test("an image that cannot be read leaves a mark and tells why in one toast", async () => {
  const host = fakeEntryHost({
    readImage: () => Promise.reject(new HushError("noImage", "no image file with this id")),
  });
  render(
    <EntryHostContext value={host}>
      <EntryImage id="0123456789abcdef0123456789abcdef" />
    </EntryHostContext>,
  );
  await screen.findByText("読み込めなかった画像");
  expect(vi.mocked(toastError).mock.calls).toEqual([
    [expect.stringMatching(/^画像を読み込めませんでした。/)],
  ]);
});
