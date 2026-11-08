import { useId } from "react";
import type { SVGProps } from "react";

const outline = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...outline} {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function DiceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...outline} {...props}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" />
      <circle cx="5.5" cy="5.5" r="0.6" fill="currentColor" />
      <circle cx="10.5" cy="5.5" r="0.6" fill="currentColor" />
      <circle cx="8" cy="8" r="0.6" fill="currentColor" />
      <circle cx="5.5" cy="10.5" r="0.6" fill="currentColor" />
      <circle cx="10.5" cy="10.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...outline} strokeWidth="2.5" {...props}>
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...outline} strokeWidth="2" {...props}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...outline} {...props}>
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
    </svg>
  );
}

/**
 * Hush's mark, a crescent moon with a keyhole: the shapes of the app icon
 * (`app-icon.svg`), in the current text color. Change both together.
 */
export function LogoIcon(props: SVGProps<SVGSVGElement>) {
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

export function AlignLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...outline} {...props}>
      <path d="M2.5 4h11M2.5 8h7M2.5 12h9" />
    </svg>
  );
}

export function AlignCenterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...outline} {...props}>
      <path d="M2.5 4h11M4.5 8h7M3.5 12h9" />
    </svg>
  );
}

export function AlignRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...outline} {...props}>
      <path d="M2.5 4h11M6.5 8h7M4.5 12h9" />
    </svg>
  );
}

export function ImageOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...outline} {...props}>
      <path d="M13.5 10.5v-6a2 2 0 0 0-2-2h-6M2.5 4.5v7a2 2 0 0 0 2 2h7" />
      <path d="M2.5 10.5l3-3 2 2M2 2l12 12" />
    </svg>
  );
}
