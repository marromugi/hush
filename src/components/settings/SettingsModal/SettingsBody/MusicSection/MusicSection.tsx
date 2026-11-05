import { Radio } from "@/components/ui/Radio";

import { useMusicSection } from "./useMusicSection";

/** Which of the Music app's playlists the diary screen plays from its corner. */
export function MusicSection() {
  const section = useMusicSection();
  const playlists = section.playlists;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 font-semibold">音楽</legend>
      {playlists === null ? null : playlists.status === "failed" ? (
        <p className="text-sm opacity-70">ミュージックのプレイリストを読めませんでした。</p>
      ) : playlists.status === "unsupported" ? (
        <p className="text-sm opacity-70">この端末では、ミュージックのプレイリストを流せません。</p>
      ) : playlists.status === "denied" ? (
        <p className="text-sm opacity-70">
          ミュージックを使う許可がありません。端末の設定で、Hush
          にミュージックへのアクセスを許可してください。
        </p>
      ) : (
        <>
          <p className="text-sm opacity-70">
            この端末だけの設定です。選んだプレイリストのジャケットが、日記の画面の右下に出ます。押すと、シャッフルで流れます。
          </p>
          <Radio
            name="playlist"
            value=""
            label="流さない"
            checked={section.chosen === null}
            disabled={section.busy}
            onChange={() => section.choose(null)}
          />
          {section.missing ? (
            <Radio
              name="playlist"
              value={section.missing.id}
              label={`${section.missing.name}（ミュージックに見つかりません）`}
              checked
              disabled={section.busy}
              onChange={() => undefined}
            />
          ) : null}
          {playlists.playlists.map((playlist) => (
            <Radio
              key={playlist.id}
              name="playlist"
              value={playlist.id}
              label={playlist.name}
              checked={section.chosen?.id === playlist.id}
              disabled={section.busy}
              onChange={() => section.choose(playlist)}
            />
          ))}
          {playlists.playlists.length === 0 && section.missing === null ? (
            <p className="text-sm opacity-70">ミュージックにプレイリストがありません。</p>
          ) : null}
        </>
      )}
    </fieldset>
  );
}
