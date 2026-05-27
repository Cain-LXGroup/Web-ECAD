import { BubbleButton } from "./ui/BubbleButton";
import { glassDock } from "./ui/uiStyles";

type WireToolPaletteProps = {
  canPlaceWire: boolean;
  canCancelWire: boolean;
  onPlaceWire: () => void;
  onCancelWire: () => void;
};

export const WireToolPalette = ({
  canPlaceWire,
  canCancelWire,
  onPlaceWire,
  onCancelWire,
}: WireToolPaletteProps) => {
  console.info("[WireToolPalette] Rendering wire tool palette", { canPlaceWire, canCancelWire });

  return (
    <aside
      className={`pointer-events-auto fixed right-3 top-1/2 z-40 flex w-40 -translate-y-1/2 flex-col gap-2 p-2 ${glassDock}`}
      aria-label="Wire tools"
    >
      <BubbleButton variant="primary" disabled={!canPlaceWire} onClick={onPlaceWire}>
        Place Wire
      </BubbleButton>
      <BubbleButton variant="secondary" disabled={!canCancelWire} onClick={onCancelWire}>
        Cancel Wire
      </BubbleButton>
    </aside>
  );
};

export default WireToolPalette;
