import { valibotResolver } from "@hookform/resolvers/valibot";
import { useState } from "react";
import type { BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegister } from "react-hook-form";
import * as v from "valibot";

const schema = v.object({ secretKey: v.string(), passphrase: v.string() });

type Fields = v.InferInput<typeof schema>;

export type UseNewDeviceUnlockForm = {
  register: UseFormRegister<Fields>;
  handleSubmit: (event?: BaseSyntheticEvent) => void;
  /** True while the camera is reading a QR code. */
  scanning: boolean;
  startScan: () => void;
  stopScan: () => void;
  /** Puts the text read from a QR code into the Secret Key field. */
  onScanned: (text: string) => void;
};

export function useNewDeviceUnlockForm(
  onUnlock: (passphrase: string, secretKey: string) => Promise<void>,
): UseNewDeviceUnlockForm {
  const form = useForm<Fields>({
    resolver: valibotResolver(schema),
    defaultValues: { secretKey: "", passphrase: "" },
  });
  const [scanning, setScanning] = useState(false);

  return {
    register: form.register,
    handleSubmit: (event) =>
      void form.handleSubmit(({ passphrase, secretKey }) => onUnlock(passphrase, secretKey))(event),
    scanning,
    startScan: () => setScanning(true),
    stopScan: () => setScanning(false),
    onScanned: (text) => {
      form.setValue("secretKey", text);
      setScanning(false);
    },
  };
}
