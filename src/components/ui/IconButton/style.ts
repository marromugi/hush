import { tv } from "@/lib/ui/tv";

export const iconButton = tv({
  base: [
    // layout
    "inline-flex size-8 cursor-pointer items-center justify-center",
    // shape
    "rounded-full",
    // motion
    "transition duration-160 ease-out active:scale-97",
    // focus
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    // state
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  variants: {
    look: {
      /** A raised circle of its own, for a button that sits on the page. */
      round: ["border border-edge", "bg-surface-raised hover:bg-edge"],
      /** Only the icon, for a button inside a bar that is already raised. */
      plain: "hover:bg-edge",
    },
  },
  defaultVariants: { look: "round" },
});
