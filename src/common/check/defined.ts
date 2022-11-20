export function assertDefined<T>(object: T | undefined) {
  if (object === undefined) {
    throw new Error();
  }
  return object;
}

export function isDefined<T>(object: T | undefined): object is T {
  return object !== undefined;
}
