import type { ReactNode } from "react";

import { glassDock } from "./ui/uiStyles";

type EditorFloatingPaletteProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
};

export const EditorFloatingPalette = ({ ariaLabel, children, className = "" }: EditorFloatingPaletteProps) => {
  console.info("[EditorFloatingPalette] Rendering floating palette", { ariaLabel });

  return (
    <aside
      className={`pointer-events-auto fixed left-[max(0.75rem,env(safe-area-inset-left))] top-1/2 z-40 flex w-44 -translate-y-1/2 flex-col gap-2 p-2 ${glassDock} ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </aside>
  );
};

export default EditorFloatingPalette;
