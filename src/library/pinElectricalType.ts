const PIN_GRAPHIC_STYLES = new Set([
  "line",
  "inverted",
  "clock",
  "inverted_clock",
  "input_low",
  "clock_low",
  "output_low",
  "edge_clock_high",
  "non_logic",
]);

const PIN_ELECTRICAL_TYPES = new Set([
  "input",
  "output",
  "bidirectional",
  "tri_state",
  "passive",
  "free",
  "unspecified",
  "power_in",
  "power_out",
  "power_output",
  "open_collector",
  "open_emitter",
  "no_connect",
  "unconnected",
]);

const LEGACY_ELECTRICAL_TYPE_MAP: Record<string, string> = {
  i: "input",
  o: "output",
  b: "bidirectional",
  t: "tri_state",
  p: "passive",
  u: "unspecified",
  e: "open_emitter",
  c: "open_collector",
  n: "no_connect",
  w: "power_in",
  v: "power_out",
  h: "power_out",
};

export const normalizePinElectricalType = (raw?: string): string => {
  console.info("[pinElectricalType] Normalizing pin electrical type", { raw });

  const token = (raw ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (!token) {
    return "passive";
  }

  const legacy = LEGACY_ELECTRICAL_TYPE_MAP[token];
  if (legacy) {
    return legacy;
  }

  if (PIN_ELECTRICAL_TYPES.has(token)) {
    return token === "unconnected" ? "no_connect" : token;
  }

  if (PIN_GRAPHIC_STYLES.has(token)) {
    return "unspecified";
  }

  if (/^\d+$/.test(token)) {
    return "unspecified";
  }

  return "unspecified";
};

export const formatPinElectricalTypeLabel = (electricalType: string): string => {
  console.info("[pinElectricalType] Formatting electrical type label", { electricalType });

  switch (normalizePinElectricalType(electricalType)) {
    case "input":
      return "Input";
    case "output":
      return "Output";
    case "bidirectional":
      return "Bidirectional";
    case "tri_state":
      return "Tri-state";
    case "passive":
      return "Passive";
    case "free":
      return "Free";
    case "unspecified":
      return "Unspecified";
    case "power_in":
      return "Power input";
    case "power_out":
    case "power_output":
      return "Power output";
    case "open_collector":
      return "Open collector";
    case "open_emitter":
      return "Open emitter";
    case "no_connect":
      return "Not connected";
    default:
      return electricalType;
  }
};

export const isOutputLikeElectricalType = (electricalType: string): boolean => {
  const normalized = normalizePinElectricalType(electricalType);
  return (
    normalized === "output" ||
    normalized === "power_out" ||
    normalized === "power_output" ||
    normalized === "open_collector" ||
    normalized === "open_emitter"
  );
};

export const shouldSkipUnconnectedPinCheck = (electricalType: string): boolean => {
  const normalized = normalizePinElectricalType(electricalType);
  return normalized === "passive" || normalized === "no_connect" || normalized === "free";
};
