import { useId } from "react";

import { control } from "./style";
import type { TextFieldProps } from "./type";

/** A labelled input, with its error under it. */
export function TextField({ name, label, error, ...props }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        {...props}
        id={id}
        name={name}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={error === undefined ? undefined : errorId}
        className={control({ state: error === undefined ? "default" : "error" })}
      />
      {error === undefined ? null : (
        <p id={errorId} role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
