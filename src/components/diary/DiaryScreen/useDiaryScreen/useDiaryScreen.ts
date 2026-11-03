import { useEffect, useState } from "react";

import { dateParts } from "@/components/diary/DiaryScreen/dateParts";
import type { DateParts } from "@/components/diary/DiaryScreen/dateParts";
import { useDisclosure } from "@/hooks/common/useDisclosure";
import type { Disclosure } from "@/hooks/common/useDisclosure";
import { usePromise } from "@/hooks/common/usePromise";
import { useSession } from "@/hooks/vault/useSession";
import { toastError } from "@/lib/ui/toast";
import { listEntryDates } from "@/lib/vault/commands";
import { failureText } from "@/lib/vault/errorText";

export type UseDiaryScreen = {
  /** The day shown, as `YYYY-MM-DD`. Today at first. */
  selected: string;
  selectedParts: DateParts;
  /** True while today is shown; it is the only day that can be written. */
  showsToday: boolean;
  select: (date: string) => void;
  /** The days shown over the diary, on a screen too narrow for the sidebar. */
  datesDrawer: Disclosure;
  /** Shows `date` and puts the days shown over the diary away. */
  selectFromDates: (date: string) => void;
  configMenu: Disclosure;
  /** The Secret Key shown over the diary. */
  secretKeyModal: Disclosure;
  /** Closes the config menu and shows the Secret Key. */
  openSecretKey: () => void;
  /** The settings shown over the diary. */
  settingsModal: Disclosure;
  /** Closes the config menu and shows the settings. */
  openSettings: () => void;
  /** Closes the config menu and locks, saving what is being written first. */
  lockFromConfig: () => void;
  /**
   * Days with an entry, and today even before anything is written. Oldest
   * first. When the days cannot be listed, only today, and a toast says why.
   */
  dates: string[];
};

/** Wide enough for the sidebar beside the diary: Tailwind's `md`. */
const WIDE = "(min-width: 48rem)";

/** Which day is shown, the days to choose from, and the menus and panels over the diary. */
export function useDiaryScreen(today: string): UseDiaryScreen {
  const { lock } = useSession();
  const [selected, setSelected] = useState(today);
  const listed = usePromise(listEntryDates, null, (failure) => toastError(failureText(failure)));
  const datesDrawer = useDisclosure();
  const configMenu = useDisclosure();
  const secretKeyModal = useDisclosure();
  const settingsModal = useDisclosure();
  // The setter keeps its identity across renders, so the listener is added once.
  const setDatesOpen = datesDrawer.setOpen;

  // The days shown over the diary have no place once the sidebar is back.
  useEffect(() => {
    const wide = window.matchMedia(WIDE);
    const putAway = () => {
      if (wide.matches) setDatesOpen(false);
    };
    wide.addEventListener("change", putAway);
    return () => wide.removeEventListener("change", putAway);
  }, [setDatesOpen]);

  const written = listed.status === "done" ? listed.value : [];
  return {
    selected,
    selectedParts: dateParts(selected),
    showsToday: selected === today,
    select: setSelected,
    datesDrawer,
    selectFromDates: (date) => {
      setSelected(date);
      datesDrawer.close();
    },
    configMenu,
    secretKeyModal,
    openSecretKey: () => {
      configMenu.close();
      secretKeyModal.open();
    },
    settingsModal,
    openSettings: () => {
      configMenu.close();
      settingsModal.open();
    },
    lockFromConfig: () => {
      configMenu.close();
      void lock();
    },
    dates: written.includes(today)
      ? written
      : [
          ...written.filter((date) => date < today),
          today,
          ...written.filter((date) => date > today),
        ],
  };
}
