export function arrayReplace<T>(
  arr: T[],
  index: number,
  ...newValues: T[]
): T[] {
  const newArr = [...arr];
  newArr.splice(index, 1, ...newValues);
  return newArr;
}
