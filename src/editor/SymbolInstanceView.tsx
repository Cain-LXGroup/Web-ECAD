import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

import { useLongPress } from "../hooks/useLongPress";
import { getPinBodyPoint } from "../library/symbolGeometry";
import type {
  LibrarySymbol,
  PinTextKind,
  SymbolGraphic,
  SymbolInstance,
  SymbolTextTarget,
  WireConnection,
} from "../library/types";
import type { SymbolTextLayout } from "./symbolTextLayout";
import { formatSymbolFieldCaption } from "./symbolDisplay";
import { DEFAULT_SCHEMATIC_TEXT_SIZE, scaleThemeFontSize } from "./schematicTextSizing";
import {
  getCustomTextLayout,
  getPinTextLayout,
  getRefTextLayout,
  getSymbolTextHitRect,
  getValueTextLayout,
  symbolTextTargetsMatch,
} from "./symbolTextLayout";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";
import { schematicColorVar } from "../theme/schematicTheme";

const ARC_TOLERANCE = 0.01;

const getArcPath = (
  cx: number,
  cy: number,
  r: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): string => {
  console.info("[SymbolInstanceView] Building arc path");

  const startAngle = Math.atan2(startY - cy, startX - cx);
  const endAngle = Math.atan2(endY - cy, endX - cx);
  const rawDelta = endAngle - startAngle;
  const normalizedDelta = rawDelta >= 0 ? rawDelta : rawDelta + Math.PI * 2;
  const largeArcFlag = normalizedDelta > Math.PI ? 1 : 0;
  const sweepFlag = Math.abs(normalizedDelta) < ARC_TOLERANCE ? 0 : 1;

  return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
};

const getBodyFill = (graphic: SymbolGraphic): string => {
  if (
    (graphic.type === "rect" || graphic.type === "circle" || graphic.type === "polyline") &&
    graphic.fill === "white"
  ) {
    return schematicColorVar("bodyFill");
  }

  return "none";
};

const renderGraphic = (graphic: SymbolGraphic, key: string): ReactNode => {
  console.info("[SymbolInstanceView] Rendering symbol graphic", { graphicType: graphic.type });

  const stroke = schematicColorVar("bodyStroke");
  const fill = getBodyFill(graphic);

  switch (graphic.type) {
    case "line":
      return (
        <line
          key={key}
          x1={graphic.start.x}
          y1={graphic.start.y}
          x2={graphic.end.x}
          y2={graphic.end.y}
          stroke={stroke}
          strokeWidth={graphic.strokeWidth ?? 2}
          strokeLinecap="round"
        />
      );

    case "rect":
      return (
        <rect
          key={key}
          x={graphic.x}
          y={graphic.y}
          width={graphic.width}
          height={graphic.height}
          fill={fill}
          stroke={stroke}
          strokeWidth={graphic.strokeWidth ?? 2}
        />
      );

    case "circle":
      return (
        <circle
          key={key}
          cx={graphic.cx}
          cy={graphic.cy}
          r={graphic.r}
          fill={fill}
          stroke={stroke}
          strokeWidth={graphic.strokeWidth ?? 2}
        />
      );

    case "polyline":
      return (
        <polyline
          key={key}
          points={graphic.points.map((point) => `${point.x},${point.y}`).join(" ")}
          fill={graphic.closed ? fill : "none"}
          stroke={stroke}
          strokeWidth={graphic.strokeWidth ?? 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case "arc":
      return (
        <path
          key={key}
          d={getArcPath(
            graphic.cx,
            graphic.cy,
            graphic.r,
            graphic.start.x,
            graphic.start.y,
            graphic.end.x,
            graphic.end.y,
          )}
          fill="none"
          stroke={stroke}
          strokeWidth={graphic.strokeWidth ?? 2}
          strokeLinecap="round"
        />
      );

    case "text":
      return (
        <g key={key} transform="scale(1 -1)">
          <text
            x={graphic.x}
            y={-graphic.y}
            fontSize={graphic.size ?? 32}
            fill={schematicColorVar("pinName")}
            fontFamily={kicadSchematicTheme.fontFamily}
            textAnchor="middle"
            dominantBaseline="central"
            transform={graphic.rotation ? `rotate(${-graphic.rotation} ${graphic.x} ${-graphic.y})` : undefined}
          >
            {graphic.text}
          </text>
        </g>
      );

    default:
      return null;
  }
};

type SymbolInstanceViewProps = {
  symbol: LibrarySymbol;
  instance: SymbolInstance;
  selected: boolean;
  netHighlighted?: boolean;
  highlightedPinNumber?: string;
  schematicTextSize?: number;
  showPinLabels?: boolean;
  showFieldLabels?: boolean;
  symbolTextEditMode?: boolean;
  selectedSymbolText?: SymbolTextTarget;
  onPointerDown?: (event: ReactPointerEvent<SVGGElement>) => void;
  onLongPress?: (event: ReactPointerEvent<SVGElement>) => void;
  onPinPointerDown?: (connection: WireConnection, event: ReactPointerEvent<SVGCircleElement>) => void;
  onSymbolTextPointerDown?: (target: SymbolTextTarget, event: ReactPointerEvent<SVGRectElement>) => void;
};

const renderEditableSymbolText = (
  key: string,
  layout: SymbolTextLayout,
  fontSize: number,
  fill: string,
  target: SymbolTextTarget,
  options: {
    symbolTextEditMode: boolean;
    selectedSymbolText?: SymbolTextTarget;
    onSymbolTextPointerDown?: (target: SymbolTextTarget, event: ReactPointerEvent<SVGRectElement>) => void;
  },
): ReactNode => {
  if (layout.hidden) {
    return null;
  }

  const hitRect = getSymbolTextHitRect(layout, fontSize);
  const isSelected =
    options.selectedSymbolText && symbolTextTargetsMatch(options.selectedSymbolText, target);
  const displayFill = layout.placeholder ? schematicColorVar("pinNumber") : fill;
  const rotationTransform = layout.rotation
    ? `rotate(${layout.rotation} ${layout.x} ${layout.y})`
    : undefined;

  return (
    <g key={key} transform={rotationTransform}>
      {isSelected ? (
        <rect
          x={hitRect.x - 4}
          y={hitRect.y - 4}
          width={hitRect.width + 8}
          height={hitRect.height + 8}
          fill="none"
          stroke={schematicColorVar("selection")}
          strokeDasharray="8 6"
          strokeWidth={2}
          rx={4}
          pointerEvents="none"
        />
      ) : null}
      <text
        x={layout.x}
        y={layout.y}
        fontSize={fontSize}
        fill={displayFill}
        fontFamily={kicadSchematicTheme.fontFamily}
        fontWeight={target.type === "ref" || target.type === "value" ? 700 : undefined}
        dominantBaseline="middle"
        textAnchor={layout.textAnchor}
        pointerEvents={options.symbolTextEditMode ? "none" : undefined}
        opacity={layout.placeholder ? 0.55 : 1}
      >
        {layout.text}
      </text>
      {options.symbolTextEditMode && options.onSymbolTextPointerDown ? (
        <rect
          x={hitRect.x}
          y={hitRect.y}
          width={hitRect.width}
          height={hitRect.height}
          fill="transparent"
          stroke="transparent"
          style={{ cursor: "move" }}
          onPointerDown={(event) => {
            event.stopPropagation();
            options.onSymbolTextPointerDown?.(target, event);
          }}
        />
      ) : null}
    </g>
  );
};

export const SymbolInstanceView = ({
  symbol,
  instance,
  selected,
  netHighlighted = false,
  highlightedPinNumber,
  schematicTextSize = DEFAULT_SCHEMATIC_TEXT_SIZE,
  showPinLabels = true,
  showFieldLabels = true,
  symbolTextEditMode = false,
  selectedSymbolText,
  onPointerDown,
  onLongPress,
  onPinPointerDown,
  onSymbolTextPointerDown,
}: SymbolInstanceViewProps) => {
  console.info("[SymbolInstanceView] Rendering symbol instance", {
    instanceId: instance.id,
    symbolName: symbol.name,
    selected,
    netHighlighted,
    highlightedPinNumber,
  });

  const boundsWidth = symbol.bounds.maxX - symbol.bounds.minX;
  const boundsHeight = symbol.bounds.maxY - symbol.bounds.minY;
  const fieldCaption = formatSymbolFieldCaption(instance, symbol);
  const refFontSize = scaleThemeFontSize(kicadSchematicTheme.refFontSize, schematicTextSize);
  const valueFontSize = scaleThemeFontSize(kicadSchematicTheme.valueFontSize, schematicTextSize);
  const compactFontSize = scaleThemeFontSize(kicadSchematicTheme.valueFontSize, schematicTextSize);

  const editableTextOptions = {
    symbolTextEditMode,
    selectedSymbolText,
    onSymbolTextPointerDown,
  };
  const pinNameFontSize = scaleThemeFontSize(kicadSchematicTheme.pinNameFontSize, schematicTextSize);
  const pinNumberFontSize = scaleThemeFontSize(kicadSchematicTheme.pinNumberFontSize, schematicTextSize);

  const longPressHandlers = useLongPress(
    (event) => {
      event.stopPropagation();
      onLongPress?.(event);
    },
    { disabled: !onLongPress },
  );

  return (
    <g
      transform={`translate(${instance.x} ${instance.y}) rotate(${instance.rotation}) scale(${instance.mirrored ? -1 : 1} 1)`}
      onPointerDown={(event) => {
        longPressHandlers.onPointerDown(event);
        onPointerDown?.(event);
      }}
      onPointerMove={longPressHandlers.onPointerMove}
      onPointerUp={longPressHandlers.onPointerUp}
      onPointerCancel={longPressHandlers.onPointerCancel}
    >
      <rect
        x={symbol.bounds.minX - 24}
        y={-(symbol.bounds.maxY + 24)}
        width={boundsWidth + 48}
        height={boundsHeight + 48}
        fill="transparent"
      />

      {selected ? (
        <rect
          x={symbol.bounds.minX - 18}
          y={-(symbol.bounds.maxY + 18)}
          width={boundsWidth + 36}
          height={boundsHeight + 36}
          fill="none"
          stroke={schematicColorVar(symbolTextEditMode ? "netHighlight" : "selection")}
          strokeDasharray={symbolTextEditMode ? undefined : "18 10"}
          strokeWidth={3}
          rx={20}
        />
      ) : netHighlighted ? (
        <rect
          x={symbol.bounds.minX - 18}
          y={-(symbol.bounds.maxY + 18)}
          width={boundsWidth + 36}
          height={boundsHeight + 36}
          fill="none"
          stroke={schematicColorVar("netHighlight")}
          strokeWidth={3}
          rx={20}
        />
      ) : null}

      <g transform="scale(1 -1)">
        {symbol.graphics.map((graphic, graphicIndex) =>
          renderGraphic(graphic, `${instance.id}-graphic-${graphicIndex}`),
        )}

        {symbol.pins
          .filter((pin) => !pin.hidden)
          .map((pin) => {
            const bodyPoint = getPinBodyPoint(pin);

            const isErcHighlighted = highlightedPinNumber === pin.number;

            return (
              <g key={`${instance.id}-pin-${pin.number}`}>
                {isErcHighlighted ? (
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={28}
                    fill="none"
                    stroke={schematicColorVar("ercMarker")}
                    strokeWidth={4}
                    pointerEvents="none"
                  />
                ) : null}
                <line
                  x1={pin.x}
                  y1={pin.y}
                  x2={bodyPoint.x}
                  y2={bodyPoint.y}
                  stroke={schematicColorVar("pinStroke")}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r={6}
                  fill={schematicColorVar(isErcHighlighted ? "ercMarker" : "pinConnection")}
                  pointerEvents="none"
                />
                {onPinPointerDown ? (
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={22}
                    fill="transparent"
                    stroke="transparent"
                    style={{ cursor: "crosshair" }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      onPinPointerDown(
                        {
                          symbolInstanceId: instance.id,
                          pinNumber: pin.number,
                        },
                        event,
                      );
                    }}
                  />
                ) : null}
              </g>
            );
          })}
      </g>

      {showPinLabels
        ? symbol.pins
            .filter((pin) => !pin.hidden)
            .flatMap((pin) => {
              const pinAnnotations = instance.pinTextAnnotations?.[pin.number];
              const entries: Array<{ kind: PinTextKind; text: string; fontSize: number; fill: string }> = [
                {
                  kind: "name",
                  text: pin.name,
                  fontSize: pinNameFontSize,
                  fill: schematicColorVar("pinName"),
                },
                {
                  kind: "number",
                  text: pin.number,
                  fontSize: pinNumberFontSize,
                  fill: schematicColorVar("pinNumber"),
                },
              ];

              return entries.map(({ kind, fontSize, fill }) =>
                renderEditableSymbolText(
                  `${instance.id}-label-${pin.number}-${kind}`,
                  getPinTextLayout(pin, kind, pinAnnotations?.[kind]),
                  fontSize,
                  fill,
                  { type: "pin", pinNumber: pin.number, kind },
                  editableTextOptions,
                ),
              );
            })
        : null}

      {showFieldLabels ? (
        symbolTextEditMode ? (
          <>
            {renderEditableSymbolText(
              `${instance.id}-ref-field`,
              getRefTextLayout(instance, symbol),
              refFontSize,
              schematicColorVar("refText"),
              { type: "ref" },
              editableTextOptions,
            )}
            {renderEditableSymbolText(
              `${instance.id}-value-field`,
              getValueTextLayout(instance, symbol, { showPlaceholder: true })!,
              valueFontSize,
              schematicColorVar("valueText"),
              { type: "value" },
              editableTextOptions,
            )}
            {(instance.customTextLabels ?? []).map((label) =>
              renderEditableSymbolText(
                `${instance.id}-custom-${label.id}`,
                getCustomTextLayout(label),
                valueFontSize,
                schematicColorVar("valueText"),
                { type: "custom", id: label.id },
                editableTextOptions,
              ),
            )}
          </>
        ) : fieldCaption.compact ? (
          <text
            key={`${instance.id}-compact-field`}
            x={symbol.bounds.minX + (instance.valueAnnotation?.offset ?? instance.refAnnotation?.offset ?? { x: 0, y: 0 }).x}
            y={
              -(symbol.bounds.maxY + 32) +
              (instance.valueAnnotation?.offset ?? instance.refAnnotation?.offset ?? { x: 0, y: 0 }).y
            }
            fontSize={compactFontSize}
            fill={schematicColorVar("valueText")}
            fontFamily={kicadSchematicTheme.fontFamily}
            fontWeight={700}
          >
            {fieldCaption.compact}
          </text>
        ) : (
          <>
            {renderEditableSymbolText(
              `${instance.id}-ref-field`,
              getRefTextLayout(instance, symbol),
              refFontSize,
              schematicColorVar("refText"),
              { type: "ref" },
              { symbolTextEditMode: false },
            )}
            {fieldCaption.value
              ? renderEditableSymbolText(
                  `${instance.id}-value-field`,
                  getValueTextLayout(instance, symbol)!,
                  valueFontSize,
                  schematicColorVar("valueText"),
                  { type: "value" },
                  { symbolTextEditMode: false },
                )
              : null}
            {(instance.customTextLabels ?? []).map((label) =>
              renderEditableSymbolText(
                `${instance.id}-custom-${label.id}`,
                getCustomTextLayout(label),
                valueFontSize,
                schematicColorVar("valueText"),
                { type: "custom", id: label.id },
                { symbolTextEditMode: false },
              ),
            )}
          </>
        )
      ) : null}
    </g>
  );
};

export default SymbolInstanceView;
