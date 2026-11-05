import { clsx } from "clsx";
import { useRef } from "react";

import { DiaryEditor } from "@/components/diary/DiaryEditor";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { Drawer } from "@/components/ui/Drawer";
import { DiceIcon, GearIcon, Icon, LogoIcon, MenuIcon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { optionList, optionRow } from "@/components/ui/Options";
import { Popover } from "@/components/ui/Popover";
import { useSettings } from "@/hooks/settings/useSettings";
import { entryTextStyle } from "@/lib/diary/entryTextStyle";
import { subsetFor } from "@/lib/diary/fonts";

import { PastEntry } from "./PastEntry";
import { PlaylistButton } from "./PlaylistButton";
import { SecretKeyModal } from "./SecretKeyModal";
import { Sidebar } from "./Sidebar";
import { useDiaryScreen } from "./useDiaryScreen";
import { useFontDice } from "./useFontDice";
import { useKeepClear } from "./useKeepClear";
import { useTodayScreen } from "./useTodayScreen";

/** Today's entry, saved as it is written, and the days before it to read. Mount it inside `UnlockedSession`. */
export function DiaryScreen() {
  const today = useTodayScreen();
  const screen = useDiaryScreen(today.date);
  const settings = useSettings();
  const dice = useFontDice(subsetFor(settings.language), today.font, today.pickFont);
  const keepClear = useKeepClear();
  // The menu item that opens the Secret Key is gone once it shows, so the focus comes back here.
  const config = useRef<HTMLButtonElement>(null);
  // A pressed button does not keep the focus in WebKit, so the days give it back here by name.
  const datesButton = useRef<HTMLButtonElement>(null);

  return (
    // The page scrolls as a whole and only the entry moves: the header,
    // sidebar, and footer stick, on the page's color, so the entry passes
    // under them. The header is h-21 and the footer h-26 from md, and h-15
    // and h-20 below it, each grown by the safe-area inset on its edge; the
    // heights are repeated in useKeepClear. The sidebar fits between them.
    // Below md there is no room for the sidebar, and the header's button
    // shows the days over the entry instead.
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
          "sticky top-0 z-5 grid h-[calc(--spacing(15)+var(--spacing-safe-top))] grid-cols-[1fr_auto_1fr] items-start gap-4 md:col-span-2 md:h-[calc(--spacing(21)+var(--spacing-safe-top))]",
          // spacing
          "pt-[calc(--spacing(4)+var(--spacing-safe-top))] md:pt-[calc(--spacing(10)+var(--spacing-safe-top))]",
          // color
          "bg-page",
        )}
      >
        <div className="flex h-6 items-center gap-3">
          <span className="-my-2 md:hidden">
            <IconButton
              ref={datesButton}
              icon={MenuIcon}
              label="日付を選ぶ"
              type="button"
              onClick={() => screen.datesDrawer.open()}
            />
          </span>
          <h1>
            {/* Below md the header holds the button for the days, and the mark gives way. */}
            <span className="hidden md:block">
              <Icon icon={LogoIcon} size="xl" />
            </span>
            <span className="sr-only">Hush</span>
          </h1>
        </div>
        <time
          dateTime={screen.selected}
          className="flex h-6 items-center text-sm tabular-nums opacity-60"
        >
          {screen.selectedParts.year}.{screen.selectedParts.month}.{screen.selectedParts.day}
        </time>
        {/* A long error wraps downward only, keeping its first line beside the date. */}
        <div className="flex justify-end pt-0.5 text-right">
          {today.saveMessage ? (
            <output
              className={clsx("text-sm", today.saveMessage.failed ? "text-error" : "opacity-70")}
            >
              {today.saveMessage.text}
            </output>
          ) : null}
        </div>
      </header>
      <div
        className={clsx(
          // layout
          "sticky top-[calc(--spacing(21)+var(--spacing-safe-top))] hidden self-start md:col-start-1 md:row-start-2 md:block",
          // size: between the header and the footer, scrolling only when a month is long
          "max-h-[calc(100dvh-var(--spacing)*47-var(--spacing-safe-top)-var(--spacing-safe-bottom))] overflow-y-auto",
          // spacing: room for the focus outline, which the scroll area would clip
          "-mx-1 px-1 pt-18 pb-1",
        )}
      >
        <Sidebar dates={screen.dates} selected={screen.selected} onSelect={screen.select} />
      </div>
      {/*
        The entry is centred on the page, not beside the sidebar: from md it
        spans both columns, padded on both sides by the sidebar and its gap
        (10rem + 1.5rem), so the two never meet. Its font size is the entry's
        own, from the text settings, so its width is 36 of its characters to a line.
      */}
      <main
        style={entryTextStyle(settings.text)}
        className={clsx(
          // layout
          "md:col-span-2 md:col-start-1 md:row-start-2",
          // spacing
          "pt-18 md:px-46",
          // typography
          "text-[length:var(--entry-size)]",
        )}
      >
        <div className="mx-auto w-full max-w-(--entry-width)">
          {screen.showsToday ? (
            today.loading || today.loadFailed ? null : (
              <DiaryEditor
                initialBody={today.initialBody}
                onChange={today.onChange}
                disabled={today.locking}
                keepClear={keepClear}
                fontFamily={today.fontFamily}
                fontLoading={today.fontLoading || dice.rolling}
              />
            )
          ) : (
            <PastEntry key={screen.selected} date={screen.selected} />
          )}
        </div>
      </main>
      <footer
        className={clsx(
          // layout
          "sticky bottom-0 z-5 grid h-[calc(--spacing(20)+var(--spacing-safe-bottom))] grid-cols-[1fr_auto_1fr] items-end md:col-span-2 md:h-[calc(--spacing(26)+var(--spacing-safe-bottom))]",
          // spacing
          "pb-[calc(--spacing(4)+var(--spacing-safe-bottom))] md:pb-[calc(--spacing(10)+var(--spacing-safe-bottom))]",
          // color
          "bg-page",
        )}
      >
        <div>
          <Popover
            direction="top"
            align="start"
            open={screen.configMenu.isOpen}
            onOpenChange={screen.configMenu.setOpen}
            trigger={
              <button
                ref={config}
                aria-label="config"
                className={clsx(
                  // layout: the padding widens the tap area past the glyph; the negative margin keeps it in place
                  "-m-2 cursor-pointer p-2",
                  // motion: the gear turns under the pointer and back when it leaves
                  "[&>svg]:transition-transform [&>svg]:duration-600 [&>svg]:ease-in-out hover:[&>svg]:rotate-240",
                  "motion-reduce:[&>svg]:transition-none",
                )}
              >
                <Icon icon={GearIcon} size="lg" />
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
            <IconButton
              icon={DiceIcon}
              label="フォントを変える"
              type="button"
              disabled={dice.rolling || today.locking || today.loading}
              onClick={() => void dice.roll()}
            />
          </div>
        ) : null}
        {/* Its own column, so it stays at the right when the dice are not shown. */}
        <div className="col-start-3 flex justify-end">
          {settings.playlist ? <PlaylistButton playlist={settings.playlist} /> : null}
        </div>
        <Drawer
          label="日付の一覧"
          open={screen.datesDrawer.isOpen}
          onOpenChange={screen.datesDrawer.setOpen}
          returnFocus={datesButton}
        >
          <Sidebar
            dates={screen.dates}
            selected={screen.selected}
            onSelect={screen.selectFromDates}
          />
        </Drawer>
        <SettingsModal
          open={screen.settingsModal.isOpen}
          onOpenChange={screen.settingsModal.setOpen}
          returnFocus={config}
        />
        <SecretKeyModal
          open={screen.secretKeyModal.isOpen}
          onOpenChange={screen.secretKeyModal.setOpen}
          returnFocus={config}
        />
      </footer>
    </div>
  );
}
