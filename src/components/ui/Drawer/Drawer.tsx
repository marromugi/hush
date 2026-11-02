import {
  FloatingFocusManager,
  FloatingNode,
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { clsx } from "clsx";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import { CloseIcon } from "../Icon";
import { IconButton } from "../IconButton";
import { Nested } from "../Nested";
import type { DrawerProps } from "./type";

/**
 * A panel that slides in from the left over the page, for what does not fit
 * beside it on a narrow screen. It keeps the focus inside until it closes,
 * then hands it back. A press outside it, Escape, or its close button closes it.
 */
function DrawerBody({ label, open, onOpenChange, returnFocus, children }: DrawerProps) {
  const nodeId = useFloatingNodeId();
  const { refs, context } = useFloating({ nodeId, open, onOpenChange });
  const setFloating = (node: HTMLElement | null) => refs.setFloating(node);
  const { getFloatingProps } = useInteractions([
    useDismiss(context, { capture: { escapeKey: true } }),
    useRole(context, { role: "dialog" }),
  ]);

  return (
    <FloatingNode id={nodeId}>
      <FloatingPortal>
        <MotionConfig reducedMotion="user">
          <AnimatePresence>
            {open ? (
              <FloatingOverlay lockScroll className="z-20">
                <motion.div
                  aria-hidden
                  className="absolute inset-0 bg-scrim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                />
                <FloatingFocusManager
                  context={context}
                  modal
                  returnFocus={returnFocus ?? true}
                  // oxlint-disable-next-line react/refs -- hands the ref over without reading it
                  initialFocus={refs.floating}
                >
                  <motion.div
                    ref={setFloating}
                    aria-modal
                    aria-label={label}
                    className={clsx(
                      // layout
                      "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col",
                      // spacing
                      "p-5 pt-10",
                      // color
                      "border-r border-edge bg-page shadow-float",
                      // focus
                      "outline-none",
                    )}
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                    {...getFloatingProps()}
                  >
                    <div className="flex justify-end">
                      <IconButton
                        icon={CloseIcon}
                        label="閉じる"
                        type="button"
                        onClick={() => onOpenChange(false)}
                      />
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                  </motion.div>
                </FloatingFocusManager>
              </FloatingOverlay>
            ) : null}
          </AnimatePresence>
        </MotionConfig>
      </FloatingPortal>
    </FloatingNode>
  );
}

export function Drawer(props: DrawerProps) {
  return (
    <Nested>
      <DrawerBody {...props} />
    </Nested>
  );
}
