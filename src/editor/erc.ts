import type { ErcSuppression, ErcViolation, LibrarySymbol, SchematicProject } from "../library/types";
import { buildElectricalModel } from "./electricalModel";

const isSuppressed = (violation: ErcViolation, suppressions: ErcSuppression[]): boolean => {
  console.info("[erc] Checking violation suppression", { violationId: violation.id, ruleId: violation.ruleId });

  return suppressions.some((suppression) => {
    if (suppression.ruleId !== violation.ruleId) {
      return false;
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

const isOutputLike = (electricalType: string): boolean =>
  electricalType === "output" || electricalType === "power_output";

export const computeErcViolations = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
): ErcViolation[] => {
  console.info("[erc] Computing ERC violations", { projectId: project.id });

  const suppressions = project.ercSuppressions ?? [];
  const electricalModel = buildElectricalModel(project, symbolIndex);
  const violations: ErcViolation[] = [];

  for (const pin of electricalModel.pins) {
    if (pin.connected || pin.electricalType === "passive" || pin.electricalType === "no_connect") {
      continue;
    }

    const candidate: ErcViolation = {
      id: `erc-unconnected-${pin.symbolInstanceId}-${pin.pinNumber}`,
      ruleId: "unconnected-non-passive-pin",
      severity: "error",
      message: `Pin ${pin.pinNumber} on ${pin.symbolInstanceId} is unconnected (${pin.electricalType}).`,
      symbolInstanceId: pin.symbolInstanceId,
      pinNumber: pin.pinNumber,
      netRoot: pin.root,
    };

    if (!isSuppressed(candidate, suppressions)) {
      violations.push(candidate);
    }
  }

  const outputsByRoot = new Map<string, typeof electricalModel.pins>();
  for (const pin of electricalModel.pins) {
    if (!isOutputLike(pin.electricalType)) {
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

    const candidate: ErcViolation = {
      id: `erc-conflicting-output-${root}`,
      ruleId: "conflicting-output-pins",
      severity: "error",
      message: `Conflicting outputs on one net (${outputs.length} output-like pins).`,
      netRoot: root,
    };

    if (!isSuppressed(candidate, suppressions)) {
      violations.push(candidate);
    }
  }

  for (const symbol of project.symbols) {
    if (symbol.value?.trim()) {
      continue;
    }

    const candidate: ErcViolation = {
      id: `erc-missing-value-${symbol.id}`,
      ruleId: "missing-value-field",
      severity: "warning",
      message: `${symbol.ref} is missing a component value.`,
      symbolInstanceId: symbol.id,
    };

    if (!isSuppressed(candidate, suppressions)) {
      violations.push(candidate);
    }
  }

  return violations;
};

