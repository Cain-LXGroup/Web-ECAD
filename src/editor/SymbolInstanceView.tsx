import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

import { useLongPress } from "../hooks/useLongPress";
import { getPinBodyPoint } from "../library/symbolGeometry";
import type {
  LibrarySymbol,
  PinTextKind,
  SymbolFieldAnnotation,
  SymbolGraphic,
  SymbolInstance,
  WireConnection,
} from "../library/types";
import { formatSymbolFieldCaption } from "./symbolDisplay";
import { DEFAULT_SCHEMATIC_TEXT_SIZE, scaleThemeFontSize } from "./schematicTextSizing";
import { estimatePinTextHitSize, getPinTextLayout } from "./pinTextLayout";
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
  schematicTextSize?: number;
  showPinLabels?: boolean;
  showFieldLabels?: boolean;
  pinTextEditMode?: boolean;
  selectedPinText?: { pinNumber: string; kind: PinTextKind };
  onPointerDown?: (event: ReactPointerEvent<SVGGElement>) => void;
  onLongPress?: (event: ReactPointerEvent<SVGElement>) => void;
  onPinPointerDown?: (connection: WireConnection, event: ReactPointerEvent<SVGCircleElement>) => void;
  onPinTextPointerDown?: (
    pinNumber: string,
    kind: PinTextKind,
    event: ReactPointerEvent<SVGRectElement>,
  ) => void;
};

export const SymbolInstanceView = ({
  symbol,
  instance,
  selected,
  netHighlighted = false,
  schematicTextSize = DEFAULT_SCHEMATIC_TEXT_SIZE,
  showPinLabels = true,
  showFieldLabels = true,
  pinTextEditMode = false,
  selectedPinText,
  onPointerDown,
  onLongPress,
  onPinPointerDown,
  onPinTextPointerDown,
}: SymbolInstanceViewProps) => {
  console.info("[SymbolInstanceView] Rendering symbol instance", {
    instanceId: instance.id,
    symbolName: symbol.name,
    selected,
    netHighlighted,
  });

  const boundsWidth = symbol.bounds.maxX - symbol.bounds.minX;
  const boundsHeight = symbol.bounds.maxY - symbol.bounds.minY;
  const fieldCaption = formatSymbolFieldCaption(instance, symbol);
  const refFontSize = scaleThemeFontSize(kicadSchematicTheme.refFontSize, schematicTextSize);
  const valueFontSize = scaleThemeFontSize(kicadSchematicTheme.valueFontSize, schematicTextSize);
  const compactFontSize = scaleThemeFontSize(kicadSchematicTheme.valueFontSize, schematicTextSize);

  const renderFieldAnnotation = (
    key: string,
    text: string,
    defaultX: number,
    defaultY: number,
    fontSize: number,
    fill: string,
    annotation?: SymbolFieldAnnotation,
  ) => {
    if (annotation?.hidden) {
      return null;
    }

    const offset = annotation?.offset ?? { x: 0, y: 0 };
    const x = defaultX + offset.x;
    const y = defaultY + offset.y;
    const rotation = annotation?.rotation ?? 0;

    return (
      <text
        key={key}
        x={x}
        y={y}
        fontSize={fontSize}
        fill={fill}
        fontFamily={kicadSchematicTheme.fontFamily}
        fontWeight={700}
        transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
      >
        {text}
      </text>
    );
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
          stroke={schematicColorVar(pinTextEditMode ? "netHighlight" : "selection")}
          strokeDasharray={pinTextEditMode ? undefined : "18 10"}
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

            return (
              <g key={`${instance.id}-pin-${pin.number}`}>
                <line
                  x1={pin.x}
                  y1={pin.y}
                  x2={bodyPoint.x}
                  y2={bodyPoint.y}
                  stroke={schematicColorVar("pinStroke")}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <circle cx={pin.x} cy={pin.y} r={6} fill={schematicColorVar("pinConnection")} pointerEvents="none" />
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

              return entries.map(({ kind, text, fontSize, fill }) => {
                const layout = getPinTextLayout(pin, kind, pinAnnotations?.[kind]);
                if (layout.hidden) {
                  return null;
                }

                const hitSize = estimatePinTextHitSize(text, fontSize);
                const isSelected =
                  selectedPinText?.pinNumber === pin.number && selectedPinText?.kind === kind;
                const hitX =
                  layout.textAnchor === "end"
                    ? layout.x - hitSize.width
                    : layout.textAnchor === "middle"
                      ? layout.x - hitSize.width / 2
                      : layout.x;
                const hitY = layout.y - hitSize.height / 2;

                return (
                  <g key={`${instance.id}-label-${pin.number}-${kind}`}>
                    {isSelected ? (
                      <rect
                        x={hitX - 4}
                        y={hitY - 4}
                        width={hitSize.width + 8}
                        height={hitSize.height + 8}
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
                      fill={fill}
                      fontFamily={kicadSchematicTheme.fontFamily}
                      dominantBaseline="middle"
                      textAnchor={layout.textAnchor}
                      transform={layout.rotation ? `rotate(${layout.rotation} ${layout.x} ${layout.y})` : undefined}
                      pointerEvents={pinTextEditMode ? "none" : undefined}
                    >
                      {text}
                    </text>
                    {pinTextEditMode && onPinTextPointerDown ? (
                      <rect
                        x={hitX}
                        y={hitY}
                        width={hitSize.width}
                        height={hitSize.height}
                        fill="transparent"
                        stroke="transparent"
                        style={{ cursor: "move" }}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          onPinTextPointerDown(pin.number, kind, event);
                        }}
                      />
                    ) : null}
                  </g>
                );
              });
            })
        : null}

      {showFieldLabels ? (
        fieldCaption.compact ? (
          renderFieldAnnotation(
            `${instance.id}-compact-field`,
            fieldCaption.compact,
            symbol.bounds.minX,
            -(symbol.bounds.maxY + 32),
            compactFontSize,
            schematicColorVar("valueText"),
            instance.valueAnnotation ?? instance.refAnnotation,
          )
        ) : (
          <>
            {renderFieldAnnotation(
              `${instance.id}-ref-field`,
              fieldCaption.ref,
              symbol.bounds.minX,
              -(symbol.bounds.maxY + 56),
              refFontSize,
              schematicColorVar("refText"),
              instance.refAnnotation,
            )}
            {fieldCaption.value
              ? renderFieldAnnotation(
                  `${instance.id}-value-field`,
                  fieldCaption.value,
                  symbol.bounds.minX,
                  -(symbol.bounds.maxY + 8),
                  valueFontSize,
                  schematicColorVar("valueText"),
                  instance.valueAnnotation,
                )
              : null}
          </>
        )
      ) : null}
    </g>
  );
};

export default SymbolInstanceView;
