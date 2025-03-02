export function isNull(value: unknown) {
  return value === null;
}

export function assertNotNull<T>(object: T | null) {
  if (object === null) {
    throw new Error();
  }
  return object;
}
