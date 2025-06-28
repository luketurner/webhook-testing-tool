import { z } from "zod/v4";

export function createMetaSchema<T extends z.ZodRawShape>(
  baseSchema: z.ZodObject<T>,
  omitFields: (keyof T)[],
) {
  const omitObject = {} as any;
  omitFields.forEach((field) => {
    omitObject[field] = true;
  });

  return baseSchema.omit(omitObject);
}

export const commonSchemaPatterns = {
  status: <T extends [string, ...string[]]>(statuses: T) => z.enum(statuses),

  entityList: <T extends z.ZodTypeAny>(itemSchema: T) =>
    z.array(itemSchema).min(1),

  bulkUpdate: <T extends z.ZodTypeAny>(itemSchema: T) =>
    z.object({
      updates: z.array(itemSchema).min(1),
    }),
};
