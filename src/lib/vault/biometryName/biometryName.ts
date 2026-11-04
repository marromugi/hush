import type { Biometry } from "@/lib/vault/commands";

const NAMES: Record<Biometry, string> = {
  touchId: "Touch ID",
  faceId: "Face ID",
  opticId: "Optic ID",
};

/** The name the person knows the device's biometry by. */
export function biometryName(biometry: Biometry): string {
  return NAMES[biometry];
}
