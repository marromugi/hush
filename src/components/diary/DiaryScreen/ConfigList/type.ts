export type ConfigListProps = {
  onSettings: () => void;
  onSecretKey: () => void;
  onLock: () => void;
  /** True while the vault is being locked; ロック cannot be pressed again. */
  locking: boolean;
};
