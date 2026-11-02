import { clsx } from "clsx";

import { Button } from "../../ui/Button";
import { DiaryEditor } from "../DiaryEditor";
import { PastEntry } from "./components/PastEntry";
import { Sidebar } from "./components/Sidebar";
import { useDiaryScreen } from "./hooks/useDiaryScreen";
import { useTodayScreen } from "./hooks/useTodayScreen";
import type { DiaryScreenProps } from "./type";

/** Today's entry, saved as it is written, and the days before it to read. Mount it on unlock. */
export function DiaryScreen({ onLock }: DiaryScreenProps) {
  const today = useTodayScreen(onLock);
  const screen = useDiaryScreen(today.date);

  return (
    <div
      className={clsx(
        // layout
        "grid min-h-screen grid-cols-[10rem_1fr] grid-rows-[auto_1fr]",
        // spacing
        "gap-x-6 px-10 py-10",
      )}
    >
      <header className="col-span-2 flex items-center justify-between gap-4">
        <h1 className="flex gap-4 text-sm tabular-nums opacity-60">
          <span>{screen.selectedParts.year}</span>
          <span>{screen.selectedParts.month}</span>
          <span>{screen.selectedParts.day}</span>
        </h1>
        <div className="flex items-center gap-4">
          {today.saveMessage ? (
            <output
              className={clsx("text-sm", today.saveMessage.failed ? "text-error" : "opacity-70")}
            >
              {today.saveMessage.text}
            </output>
          ) : null}
          <Button
            type="button"
            tone="neutral"
            disabled={today.locking}
            onClick={() => void today.lock()}
          >
            ロック
          </Button>
        </div>
      </header>
      <div className="pt-24">
        <Sidebar
          dates={screen.dates}
          selected={screen.selected}
          onSelect={screen.select}
          error={screen.datesError}
        />
      </div>
      <main className="mx-auto w-full max-w-2xl pt-24">
        {screen.showsToday ? (
          today.loading ? null : today.loadError ? (
            <p role="alert" className="text-sm text-error">
              {today.loadError}
            </p>
          ) : (
            <DiaryEditor
              initialBody={today.initialBody}
              onChange={today.onChange}
              disabled={today.locking}
            />
          )
        ) : (
          <PastEntry key={screen.selected} date={screen.selected} />
        )}
      </main>
    </div>
  );
}
