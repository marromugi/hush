import { useRef } from "react";

import { ImageIcon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";

import type { PictureButtonProps } from "./type";

/** A button that asks for pictures, from the photos or the files, and hands over the ones chosen. */
export function PictureButton({ onPick, disabled }: PictureButtonProps) {
  const chooser = useRef<HTMLInputElement>(null);

  return (
    <>
      <IconButton
        look="plain"
        icon={ImageIcon}
        label="写真を入れる"
        type="button"
        disabled={disabled}
        onClick={() => chooser.current?.click()}
      />
      <input
        ref={chooser}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const files = [...(event.currentTarget.files ?? [])];
          // Cleared, so the same picture can be chosen again.
          event.currentTarget.value = "";
          if (files.length > 0) onPick(files);
        }}
      />
    </>
  );
}
