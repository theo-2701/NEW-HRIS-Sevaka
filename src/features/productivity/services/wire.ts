/**
 * Kontrak productivity memakai snake_case di kabel; layar memakai camelCase. Dua penerjemah dalam ini dipakai
 * cabang API seluruh service productivity supaya pemetaan medan tidak ditulis ulang per endpoint.
 */
type Json = unknown;

const toCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
const toSnake = (key: string) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);

function mapKeys(value: Json, rename: (key: string) => string): Json {
  if (Array.isArray(value)) return value.map((item) => mapKeys(item, rename));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, Json>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [rename(key), mapKeys(item, rename)]),
    );
  }
  return value;
}

export const camelize = <T>(value: Json) => mapKeys(value, toCamel) as T;
export const snakeize = (value: Json) => mapKeys(value, toSnake);

export interface WirePage<T> {
  data: T[];
  totalData: number;
  totalPage: number;
  currentPage: number;
  size: number;
}

export const newIdempotencyKey = () => crypto.randomUUID();
