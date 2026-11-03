/**
 * A short, brisk move, for things that move together: the same timing as
 * Tailwind's `duration-180 ease-in-out`, for motion's `transition`.
 */
export const quickMove = { duration: 0.18, ease: [0.4, 0, 0.2, 1] } as const;

/** The same move, for the browser's own `element.animate`. */
export const quickMoveTiming = { duration: 180, easing: "cubic-bezier(0.4, 0, 0.2, 1)" } as const;
