import {Node} from '../treefun/node';

function* yieldNodes(nodes: Node[], level: number): Generator<{ level: number; label: string }> {
  for (let idx = 0; idx !== nodes.length; idx++) {
    const node = nodes[idx];
    yield {level, label: node.label};
    if (node.children) {
      yield* yieldNodes(node.children, level + 1);
    }
  }
}

export function treeToText(tree: Node[]): string {
  const lines: string[] = [];
  for (const {level, label} of yieldNodes(tree || [], 0)) {
    let indent = '';
    for (let idx = 0; idx !== level; idx++) {
      indent += ' ';
    }
    lines.push(indent + label);
  }
  return lines.join('\n');
}
