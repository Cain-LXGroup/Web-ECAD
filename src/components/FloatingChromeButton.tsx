import type { ButtonHTMLAttributes, ReactNode } from "react";

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
      className={`touch-manipulation rounded-full border border-white/12 bg-slate-950/65 px-3 py-2 text-sm font-semibold text-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all duration-200 ease-out hover:border-white/20 hover:bg-slate-900/80 active:scale-[0.97] ${className}`}
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
