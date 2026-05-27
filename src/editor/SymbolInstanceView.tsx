import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

import { useLongPress } from "../hooks/useLongPress";
import { getPinBodyPoint, getPinDirection } from "../library/symbolGeometry";
import type { LibrarySymbol, SymbolGraphic, SymbolInstance, WireConnection } from "../library/types";
import { DEFAULT_SCHEMATIC_TEXT_SIZE, scaleThemeFontSize } from "./schematicTextSizing";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";

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
    return kicadSchematicTheme.bodyFill;
  }

  return "none";
};

const renderGraphic = (graphic: SymbolGraphic, key: string): ReactNode => {
  console.info("[SymbolInstanceView] Rendering symbol graphic", { graphicType: graphic.type });

  const stroke = kicadSchematicTheme.bodyStroke;
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
            fill={kicadSchematicTheme.pinName}
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
  onPointerDown?: (event: ReactPointerEvent<SVGGElement>) => void;
  onLongPress?: (event: ReactPointerEvent<SVGElement>) => void;
  onPinPointerDown?: (connection: WireConnection, event: ReactPointerEvent<SVGCircleElement>) => void;
};

export const SymbolInstanceView = ({
  symbol,
  instance,
  selected,
  netHighlighted = false,
  schematicTextSize = DEFAULT_SCHEMATIC_TEXT_SIZE,
  showPinLabels = true,
  showFieldLabels = true,
  onPointerDown,
  onLongPress,
  onPinPointerDown,
}: SymbolInstanceViewProps) => {
  console.info("[SymbolInstanceView] Rendering symbol instance", {
    instanceId: instance.id,
    symbolName: symbol.name,
    selected,
    netHighlighted,
  });

  const boundsWidth = symbol.bounds.maxX - symbol.bounds.minX;
  const boundsHeight = symbol.bounds.maxY - symbol.bounds.minY;
  const displayValue = instance.value || symbol.properties?.Value || symbol.name;
  const displayRef = instance.ref || `${symbol.referencePrefix ?? "U"}?`;
  const refFontSize = scaleThemeFontSize(kicadSchematicTheme.refFontSize, schematicTextSize);
  const valueFontSize = scaleThemeFontSize(kicadSchematicTheme.valueFontSize, schematicTextSize);
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
          stroke={kicadSchematicTheme.selection}
          strokeDasharray="18 10"
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
          stroke="rgba(250, 204, 21, 0.9)"
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
                  stroke={kicadSchematicTheme.pinStroke}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <circle cx={pin.x} cy={pin.y} r={6} fill={kicadSchematicTheme.pinConnection} pointerEvents="none" />
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
            .map((pin) => {
              const bodyPoint = getPinBodyPoint(pin);
              const direction = getPinDirection(pin.orientation);
              const nameX = bodyPoint.x + direction.x * 16;
              const nameY = -(bodyPoint.y + direction.y * 16);
              const numberX = pin.x - direction.x * 14;
              const numberY = -(pin.y - direction.y * 14);

              return (
                <g key={`${instance.id}-label-${pin.number}`}>
                  <text
                    x={nameX}
                    y={nameY}
                    fontSize={pinNameFontSize}
                    fill={kicadSchematicTheme.pinName}
                    fontFamily={kicadSchematicTheme.fontFamily}
                    dominantBaseline="middle"
                    textAnchor={direction.x > 0 ? "start" : direction.x < 0 ? "end" : "middle"}
                  >
                    {pin.name}
                  </text>
                  <text
                    x={numberX}
                    y={numberY}
                    fontSize={pinNumberFontSize}
                    fill={kicadSchematicTheme.pinNumber}
                    fontFamily={kicadSchematicTheme.fontFamily}
                    dominantBaseline="middle"
                    textAnchor={direction.x > 0 ? "end" : direction.x < 0 ? "start" : "middle"}
                  >
                    {pin.number}
                  </text>
                </g>
              );
            })
        : null}

      {showFieldLabels ? (
        <>
          <text
            x={symbol.bounds.minX}
            y={-(symbol.bounds.maxY + 56)}
            fontSize={refFontSize}
            fill={kicadSchematicTheme.refText}
            fontFamily={kicadSchematicTheme.fontFamily}
            fontWeight={700}
          >
            {displayRef}
          </text>
          <text
            x={symbol.bounds.minX}
            y={-(symbol.bounds.maxY + 8)}
            fontSize={valueFontSize}
            fill={kicadSchematicTheme.valueText}
            fontFamily={kicadSchematicTheme.fontFamily}
            fontWeight={700}
          >
            {displayValue}
          </text>
        </>
      ) : null}
    </g>
  );
};

export default SymbolInstanceView;
