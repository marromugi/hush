import { useEffect, useState } from "react";

import { dateParts } from "@/components/diary/DiaryScreen/dateParts";
import type { DateParts } from "@/components/diary/DiaryScreen/dateParts";
import { useDisclosure } from "@/hooks/common/useDisclosure";
import type { Disclosure } from "@/hooks/common/useDisclosure";
import { usePromise } from "@/hooks/common/usePromise";
import { useSession } from "@/hooks/vault/useSession";
import { atLeast } from "@/lib/ui/breakpoints";
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
  /** The days, the settings, the Secret Key, and the lock, shown over the diary on a screen too narrow for the sidebar. */
  menuDrawer: Disclosure;
  /** Shows `date` and puts the menu shown over the diary away. */
  selectFromMenu: (date: string) => void;
  /** The Secret Key shown over the diary. */
  secretKeyModal: Disclosure;
  /** Puts the menu away and shows the Secret Key. */
  openSecretKey: () => void;
  /** The settings shown over the diary. */
  settingsModal: Disclosure;
  /** Puts the menu away and shows the settings. */
  openSettings: () => void;
  /** True while the settings, the Secret Key, or the menu are shown over the diary. */
  covered: boolean;
  /** Puts the menu away and locks, saving what is being written first. */
  lockFromMenu: () => void;
  /**
   * Days with an entry, and today even before anything is written. Oldest
   * first. When the days cannot be listed, only today, and a toast says why.
   */
  dates: string[];
};

/** Which day is shown, the days to choose from, and the menu and panels over the diary. */
export function useDiaryScreen(today: string): UseDiaryScreen {
  const { lock } = useSession();
  const [selected, setSelected] = useState(today);
  const listed = usePromise(listEntryDates, null, (failure) => toastError(failureText(failure)));
  const menuDrawer = useDisclosure();
  const secretKeyModal = useDisclosure();
  const settingsModal = useDisclosure();
  // The setter keeps its identity across renders, so the listener is added once.
  const setMenuOpen = menuDrawer.setOpen;

  // The menu shown over the diary has no place once the sidebar is back.
  useEffect(() => {
    const wide = window.matchMedia(atLeast("md"));
    const putAway = () => {
      if (wide.matches) setMenuOpen(false);
    };
    wide.addEventListener("change", putAway);
    return () => wide.removeEventListener("change", putAway);
  }, [setMenuOpen]);

  const written = listed.status === "done" ? listed.value : [];
  return {
    selected,
    selectedParts: dateParts(selected),
    showsToday: selected === today,
    select: setSelected,
    menuDrawer,
    selectFromMenu: (date) => {
      setSelected(date);
      menuDrawer.close();
    },
    secretKeyModal,
    openSecretKey: () => {
      menuDrawer.close();
      secretKeyModal.open();
    },
    settingsModal,
    openSettings: () => {
      menuDrawer.close();
      settingsModal.open();
    },
    covered: menuDrawer.isOpen || secretKeyModal.isOpen || settingsModal.isOpen,
    lockFromMenu: () => {
      menuDrawer.close();
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
