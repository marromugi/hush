import { createContext, use } from "react";

/** Work to finish before the vault locks. Resolves false when locking must wait. */
export type BeforeLock = () => Promise<boolean>;

/** What the screens shown while unlocked share. */
export type Session = {
  /**
   * Finishes all work registered with `addBeforeLock`, then locks, only if
   * all of it succeeded. A call while one runs joins it.
   */
  lock: () => Promise<void>;
  /** True while a lock runs; nothing may change then. */
  locking: boolean;
  /** Registers work to finish before locking; returns a function that removes it. */
  addBeforeLock: (work: BeforeLock) => () => void;
};

export const SessionContext = createContext<Session | null>(null);

/** The session of the unlocked vault. Use it only inside `UnlockedSession`. */
export function useSession(): Session {
  const session = use(SessionContext);
  if (session === null) throw new Error("useSession is used outside UnlockedSession");
  return session;
}
