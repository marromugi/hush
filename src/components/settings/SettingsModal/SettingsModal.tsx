import { Modal } from "../../ui/Modal";
import { SettingsBody } from "./components/SettingsBody";
import type { SettingsModalProps } from "./type";

/** This device's settings: sections on the left, the chosen section's settings on the right. */
export function SettingsModal({ open, onOpenChange, returnFocus }: SettingsModalProps) {
  return (
    <Modal title="設定" open={open} onOpenChange={onOpenChange} returnFocus={returnFocus}>
      <SettingsBody />
    </Modal>
  );
}
