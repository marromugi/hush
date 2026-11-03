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
 * Hush's mark, one thick winding stroke. Unlike the other glyphs it is tall,
 * not drawn on the 16px grid, so it is shown at a size set by height (`xl`).
 */
export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 34 54" fill="none" {...props}>
      <path
        d="M6.53085 6.00146C6.53085 6.00146 30.6374 17.5784 26.5437 26.463C22.4499 35.3476 10.8758 17.8476 6.53085 26.463C2.18588 35.0784 26.5437 48.0015 26.5437 48.0015"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
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
