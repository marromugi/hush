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
  /** Shows that day, and closes the Secret Key if it is shown. */
  select: (date: string) => void;
  /** True while the Secret Key is shown in place of the day. */
  showsSecretKey: boolean;
  openSecretKey: () => void;
  closeSecretKey: () => void;
  /** Days with an entry, and today even before anything is written. Oldest first. */
  dates: string[];
  datesError: string | null;
};

/** Which day is shown, and the days to choose from. Mount it on unlock. */
export function useDiaryScreen(today: string): UseDiaryScreen {
  const [selected, setSelected] = useState(today);
  const [listed, setListed] = useState<Listed | null>(null);
  const [showsSecretKey, setShowsSecretKey] = useState(false);

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
    select: (date) => {
      setSelected(date);
      setShowsSecretKey(false);
    },
    showsSecretKey,
    openSecretKey: () => setShowsSecretKey(true),
    closeSecretKey: () => setShowsSecretKey(false),
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
