import { input } from "./style";
import type { InputProps } from "./type";

export function Input({ className, ...props }: InputProps) {
  return <input className={input({ className })} {...props} />;
}
