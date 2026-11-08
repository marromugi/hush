import { clsx } from "clsx";
import { useRef } from "react";

import { DiaryEditor } from "@/components/diary/DiaryEditor";
import type { DiaryEditorHandle } from "@/components/diary/DiaryEditor";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { Drawer } from "@/components/ui/Drawer";
import { DiceIcon, Icon, ImageIcon, LogoIcon, MenuIcon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { useMedia } from "@/hooks/common/useMedia";
import { useSettings } from "@/hooks/settings/useSettings";
import { entryTextStyle } from "@/lib/diary/entryTextStyle";
import { subsetFor } from "@/lib/diary/fonts";

import { ConfigList } from "./ConfigList";
import { PastEntry } from "./PastEntry";
import { PictureInput } from "./PictureInput";
import { PlaylistButton } from "./PlaylistButton";
import { SecretKeyModal } from "./SecretKeyModal";
import { Sidebar } from "./Sidebar";
import { ToolMenu } from "./ToolMenu";
import { useDiaryScreen } from "./useDiaryScreen";
import { useFontDice } from "./useFontDice";
import { useKeepClear } from "./useKeepClear";
import { useShakeToRoll } from "./useShakeToRoll";
import { useTodayScreen } from "./useTodayScreen";

/** Today's entry, saved as it is written, and the days before it to read. Mount it inside `UnlockedSession`. */
export function DiaryScreen() {
  const today = useTodayScreen();
  const screen = useDiaryScreen(today.date);
  const settings = useSettings();
  const dice = useFontDice(subsetFor(settings.language), today.font, today.pickFont);
  const keepClear = useKeepClear();
  // The dice rolls from its button or, on iOS, from a shake, once today's entry is ready for it.
  const diceReady = !dice.rolling && !today.locking && !today.loading;
  // Not while something covers the entry, where the change could not be seen.
  useShakeToRoll(() => void dice.roll(), screen.showsToday && !screen.covered && diceReady);
  // A pressed button does not keep the focus in WebKit, so the menu gives it back here by name.
  const menuButton = useRef<HTMLButtonElement>(null);
  // Below md the item that opened the settings or the Secret Key went away
  // with the menu, so the focus comes back to the menu's button. From md the
  // item stays in the sidebar, and the focus goes back where it was.
  const returnFromMenu = useMedia("md") ? undefined : menuButton;
  // Pictures go in once today's entry is shown and can be typed in.
  const editor = useRef<DiaryEditorHandle>(null);
  const editorReady = !today.loading && !today.loadFailed && !today.locking;
  const pictureChooser = useRef<HTMLInputElement>(null);

  return (
    // The page scrolls as a whole and only the entry moves: the header and
    // sidebar stick on the page's color, and the footer as an island over
    // it, so the entry passes under them. The header is h-21 and the footer
    // h-26 from md, and h-15 and h-20 below it, each grown by the safe-area
    // inset on its edge; the heights are repeated in useKeepClear. The
    // sidebar fits between them.
    // Below md there is no room for the sidebar, and the header's button
    // shows it over the entry instead.
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
          "sticky top-0 z-5 grid h-[calc(--spacing(15)+var(--spacing-safe-top))] grid-cols-[auto_1fr] items-start gap-4 md:col-span-2 md:h-[calc(--spacing(21)+var(--spacing-safe-top))]",
          // spacing
          "pt-[calc(--spacing(4)+var(--spacing-safe-top))] md:pt-[calc(--spacing(10)+var(--spacing-safe-top))]",
          // color
          "bg-page",
        )}
      >
        <div className="flex h-6 items-center gap-3">
          <button
            ref={menuButton}
            type="button"
            onClick={() => screen.menuDrawer.open()}
            className={clsx(
              // layout: the padding widens the tap area past the label; the negative margin keeps it in place
              "-m-2 flex cursor-pointer items-center gap-1.5 p-2 md:hidden",
              // typography
              "font-semibold tracking-wide",
              // focus
              "rounded-sm focus-visible:outline-2 focus-visible:outline-accent",
            )}
          >
            <Icon icon={MenuIcon} size="md" />
            MENU
          </button>
          <h1>
            {/* Below md the header holds the button for the menu, and the mark gives way. */}
            <span className="hidden md:block">
              <Icon icon={LogoIcon} size="xl" />
            </span>
            <span className="sr-only">Hush</span>
          </h1>
        </div>
        {/* A long error wraps downward only, keeping its first line beside the menu. */}
        <div className="flex justify-end pt-0.5 text-right">
          {today.saveMessage ? (
            <output
              className={clsx("text-sm", today.saveMessage.failed ? "text-error" : "opacity-70")}
            >
              {today.saveMessage.text}
            </output>
          ) : null}
        </div>
        {/* The entry fades and blurs into the header as it passes under it. Its height is repeated in useKeepClear. */}
        <div
          aria-hidden
          className={clsx(
            // layout
            "pointer-events-none absolute inset-x-0 top-full h-8",
            // color: the page's color at the top, clear at the bottom
            "bg-linear-to-b from-page to-transparent",
            // blur: strongest at the top, gone at the bottom
            "mask-b-from-0% backdrop-blur-sm",
          )}
        />
      </header>
      <div
        className={clsx(
          // layout
          "sticky top-[calc(--spacing(21)+var(--spacing-safe-top))] hidden self-start md:col-start-1 md:row-start-2 md:flex md:flex-col",
          // size: between the header and the footer; the days scroll inside it when a month is long
          "max-h-[calc(100dvh-var(--spacing)*47-var(--spacing-safe-top)-var(--spacing-safe-bottom))]",
          // spacing
          "pt-18",
        )}
      >
        <Sidebar dates={screen.dates} selected={screen.selected} onSelect={screen.select}>
          <ConfigList
            onSettings={screen.openSettings}
            onSecretKey={screen.openSecretKey}
            onLock={screen.lockFromMenu}
            locking={today.locking}
          />
        </Sidebar>
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
          // spacing: room at the end as tall as the row of the writing tools, so the last line can scroll out from under it
          screen.showsToday && "pb-12",
          // typography
          "text-[length:var(--entry-size)]",
        )}
      >
        <div className="mx-auto w-full max-w-(--entry-width)">
          {screen.showsToday ? (
            today.loading || today.loadFailed ? null : (
              <DiaryEditor
                ref={editor}
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
          // layout: edge to edge, out past the page's side padding
          "sticky bottom-0 z-5 -mx-5 grid h-[calc(--spacing(20)+var(--spacing-safe-bottom))] grid-cols-[1fr_auto] items-end md:col-span-2 md:-mx-10 md:h-[calc(--spacing(26)+var(--spacing-safe-bottom))]",
          // spacing: the line of the date sits in the middle, above the safe area
          "px-5 pb-[calc(--spacing(4)+var(--spacing-safe-bottom))] md:px-10 md:pb-[calc(--spacing(7)+var(--spacing-safe-bottom))]",
          // shape and color: an island over the entry, which shows past its corners
          "rounded-t-3xl bg-island shadow-island",
        )}
      >
        {/* As tall as the playlist's artwork, so the two sit on one line. */}
        <div className="flex h-12 items-center gap-3">
          <time dateTime={screen.selected} className="text-xl font-bold tabular-nums">
            {screen.selectedParts.year}.{screen.selectedParts.month}.{screen.selectedParts.day}
          </time>
          <span aria-hidden className="size-4 rounded-full bg-stone-200 dark:bg-stone-700" />
        </div>
        <div className="flex justify-end">
          {settings.playlist ? <PlaylistButton playlist={settings.playlist} /> : null}
        </div>
        {/*
          The tools for writing today's entry, floating on a row just above
          the footer: the entry passes behind them. Only the tools take
          presses, so the sidebar beside the row can still be pressed. The
          row's height is repeated in useKeepClear.
        */}
        {screen.showsToday ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-full flex h-12 items-center justify-center *:pointer-events-auto">
            <ToolMenu label="書く道具">
              <IconButton
                look="bubble"
                icon={ImageIcon}
                label="写真を入れる"
                type="button"
                disabled={!editorReady}
                onClick={() => pictureChooser.current?.click()}
              />
              <IconButton
                look="bubble"
                icon={DiceIcon}
                label="フォントを変える"
                type="button"
                disabled={!diceReady}
                onClick={() => void dice.roll()}
              />
            </ToolMenu>
            <PictureInput
              ref={pictureChooser}
              onPick={(files) => editor.current?.addImages(files)}
            />
          </div>
        ) : null}
        <Drawer
          label="メニュー"
          open={screen.menuDrawer.isOpen}
          onOpenChange={screen.menuDrawer.setOpen}
          returnFocus={menuButton}
        >
          <Sidebar dates={screen.dates} selected={screen.selected} onSelect={screen.selectFromMenu}>
            <ConfigList
              onSettings={screen.openSettings}
              onSecretKey={screen.openSecretKey}
              onLock={screen.lockFromMenu}
              locking={today.locking}
            />
          </Sidebar>
        </Drawer>
        <SettingsModal
          open={screen.settingsModal.isOpen}
          onOpenChange={screen.settingsModal.setOpen}
          returnFocus={returnFromMenu}
        />
        <SecretKeyModal
          open={screen.secretKeyModal.isOpen}
          onOpenChange={screen.secretKeyModal.setOpen}
          returnFocus={returnFromMenu}
        />
      </footer>
    </div>
  );
}
