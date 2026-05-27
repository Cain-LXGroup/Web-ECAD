import { type PropsWithChildren, useEffect, useRef, useState } from "react";

type WorkspaceMenuProps = PropsWithChildren<{
  label?: string;
}>;

export const WorkspaceMenu = ({ label = "Workspace Menu", children }: WorkspaceMenuProps) => {
  console.info("[WorkspaceMenu] Rendering workspace dropdown menu", { label });

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
      <button
        className={`touch-manipulation rounded-2xl border px-4 py-3 text-base font-medium transition-colors ${
          isOpen
            ? "border-cyan-400 bg-cyan-500/10 text-cyan-200"
            : "border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
        }`}
        type="button"
        onClick={() => {
          console.info("[WorkspaceMenu] Toggling workspace dropdown", { nextOpen: !isOpen });
          setIsOpen((currentOpen) => !currentOpen);
        }}
      >
        {label}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-[70] mt-3 w-[min(28rem,calc(100vw-2rem))] rounded-[2rem] border border-slate-800 bg-slate-950/95 p-3 shadow-2xl shadow-slate-950/70 backdrop-blur">
          <div className="max-h-[70svh] space-y-3 overflow-y-auto pr-1">{children}</div>
        </div>
      ) : null}
    </div>
  );
};

export default WorkspaceMenu;
