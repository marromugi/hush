export type QrScannerProps = {
  /** Called once, with the text of the first QR code read. */
  onFound: (text: string) => void;
  onCancel: () => void;
};
