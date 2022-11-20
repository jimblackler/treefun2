export interface Node {
  readonly ownerDocument: Document | null;
}

export interface HTMLElement extends Node {
  readonly tagName: string;

  append(...nodes: (Node | string)[]): void;

  setAttribute(qualifiedName: string, value: string): void;
}

export interface Document extends Node {
  documentElement: HTMLElement;
  head: HTMLElement;
  body: HTMLElement;

  createElement(tagName: string): HTMLElement;
}
