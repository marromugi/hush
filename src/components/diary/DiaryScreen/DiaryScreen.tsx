import { clsx } from "clsx";
import { useRef } from "react";

import { optionList, optionRow } from "../../ui/Options";
import { Popover } from "../../ui/Popover";
import { DiaryEditor } from "../DiaryEditor";
import { PastEntry } from "./components/PastEntry";
import { SecretKeyModal } from "./components/SecretKeyModal";
import { Sidebar } from "./components/Sidebar";
import { useDiaryScreen } from "./hooks/useDiaryScreen";
import { useTodayScreen } from "./hooks/useTodayScreen";

/** Today's entry, saved as it is written, and the days before it to read. Mount it inside `UnlockedSession`. */
export function DiaryScreen() {
  const today = useTodayScreen();
  const screen = useDiaryScreen(today.date);
  // The menu item that opens the Secret Key is gone once it shows, so the focus comes back here.
  const config = useRef<HTMLButtonElement>(null);

  return (
    <div
      className={clsx(
        // layout
        "grid min-h-screen grid-cols-[10rem_1fr] grid-rows-[auto_1fr_auto]",
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
        {today.saveMessage ? (
          <output
            className={clsx("text-sm", today.saveMessage.failed ? "text-error" : "opacity-70")}
          >
            {today.saveMessage.text}
          </output>
        ) : null}
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
      <footer className="col-span-2">
        <Popover
          direction="top"
          align="start"
          open={screen.configOpen}
          onOpenChange={screen.setConfigOpen}
          trigger={
            <button ref={config} className="cursor-pointer">
              config
            </button>
          }
        >
          <div className={optionList({ className: "w-48" })}>
            <button type="button" className={optionRow()} onClick={screen.openSecretKey}>
              Secret Key
            </button>
            <button
              type="button"
              className={optionRow()}
              disabled={today.locking}
              onClick={screen.lockFromConfig}
            >
              ロック
            </button>
          </div>
        </Popover>
        <SecretKeyModal
          open={screen.secretKeyOpen}
          onOpenChange={screen.setSecretKeyOpen}
          returnFocus={config}
        />
      </footer>
    </div>
  );
}
