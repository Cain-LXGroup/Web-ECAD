import type { HTMLAttributes, PropsWithChildren } from "react";

import { glassPanel } from "./uiStyles";

type GlassPanelProps = PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    as?: "section" | "div" | "aside";
  }
>;

export const GlassPanel = ({ as: Component = "section", className = "", children, ...props }: GlassPanelProps) => {
  console.info("[GlassPanel] Rendering glass panel", { as: Component });

  return (
    <Component className={`${glassPanel} p-4 ${className}`} {...props}>
      {children}
    </Component>
  );
};

export default GlassPanel;
