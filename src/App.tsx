import { clsx } from "clsx";

import { DiaryEditor } from "./components/diary/DiaryEditor";

export function App() {
  return (
    <main className="min-h-screen">
      <div className={clsx("mx-auto max-w-2xl", "px-6 py-12")}>
        <DiaryEditor />
      </div>
    </main>
  );
}
