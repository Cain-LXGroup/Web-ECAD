import type { ButtonHTMLAttributes, ReactNode } from "react";

import { floatingChromeButton } from "./ui/uiStyles";

type FloatingChromeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon?: ReactNode;
};

export const FloatingChromeButton = ({
  label,
  icon,
  className = "",
  type = "button",
  ...props
}: FloatingChromeButtonProps) => {
  console.info("[FloatingChromeButton] Rendering floating chrome button", { label });

  return (
    <button
      className={`${floatingChromeButton} ${className}`}
      type={type}
      aria-label={label}
      title={label}
      {...props}
    >
      <span className="flex items-center gap-2">
        {icon ? <span className="flex h-6 w-6 items-center justify-center">{icon}</span> : null}
        <span>{label}</span>
      </span>
    </button>
  );
};

export default FloatingChromeButton;
