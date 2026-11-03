import { clsx } from "clsx";

import { ImageFrame } from "./components/ImageFrame";
import { useImageSrc } from "./hooks/useImageSrc";
import type { EntryImageProps } from "./type";

/** A picture in an entry, read from its encrypted file. */
export function EntryImage({
  id,
  selected = false,
  width = null,
  align = "left",
  onResize,
}: EntryImageProps) {
  const image = useImageSrc(id);

  if (image.error) {
    return (
      <p role="alert" className="text-sm text-error">
        {image.error}
      </p>
    );
  }
  return (
    <ImageFrame width={width} align={align} onResize={selected ? onResize : undefined}>
      {image.src ? (
        <img
          src={image.src}
          alt=""
          className={clsx(
            // size
            "max-w-full",
            // spacing
            "my-0",
            // shape
            "rounded-lg",
            // focus
            selected && "outline-2 outline-offset-2 outline-current/40",
          )}
        />
      ) : (
        // Room for the picture while it is read, so the text below does not jump twice.
        <div aria-busy="true" className="aspect-4/3 w-full" />
      )}
    </ImageFrame>
  );
}
