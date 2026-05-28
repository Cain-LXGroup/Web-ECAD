import type { ErcRuleId, ErcSeverity } from "../library/types";
import {
  normalizePinElectricalType,
  shouldSkipUnconnectedPinCheck,
} from "../library/pinElectricalType";

export type UnconnectedPinErcCheck = {
  applies: true;
  ruleId: ErcRuleId;
  severity: ErcSeverity;
  guidance: string;
};

export type UnconnectedPinErcResult = { applies: false } | UnconnectedPinErcCheck;

const UNCONNECTED_RULE_IDS: ErcRuleId[] = [
  "unconnected-power-input-pin",
  "unconnected-output-pin",
  "unconnected-input-pin",
  "unconnected-bidirectional-pin",
  "unconnected-unspecified-pin",
  "unconnected-non-passive-pin",
];

export const isUnconnectedPinRuleId = (ruleId: ErcRuleId): boolean =>
  UNCONNECTED_RULE_IDS.includes(ruleId);

/** KiCad-inspired severity for floating pins (schematic ERC). */
export const getUnconnectedPinErcCheck = (electricalType: string): UnconnectedPinErcResult => {
  console.info("[pinElectricalErc] Evaluating unconnected pin ERC check", { electricalType });

  const normalized = normalizePinElectricalType(electricalType);
  if (shouldSkipUnconnectedPinCheck(normalized)) {
    return { applies: false };
  }

  switch (normalized) {
    case "power_in":
      return {
        applies: true,
        ruleId: "unconnected-power-input-pin",
        severity: "error",
        guidance: "Power inputs must be wired to a power net (or use a power symbol).",
      };
    case "output":
    case "power_out":
    case "power_output":
    case "open_collector":
    case "open_emitter":
      return {
        applies: true,
        ruleId: "unconnected-output-pin",
        severity: "error",
        guidance: "Outputs should drive a net; floating outputs are usually a wiring mistake.",
      };
    case "input":
      return {
        applies: true,
        ruleId: "unconnected-input-pin",
        severity: "warning",
        guidance:
          "Inputs should be driven by another output or label; unused inputs are often left unwired but verify in the datasheet.",
      };
    case "bidirectional":
    case "tri_state":
      return {
        applies: true,
        ruleId: "unconnected-bidirectional-pin",
        severity: "warning",
        guidance:
          "Bidirectional pins are usually connected to a bus or peripheral; unused GPIOs are often set to passive in the symbol or marked NC.",
      };
    case "unspecified":
      return {
        applies: true,
        ruleId: "unconnected-unspecified-pin",
        severity: "warning",
        guidance: "Pin electrical type is unspecified; confirm whether this pin should be wired or marked NC/passive.",
      };
    default:
      return {
        applies: true,
        ruleId: "unconnected-non-passive-pin",
        severity: "warning",
        guidance: "This pin is not marked passive/NC; confirm whether it should be connected.",
      };
  }
};
