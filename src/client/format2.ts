import {assertDefined} from '../common/check/defined';
import {Node} from '../treefun/node';

export type Format2 = (Format2 | string)[];

function fromJsonFormat2b(data: Format2, parent: Node) {
  let addTo: Node | undefined = parent;
  data.forEach(entry => {
    if (typeof entry === 'string') {
      if (!parent.children) {
        parent.children = [];
      }
      const node: Node = {label: entry};
      parent.children.push(node);
      addTo = node;
    } else {
      if (!addTo) {
        throw new Error();
      }
      fromJsonFormat2b(entry, addTo);
      addTo = undefined;
    }
  });
}

export function fromJsonFormat2(data: Format2) {
  const root: Node = {
    label: 'root'
  };
  fromJsonFormat2b(data, root);
  return assertDefined(root.children);
}

export function toJsonFormat2(tree: Node[]) {
  const out: Format2 = [];
  tree.forEach(node => {
    out.push(node.label);
    if (!node.children) {
      return;
    }
    out.push(toJsonFormat2(node.children));
  });
  return out;
}
