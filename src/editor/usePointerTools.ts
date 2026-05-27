import { useMemo } from "react";

export const usePointerTools = () => {
  return useMemo(
    () => ({
      pointerEventsEnabled: true,
    }),
    [],
  );
};

export default usePointerTools;
