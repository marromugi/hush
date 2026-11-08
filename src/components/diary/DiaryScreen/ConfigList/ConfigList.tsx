import { clsx } from "clsx";

import { menuItem } from "@/components/diary/DiaryScreen/menuItem";

import type { ConfigListProps } from "./type";

const item = clsx(menuItem, "disabled:pointer-events-none disabled:opacity-25");

/** The settings, the Secret Key, and the lock, listed under the days. */
export function ConfigList({ onSettings, onSecretKey, onLock, locking }: ConfigListProps) {
  return (
    <ul className="text-sm">
      <li>
        <button type="button" className={item} onClick={onSettings}>
          設定
        </button>
      </li>
      <li>
        <button type="button" className={item} onClick={onSecretKey}>
          Secret Key
        </button>
      </li>
      <li>
        <button type="button" className={item} disabled={locking} onClick={onLock}>
          ロック
        </button>
      </li>
    </ul>
  );
}
