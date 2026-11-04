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
          "px-6 pt-[calc(--spacing(12)+var(--spacing-safe-top))] pb-[calc(--spacing(12)+var(--spacing-safe-bottom))]",
        )}
      >
        {children}
      </div>
    </main>
  );
}
