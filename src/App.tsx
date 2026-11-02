import { clsx } from "clsx";

import { DiaryScreen } from "./components/diary/DiaryScreen";
import { CreateVaultForm } from "./components/vault/CreateVaultForm";
import { NewDeviceUnlockForm } from "./components/vault/NewDeviceUnlockForm";
import { SecretKeyNotice } from "./components/vault/SecretKeyNotice";
import { UnlockForm } from "./components/vault/UnlockForm";
import { useVault } from "./hooks/vault/useVault";
import { errorText } from "./lib/vault/errorText";

export function App() {
  const vault = useVault();

  if (vault.status === "unlocked" && vault.newSecretKey === null) {
    return <DiaryScreen onLock={vault.lock} />;
  }

  return (
    <main className="min-h-screen">
      <div
        className={clsx(
          // layout
          "mx-auto max-w-2xl",
          // spacing
          "px-6 py-12",
        )}
      >
        {vault.status === "loading" && vault.error ? (
          <p role="alert" className="text-error">
            {errorText(vault.error.kind)}
          </p>
        ) : null}
        {vault.status === "missing" ? (
          <CreateVaultForm busy={vault.busy} error={vault.error} onCreate={vault.create} />
        ) : null}
        {vault.status === "unlocked" && vault.newSecretKey !== null ? (
          <SecretKeyNotice
            secretKey={vault.newSecretKey}
            onKept={vault.keptSecretKey}
            onLock={vault.lock}
          />
        ) : null}
        {vault.status === "needsSecretKey" ? (
          <NewDeviceUnlockForm busy={vault.busy} error={vault.error} onUnlock={vault.unlock} />
        ) : null}
        {vault.status === "locked" ? (
          <UnlockForm busy={vault.busy} error={vault.error} onUnlock={vault.unlock} />
        ) : null}
      </div>
    </main>
  );
}
