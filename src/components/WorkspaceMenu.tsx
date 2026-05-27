import { type PropsWithChildren, useEffect, useRef, useState } from "react";

import { BubbleButton } from "./ui/BubbleButton";
import { glassPanel } from "./ui/uiStyles";

type WorkspaceMenuProps = PropsWithChildren<{
  label?: string;
}>;

export const WorkspaceMenu = ({ label = "Workspace", children }: WorkspaceMenuProps) => {
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
      <BubbleButton
        variant={isOpen ? "primary" : "secondary"}
        className="!py-2.5"
        onClick={() => {
          console.info("[WorkspaceMenu] Toggling workspace dropdown", { nextOpen: !isOpen });
          setIsOpen((currentOpen) => !currentOpen);
        }}
      >
        {label}
      </BubbleButton>

      {isOpen ? (
        <div
          className={`absolute right-0 top-full z-[70] mt-2 w-[min(28rem,calc(100vw-1.5rem))] p-3 ${glassPanel}`}
        >
          <div className="max-h-[70svh] space-y-3 overflow-y-auto overscroll-contain pr-1">{children}</div>
        </div>
      ) : null}
    </div>
  );
};

export default WorkspaceMenu;
