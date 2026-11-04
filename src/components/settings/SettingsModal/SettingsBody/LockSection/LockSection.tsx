import { Radio } from "@/components/ui/Radio";
import { biometryName } from "@/lib/vault/biometryName";

import { useLockSection } from "./useLockSection";

/** Whether this device opens the vault with Touch ID or Face ID as well as the passphrase. */
export function LockSection() {
  const section = useLockSection();
  const biometry = section.status?.biometry ?? null;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 font-semibold">ロック</legend>
      {section.status === null ? null : biometry === null ? (
        <p className="text-sm opacity-70">
          この端末では、日記帳はパスフレーズで開きます。Touch ID や Face ID
          が使える端末では、それでも開けるようにできます。
        </p>
      ) : (
        <>
          <p className="text-sm opacity-70">
            この端末だけの設定です。{biometryName(biometry)}
            でも開けるようにすると、この端末と{biometryName(biometry)}
            で日記帳を開けます。パスフレーズは、{biometryName(biometry)}
            で開けないときに使います。
          </p>
          <Radio
            name="unlock"
            value="passphrase"
            label="パスフレーズだけで開く"
            checked={!section.status.on}
            disabled={section.busy}
            onChange={() => section.setOn(false)}
          />
          <Radio
            name="unlock"
            value="biometry"
            label={`${biometryName(biometry)} でも開く`}
            checked={section.status.on}
            disabled={section.busy}
            onChange={() => section.setOn(true)}
          />
        </>
      )}
    </fieldset>
  );
}
