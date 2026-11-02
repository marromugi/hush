import { clsx } from "clsx";
import { useRef } from "react";

import { useSettings } from "../../../hooks/settings/useSettings";
import { subsetFor } from "../../../lib/diary/fonts";
import { SettingsModal } from "../../settings/SettingsModal";
import { Drawer } from "../../ui/Drawer";
import { DiceIcon, MenuIcon } from "../../ui/Icon";
import { IconButton } from "../../ui/IconButton";
import { Logo } from "../../ui/Logo";
import { optionList, optionRow } from "../../ui/Options";
import { Popover } from "../../ui/Popover";
import { DiaryEditor } from "../DiaryEditor";
import { PastEntry } from "./components/PastEntry";
import { SecretKeyModal } from "./components/SecretKeyModal";
import { Sidebar } from "./components/Sidebar";
import { useDiaryScreen } from "./hooks/useDiaryScreen";
import { useFontDice } from "./hooks/useFontDice";
import { useTodayScreen } from "./hooks/useTodayScreen";

/** The sticky header (h-21) and footer (h-26), in pixels, that the cursor must stay out of. */
const BANDS = { top: 84, bottom: 104 };

/** Today's entry, saved as it is written, and the days before it to read. Mount it inside `UnlockedSession`. */
export function DiaryScreen() {
  const today = useTodayScreen();
  const screen = useDiaryScreen(today.date);
  const settings = useSettings();
  const dice = useFontDice(subsetFor(settings.language), today.font, today.pickFont);
  // The menu item that opens the Secret Key is gone once it shows, so the focus comes back here.
  const config = useRef<HTMLButtonElement>(null);
  // A pressed button does not keep the focus in WebKit, so the days give it back here by name.
  const datesButton = useRef<HTMLButtonElement>(null);

  return (
    // The page scrolls as a whole and only the entry moves: the header,
    // sidebar, and footer stick, on the page's color, so the entry passes
    // under them. The header is h-21 and the footer h-26; the sidebar fits
    // between them. Below md there is no room for the sidebar, and the
    // header's button shows the days over the entry instead.
    <div
      className={clsx(
        // layout
        "grid min-h-screen grid-cols-1 grid-rows-[auto_1fr_auto] md:grid-cols-[10rem_1fr]",
        // spacing
        "gap-x-6 px-5 md:px-10",
      )}
    >
      <header
        className={clsx(
          // layout
          "sticky top-0 z-5 flex h-21 items-start justify-between gap-4 md:col-span-2",
          // spacing
          "pt-10",
          // color
          "bg-page",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="-my-2 md:hidden">
            <IconButton
              ref={datesButton}
              icon={MenuIcon}
              label="日付を選ぶ"
              type="button"
              onClick={() => screen.setDatesOpen(true)}
            />
          </span>
          <h1>
            <Logo aria-hidden className="size-6" />
            <span className="sr-only">Hush</span>
          </h1>
        </div>
        {today.saveMessage ? (
          <output
            className={clsx("text-sm", today.saveMessage.failed ? "text-error" : "opacity-70")}
          >
            {today.saveMessage.text}
          </output>
        ) : null}
      </header>
      <div
        className={clsx(
          // layout
          "sticky top-21 hidden self-start md:block",
          // size: between the header and the footer, scrolling only when a month is long
          "max-h-[calc(100dvh-var(--spacing)*47)] overflow-y-auto",
          // spacing: room for the focus outline, which the scroll area would clip
          "-mx-1 px-1 pt-18 pb-1",
        )}
      >
        <Sidebar
          dates={screen.dates}
          selected={screen.selected}
          onSelect={screen.select}
          error={screen.datesError}
        />
      </div>
      <main className="mx-auto w-full max-w-2xl pt-18">
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
              keepClear={BANDS}
              fontFamily={today.fontFamily}
              fontLoading={today.fontLoading || dice.rolling}
            />
          )
        ) : (
          <PastEntry key={screen.selected} date={screen.selected} />
        )}
      </main>
      <footer
        className={clsx(
          // layout
          "sticky bottom-0 z-5 grid h-26 grid-cols-[1fr_auto_1fr] items-end md:col-span-2",
          // spacing
          "pb-10",
          // color
          "bg-page",
        )}
      >
        <div>
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
              <button type="button" className={optionRow()} onClick={screen.openSettings}>
                設定
              </button>
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
        </div>
        {screen.showsToday ? (
          <div className="flex flex-col items-center gap-2">
            {dice.error ? (
              <p role="alert" className="text-sm text-error">
                {dice.error}
              </p>
            ) : null}
            <IconButton
              icon={DiceIcon}
              label="フォントを変える"
              type="button"
              disabled={dice.rolling || today.locking || today.loading}
              onClick={() => void dice.roll()}
            />
          </div>
        ) : null}
        <Drawer
          label="日付の一覧"
          open={screen.datesOpen}
          onOpenChange={screen.setDatesOpen}
          returnFocus={datesButton}
        >
          <Sidebar
            dates={screen.dates}
            selected={screen.selected}
            onSelect={screen.selectFromDates}
            error={screen.datesError}
          />
        </Drawer>
        <SettingsModal
          open={screen.settingsOpen}
          onOpenChange={screen.setSettingsOpen}
          returnFocus={config}
        />
        <SecretKeyModal
          open={screen.secretKeyOpen}
          onOpenChange={screen.setSecretKeyOpen}
          returnFocus={config}
        />
      </footer>
    </div>
  );
}
