import { BubbleButton } from "./ui/BubbleButton";
import { EditorFloatingPalette } from "./EditorFloatingPalette";

type ToolActionPaletteProps = {
  ariaLabel: string;
  actions: Array<{
    id: string;
    label: string;
    variant?: "primary" | "secondary";
    disabled?: boolean;
    onClick: () => void;
  }>;
};

export const ToolActionPalette = ({ ariaLabel, actions }: ToolActionPaletteProps) => {
  console.info("[ToolActionPalette] Rendering tool action palette", { ariaLabel, actionCount: actions.length });

  return (
    <EditorFloatingPalette ariaLabel={ariaLabel}>
      {actions.map((action) => (
        <BubbleButton
          key={action.id}
          variant={action.variant ?? "secondary"}
          className="w-full"
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.label}
        </BubbleButton>
      ))}
    </EditorFloatingPalette>
  );
};

export default ToolActionPalette;
