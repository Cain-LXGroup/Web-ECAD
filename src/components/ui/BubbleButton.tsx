import type { ButtonHTMLAttributes } from "react";

import { bubbleButtonPrimary, bubbleButtonSecondary } from "./uiStyles";

type BubbleButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export const BubbleButton = ({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...props
}: BubbleButtonProps) => {
  console.info("[BubbleButton] Rendering bubble button", { variant });

  const variantClass = variant === "primary" ? bubbleButtonPrimary : bubbleButtonSecondary;

  return (
    <button className={`${variantClass} px-4 py-3 text-sm ${className}`} type={type} {...props}>
      {children}
    </button>
  );
};

export default BubbleButton;
