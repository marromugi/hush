import { useClick, useDismiss, useFloating, useInteractions, useRole } from "@floating-ui/react";
import { clsx } from "clsx";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Children, useState } from "react";

import type { ToolMenuProps } from "./type";

/** How far apart the tools stand, centre to centre, in pixels: a 44px bubble and the gap above it. */
const STEP = 52;

/**
 * A pill that, pressed, raises `children` above itself as a column of
 * bubbles. Pressing one of them puts them all away, as does pressing the pill
 * again, a press outside, or Escape. A tool that had the focus gives it back
 * to the pill.
 */
export function ToolMenu({ label, children }: ToolMenuProps) {
  const [open, setOpen] = useState(false);
  const { refs, context } = useFloating({
    open,
    onOpenChange: (next) => (next ? setOpen(true) : putAway()),
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context, { capture: { escapeKey: true } }),
    useRole(context),
  ]);
  const setReference = (node: HTMLElement | null) => refs.setReference(node);
  const setFloating = (node: HTMLElement | null) => refs.setFloating(node);

  function putAway() {
    // The tools leave the page, and the focus would fall to the page with them.
    const pill = refs.domReference.current;
    if (refs.floating.current?.contains(document.activeElement) && pill instanceof HTMLElement) {
      pill.focus();
    }
    setOpen(false);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex">
        <button
          ref={setReference}
          type="button"
          aria-label={label}
          className={clsx(
            // layout
            "h-8 w-18 cursor-pointer",
            // shape
            "rounded-full",
            // color
            "bg-surface hover:bg-edge aria-expanded:bg-edge",
            // motion
            "transition duration-160 ease-out active:scale-97",
            // focus
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
          {...getReferenceProps()}
        />
        <AnimatePresence>
          {open ? (
            <div
              ref={setFloating}
              aria-label={label}
              className={clsx(
                // layout: a column standing on the pill, the first tool at its foot
                "pointer-events-none absolute bottom-full left-1/2 z-10 flex -translate-x-1/2 flex-col-reverse items-center gap-2",
                // spacing
                "pb-3",
              )}
              {...getFloatingProps({
                // A press on a tool that cannot be pressed lands beside its button, and leaves them up.
                onClick: (event) => {
                  if (event.target instanceof Element && event.target.closest("button")) putAway();
                },
              })}
            >
              {Children.toArray(children).map((tool, index) => (
                <motion.div
                  key={index}
                  className="pointer-events-auto"
                  // Each rises out of the pill, the farther ones a moment later.
                  initial={{ y: (index + 1) * STEP, opacity: 0, scale: 0.5 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: (index + 1) * STEP, opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", bounce: 0.3, duration: 0.35, delay: index * 0.03 }}
                >
                  {tool}
                </motion.div>
              ))}
            </div>
          ) : null}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
