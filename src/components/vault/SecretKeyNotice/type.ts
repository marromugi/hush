export type SecretKeyNoticeProps = {
  /** The Secret Key in its text form. */
  secretKey: string;
  /** Called when the person says they have kept it. */
  onKept: () => void;
};
