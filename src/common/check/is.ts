export function assertIs<T>(type: { new(...a: any[]): T }, object: any) {
  if (object instanceof type) {
    return object;
  }
  throw new Error(`Expected ${object} to be of type ${type}`);
}
