import type { ReactNode } from "react";

export type UnlockedSessionProps = {
  /** Locks the vault. Called only after all registered work succeeded. */
  onLock: () => Promise<void>;
  children: ReactNode;
};
