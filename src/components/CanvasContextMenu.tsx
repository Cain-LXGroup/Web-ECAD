import { BubbleButton } from "./ui/BubbleButton";
import { glassPanel } from "./ui/uiStyles";

export type CanvasContextMenuTarget = {
  objectId: string;
  objectType: "symbol" | "wire" | "net-label" | "text-note";
  clientX: number;
  clientY: number;
};

type CanvasContextMenuProps = {
  target: CanvasContextMenuTarget | null;
  canDuplicate: boolean;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onProperties: () => void;
  onNudgeSymbolAnnotation?: (field: "ref" | "value", direction: "up" | "right" | "down" | "left") => void;
  onRotateSymbolAnnotation?: (field: "ref" | "value") => void;
  onToggleSymbolAnnotationHidden?: (field: "ref" | "value") => void;
};

export const CanvasContextMenu = ({
  target,
  canDuplicate,
  onClose,
  onDuplicate,
  onDelete,
  onProperties,
  onNudgeSymbolAnnotation,
  onRotateSymbolAnnotation,
  onToggleSymbolAnnotationHidden,
}: CanvasContextMenuProps) => {
  console.info("[CanvasContextMenu] Rendering canvas context menu", { targetId: target?.objectId });

  if (!target) {
    return null;
  }

  const isSymbol = target.objectType === "symbol";
  const hasAnnotationActions =
    isSymbol && onNudgeSymbolAnnotation && onRotateSymbolAnnotation && onToggleSymbolAnnotationHidden;

  return (
    <div className="fixed inset-0 z-[80]" onClick={onClose} role="presentation">
      <div
        className={`absolute flex max-h-[min(80vh,520px)] min-w-[168px] flex-col gap-2 overflow-y-auto p-2 ${glassPanel}`}
        style={{
          left: Math.min(target.clientX, window.innerWidth - 200),
          top: Math.min(target.clientY, window.innerHeight - 220),
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {canDuplicate ? (
          <BubbleButton variant="secondary" className="w-full !py-2.5 text-sm" onClick={onDuplicate}>
            Duplicate
          </BubbleButton>
        ) : null}
        {hasAnnotationActions ? (
          <>
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ref label</p>
            <div className="grid grid-cols-2 gap-2">
              {(["up", "left", "right", "down"] as const).map((direction) => (
                <BubbleButton
                  key={`ref-${direction}`}
                  variant="secondary"
                  className="w-full !py-2 text-xs"
                  onClick={() => onNudgeSymbolAnnotation("ref", direction)}
                >
                  Move {direction}
                </BubbleButton>
              ))}
            </div>
            <BubbleButton
              variant="secondary"
              className="w-full !py-2.5 text-sm"
              onClick={() => onRotateSymbolAnnotation("ref")}
            >
              Rotate ref
            </BubbleButton>
            <BubbleButton
              variant="secondary"
              className="w-full !py-2.5 text-sm"
              onClick={() => onToggleSymbolAnnotationHidden("ref")}
            >
              Hide ref
            </BubbleButton>
            <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Value label</p>
            <div className="grid grid-cols-2 gap-2">
              {(["up", "left", "right", "down"] as const).map((direction) => (
                <BubbleButton
                  key={`value-${direction}`}
                  variant="secondary"
                  className="w-full !py-2 text-xs"
                  onClick={() => onNudgeSymbolAnnotation("value", direction)}
                >
                  Move {direction}
                </BubbleButton>
              ))}
            </div>
            <BubbleButton
              variant="secondary"
              className="w-full !py-2.5 text-sm"
              onClick={() => onRotateSymbolAnnotation("value")}
            >
              Rotate value
            </BubbleButton>
            <BubbleButton
              variant="secondary"
              className="w-full !py-2.5 text-sm"
              onClick={() => onToggleSymbolAnnotationHidden("value")}
            >
              Hide value
            </BubbleButton>
          </>
        ) : null}
        <BubbleButton variant="secondary" className="w-full !py-2.5 text-sm" onClick={onProperties}>
          Properties
        </BubbleButton>
        <BubbleButton variant="primary" className="w-full !py-2.5 text-sm !bg-rose-500" onClick={onDelete}>
          Delete
        </BubbleButton>
      </div>
    </div>
  );
};

export default CanvasContextMenu;
