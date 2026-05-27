import type { PropsWithChildren } from "react";

import { glassPanel } from "./ui/uiStyles";

type SidebarProps = PropsWithChildren<{
  title: string;
}>;

export const Sidebar = ({ title, children }: SidebarProps) => {
  console.info("[Sidebar] Rendering sidebar section", { title });

  return (
    <section className={`flex min-h-0 w-full flex-col gap-4 overflow-hidden p-4 ${glassPanel}`}>
      <header className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</h2>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4">{children}</div>
    </section>
  );
};

export default Sidebar;
