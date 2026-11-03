import { Modal } from "@/components/ui/Modal";

import { SettingsBody } from "./SettingsBody";
import type { SettingsModalProps } from "./type";

/**
 * This device's settings: the sections, and the chosen section's settings
 * beside them, or below them on a narrow screen.
 */
export function SettingsModal({ open, onOpenChange, returnFocus }: SettingsModalProps) {
  return (
    <Modal
      title="設定"
      open={open}
      onOpenChange={onOpenChange}
      returnFocus={returnFocus}
      height="full"
    >
      <SettingsBody />
    </Modal>
  );
}
