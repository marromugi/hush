import { useId } from "react";

import type { LogoProps } from "./type";

/**
 * Hush's mark, a crescent moon with a keyhole, in the current text color.
 * Its shapes are the app icon's (`app-icon.svg`); change both together.
 */
export function Logo(props: LogoProps) {
  const mask = useId();

  return (
    <svg viewBox="-100 -100 200 200" {...props}>
      <defs>
        <mask id={mask}>
          <rect x="-100" y="-100" width="200" height="200" fill="#fff" />
          <circle cx="45" cy="-5" r="55" fill="#000" />
          <circle cx="45" cy="-8" r="16.5" fill="#fff" />
          <polygon points="37.7,-5 52.3,-5 64.1,55 25.9,55" fill="#fff" />
        </mask>
      </defs>
      <circle r="100" fill="currentColor" mask={`url(#${mask})`} />
    </svg>
  );
}
