import type { ColorScheme } from "../hooks/useAppSettings";
import { GlassPanel } from "./ui/GlassPanel";
import { glassPanelInset } from "./ui/uiStyles";

type EditorSettingsPanelProps = {
  fingerPansOnly: boolean;
  soundEnabled: boolean;
  wireRouteClearance: number;
  colorScheme: ColorScheme;
  onFingerPansOnlyChange: (enabled: boolean) => void;
  onSoundEnabledChange: (enabled: boolean) => void;
  onWireRouteClearanceChange: (clearance: number) => void;
  onColorSchemeChange: (scheme: ColorScheme) => void;
};

export const EditorSettingsPanel = ({
  fingerPansOnly,
  soundEnabled,
  wireRouteClearance,
  colorScheme,
  onFingerPansOnlyChange,
  onSoundEnabledChange,
  onWireRouteClearanceChange,
  onColorSchemeChange,
}: EditorSettingsPanelProps) => {
  console.info("[EditorSettingsPanel] Rendering editor settings panel", {
    fingerPansOnly,
    soundEnabled,
    wireRouteClearance,
    colorScheme,
  });

  return (
    <GlassPanel>
      <h3 className="text-base font-semibold text-[var(--chrome-heading)]">Editor</h3>
      <p className="mt-1 text-sm text-[var(--chrome-muted)]">Tablet input, routing, and appearance.</p>
      <div className={`mt-3 space-y-4 p-3 ${glassPanelInset}`}>
        <label className="block space-y-2 text-sm text-[var(--chrome-text)]">
          <div className="flex items-center justify-between gap-3">
            <span>Wire route clearance</span>
            <span className="font-mono text-cyan-300">{wireRouteClearance}px</span>
          </div>
          <input
            className="w-full accent-cyan-400"
            type="range"
            min={40}
            max={320}
            step={10}
            value={wireRouteClearance}
            onChange={(event) => onWireRouteClearanceChange(Number(event.target.value))}
          />
          <p className="text-xs text-[var(--chrome-muted)]">
            Increase if auto wires still clip symbols; decrease for tighter routing.
          </p>
        </label>

        <label className="block space-y-2 text-sm text-[var(--chrome-text)]">
          <span>Appearance</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-base text-white"
            value={colorScheme}
            onChange={(event) => onColorSchemeChange(event.target.value as ColorScheme)}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>

        <label className="flex items-center justify-between gap-3 text-sm text-[var(--chrome-text)]">
          <span>Finger pans, pencil draws</span>
          <input
            checked={fingerPansOnly}
            className="h-5 w-5 accent-cyan-400"
            type="checkbox"
            onChange={(event) => onFingerPansOnlyChange(event.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-[var(--chrome-text)]">
          <span>Placement sounds</span>
          <input
            checked={soundEnabled}
            className="h-5 w-5 accent-cyan-400"
            type="checkbox"
            onChange={(event) => onSoundEnabledChange(event.target.checked)}
          />
        </label>
      </div>
    </GlassPanel>
  );
};

export default EditorSettingsPanel;
