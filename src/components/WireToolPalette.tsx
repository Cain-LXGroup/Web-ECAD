import { BubbleButton } from "./ui/BubbleButton";

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
    <div className="flex flex-col gap-2" aria-label="Wire tools">
      <BubbleButton variant="primary" disabled={!canPlaceWire} onClick={onPlaceWire}>
        Place Wire
      </BubbleButton>
      <BubbleButton variant="secondary" disabled={!canCancelWire} onClick={onCancelWire}>
        Cancel Wire
      </BubbleButton>
    </div>
  );
};

export default WireToolPalette;
