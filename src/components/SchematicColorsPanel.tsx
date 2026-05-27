import type { ColorScheme } from "../hooks/useAppSettings";
import {
  colorInputValueFromStored,
  defaultSchematicColorsForScheme,
  normalizeColorInputValue,
  SCHEMATIC_COLOR_LABELS,
  SCHEMATIC_COLOR_ROLES,
  type SchematicColorRole,
  type SchematicColors,
} from "../theme/schematicTheme";
import { GlassPanel } from "./ui/GlassPanel";
import { chromeBody, chromeTitle, glassPanelInset } from "./ui/uiStyles";
import { BubbleButton } from "./ui/BubbleButton";

type SchematicColorsPanelProps = {
  colorScheme: ColorScheme;
  schematicColors: SchematicColors;
  onColorChange: (role: SchematicColorRole, value: string) => void;
  onReset: () => void;
};

const schemeLabel = (scheme: ColorScheme): string => (scheme === "light" ? "Light" : "Dark");

export const SchematicColorsPanel = ({
  colorScheme,
  schematicColors,
  onColorChange,
  onReset,
}: SchematicColorsPanelProps) => {
  console.info("[SchematicColorsPanel] Rendering schematic colors panel", { colorScheme });

  const defaults = defaultSchematicColorsForScheme(colorScheme);

  return (
    <GlassPanel>
      <h3 className={chromeTitle}>Schematic Colors</h3>
      <p className={`mt-1 ${chromeBody}`}>
        Colors for <span className="font-semibold text-[var(--chrome-heading)]">{schemeLabel(colorScheme)}</span>{" "}
        mode. Switch appearance in Editor settings to edit the other palette.
      </p>
      <div className={`mt-3 space-y-3 p-3 ${glassPanelInset}`}>
        {SCHEMATIC_COLOR_ROLES.map((role) => {
          const stored = schematicColors[role];
          const colorInputValue = colorInputValueFromStored(stored);

          return (
            <label
              key={role}
              className="flex min-h-[3rem] items-center justify-between gap-3 rounded-xl border border-[var(--chrome-inset-border)] bg-[var(--chrome-inset-bg)] px-3 py-2 text-sm text-[var(--chrome-text)] touch-manipulation"
            >
              <span className="flex-1 leading-snug">{SCHEMATIC_COLOR_LABELS[role]}</span>
              <input
                type="color"
                className="h-12 w-14 shrink-0 cursor-pointer rounded-lg border border-[var(--chrome-border)] bg-transparent p-1"
                value={colorInputValue}
                aria-label={SCHEMATIC_COLOR_LABELS[role]}
                onChange={(event) =>
                  onColorChange(role, normalizeColorInputValue(event.target.value))
                }
              />
            </label>
          );
        })}

        <BubbleButton variant="secondary" className="w-full !py-3 text-base" onClick={onReset}>
          Reset {schemeLabel(colorScheme)} schematic colors
        </BubbleButton>
        <p className="text-xs text-[var(--chrome-muted)]">
          Default {schemeLabel(colorScheme).toLowerCase()} background: {defaults.background}
        </p>
      </div>
    </GlassPanel>
  );
};

export default SchematicColorsPanel;
