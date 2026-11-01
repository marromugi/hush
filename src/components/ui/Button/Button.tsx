import { button } from "./style";
import type { ButtonProps } from "./type";

export function Button({ tone, className, ...props }: ButtonProps) {
  return <button className={button({ tone, className })} {...props} />;
}
