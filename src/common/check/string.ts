export function assertString(object: any) {
  if (typeof object !== 'string') {
    throw new Error();
  }
  return object;
}
