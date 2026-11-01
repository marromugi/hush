import { tv } from "../../../lib/ui/tv";

export const control = tv({
  base: [
    // layout
    "w-full",
    // shape
    "rounded-control border px-4 control-py-2",
    // typography
    "text-base placeholder:opacity-50",
    // color
    "bg-surface-raised hover:bg-surface focus:bg-surface-raised",
    // motion
    "transition duration-160 ease-out",
    // focus
    "outline-none",
  ],
  variants: {
    state: {
      default: "border-edge focus-visible:border-accent",
      error: "border-error",
    },
  },
  defaultVariants: { state: "default" },
});
