import { MotionConfig, motion } from "motion/react";

import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, Icon } from "@/components/ui/Icon";
import type { IconSource } from "@/components/ui/Icon";
import { optionList, optionRow } from "@/components/ui/Options";
import type { ImageAlign } from "@/lib/diary/imageAlign";

import type { ImageMenuProps } from "./type";

const CHOICES: Array<{ align: ImageAlign; icon: IconSource; label: string }> = [
  { align: "left", icon: AlignLeftIcon, label: "左に寄せる" },
  { align: "center", icon: AlignCenterIcon, label: "中央に置く" },
  { align: "right", icon: AlignRightIcon, label: "右に寄せる" },
];

/** The buttons that move the selected image across the entry. Rises into place when it appears. */
export function ImageMenu({ align, onAlign }: ImageMenuProps) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        role="toolbar"
        aria-label="画像の位置"
        className={optionList({ className: "flex-row shadow-float" })}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.25, duration: 0.3 }}
      >
        {CHOICES.map((choice) => (
          <button
            key={choice.align}
            type="button"
            aria-label={choice.label}
            aria-pressed={align === choice.align}
            className={optionRow({
              active: align === choice.align ? "yes" : "no",
              className: "w-auto px-2",
            })}
            onClick={() => onAlign(choice.align)}
          >
            <Icon icon={choice.icon} size="md" />
          </button>
        ))}
      </motion.div>
    </MotionConfig>
  );
}
