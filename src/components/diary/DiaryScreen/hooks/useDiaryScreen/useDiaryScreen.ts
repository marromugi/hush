import { useEffect, useState } from "react";

import { useSession } from "../../../../../hooks/vault/useSession";
import { listEntryDates } from "../../../../../lib/vault/commands";
import { errorText } from "../../../../../lib/vault/errorText";
import { toHushError } from "../../../../../lib/vault/hushError";
import { dateParts } from "../../lib/dateParts";
import type { DateParts } from "../../lib/dateParts";

type Listed = { dates: string[] } | { error: string };

export type UseDiaryScreen = {
  /** The day shown, as `YYYY-MM-DD`. Today at first. */
  selected: string;
  selectedParts: DateParts;
  /** True while today is shown; it is the only day that can be written. */
  showsToday: boolean;
  select: (date: string) => void;
  /** True while the days are shown over the diary, on a screen too narrow for the sidebar. */
  datesOpen: boolean;
  setDatesOpen: (open: boolean) => void;
  /** Shows `date` and puts the days shown over the diary away. */
  selectFromDates: (date: string) => void;
  /** True while the config menu is open. */
  configOpen: boolean;
  setConfigOpen: (open: boolean) => void;
  /** True while the Secret Key is shown over the diary. */
  secretKeyOpen: boolean;
  setSecretKeyOpen: (open: boolean) => void;
  /** Closes the config menu and shows the Secret Key. */
  openSecretKey: () => void;
  /** True while the settings are shown over the diary. */
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  /** Closes the config menu and shows the settings. */
  openSettings: () => void;
  /** Closes the config menu and locks, saving what is being written first. */
  lockFromConfig: () => void;
  /** Days with an entry, and today even before anything is written. Oldest first. */
  dates: string[];
  datesError: string | null;
};

/** Which day is shown, the days to choose from, and the menus and panels over the diary. */
export function useDiaryScreen(today: string): UseDiaryScreen {
  const { lock } = useSession();
  const [selected, setSelected] = useState(today);
  const [listed, setListed] = useState<Listed | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [secretKeyOpen, setSecretKeyOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    void listEntryDates().then(
      (dates) => {
        if (!ignore) setListed({ dates });
      },
      (failure: unknown) => {
        if (!ignore) setListed({ error: errorText(toHushError(failure).kind) });
      },
    );
    return () => {
      ignore = true;
    };
  }, []);

  const written = listed && "dates" in listed ? listed.dates : [];
  return {
    selected,
    selectedParts: dateParts(selected),
    showsToday: selected === today,
    select: setSelected,
    datesOpen,
    setDatesOpen,
    selectFromDates: (date) => {
      setSelected(date);
      setDatesOpen(false);
    },
    configOpen,
    setConfigOpen,
    secretKeyOpen,
    setSecretKeyOpen,
    openSecretKey: () => {
      setConfigOpen(false);
      setSecretKeyOpen(true);
    },
    settingsOpen,
    setSettingsOpen,
    openSettings: () => {
      setConfigOpen(false);
      setSettingsOpen(true);
    },
    lockFromConfig: () => {
      setConfigOpen(false);
      void lock();
    },
    dates: written.includes(today)
      ? written
      : [
          ...written.filter((date) => date < today),
          today,
          ...written.filter((date) => date > today),
        ],
    datesError: listed && "error" in listed ? listed.error : null,
  };
}
