export type Node = {
  label: string;
  children?: Node[];
}

export function isNode(value: unknown): value is Node {
  if (value === null || typeof(value) !== 'object' || Array.isArray(value)) {
    return false;
  }
  if (!('label' in value) || typeof(value.label) !== 'string') {
    return false;
  }
  if (!('children' in value)) {
    return true;
  }
  return Array.isArray(value.children) && value.children.every(element => isNode(element));
}

export function isNodeArray(value: unknown): value is Node[] {
  return Array.isArray(value) && value.every(entry => isNode(entry));
}
