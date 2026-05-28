import { useMemo, useState } from "react";

import type { ErcViolation } from "../library/types";
import { summarizeErcViolations } from "../editor/erc";
import { BubbleButton } from "./ui/BubbleButton";
import { GlassPanel } from "./ui/GlassPanel";
import { chromeBody, chromeTitle } from "./ui/uiStyles";

type ErcPanelProps = {
  violations: ErcViolation[];
  hasRun: boolean;
  isStale: boolean;
  lastRunAt?: number;
  onRunErc: () => void;
  onSelectViolation: (violation: ErcViolation) => void;
  onSuppressViolation: (violation: ErcViolation) => void;
  onClearSuppressions?: () => void;
  suppressionCount?: number;
};

const formatLastRun = (timestamp: number): string => {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 10) {
    return "just now";
  }

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`;
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  return `${elapsedMinutes}m ago`;
};

type ViolationGroup = {
  key: string;
  label: string;
  violations: ErcViolation[];
};

const groupViolationsBySymbol = (violations: ErcViolation[]): ViolationGroup[] => {
  console.info("[ErcPanel] Grouping violations by symbol");

  const groups = new Map<string, ViolationGroup>();

  for (const violation of violations) {
    const key = violation.symbolInstanceId ?? violation.id;
    const label =
      violation.symbolRef && violation.libraryName
        ? `${violation.symbolRef} · ${violation.symbolValue || violation.libraryName}`
        : violation.symbolRef ?? violation.title;

    const existing = groups.get(key);
    if (existing) {
      existing.violations.push(violation);
      continue;
    }

    groups.set(key, {
      key,
      label,
      violations: [violation],
    });
  }

  return [...groups.values()].sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { numeric: true }),
  );
};

const ViolationRow = ({
  violation,
  onSelectViolation,
  onSuppressViolation,
}: {
  violation: ErcViolation;
  onSelectViolation: (violation: ErcViolation) => void;
  onSuppressViolation: (violation: ErcViolation) => void;
}) => (
  <li className="rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-panel-soft)] p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
              violation.severity === "error"
                ? "bg-red-500/20 text-red-200"
                : "bg-amber-500/20 text-amber-100"
            }`}
          >
            {violation.severity}
          </span>
          {violation.electricalTypeLabel ? (
            <span className="rounded-full border border-[var(--chrome-border)] px-2 py-0.5 text-[10px] text-[var(--chrome-muted)]">
              {violation.electricalTypeLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-medium text-[var(--chrome-text)]">{violation.title}</p>
        <p className="mt-1 text-sm text-[var(--chrome-muted)]">{violation.detail}</p>
        {violation.guidance ? (
          <p className="mt-2 text-xs leading-relaxed text-[var(--chrome-faint)]">{violation.guidance}</p>
        ) : null}
        {violation.conflictingPins && violation.conflictingPins.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-[var(--chrome-muted)]">
            {violation.conflictingPins.map((pin) => (
              <li key={`${pin.symbolInstanceId}-${pin.pinNumber}`}>
                {pin.symbolRef} · pin {pin.pinNumber}
                {pin.pinName && pin.pinName !== pin.pinNumber ? ` (${pin.pinName})` : ""} · {pin.electricalTypeLabel}
              </li>
            ))}
          </ul>
        ) : null}
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
);

export const ErcPanel = ({
  violations,
  hasRun,
  isStale,
  lastRunAt,
  onRunErc,
  onSelectViolation,
  onSuppressViolation,
  onClearSuppressions,
  suppressionCount = 0,
}: ErcPanelProps) => {
  console.info("[ErcPanel] Rendering ERC panel", { violationCount: violations.length, hasRun, isStale });

  const [groupBySymbol, setGroupBySymbol] = useState(true);
  const summary = useMemo(() => summarizeErcViolations(violations), [violations]);
  const groups = useMemo(
    () => (groupBySymbol ? groupViolationsBySymbol(violations) : []),
    [groupBySymbol, violations],
  );

  return (
    <GlassPanel>
      <div className="flex items-start justify-between gap-3">
        <h2 className={chromeTitle}>ERC</h2>
        {hasRun && violations.length > 0 ? (
          <div className="flex flex-col items-end gap-1 text-right text-xs">
            <span className="font-semibold text-red-200">{summary.errorCount} errors</span>
            <span className="text-amber-100">{summary.warningCount} warnings</span>
          </div>
        ) : null}
      </div>
      <p className={`mt-2 ${chromeBody}`}>
        Electrical rules check: pin types, connectivity, output conflicts, and fields.
        {hasRun
          ? ` Last run ${lastRunAt ? formatLastRun(lastRunAt) : ""} — ${summary.totalCount} issue${summary.totalCount === 1 ? "" : "s"}.`
          : " Run ERC after editing wires or placement."}
      </p>

      <div className="mt-3">
        <BubbleButton variant="primary" className="w-full !py-2.5 text-sm font-semibold" onClick={onRunErc}>
          Run ERC
        </BubbleButton>
      </div>

      {isStale ? (
        <p className="mt-2 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          Schematic changed since the last ERC run. Run ERC again to update results.
        </p>
      ) : null}

      {!hasRun ? (
        <p className="mt-3 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-panel-soft)] px-3 py-2 text-sm text-[var(--chrome-muted)]">
          Press <span className="font-semibold text-[var(--chrome-text)]">Run ERC</span> to check the schematic.
        </p>
      ) : null}

      {hasRun && violations.length === 0 ? (
        <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
          No ERC violations detected.
        </p>
      ) : null}

      {hasRun && violations.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <BubbleButton
            variant={groupBySymbol ? "primary" : "secondary"}
            className="!py-1.5 text-xs"
            onClick={() => setGroupBySymbol(true)}
          >
            By component
          </BubbleButton>
          <BubbleButton
            variant={!groupBySymbol ? "primary" : "secondary"}
            className="!py-1.5 text-xs"
            onClick={() => setGroupBySymbol(false)}
          >
            Flat list
          </BubbleButton>
        </div>
      ) : null}

      {suppressionCount > 0 && onClearSuppressions ? (
        <div className="mt-3">
          <BubbleButton variant="secondary" className="w-full !py-2 text-xs" onClick={onClearSuppressions}>
            Clear {suppressionCount} suppression{suppressionCount === 1 ? "" : "s"}
          </BubbleButton>
        </div>
      ) : null}

      {hasRun && violations.length > 0 ? (
        groupBySymbol ? (
        <div className="mt-3 max-h-[min(52vh,520px)] space-y-3 overflow-y-auto pr-1">
          {groups.map((group) => (
            <section key={group.key}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--chrome-faint)]">
                {group.label}{" "}
                <span className="text-[var(--chrome-muted)]">({group.violations.length})</span>
              </h3>
              <ul className="mt-2 space-y-2">
                {group.violations.map((violation) => (
                  <ViolationRow
                    key={violation.id}
                    violation={violation}
                    onSelectViolation={onSelectViolation}
                    onSuppressViolation={onSuppressViolation}
                  />
                ))}
              </ul>
            </section>
          ))}
          {groups.length === 0 ? (
            <ul className="space-y-2">
              {violations.map((violation) => (
                <ViolationRow
                  key={violation.id}
                  violation={violation}
                  onSelectViolation={onSelectViolation}
                  onSuppressViolation={onSuppressViolation}
                />
              ))}
            </ul>
          ) : null}
        </div>
        ) : (
          <ul className="mt-3 max-h-[min(52vh,520px)] space-y-2 overflow-y-auto pr-1">
            {violations.map((violation) => (
              <ViolationRow
                key={violation.id}
                violation={violation}
                onSelectViolation={onSelectViolation}
                onSuppressViolation={onSuppressViolation}
              />
            ))}
          </ul>
        )
      ) : null}
    </GlassPanel>
  );
};

export default ErcPanel;
