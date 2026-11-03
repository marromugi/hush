import { SessionContext } from "@/hooks/vault/useSession";

import type { UnlockedSessionProps } from "./type";
import { useAutoLock } from "./useAutoLock";
import { useLockFlow } from "./useLockFlow";

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
