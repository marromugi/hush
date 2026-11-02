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
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useId } from "react";

import { CloseIcon } from "../Icon";
import { IconButton } from "../IconButton";
import { Nested } from "../Nested";
import type { ModalProps } from "./type";

/**
 * A dialog over the page that keeps the focus inside it until it closes, then
 * hands the focus back to where it was. On opening, the focus goes to the
 * dialog itself, not to a control in it. A press outside it, Escape, or its
 * close button closes it.
 */
function ModalBody({ title, open, onOpenChange, returnFocus, children }: ModalProps) {
  const titleId = useId();
  const nodeId = useFloatingNodeId();
  const { refs, context } = useFloating({ nodeId, open, onOpenChange });
  const setFloating = (node: HTMLElement | null) => refs.setFloating(node);
  const { getFloatingProps } = useInteractions([
    useDismiss(context, { capture: { escapeKey: true } }),
    useRole(context, { role: "dialog" }),
  ]);

  // The close button casts a shadow, so it reads as lying over whatever it overlaps.
  const close = (
    <span className="inline-flex rounded-full shadow-float">
      <IconButton
        icon={CloseIcon}
        label="閉じる"
        type="button"
        onClick={() => onOpenChange(false)}
      />
    </span>
  );

  return (
    <FloatingNode id={nodeId}>
      <FloatingPortal>
        <MotionConfig reducedMotion="user">
          <AnimatePresence>
            {open ? (
              <FloatingOverlay lockScroll className="z-20 grid place-items-center p-6">
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
                    aria-labelledby={titleId}
                    className="relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-container border border-edge bg-surface-raised container-p-6 outline-none"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                    {...getFloatingProps()}
                  >
                    <div className="flex min-h-8 items-center justify-between gap-3">
                      <h2 id={titleId} className="text-base font-semibold">
                        {title}
                      </h2>
                      {close}
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto pt-4">{children}</div>
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

export function Modal(props: ModalProps) {
  return (
    <Nested>
      <ModalBody {...props} />
    </Nested>
  );
}
