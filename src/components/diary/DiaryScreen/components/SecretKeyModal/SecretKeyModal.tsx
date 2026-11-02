import { Modal } from "../../../../ui/Modal";
import { SecretKeyContent } from "./components/SecretKeyContent";
import type { SecretKeyModalProps } from "./type";

/** The vault's Secret Key over the diary, to keep again or to give another device. */
export function SecretKeyModal({ open, onOpenChange, returnFocus }: SecretKeyModalProps) {
  return (
    <Modal title="Secret Key" open={open} onOpenChange={onOpenChange} returnFocus={returnFocus}>
      <SecretKeyContent />
    </Modal>
  );
}
