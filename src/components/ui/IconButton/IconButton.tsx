import { Icon } from "@/components/ui/Icon";

import { iconButton } from "./style";
import type { IconButtonProps } from "./type";

/** A round button that shows only an icon. */
export function IconButton({ icon, label, look, className, ...props }: IconButtonProps) {
  return (
    <button {...props} aria-label={label} className={iconButton({ look, className })}>
      <Icon icon={icon} size="md" />
    </button>
  );
}
