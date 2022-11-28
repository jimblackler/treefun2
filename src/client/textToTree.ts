import {Node} from '../treefun/node';

export function textToTree(text: string): Node[] {
  const lines = text.split(/\n/);
  const rootNode: Node = {
    label: 'root'
  };

  const stackParents = [rootNode];
  const stackIndents = [-1];
  for (const line of lines) {
    let indent = 0;
    while (indent < line.length) {
      if (line[indent] !== ' ') {
        break;
      }
      indent++;
    }
    while (stackIndents[stackIndents.length - 1] >= indent) {
      stackIndents.pop();
      stackParents.pop();
    }
    const parent = stackParents[stackParents.length - 1];
    const node: Node = {
      label: line.substring(indent)
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
