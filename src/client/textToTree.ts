import {Node} from '../treefun/node';

export function textToTree(text: string): Node[] {
  const lines = text.split(/\n/);
  const rootNode: Node = {
    label: 'root'
  };

  const stackParents = [rootNode];
  const stackIndents = [-1];
  for (let idx = 0; idx !== lines.length; idx++) {
    const line = lines[idx];
    const content = line.trim();
    if (!content.length) {
      continue;
    }
    const indent = line.indexOf(content);
    while (stackIndents[stackIndents.length - 1] >= indent) {
      stackIndents.pop();
      stackParents.pop();
    }
    const parent = stackParents[stackParents.length - 1];
    const node: Node = {
      label: content
    };
    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(node);
    stackParents.push(node);
    stackIndents.push(indent);
  }
  return rootNode.children || [];
}
