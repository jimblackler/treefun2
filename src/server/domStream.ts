import {Response} from 'express';
import {Document, HTMLElement, Node} from '../common/domStreamTypes';

const VOID_ELEMENTS = {
  'area': true,
  'base': true,
  'br': true,
  'col': true,
  'command': true,
  'embed': true,
  'hr': true,
  'img': true,
  'input': true,
  'keygen': true,
  'link': true,
  'meta': true,
  'param': true,
  'source': true,
  'track': true,
  'wbr': true
};

class LocalNode implements Node {
  readonly ownerDocument: LocalDocument | null;

  constructor(ownerDocument: LocalDocument | null) {
    this.ownerDocument = ownerDocument;
  }

  get useDocument() {
    if (!this.ownerDocument) {
      throw new Error();
    }
    return this.ownerDocument;
  }

  open() {

  }

  close() {

  }
}

class LocalElement extends LocalNode implements HTMLElement {
  readonly tagName: string;
  private mode: 'unopened' | 'in_attributes' | 'in_children' | 'closed';

  constructor(ownerDocument: LocalDocument, tagName: string) {
    super(ownerDocument);
    this.tagName = tagName;
    this.mode = 'unopened';
  }

  open() {
    if (this.mode !== 'unopened') {
      throw new Error(`Attempt to add <${this.tagName}> twice.`);
    }
    this.mode = 'in_attributes';
    this.useDocument.write(`<${this.tagName}`);
  }

  setAttribute(name: string, value: string): void {
    switch (this.mode) {
      case 'unopened':
        throw new Error(`Attempt to setAttribute on <${this.tagName}> which has no parent`);
      case 'in_attributes':
        break;
      case 'in_children':
        throw new Error(`Attempt to setAttribute on <${this.tagName}> which already has children`);
      case 'closed':
        throw new Error(`Attempt to setAttribute on <${this.tagName}> \
            which has already had an element added to an ancestor`);

    }
    this.useDocument.write(
        ` ${name}="${value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')}"`);
  }

  append(...nodes: (LocalNode | string)[]): void {
    switch (this.mode) {
      case 'unopened':
        throw new Error(`Attempt to append to <${this.tagName}> which has no parent`);
      case 'in_attributes':
        this.useDocument.write(`>`);
        this.mode = 'in_children';
        break;
      case 'in_children':
        break;
      case 'closed':
        throw new Error(`Attempt to append to <${this.tagName}> \
            which has already had an element added to an ancestor`);
    }
    for (const node of nodes) {
      if (typeof node === 'string') {
        this.useDocument.closeTo(this);
        this.useDocument.write(node.replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/'/g, '&quot;').replace(/'/g, '&#039;'));
      } else {
        this.useDocument.newChild(node, this);
      }
    }

  }

  close() {
    if (this.mode === 'in_attributes') {
      const lowerCaseTag = this.tagName.toLowerCase();
      if (lowerCaseTag in VOID_ELEMENTS) {
        this.useDocument.write(`>`);
      } else {
        this.useDocument.write(`></${this.tagName}>`);
      }
    } else if (this.mode === 'in_children') {
      this.useDocument.write(`</${this.tagName}>`);
    } else {
      throw new Error();
    }
    this.mode = 'closed';
  }
}

class LocalHTMLElement extends LocalElement implements HTMLElement {
  constructor(ownerDocument: LocalDocument, tagName: string) {
    super(ownerDocument, tagName);
  }
}

class LocalDocument extends LocalNode implements Document {
  documentElement: LocalHTMLElement;
  private readonly writer: (str: string) => void;
  private readonly activeStack: LocalNode[] = [];

  constructor(writer: (str: string) => void) {
    super(null);
    this.writer = writer;
    const element = this.createElement('html');
    this.documentElement = element;
    this.activeStack.push(element);
    element.open();
  }

  private _head: LocalHTMLElement | undefined;

  get head() {
    if (!this._head) {
      const head = this.createElement('head');
      this.documentElement.append(head);
      this._head = head;
    }
    return this._head;
  }

  private _body: LocalHTMLElement | undefined;

  get body() {
    if (!this._body) {
      const body = this.createElement('body');
      this.documentElement.append(body);
      this._body = body;
    }
    return this._body;
  }

  get useDocument() {
    return this;
  }

  createElement(tagName: string): LocalHTMLElement {
    return new LocalHTMLElement(this, tagName);
  }

  newChild(child: LocalNode, parent: LocalNode) {
    this.closeTo(parent);
    this.activeStack.push(child);
    child.open();
  }

  closeTo(parent: LocalNode) {
    for (let idx = this.activeStack.length - 1; idx >= 0; idx--) {
      const node = this.activeStack[idx];
      if (parent === node) {
        this.activeStack.length = idx + 1;
        return;
      }
      node.close();
    }
    throw new Error('Parent not on active stack');
  }

  write(str: string) {
    this.writer(str);
  }

  close() {
    for (let idx = this.activeStack.length - 1; idx !== 0; idx--) {
      const node = this.activeStack[idx];
      node.close();
    }
  }
}

export class DomStream {
  private res: Response;
  private readonly _document: LocalDocument;

  constructor(res: Response) {
    this.res = res;

    this.res.setHeader('Content-Type', 'text/html');

    function writeString(str: string) {
      res.write(str);
    }

    writeString('<!DOCTYPE html>\n');
    this._document = new LocalDocument(writeString);
  }

  get document(): Document {
    return this._document;
  }

  end() {
    this._document.close();
    this.res.end();
  }
}
