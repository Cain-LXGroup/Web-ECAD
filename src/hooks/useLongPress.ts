import { useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type UseLongPressOptions = {
  delayMs?: number;
  moveTolerancePx?: number;
  disabled?: boolean;
};

export const useLongPress = (
  onLongPress: (event: ReactPointerEvent<SVGElement>) => void,
  { delayMs = 500, moveTolerancePx = 12, disabled = false }: UseLongPressOptions = {},
) => {
  console.info("[useLongPress] Creating long-press handlers", { delayMs, disabled });

  const timerRef = useRef<number | undefined>(undefined);
  const startClientRef = useRef<{ x: number; y: number } | undefined>(undefined);

  return useMemo(() => {
    const clearTimer = () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };

    return {
      onPointerDown: (event: ReactPointerEvent<SVGElement>) => {
        if (disabled) {
          return;
        }

        startClientRef.current = { x: event.clientX, y: event.clientY };
        clearTimer();
        timerRef.current = window.setTimeout(() => {
          onLongPress(event);
        }, delayMs);
      },
      onPointerMove: (event: ReactPointerEvent<SVGElement>) => {
        const startClient = startClientRef.current;
        if (!startClient) {
          return;
        }

        const distance = Math.hypot(event.clientX - startClient.x, event.clientY - startClient.y);
        if (distance > moveTolerancePx) {
          clearTimer();
        }
      },
      onPointerUp: () => {
        clearTimer();
        startClientRef.current = undefined;
      },
      onPointerCancel: () => {
        clearTimer();
        startClientRef.current = undefined;
      },
    };
  }, [delayMs, disabled, moveTolerancePx, onLongPress]);
};

export default useLongPress;
