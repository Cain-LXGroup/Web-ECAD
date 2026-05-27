import type { PropsWithChildren } from "react";

type SidebarProps = PropsWithChildren<{
  title: string;
}>;

export const Sidebar = ({ title, children }: SidebarProps) => {
  console.info("[Sidebar] Rendering sidebar section", { title });

  return (
    <section className="flex min-h-0 w-full flex-col gap-4 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</h2>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4">{children}</div>
    </section>
  );
};

export default Sidebar;
