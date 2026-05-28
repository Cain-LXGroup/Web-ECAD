import type {
  ErcConflictingPinRef,
  ErcSuppression,
  ErcViolation,
  LibrarySymbol,
  SchematicProject,
  SymbolInstance,
} from "../library/types";
import {
  formatPinElectricalTypeLabel,
  getUnconnectedPinErcCheck,
  isOutputLikeElectricalType,
  isUnconnectedPinRuleId,
} from "../library/pinElectricalType";
import type { ElectricalPinState } from "./electricalModel";
import { buildElectricalModel } from "./electricalModel";

type SymbolContext = {
  instance: SymbolInstance;
  librarySymbol?: LibrarySymbol;
};

const formatPinLabel = (pinNumber: string, pinName: string): string => {
  const trimmedName = pinName.trim();
  if (!trimmedName || trimmedName === pinNumber || trimmedName === "~") {
    return `pin ${pinNumber}`;
  }

  return `pin ${pinNumber} (${trimmedName})`;
};

const formatSymbolDesignator = (context: SymbolContext): string => {
  const { instance, librarySymbol } = context;
  const ref = instance.ref?.trim() || "???";
  const value = instance.value?.trim();
  const libraryName = librarySymbol?.name?.trim();

  if (value && libraryName && value !== libraryName) {
    return `${ref} · ${value} · ${libraryName}`;
  }

  if (value) {
    return `${ref} · ${value}`;
  }

  if (libraryName) {
    return `${ref} · ${libraryName}`;
  }

  return ref;
};

const buildSymbolContextIndex = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
): Map<string, SymbolContext> => {
  console.info("[erc] Building symbol context index", { projectId: project.id });

  const contexts = new Map<string, SymbolContext>();
  for (const instance of project.symbols) {
    contexts.set(instance.id, {
      instance,
      librarySymbol: symbolIndex[instance.symbolId],
    });
  }

  return contexts;
};

const isSuppressed = (violation: ErcViolation, suppressions: ErcSuppression[]): boolean => {
  console.info("[erc] Checking violation suppression", { violationId: violation.id, ruleId: violation.ruleId });

  return suppressions.some((suppression) => {
    if (suppression.ruleId !== violation.ruleId) {
      if (
        suppression.ruleId === "unconnected-non-passive-pin" &&
        violation.ruleId &&
        isUnconnectedPinRuleId(violation.ruleId)
      ) {
        // Legacy suppressions from earlier ERC builds.
      } else {
        return false;
      }
    }

    if (suppression.symbolInstanceId && suppression.symbolInstanceId !== violation.symbolInstanceId) {
      return false;
    }

    if (suppression.pinNumber && suppression.pinNumber !== violation.pinNumber) {
      return false;
    }

    if (suppression.netRoot && suppression.netRoot !== violation.netRoot) {
      return false;
    }

    return true;
  });
};

const buildUnconnectedPinViolation = (
  pin: ElectricalPinState,
  context: SymbolContext | undefined,
): ErcViolation | undefined => {
  console.info("[erc] Building unconnected pin violation", {
    symbolInstanceId: pin.symbolInstanceId,
    pinNumber: pin.pinNumber,
  });

  if (pin.connected) {
    return undefined;
  }

  const ercCheck = getUnconnectedPinErcCheck(pin.electricalType);
  if (!ercCheck.applies) {
    return undefined;
  }

  const instance = context?.instance;
  const librarySymbol = context?.librarySymbol;
  const symbolRef = instance?.ref?.trim() || "???";
  const symbolValue = instance?.value?.trim();
  const libraryName = librarySymbol?.name?.trim();
  const electricalTypeLabel = formatPinElectricalTypeLabel(pin.electricalType);
  const pinLabel = formatPinLabel(pin.pinNumber, pin.pinName);
  const designator = context ? formatSymbolDesignator(context) : symbolRef;
  const title = `${symbolRef} · ${pinLabel}`;
  const detail = `Unconnected ${electricalTypeLabel.toLowerCase()} on ${designator}.`;
  const message = `${title}: ${detail} ${ercCheck.guidance}`;

  return {
    id: `erc-unconnected-${pin.symbolInstanceId}-${pin.pinNumber}`,
    ruleId: ercCheck.ruleId,
    severity: ercCheck.severity,
    message,
    title,
    detail,
    symbolInstanceId: pin.symbolInstanceId,
    symbolRef,
    symbolValue,
    libraryName,
    pinNumber: pin.pinNumber,
    pinName: pin.pinName,
    electricalType: pin.electricalType,
    electricalTypeLabel,
    guidance: ercCheck.guidance,
    netRoot: pin.root,
  };
};

const buildConflictingOutputViolation = (
  root: string,
  outputs: ElectricalPinState[],
  contexts: Map<string, SymbolContext>,
): ErcViolation => {
  console.info("[erc] Building conflicting output violation", { root, outputCount: outputs.length });

  const conflictingPins: ErcConflictingPinRef[] = outputs.map((pin) => {
    const context = contexts.get(pin.symbolInstanceId);
    const symbolRef = context?.instance.ref?.trim() || "???";
    return {
      symbolInstanceId: pin.symbolInstanceId,
      symbolRef,
      pinNumber: pin.pinNumber,
      pinName: pin.pinName,
      electricalTypeLabel: formatPinElectricalTypeLabel(pin.electricalType),
    };
  });

  const driverSummary = conflictingPins
    .map((entry) => `${entry.symbolRef} ${formatPinLabel(entry.pinNumber, entry.pinName)}`)
    .join(", ");

  const title = `Output conflict · ${outputs.length} drivers`;
  const detail = `Multiple output-like pins on one net: ${driverSummary}.`;
  const message = `${title}. ${detail}`;

  return {
    id: `erc-conflicting-output-${root}`,
    ruleId: "conflicting-output-pins",
    severity: "error",
    message,
    title,
    detail,
    netRoot: root,
    conflictingPins,
  };
};

const compareViolations = (left: ErcViolation, right: ErcViolation): number => {
  const severityRank = (severity: ErcViolation["severity"]) => (severity === "error" ? 0 : 1);
  const severityDelta = severityRank(left.severity) - severityRank(right.severity);
  if (severityDelta !== 0) {
    return severityDelta;
  }

  const refDelta = (left.symbolRef ?? "").localeCompare(right.symbolRef ?? "", undefined, {
    numeric: true,
  });
  if (refDelta !== 0) {
    return refDelta;
  }

  const pinLeft = left.pinNumber ?? "";
  const pinRight = right.pinNumber ?? "";
  return pinLeft.localeCompare(pinRight, undefined, { numeric: true });
};

export const computeErcViolations = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
): ErcViolation[] => {
  console.info("[erc] Computing ERC violations", { projectId: project.id });

  const suppressions = project.ercSuppressions ?? [];
  const contexts = buildSymbolContextIndex(project, symbolIndex);
  const electricalModel = buildElectricalModel(project, symbolIndex);
  const violations: ErcViolation[] = [];

  for (const pin of electricalModel.pins) {
    const candidate = buildUnconnectedPinViolation(pin, contexts.get(pin.symbolInstanceId));
    if (candidate && !isSuppressed(candidate, suppressions)) {
      violations.push(candidate);
    }
  }

  const outputsByRoot = new Map<string, ElectricalPinState[]>();
  for (const pin of electricalModel.pins) {
    if (!isOutputLikeElectricalType(pin.electricalType)) {
      continue;
    }
    const current = outputsByRoot.get(pin.root) ?? [];
    current.push(pin);
    outputsByRoot.set(pin.root, current);
  }

  for (const [root, outputs] of outputsByRoot.entries()) {
    if (outputs.length <= 1) {
      continue;
    }

    const candidate = buildConflictingOutputViolation(root, outputs, contexts);
    if (!isSuppressed(candidate, suppressions)) {
      violations.push(candidate);
    }
  }

  for (const symbol of project.symbols) {
    if (symbol.value?.trim()) {
      continue;
    }

    const context = contexts.get(symbol.id);
    const librarySymbol = context?.librarySymbol;
    const symbolRef = symbol.ref?.trim() || "???";
    const libraryName = librarySymbol?.name?.trim();
    const designator = context ? formatSymbolDesignator(context) : symbolRef;
    const title = `${symbolRef} · missing value`;
    const detail = `${designator} has no value field (e.g. part number or rating).`;
    const message = `${title}. ${detail}`;

    const candidate: ErcViolation = {
      id: `erc-missing-value-${symbol.id}`,
      ruleId: "missing-value-field",
      severity: "warning",
      message,
      title,
      detail,
      symbolInstanceId: symbol.id,
      symbolRef,
      libraryName,
    };

    if (!isSuppressed(candidate, suppressions)) {
      violations.push(candidate);
    }
  }

  violations.sort(compareViolations);
  return violations;
};

export type ErcSummary = {
  errorCount: number;
  warningCount: number;
  totalCount: number;
};

export const summarizeErcViolations = (violations: ErcViolation[]): ErcSummary => {
  console.info("[erc] Summarizing ERC violations", { violationCount: violations.length });

  const errorCount = violations.filter((violation) => violation.severity === "error").length;
  const warningCount = violations.length - errorCount;

  return {
    errorCount,
    warningCount,
    totalCount: violations.length,
  };
};
