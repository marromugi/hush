import {
  FloatingNode,
  useClick,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Children, useState } from "react";

import { Icon, PlusIcon } from "@/components/ui/Icon";
import { Nested } from "@/components/ui/Nested";

import { fanOffsets } from "./fanOffsets";
import { radialMenu } from "./style";
import type { RadialMenuProps } from "./type";

const RADIUS = 56;
const STEP = 45;

/**
 * A pill-shaped button that fans `children` out above itself in an arc when
 * pressed, and gathers them back on a second press, a press outside, or
 * Escape. Pressing an item leaves the menu open.
 */
function RadialMenuBody({ label, children, defaultOpen = false }: RadialMenuProps) {
  const [open, setOpen] = useState(defaultOpen);
  const nodeId = useFloatingNodeId();
  const { refs, context } = useFloating({
    nodeId,
    open,
    onOpenChange: (next, _event, reason) => {
      setOpen(next);
      // Escape may close it while an item has the focus, which would fall to the page with it.
      const trigger = refs.domReference.current;
      if (!next && reason === "escape-key" && trigger instanceof HTMLElement) trigger.focus();
    },
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context, { capture: { escapeKey: true } }),
    useRole(context),
  ]);
  const setReference = (node: HTMLElement | null) => refs.setReference(node);
  const setFloating = (node: HTMLElement | null) => refs.setFloating(node);
  const items = Children.toArray(children);
  const offsets = fanOffsets(items.length, RADIUS, STEP);
  const styles = radialMenu();

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex">
        <button
          ref={setReference}
          type="button"
          aria-label={label}
          className={styles.trigger()}
          {...getReferenceProps()}
        >
          <motion.span animate={{ rotate: open ? 45 : 0 }} className="inline-flex">
            <Icon icon={PlusIcon} size="md" />
          </motion.span>
        </button>
        <FloatingNode id={nodeId}>
          <AnimatePresence>
            {open ? (
              <div
                ref={setFloating}
                aria-label={label}
                className={styles.fan()}
                {...getFloatingProps()}
              >
                {items.map((item, index) => (
                  <motion.div
                    key={index}
                    className={styles.item()}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                    animate={{ ...offsets[index], opacity: 1, scale: 1 }}
                    exit={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                    transition={{
                      type: "spring",
                      bounce: 0.3,
                      duration: 0.35,
                      delay: index * 0.03,
                    }}
                  >
                    {item}
                  </motion.div>
                ))}
              </div>
            ) : null}
          </AnimatePresence>
        </FloatingNode>
      </div>
    </MotionConfig>
  );
}

export function RadialMenu(props: RadialMenuProps) {
  return (
    <Nested>
      <RadialMenuBody {...props} />
    </Nested>
  );
}
