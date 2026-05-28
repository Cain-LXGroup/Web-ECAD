import { BubbleButton } from "./ui/BubbleButton";

type BusToolPaletteProps = {
  canPlaceBus: boolean;
  canCancelBus: boolean;
  canUnfoldBus: boolean;
  onPlaceBus: () => void;
  onCancelBus: () => void;
  onUnfoldBus: () => void;
};

export const BusToolPalette = ({
  canPlaceBus,
  canCancelBus,
  canUnfoldBus,
  onPlaceBus,
  onCancelBus,
  onUnfoldBus,
}: BusToolPaletteProps) => {
  console.info("[BusToolPalette] Rendering bus tool palette", { canPlaceBus, canCancelBus, canUnfoldBus });

  return (
    <div className="flex flex-col gap-2" aria-label="Bus tools">
      <BubbleButton variant="primary" disabled={!canPlaceBus} onClick={onPlaceBus}>
        Place Bus
      </BubbleButton>
      <BubbleButton variant="secondary" disabled={!canCancelBus} onClick={onCancelBus}>
        Cancel Bus
      </BubbleButton>
      <BubbleButton variant="secondary" disabled={!canUnfoldBus} onClick={onUnfoldBus}>
        Unfold Bus
      </BubbleButton>
    </div>
  );
};

export default BusToolPalette;
