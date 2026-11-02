import { tv } from "../../../lib/ui/tv";

export const icon = tv({
  base: "shrink-0",
  variants: {
    size: { sm: "size-3", md: "size-4", lg: "size-5" },
  },
  defaultVariants: { size: "md" },
});
