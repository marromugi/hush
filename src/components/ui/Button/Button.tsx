import { button } from "./style";
import type { ButtonProps } from "./type";

export function Button({ className, ...props }: ButtonProps) {
  return <button className={button({ className })} {...props} />;
}
