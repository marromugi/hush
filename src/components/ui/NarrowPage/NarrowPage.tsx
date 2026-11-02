import { clsx } from "clsx";

import type { NarrowPageProps } from "./type";

/** A page whose content sits in one narrow column in the middle. */
export function NarrowPage({ children }: NarrowPageProps) {
  return (
    <main className="min-h-screen">
      <div
        className={clsx(
          // layout
          "mx-auto max-w-2xl",
          // spacing
          "px-6 py-12",
        )}
      >
        {children}
      </div>
    </main>
  );
}
