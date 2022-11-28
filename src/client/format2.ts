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
  return assertDefined(root.children)[0];
}

function toJsonFormat2b(tree: Node, addTo: Format2) {
  addTo.push(tree.label);
  if (!tree.children) {
    return;
  }
  const p: Format2 = [];
  tree.children.forEach(node => toJsonFormat2b(node, p));
  addTo.push(p);
}

export function toJsonFormat2(tree: Node): Format2 {
  const out: Format2 = [];
  toJsonFormat2b(tree, out);
  return out;
}
