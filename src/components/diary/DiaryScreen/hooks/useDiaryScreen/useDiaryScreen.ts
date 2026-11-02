import { useEffect, useState } from "react";

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
  /** True while the config menu is open. */
  configOpen: boolean;
  setConfigOpen: (open: boolean) => void;
  /** True while the Secret Key is shown over the diary. */
  secretKeyOpen: boolean;
  setSecretKeyOpen: (open: boolean) => void;
  /** Closes the config menu and shows the Secret Key. */
  openSecretKey: () => void;
  /** Closes the config menu and locks, saving what is being written first. */
  lockFromConfig: () => void;
  /** Days with an entry, and today even before anything is written. Oldest first. */
  dates: string[];
  datesError: string | null;
};

/**
 * Which day is shown, the days to choose from, and the config menu. `lock`
 * saves what is being written, then locks. Mount it on unlock.
 */
export function useDiaryScreen(today: string, lock: () => Promise<void>): UseDiaryScreen {
  const [selected, setSelected] = useState(today);
  const [listed, setListed] = useState<Listed | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [secretKeyOpen, setSecretKeyOpen] = useState(false);

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
    configOpen,
    setConfigOpen,
    secretKeyOpen,
    setSecretKeyOpen,
    openSecretKey: () => {
      setConfigOpen(false);
      setSecretKeyOpen(true);
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
