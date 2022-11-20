export function assertTruthy<T>(object: T | null | undefined) {
  if (!object) {
    throw new Error();
  }
  return object;
}
