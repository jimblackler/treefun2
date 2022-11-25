export interface Node {
  label: string;
  parent: Node | undefined;
  children: Node[];
}
