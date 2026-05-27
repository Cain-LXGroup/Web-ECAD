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
};

export const CanvasContextMenu = ({
  target,
  canDuplicate,
  onClose,
  onDuplicate,
  onDelete,
  onProperties,
}: CanvasContextMenuProps) => {
  console.info("[CanvasContextMenu] Rendering canvas context menu", { targetId: target?.objectId });

  if (!target) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80]" onClick={onClose} role="presentation">
      <div
        className={`absolute flex min-w-[168px] flex-col gap-2 p-2 ${glassPanel}`}
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
