export type BottomToolbarAction = "select" | "wire" | "label" | "text";

export const bottomToolbarActions: Array<{ id: BottomToolbarAction; label: string }> = [
  { id: "select", label: "Select" },
  { id: "wire", label: "Wire" },
  { id: "label", label: "Label" },
  { id: "text", label: "Text" },
];

export const sidebarSections = [
  "Import Library",
  "Search Symbols",
  "Projects",
  "Backup",
] as const;
