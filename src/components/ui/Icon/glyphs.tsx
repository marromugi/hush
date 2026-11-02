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
