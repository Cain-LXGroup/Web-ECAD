import type { Point, SymbolInstance, SymbolTextTarget } from "../library/types";
import { normalizeRotation } from "./transforms";

export const applySymbolTextOffset = (
  instance: SymbolInstance,
  target: SymbolTextTarget,
  delta: Point,
): SymbolInstance => {
  console.info("[symbolTextMutation] Applying symbol text offset", {
    instanceId: instance.id,
    target,
    delta,
  });

  switch (target.type) {
    case "pin": {
      const pinAnnotations = instance.pinTextAnnotations ?? {};
      const pinEntry = pinAnnotations[target.pinNumber] ?? {};
      const current = pinEntry[target.kind] ?? {};
      const currentOffset = current.offset ?? { x: 0, y: 0 };

      return {
        ...instance,
        pinTextAnnotations: {
          ...pinAnnotations,
          [target.pinNumber]: {
            ...pinEntry,
            [target.kind]: {
              ...current,
              offset: {
                x: currentOffset.x + delta.x,
                y: currentOffset.y + delta.y,
              },
            },
          },
        },
      };
    }

    case "ref": {
      const current = instance.refAnnotation ?? {};
      const currentOffset = current.offset ?? { x: 0, y: 0 };
      return {
        ...instance,
        refAnnotation: {
          ...current,
          offset: {
            x: currentOffset.x + delta.x,
            y: currentOffset.y + delta.y,
          },
        },
      };
    }

    case "value": {
      const current = instance.valueAnnotation ?? {};
      const currentOffset = current.offset ?? { x: 0, y: 0 };
      return {
        ...instance,
        valueAnnotation: {
          ...current,
          offset: {
            x: currentOffset.x + delta.x,
            y: currentOffset.y + delta.y,
          },
        },
      };
    }

    case "custom": {
      const labels = instance.customTextLabels ?? [];
      return {
        ...instance,
        customTextLabels: labels.map((label) => {
          if (label.id !== target.id) {
            return label;
          }

          const currentOffset = label.offset ?? { x: 0, y: 0 };
          return {
            ...label,
            offset: {
              x: currentOffset.x + delta.x,
              y: currentOffset.y + delta.y,
            },
          };
        }),
      };
    }

    default:
      return instance;
  }
};

export const applySymbolTextRotation = (
  instance: SymbolInstance,
  target: SymbolTextTarget,
): SymbolInstance => {
  console.info("[symbolTextMutation] Applying symbol text rotation", { instanceId: instance.id, target });

  switch (target.type) {
    case "pin": {
      const pinAnnotations = instance.pinTextAnnotations ?? {};
      const pinEntry = pinAnnotations[target.pinNumber] ?? {};
      const current = pinEntry[target.kind] ?? {};

      return {
        ...instance,
        pinTextAnnotations: {
          ...pinAnnotations,
          [target.pinNumber]: {
            ...pinEntry,
            [target.kind]: {
              ...current,
              rotation: normalizeRotation((current.rotation ?? 0) + 90),
            },
          },
        },
      };
    }

    case "ref": {
      const current = instance.refAnnotation ?? {};
      return {
        ...instance,
        refAnnotation: {
          ...current,
          rotation: normalizeRotation((current.rotation ?? 0) + 90),
        },
      };
    }

    case "value": {
      const current = instance.valueAnnotation ?? {};
      return {
        ...instance,
        valueAnnotation: {
          ...current,
          rotation: normalizeRotation((current.rotation ?? 0) + 90),
        },
      };
    }

    case "custom": {
      const labels = instance.customTextLabels ?? [];
      return {
        ...instance,
        customTextLabels: labels.map((label) =>
          label.id === target.id
            ? {
                ...label,
                rotation: normalizeRotation((label.rotation ?? 0) + 90),
              }
            : label,
        ),
      };
    }

    default:
      return instance;
  }
};

export const applySymbolTextContent = (
  instance: SymbolInstance,
  target: SymbolTextTarget,
  text: string,
): SymbolInstance => {
  console.info("[symbolTextMutation] Applying symbol text content", { instanceId: instance.id, target });

  switch (target.type) {
    case "ref":
      return { ...instance, ref: text.trim() || instance.ref };
    case "value":
      return { ...instance, value: text.trim() };
    case "custom": {
      const labels = instance.customTextLabels ?? [];
      return {
        ...instance,
        customTextLabels: labels.map((label) =>
          label.id === target.id ? { ...label, text: text.trim() || label.text } : label,
        ),
      };
    }
    default:
      return instance;
  }
};
