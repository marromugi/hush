import { clsx } from "clsx";

import { DiaryEditor } from "./components/DiaryEditor";

export function App() {
  return (
    <main
      className={clsx(
        "min-h-screen",
        "bg-stone-50 text-stone-900",
        "dark:bg-stone-950 dark:text-stone-100",
      )}
    >
      <div className={clsx("mx-auto max-w-2xl", "px-6 py-12")}>
        <DiaryEditor />
      </div>
    </main>
  );
}
