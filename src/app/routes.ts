export type BottomToolbarAction =
  | "select"
  | "wire"
  | "bus"
  | "label-global"
  | "label-sheet"
  | "label-hierarchical"
  | "label-bus"
  | "sheet-pin"
  | "text";

export const bottomToolbarActions: Array<{ id: BottomToolbarAction; label: string }> = [
  { id: "select", label: "Select" },
  { id: "wire", label: "Wire" },
  { id: "bus", label: "Bus" },
  { id: "label-global", label: "Global label" },
  { id: "label-sheet", label: "Sheet label" },
  { id: "label-hierarchical", label: "Hierarchical label" },
  { id: "label-bus", label: "Bus label" },
  { id: "sheet-pin", label: "Sheet pin" },
  { id: "text", label: "Text" },
];

export const sidebarSections = [
  "Import Library",
  "Search Symbols",
  "Projects",
  "Backup",
] as const;
