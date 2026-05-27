import { useEffect, useMemo, useRef } from "react";
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
  const pointerIdRef = useRef<number | undefined>(undefined);
  const cleanupGlobalListenersRef = useRef<(() => void) | undefined>(undefined);

  const clearTimer = () => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  const clearTracking = () => {
    clearTimer();
    startClientRef.current = undefined;
    pointerIdRef.current = undefined;
    if (cleanupGlobalListenersRef.current) {
      cleanupGlobalListenersRef.current();
      cleanupGlobalListenersRef.current = undefined;
    }
  };

  useEffect(() => {
    return () => {
      clearTracking();
    };
  }, []);

  return useMemo(() => {
    return {
      onPointerDown: (event: ReactPointerEvent<SVGElement>) => {
        if (disabled) {
          return;
        }

        clearTracking();
        startClientRef.current = { x: event.clientX, y: event.clientY };
        pointerIdRef.current = event.pointerId;

        const handleGlobalPointerMove = (globalEvent: PointerEvent) => {
          if (pointerIdRef.current !== globalEvent.pointerId) {
            return;
          }

          const startClient = startClientRef.current;
          if (!startClient) {
            return;
          }

          const distance = Math.hypot(globalEvent.clientX - startClient.x, globalEvent.clientY - startClient.y);
          if (distance > moveTolerancePx) {
            clearTracking();
          }
        };

        const handleGlobalPointerEnd = (globalEvent: PointerEvent) => {
          if (pointerIdRef.current !== globalEvent.pointerId) {
            return;
          }

          clearTracking();
        };

        window.addEventListener("pointermove", handleGlobalPointerMove, { passive: true });
        window.addEventListener("pointerup", handleGlobalPointerEnd, { passive: true });
        window.addEventListener("pointercancel", handleGlobalPointerEnd, { passive: true });
        cleanupGlobalListenersRef.current = () => {
          window.removeEventListener("pointermove", handleGlobalPointerMove);
          window.removeEventListener("pointerup", handleGlobalPointerEnd);
          window.removeEventListener("pointercancel", handleGlobalPointerEnd);
        };

        timerRef.current = window.setTimeout(() => {
          cleanupGlobalListenersRef.current?.();
          cleanupGlobalListenersRef.current = undefined;
          pointerIdRef.current = undefined;
          startClientRef.current = undefined;
          onLongPress(event);
          clearTimer();
        }, delayMs);
      },
      onPointerMove: (event: ReactPointerEvent<SVGElement>) => {
        const startClient = startClientRef.current;
        if (!startClient || pointerIdRef.current !== event.pointerId) {
          return;
        }

        const distance = Math.hypot(event.clientX - startClient.x, event.clientY - startClient.y);
        if (distance > moveTolerancePx) {
          clearTracking();
        }
      },
      onPointerUp: () => {
        clearTracking();
      },
      onPointerCancel: () => {
        clearTracking();
      },
    };
  }, [delayMs, disabled, moveTolerancePx, onLongPress]);
};

export default useLongPress;
