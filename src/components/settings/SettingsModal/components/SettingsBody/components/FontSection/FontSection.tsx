import { Button } from "../../../../../../ui/Button";
import { Combobox } from "../../../../../../ui/Combobox";
import { useFontSection } from "./hooks/useFontSection";

/** The font entries are shown in until the dice picks another. */
export function FontSection() {
  const section = useFontSection();

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">フォント</h3>
      <p className="text-sm opacity-70">
        日記の文章の、ふだんのフォントです。今日の日記は、サイコロを振るまでこのフォントで出ます。言語ごとに選べます。
      </p>
      <Combobox
        label={
          section.language === "ja" ? "ふだんのフォント（日本語）" : "ふだんのフォント（English）"
        }
        options={section.options}
        value={section.value}
        onChange={(id) => void section.choose(id)}
        placeholder={section.fonts === null ? "読み込み中…" : "入力して探す"}
        disabled={section.fonts === null}
      />
      {(section.listError ?? section.chooseError) ? (
        <p role="alert" className="text-sm text-error">
          {section.listError ?? section.chooseError}
        </p>
      ) : null}
      {section.chosen ? (
        <div>
          <Button type="button" tone="neutral" onClick={() => void section.choose(null)}>
            標準のフォントに戻す
          </Button>
        </div>
      ) : null}
      <p
        style={{ fontFamily: section.sample }}
        className="rounded-md border border-edge px-4 py-3 text-lg"
      >
        今日は晴れ。The quick brown fox jumps over the lazy dog.
      </p>
    </section>
  );
}
