export type BottomToolbarAction = "select" | "wire" | "label-global" | "label-sheet" | "text";

export const bottomToolbarActions: Array<{ id: BottomToolbarAction; label: string }> = [
  { id: "select", label: "Select" },
  { id: "wire", label: "Wire" },
  { id: "label-global", label: "Global label" },
  { id: "label-sheet", label: "Sheet label" },
  { id: "text", label: "Text" },
];

export const sidebarSections = [
  "Import Library",
  "Search Symbols",
  "Projects",
  "Backup",
] as const;
