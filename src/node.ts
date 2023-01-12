export type Node = {
  label: string;
  children?: Node[];
}

export function isNode(test: any): test is Node {
  if (test === null) {
    return false;
  }
  if (typeof test !== 'object') {
    return false;
  }
  if (typeof test['label'] !== 'string') {
    return false;
  }
  if (!('children' in test)) {
    return true;
  }
  return isNodeArray(test.children);
}

export function isNodeArray(test: any): test is Node[] {
  return Array.isArray(test) && test.every(isNode);
}
