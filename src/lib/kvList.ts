import { z, ZodSchema } from "zod";

export function kvListSchema<T>(valueSchema?: ZodSchema<T>) {
  return z.array(z.tuple([z.string(), valueSchema ?? z.any()]));
}

export function parseKvList<T>(
  kvList: unknown,
  valueSchema?: ZodSchema<T>
): KVList<T> {
  return kvListSchema(valueSchema).parse(kvList) as KVList<T>;
}

export type KVList<T> = [string, T][];

export function fromObject<T>(obj: Record<string, T | T[]>): KVList<T> {
  const list: KVList<T> = [];
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      for (const vi of v) {
        list.push([k, vi]);
      }
    } else {
      list.push([k, v]);
    }
  }
  return list;
}

export function toObject<T>(list: KVList<T>): Record<string, T[]> {
  const obj: Record<string, T[]> = {};
  for (const [k, v] of list) {
    obj[k] = [...obj[k], v];
  }
  return obj;
}

export function fromFlatArray<T>(flat: (string | T)[]): KVList<T> {
  const list: KVList<T> = [];
  for (let i = 0; i < flat.length; i += 2) {
    list.push([flat[i] as string, flat[i + 1] as T]);
  }
  return list;
}

export function arrayReplace<T>(
  arr: T[],
  index: number,
  ...newValues: T[]
): T[] {
  const newArr = [...arr];
  newArr.splice(index, 1, ...newValues);
  return newArr;
}
