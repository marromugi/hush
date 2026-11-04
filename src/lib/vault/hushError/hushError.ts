/** Every `kind` the Rust side sends, plus `unknown` for anything else. */
export const HUSH_ERROR_KINDS = [
  "wrongPassphrase",
  "wrongPassphraseOrSecretKey",
  "invalidSecretKey",
  "noSecretKey",
  "keychain",
  "noBiometry",
  "biometryCancelled",
  "biometryFailed",
  "biometricKeychain",
  "noKeptKey",
  "emptyPassphrase",
  "noVault",
  "vaultExists",
  "locked",
  "invalidDate",
  "newerVaultVersion",
  "outdatedVault",
  "brokenVault",
  "newerEntryVersion",
  "brokenEntry",
  "newerImageVersion",
  "brokenImage",
  "invalidImageId",
  "noImage",
  "unsupportedPicture",
  "embedPages",
  "decryption",
  "encryption",
  "keyDerivation",
  "random",
  "io",
  "tauri",
  "unknown",
] as const;

export type HushErrorKind = (typeof HUSH_ERROR_KINDS)[number];

export class HushError extends Error {
  readonly kind: HushErrorKind;

  constructor(kind: HushErrorKind, message: string) {
    super(message);
    this.name = "HushError";
    this.kind = kind;
  }
}

function isKind(value: unknown): value is HushErrorKind {
  return HUSH_ERROR_KINDS.some((kind) => kind === value);
}

/**
 * Turns whatever a rejected `invoke` gives into a `HushError`. Commands send
 * `{ kind, message }`; Tauri itself sends a plain string when a command's
 * arguments are wrong, before the command runs.
 */
export function toHushError(error: unknown): HushError {
  if (error instanceof HushError) {
    return error;
  }
  if (typeof error === "object" && error !== null && "kind" in error) {
    const message = "message" in error ? String(error.message) : "";
    return new HushError(isKind(error.kind) ? error.kind : "unknown", message);
  }
  if (error instanceof Error) {
    return new HushError("unknown", error.message);
  }
  return new HushError("unknown", String(error));
}

/** True for the kinds that mean the typed passphrase itself is wrong. */
export function isAboutPassphrase(kind: HushErrorKind): boolean {
  return kind === "wrongPassphrase" || kind === "emptyPassphrase";
}

/** True for a failure about what was typed, which the form shows itself instead of a toast. */
export function isAboutInput(kind: HushErrorKind): boolean {
  return (
    isAboutPassphrase(kind) || kind === "invalidSecretKey" || kind === "wrongPassphraseOrSecretKey"
  );
}
