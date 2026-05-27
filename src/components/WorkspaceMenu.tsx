import { type PropsWithChildren, useEffect, useRef, useState } from "react";

import { BubbleButton } from "./ui/BubbleButton";
import { glassPanel } from "./ui/uiStyles";

type WorkspaceMenuProps = PropsWithChildren<{
  label?: string;
  projectName?: string;
  statusMessage?: string;
  onSaveProject?: () => void;
}>;

export const WorkspaceMenu = ({
  label = "Menu",
  projectName,
  statusMessage,
  onSaveProject,
  children,
}: WorkspaceMenuProps) => {
  console.info("[WorkspaceMenu] Rendering workspace dropdown menu", { label, projectName });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    console.info("[WorkspaceMenu] Subscribing to outside click handler", { isOpen });

    const handlePointerDown = (event: PointerEvent) => {
      if (!isOpen) {
        return;
      }

      const nextTarget = event.target;
      if (!(nextTarget instanceof Node)) {
        return;
      }

      if (containerRef.current?.contains(nextTarget)) {
        return;
      }

      setIsOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative z-[60]">
      <BubbleButton
        variant={isOpen ? "primary" : "secondary"}
        className="!px-4 !py-3 text-base"
        onClick={() => {
          console.info("[WorkspaceMenu] Toggling workspace dropdown", { nextOpen: !isOpen });
          setIsOpen((currentOpen) => !currentOpen);
        }}
      >
        {label}
      </BubbleButton>

      {isOpen ? (
        <div
          className={`app-chrome absolute left-0 top-full z-[70] mt-2 w-[min(32rem,calc(100vw-1.5rem))] p-4 ${glassPanel}`}
        >
          {projectName || statusMessage || onSaveProject ? (
            <div className="mb-4 space-y-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">Project</p>
                <p className="mt-1 text-xl font-semibold text-white">{projectName ?? "Untitled"}</p>
              </div>
              {statusMessage ? (
                <p className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-base leading-relaxed text-slate-200">
                  {statusMessage}
                </p>
              ) : null}
              {onSaveProject ? (
                <BubbleButton variant="primary" className="w-full !py-3 text-base" onClick={onSaveProject}>
                  Save Project
                </BubbleButton>
              ) : null}
            </div>
          ) : null}
          <div className="max-h-[min(62svh,560px)] space-y-3 overflow-y-auto overscroll-contain pr-1">{children}</div>
        </div>
      ) : null}
    </div>
  );
};

export default WorkspaceMenu;
