export type BottomToolbarAction =
  | "select"
  | "wire"
  | "label"
  | "text"
  | "rotate"
  | "mirror"
  | "delete"
  | "pan";

export const bottomToolbarActions: Array<{ id: BottomToolbarAction; label: string }> = [
  { id: "select", label: "Select" },
  { id: "wire", label: "Wire" },
  { id: "label", label: "Label" },
  { id: "text", label: "Text" },
  { id: "rotate", label: "Rotate" },
  { id: "mirror", label: "Mirror" },
  { id: "delete", label: "Delete" },
  { id: "pan", label: "Pan" },
];

export const sidebarSections = [
  "Import Library",
  "Search Symbols",
  "Projects",
  "Backup",
] as const;
