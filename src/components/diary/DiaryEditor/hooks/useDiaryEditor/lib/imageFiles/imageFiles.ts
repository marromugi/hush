/**
 * The pictures among the files in `data`, in their order. None when `data`
 * also holds text: apps such as spreadsheets put a picture of the copied
 * cells beside the text, and the text is what was meant.
 */
export function imageFiles(data: DataTransfer | null): File[] {
  if (!data || data.getData("text/plain") !== "") return [];
  return [...data.files].filter((file) => file.type.startsWith("image/"));
}
