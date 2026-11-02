import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, test } from "vitest";

import { UnlockedSession } from "@/components/vault/UnlockedSession";
import { useSession } from "@/hooks/vault/useSession";
import type { Session } from "@/hooks/vault/useSession";

import { useBeforeLock } from "./useBeforeLock";

afterEach(() => {
  cleanup();
  clearMocks();
});

function Saving({ log }: { log: string[] }) {
  useBeforeLock(async () => {
    log.push("save");
    return true;
  });
  return null;
}

/** Shows `Saving` until `hide` is called, and hands out the session. */
function Screen({
  log,
  found,
}: {
  log: string[];
  found: (session: Session, hide: () => void) => void;
}) {
  const [shown, setShown] = useState(true);
  found(useSession(), () => setShown(false));
  return shown ? <Saving log={log} /> : null;
}

test("work is run before locking only while its screen is shown", async () => {
  const log: string[] = [];
  let session: Session | undefined;
  let hide: (() => void) | undefined;
  mockIPC(() => null, { shouldMockEvents: true });
  render(
    <UnlockedSession
      onLock={async () => {
        log.push("lock");
      }}
    >
      <Screen
        log={log}
        found={(current, hideScreen) => {
          session = current;
          hide = hideScreen;
        }}
      />
    </UnlockedSession>,
  );
  await act(async () => session?.lock());
  expect(log).toEqual(["save", "lock"]);
  act(() => hide?.());
  await act(async () => session?.lock());
  expect(log).toEqual(["save", "lock", "lock"]);
});
