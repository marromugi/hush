/** The pictures among the files in `data`, in their order. */
export function imageFiles(data: DataTransfer | null): File[] {
  return [...(data?.files ?? [])].filter((file) => file.type.startsWith("image/"));
}
