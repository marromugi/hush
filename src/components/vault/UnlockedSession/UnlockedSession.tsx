import { SessionContext } from "@/hooks/vault/useSession";

import { useAutoLock } from "./hooks/useAutoLock";
import { useLockFlow } from "./hooks/useLockFlow";
import type { UnlockedSessionProps } from "./type";

/**
 * Wraps every screen shown while the vault is unlocked. It locks when no one
 * is there, and gives the screens one way to lock (`useSession`) and to make
 * the lock wait for their work (`useBeforeLock`).
 */
export function UnlockedSession({ onLock, children }: UnlockedSessionProps) {
  const session = useLockFlow(onLock);
  useAutoLock(session.lock);

  return <SessionContext value={session}>{children}</SessionContext>;
}
