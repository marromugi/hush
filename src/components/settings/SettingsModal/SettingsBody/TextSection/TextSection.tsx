import { clsx } from "clsx";

import { Button } from "@/components/ui/Button";
import { entryProse } from "@/lib/diary/entryProse";
import { entryTextStyle } from "@/lib/diary/entryTextStyle";
import { TEXT_RANGES } from "@/lib/settings/settings";

import { useTextSection } from "./useTextSection";

const SLIDERS = [
  { name: "size", label: "フォントサイズ", show: (value: number) => `${value}px` },
  { name: "lineHeight", label: "行間", show: (value: number) => `${value.toFixed(1)} 倍` },
  { name: "letterSpacing", label: "文字間", show: (value: number) => `${value.toFixed(2)} 倍` },
] as const;

/** The size of the entry's text, and the space between its lines and letters. */
export function TextSection() {
  const section = useTextSection();

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold">文字</h3>
      <p className="text-sm opacity-70">
        日記の本文の文字です。行間と文字間は、文字の大きさに対する倍率です。
      </p>
      {SLIDERS.map((slider) => {
        const range = TEXT_RANGES[slider.name];
        const value = section.text[slider.name];
        return (
          <div key={slider.name} className="flex flex-col gap-1">
            <span className="flex justify-between text-sm">
              <label htmlFor={`text-${slider.name}`}>{slider.label}</label>
              <span className="tabular-nums opacity-70">{slider.show(value)}</span>
            </span>
            <input
              id={`text-${slider.name}`}
              type="range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={value}
              aria-valuetext={slider.show(value)}
              onChange={(event) => section.change(slider.name, Number(event.target.value))}
              className="accent-accent"
            />
          </div>
        );
      })}
      <div>
        {/* aria-disabled, not disabled, so the focus stays on it after it is pressed. */}
        <Button
          type="button"
          tone="neutral"
          aria-disabled={section.initial}
          onClick={section.initial ? undefined : section.reset}
        >
          元に戻す
        </Button>
      </div>
      <div style={entryTextStyle(section.text)}>
        <p className={clsx(entryProse, "rounded-container border border-edge container-p-4")}>
          今日は晴れ。午後から少し風が出てきて、窓の外の木がずっと揺れていた。
        </p>
      </div>
    </div>
  );
}
