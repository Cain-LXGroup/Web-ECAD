import { KicadContextIcon, type ContextActionIcon } from "./icons/KicadToolIcon";
import { glassDock, iconToolButtonActive, iconToolButtonIdle } from "./ui/uiStyles";

export type ContextRailAction = {
  id: string;
  icon: ContextActionIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary";
};

type EditorContextRailProps = {
  hidden?: boolean;
  actions: ContextRailAction[];
  theme?: "dark" | "light";
};

export const EditorContextRail = ({ hidden = false, actions, theme = "dark" }: EditorContextRailProps) => {
  console.info("[EditorContextRail] Rendering context tool rail", { hidden, actionCount: actions.length });

  if (hidden || actions.length === 0) {
    return null;
  }

  return (
    <aside
      className={`pointer-events-auto ${glassDock} flex flex-col gap-1 p-2`}
      aria-label="Context actions"
    >
      {actions.map((action) => (
        <button
          key={action.id}
          className={action.variant === "primary" ? iconToolButtonActive : iconToolButtonIdle}
          type="button"
          aria-label={action.label}
          title={action.label}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          <KicadContextIcon action={action.icon} size={26} theme={theme} />
        </button>
      ))}
    </aside>
  );
};

export default EditorContextRail;
