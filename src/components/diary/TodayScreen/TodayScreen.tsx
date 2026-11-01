import { clsx } from "clsx";

import { Button } from "../../ui/Button";
import { DiaryEditor } from "../DiaryEditor";
import { useTodayScreen } from "./hooks/useTodayScreen";
import type { TodayScreenProps } from "./type";

/** Today's entry, saved as it is written. Mount it on unlock. */
export function TodayScreen({ onLock }: TodayScreenProps) {
  const screen = useTodayScreen(onLock);

  if (screen.loading) return null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-lg">{screen.date}</h1>
        <div className="flex items-center gap-4">
          {screen.saveMessage ? (
            <output
              className={clsx("text-sm", screen.saveMessage.failed ? "text-error" : "opacity-70")}
            >
              {screen.saveMessage.text}
            </output>
          ) : null}
          <Button type="button" tone="neutral" onClick={() => void screen.lock()}>
            ロック
          </Button>
        </div>
      </header>
      {screen.loadError ? (
        <p role="alert" className="text-sm text-error">
          {screen.loadError}
        </p>
      ) : (
        <DiaryEditor initialBody={screen.initialBody} onChange={screen.onChange} />
      )}
    </div>
  );
}
