export interface Node {
  label: string;
  parent?: Node;
  children: Node[];

  x?: number;
  x0?: number;
  x1?: number;
  line?: SVGLineElement;
}
