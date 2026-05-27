import { GlassPanel } from "./ui/GlassPanel";
import { glassPanelInset } from "./ui/uiStyles";

type EditorSettingsPanelProps = {
  fingerPansOnly: boolean;
  soundEnabled: boolean;
  onFingerPansOnlyChange: (enabled: boolean) => void;
  onSoundEnabledChange: (enabled: boolean) => void;
};

export const EditorSettingsPanel = ({
  fingerPansOnly,
  soundEnabled,
  onFingerPansOnlyChange,
  onSoundEnabledChange,
}: EditorSettingsPanelProps) => {
  console.info("[EditorSettingsPanel] Rendering editor settings panel", { fingerPansOnly, soundEnabled });

  return (
    <GlassPanel>
      <h3 className="text-base font-semibold text-white">Editor</h3>
      <p className="mt-1 text-sm text-slate-400">Tablet input and feedback preferences.</p>
      <div className={`mt-3 space-y-3 p-3 ${glassPanelInset}`}>
        <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
          <span>Finger pans, pencil draws</span>
          <input
            checked={fingerPansOnly}
            className="h-5 w-5 accent-cyan-400"
            type="checkbox"
            onChange={(event) => onFingerPansOnlyChange(event.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
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
