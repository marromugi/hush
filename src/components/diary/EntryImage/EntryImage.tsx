import { clsx } from "clsx";

import { useImageSrc } from "./hooks/useImageSrc";
import type { EntryImageProps } from "./type";

/** A picture in an entry, read from its encrypted file. */
export function EntryImage({ id, selected = false }: EntryImageProps) {
  const image = useImageSrc(id);

  if (image.error) {
    return (
      <p role="alert" className="text-sm text-error">
        {image.error}
      </p>
    );
  }
  return image.src ? (
    <img
      src={image.src}
      alt=""
      className={clsx(
        // size
        "max-w-full",
        // spacing
        "my-0",
        // focus
        selected && "outline-2 outline-offset-2 outline-current",
      )}
    />
  ) : (
    // Room for the picture while it is read, so the text below does not jump twice.
    <div aria-busy="true" className="aspect-4/3 w-full" />
  );
}
