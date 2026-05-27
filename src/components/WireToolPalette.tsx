import { BubbleButton } from "./ui/BubbleButton";
import { EditorFloatingPalette } from "./EditorFloatingPalette";

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
    <EditorFloatingPalette ariaLabel="Wire tools">
      <BubbleButton variant="primary" disabled={!canPlaceWire} onClick={onPlaceWire}>
        Place Wire
      </BubbleButton>
      <BubbleButton variant="secondary" disabled={!canCancelWire} onClick={onCancelWire}>
        Cancel Wire
      </BubbleButton>
    </EditorFloatingPalette>
  );
};

export default WireToolPalette;
