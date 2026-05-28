export type ParsedBusRange = {
  prefix: string;
  start: number;
  end: number;
};

const BUS_RANGE_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*(\d+)\s*\.\.\s*(\d+)\s*\]$/;
const BUS_SINGLE_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*(\d+)\s*\]$/;

export const parseBusNotation = (text: string): ParsedBusRange | undefined => {
  console.info("[busNotation] Parsing bus notation", { text });

  const trimmed = text.trim();
  const rangeMatch = trimmed.match(BUS_RANGE_PATTERN);
  if (rangeMatch) {
    const start = Number(rangeMatch[2]);
    const end = Number(rangeMatch[3]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return undefined;
    }

    return {
      prefix: rangeMatch[1],
      start: Math.min(start, end),
      end: Math.max(start, end),
    };
  }

  const singleMatch = trimmed.match(BUS_SINGLE_PATTERN);
  if (singleMatch) {
    const index = Number(singleMatch[2]);
    if (!Number.isFinite(index)) {
      return undefined;
    }

    return {
      prefix: singleMatch[1],
      start: index,
      end: index,
    };
  }

  return undefined;
};

export const formatBusNotation = (prefix: string, start: number, end: number): string => {
  console.info("[busNotation] Formatting bus notation", { prefix, start, end });

  if (start === end) {
    return `${prefix}[${start}]`;
  }

  return `${prefix}[${start}..${end}]`;
};

export const formatBusMemberName = (prefix: string, index: number): string => {
  console.info("[busNotation] Formatting bus member name", { prefix, index });

  return `${prefix}${index}`;
};

export const busMemberCount = (range: ParsedBusRange): number => {
  return range.end - range.start + 1;
};

export const normalizeBusText = (text: string): string => {
  const parsed = parseBusNotation(text);
  if (!parsed) {
    return text.trim();
  }

  return formatBusNotation(parsed.prefix, parsed.start, parsed.end);
};
