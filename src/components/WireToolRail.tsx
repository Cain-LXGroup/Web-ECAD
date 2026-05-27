import type { ReactNode } from "react";

import { glassDock } from "./ui/uiStyles";

type WireToolRailProps = {
  hidden?: boolean;
  children: ReactNode;
};

export const WireToolRail = ({ hidden = false, children }: WireToolRailProps) => {
  console.info("[WireToolRail] Rendering wire tool rail", { hidden });

  if (hidden) {
    return null;
  }

  return (
    <aside
      className={`pointer-events-auto ${glassDock} flex w-44 flex-col gap-2 p-2`}
      aria-label="Wire actions"
    >
      {children}
    </aside>
  );
};

export default WireToolRail;
