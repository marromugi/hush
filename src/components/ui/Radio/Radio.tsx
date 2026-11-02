import { radio } from "./style";
import type { RadioProps } from "./type";

/** One choice among several with the same name, drawn so its look and motion are Hush's own. */
export function Radio({ label, ...props }: RadioProps) {
  const style = radio();

  return (
    <label className={style.root()}>
      <span className={style.circle()}>
        <input {...props} type="radio" className={style.input()} />
        <span aria-hidden className={style.dot()} />
      </span>
      {label}
    </label>
  );
}
