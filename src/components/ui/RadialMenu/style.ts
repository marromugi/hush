import { tv } from "@/lib/ui/tv";

export const radialMenu = tv({
  slots: {
    trigger: [
      // layout
      "inline-flex h-8 w-14 cursor-pointer items-center justify-center",
      // shape: a pill, wider than the round buttons it opens
      "rounded-full border border-edge",
      // color
      "bg-surface-raised shadow-float hover:bg-edge",
      // motion
      "transition duration-160 ease-out active:scale-97",
      // focus
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    ],
    // A point at the trigger's centre that the items are placed around.
    fan: "pointer-events-none absolute top-1/2 left-1/2 z-10 size-0",
    item: "pointer-events-auto absolute -translate-1/2",
  },
});
