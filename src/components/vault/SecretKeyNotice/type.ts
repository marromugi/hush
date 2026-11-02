export type SecretKeyNoticeProps = {
  /** The Secret Key in its text form. */
  secretKey: string;
  /** Called when the person says they have kept it. */
  onKept: () => void;
  /** Locks the vault when no one is there, as the diary does. */
  onLock: () => Promise<void>;
};
