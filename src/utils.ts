export function headerNameDisplay(v: string) {
  return v?.replace(/(?<!\w)[a-zA-Z]/g, (match) => match.toUpperCase());
}
