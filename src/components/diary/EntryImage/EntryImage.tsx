import { clsx } from "clsx";

import { ImageGrip } from "./components/ImageGrip";
import { useImageSrc } from "./hooks/useImageSrc";
import type { EntryImageProps } from "./type";

/** A picture in an entry, read from its encrypted file. */
export function EntryImage({ id, selected = false, width = null, onResize }: EntryImageProps) {
  const image = useImageSrc(id);

  if (image.error) {
    return (
      <p role="alert" className="text-sm text-error">
        {image.error}
      </p>
    );
  }
  if (!image.src) {
    // Room for the picture while it is read, so the text below does not jump twice.
    return <div aria-busy="true" className="aspect-4/3 w-full" />;
  }
  const picture = (
    <img
      src={image.src}
      alt=""
      className={clsx(
        // size
        "max-w-full",
        width !== null && "w-full",
        // spacing
        "my-0",
        // shape
        "rounded-lg",
        // focus
        selected && "outline-2 outline-offset-2 outline-current/40",
      )}
    />
  );
  return onResize && selected ? (
    <ImageGrip width={width} onResize={onResize}>
      {picture}
    </ImageGrip>
  ) : (
    <div style={width === null ? undefined : { width: `${width}%` }}>{picture}</div>
  );
}
