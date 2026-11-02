import { tv } from "@/lib/ui/tv";

export const qrCode = tv({
  base: [
    // size
    "size-48",
    // shape
    "rounded-md",
    // color: readers expect dark on light, in either scheme
    "bg-white text-black",
  ],
});
