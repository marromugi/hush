import { useImageSrc } from "@/hooks/diary/useImageSrc";

import type { LinkCardImageProps } from "./type";

/** The page's picture behind a card, filling it. Nothing while it is read, or when it cannot be. */
export function LinkCardImage({ id }: LinkCardImageProps) {
  const image = useImageSrc(id);
  return image.src === null ? null : (
    <img src={image.src} alt="" className="absolute inset-0 size-full object-cover" />
  );
}
