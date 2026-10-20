export class ContractValidationError extends Error {
  constructor(readonly path: string, readonly rule: string) {
    super(`${path}: ${rule}`);
    this.name = "ContractValidationError";
  }
}

export interface Schema<T> {
  parse(value: unknown): T;
  safeParse(value: unknown):
    | { success: true; data: T }
    | { success: false; error: ContractValidationError };
  read(value: unknown, path: string): T;
}

export type Infer<S> = S extends Schema<infer T> ? T : never;

export function schema<T>(read: (value: unknown, path: string) => T): Schema<T> {
  return {
    read,
    parse: (value) => read(value, "$"),
    safeParse(value) {
      try {
        return { success: true, data: read(value, "$") };
      } catch (error) {
        if (error instanceof ContractValidationError) return { success: false, error };
        throw error;
      }
    },
  };
}

export function reject(path: string, rule: string): never {
  // Error messages deliberately exclude input values (including tokens).
  throw new ContractValidationError(path, rule);
}

export const literal = <const T extends string | number | boolean | null>(expected: T) =>
  schema<T>((value, path) => value === expected ? expected : reject(path, "unexpected literal"));

export const text = (min = 1, max = 500, pattern?: RegExp) =>
  schema<string>((value, path) =>
    typeof value === "string" && value.length >= min && value.length <= max &&
    (!pattern || pattern.test(value)) ? value : reject(path, "invalid string"));

export const integer = (min = 0, max = Number.MAX_SAFE_INTEGER) =>
  schema<number>((value, path) =>
    typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max
      ? value : reject(path, "invalid integer"));

export const boolean = schema<boolean>((value, path) =>
  typeof value === "boolean" ? value : reject(path, "invalid boolean"));

export const nullable = <T>(inner: Schema<T>) =>
  schema<T | null>((value, path) => value === null ? null : inner.read(value, path));

export const array = <T>(inner: Schema<T>, max: number, min = 0) =>
  schema<T[]>((value, path) => {
    if (!Array.isArray(value) || value.length < min || value.length > max) {
      return reject(path, "invalid array length");
    }
    return Array.from(value, (item, index) => inner.read(item, `${path}[${index}]`));
  });

export const object = <S extends Record<string, Schema<unknown>>>(shape: S) =>
  schema<{ [K in keyof S]: Infer<S[K]> }>((value, path) => {
    if (value === null || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      return reject(path, "expected plain object");
    }
    const record = value as Record<string, unknown>;
    if (Object.keys(record).some((key) => !Object.hasOwn(shape, key))) {
      return reject(path, "unknown field");
    }
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(shape)) {
      if (!Object.hasOwn(record, key)) return reject(`${path}.${key}`, "missing field");
      result[key] = shape[key]!.read(record[key], `${path}.${key}`);
    }
    return result as { [K in keyof S]: Infer<S[K]> };
  });

export const union = <const S extends readonly Schema<unknown>[]>(...choices: S) =>
  schema<Infer<S[number]>>((value, path) => {
    for (const choice of choices) {
      try { return choice.read(value, path) as Infer<S[number]>; }
      catch (error) { if (!(error instanceof ContractValidationError)) throw error; }
    }
    return reject(path, "no matching variant");
  });

export const refine = <T>(inner: Schema<T>, check: (value: T) => boolean, rule: string) =>
  schema<T>((value, path) => {
    const parsed = inner.read(value, path);
    return check(parsed) ? parsed : reject(path, rule);
  });
