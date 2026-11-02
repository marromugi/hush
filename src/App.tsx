import { DiaryScreen } from "./components/diary/DiaryScreen";
import { NarrowPage } from "./components/ui/NarrowPage";
import { WindowDragRegion } from "./components/ui/WindowDragRegion";
import { CreateVaultForm } from "./components/vault/CreateVaultForm";
import { NewDeviceUnlockForm } from "./components/vault/NewDeviceUnlockForm";
import { SecretKeyNotice } from "./components/vault/SecretKeyNotice";
import { UnlockedSession } from "./components/vault/UnlockedSession";
import { UnlockForm } from "./components/vault/UnlockForm";
import { useVault } from "./hooks/vault/useVault";
import { errorText } from "./lib/vault/errorText";

export function App() {
  return (
    <>
      <WindowDragRegion />
      <Screen />
    </>
  );
}

/** The screen for where the vault stands: locked, unlocked, or not made yet. */
function Screen() {
  const vault = useVault();

  if (vault.status === "unlocked") {
    return (
      <UnlockedSession onLock={vault.lock}>
        {vault.newSecretKey === null ? (
          <DiaryScreen />
        ) : (
          <NarrowPage>
            <SecretKeyNotice secretKey={vault.newSecretKey} onKept={vault.keptSecretKey} />
          </NarrowPage>
        )}
      </UnlockedSession>
    );
  }

  return (
    <NarrowPage>
      {vault.status === "loading" && vault.error ? (
        <p role="alert" className="text-error">
          {errorText(vault.error.kind)}
        </p>
      ) : null}
      {vault.status === "missing" ? (
        <CreateVaultForm busy={vault.busy} error={vault.error} onCreate={vault.create} />
      ) : null}
      {vault.status === "needsSecretKey" ? (
        <NewDeviceUnlockForm busy={vault.busy} error={vault.error} onUnlock={vault.unlock} />
      ) : null}
      {vault.status === "locked" ? (
        <UnlockForm busy={vault.busy} error={vault.error} onUnlock={vault.unlock} />
      ) : null}
    </NarrowPage>
  );
}
