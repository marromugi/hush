/** The text typed into the field called `name`, or "" when there is none. */
export function readField(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === "string" ? value : "";
}
