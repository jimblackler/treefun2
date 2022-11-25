export interface Node {
  label: string;
  parent: Node | undefined;
  children: Node[];

  x?: number;
  x0?: number;
  x1?: number;
}
