import type { PropsWithChildren, ReactNode } from "react";

import { BubbleButton } from "./BubbleButton";
import { glassPanel } from "./uiStyles";

type SheetDrawerProps = PropsWithChildren<{
  isOpen: boolean;
  title: string;
  align?: "left" | "right";
  onClose: () => void;
  headerAccessory?: ReactNode;
}>;

export const SheetDrawer = ({
  isOpen,
  title,
  align = "left",
  onClose,
  headerAccessory,
  children,
}: SheetDrawerProps) => {
  console.info("[SheetDrawer] Rendering sheet drawer", { isOpen, title, align });

  if (!isOpen) {
    return null;
  }

  const panelPositionClass =
    align === "right" ? "ml-auto h-full max-w-md" : "h-full max-w-md";

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/45 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`${glassPanel} ${panelPositionClass} flex min-h-0 w-full flex-col overflow-hidden p-4`}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</p>
            {headerAccessory}
          </div>
          <BubbleButton variant="secondary" className="!min-h-0 !px-3 !py-2 text-xs" onClick={onClose}>
            Done
          </BubbleButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
};

export default SheetDrawer;
