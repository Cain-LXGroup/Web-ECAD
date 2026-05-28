import type { ErcViolation } from "../library/types";
import { BubbleButton } from "./ui/BubbleButton";
import { GlassPanel } from "./ui/GlassPanel";
import { chromeBody, chromeTitle } from "./ui/uiStyles";

type ErcPanelProps = {
  violations: ErcViolation[];
  onSelectViolation: (violation: ErcViolation) => void;
  onSuppressViolation: (violation: ErcViolation) => void;
};

export const ErcPanel = ({ violations, onSelectViolation, onSuppressViolation }: ErcPanelProps) => {
  console.info("[ErcPanel] Rendering ERC panel", { violationCount: violations.length });

  return (
    <GlassPanel>
      <h2 className={chromeTitle}>ERC</h2>
      <p className={`mt-2 ${chromeBody}`}>
        Live electrical checks for pin connectivity, output conflicts, and missing values.
      </p>
      {violations.length === 0 ? (
        <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
          No ERC violations detected.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {violations.map((violation) => (
            <li
              key={violation.id}
              className="rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-panel-soft)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--chrome-faint)]">
                    {violation.severity}
                  </p>
                  <p className="mt-1 text-sm text-[var(--chrome-text)]">{violation.message}</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <BubbleButton
                  variant="secondary"
                  className="w-full !py-2 text-xs"
                  onClick={() => onSelectViolation(violation)}
                >
                  Select
                </BubbleButton>
                <BubbleButton
                  variant="secondary"
                  className="w-full !py-2 text-xs"
                  onClick={() => onSuppressViolation(violation)}
                >
                  Suppress
                </BubbleButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
};

export default ErcPanel;
