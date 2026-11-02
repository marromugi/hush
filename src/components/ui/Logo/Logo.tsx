import type { LogoProps } from "./type";

/** Hush's mark, one thick winding stroke, in the current text color. */
export function Logo(props: LogoProps) {
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
