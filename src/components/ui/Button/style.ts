import { tv } from "../../../lib/ui/tv";

export const button = tv({
  base: [
    // layout
    "inline-flex cursor-pointer items-center justify-center gap-2",
    // shape
    "rounded-control px-4 control-py-2",
    // typography
    "text-sm font-semibold",
    // color
    "border border-on-accent/30 bg-accent text-on-accent hover:brightness-110",
    // motion
    "transition duration-160 ease-out active:scale-97",
    // focus
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    // state
    "disabled:pointer-events-none disabled:opacity-50",
  ],
});
