import type { ComponentProps } from "react";

export type TextFieldProps = {
  /** The form field name; the value is read back under it. */
  name: string;
  label: string;
  /** Shown under the input, which is then marked invalid. */
  error?: string;
} & Pick<ComponentProps<"input">, "type" | "autoComplete" | "disabled">;
