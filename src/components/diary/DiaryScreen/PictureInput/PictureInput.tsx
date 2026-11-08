import type { PictureInputProps } from "./type";

/**
 * A hidden chooser of pictures, from the photos or the files. Calling
 * `click()` on `ref` opens it, from a press of the person's own; the
 * pictures chosen go to `onPick`. It stays on the page while the chooser is
 * open, or the pictures would have nowhere to go.
 */
export function PictureInput({ ref, onPick }: PictureInputProps) {
  return (
    <input
      ref={ref}
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
  );
}
