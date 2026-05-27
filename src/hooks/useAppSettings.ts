import { useCallback, useEffect, useState } from "react";

import { getAppSetting, setAppSetting } from "../storage/settingsStore";

const FINGER_PAN_ONLY_KEY = "editor.fingerPansOnly";
const SOUND_ENABLED_KEY = "editor.soundEnabled";
const WIRE_ROUTE_CLEARANCE_KEY = "editor.wireRouteClearance";
const COLOR_SCHEME_KEY = "editor.colorScheme";

export type ColorScheme = "dark" | "light";

export const DEFAULT_WIRE_ROUTE_CLEARANCE = 120;

export const useAppSettings = () => {
  console.info("[useAppSettings] Initializing app settings hook");

  const [fingerPansOnly, setFingerPansOnlyState] = useState(true);
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [wireRouteClearance, setWireRouteClearanceState] = useState(DEFAULT_WIRE_ROUTE_CLEARANCE);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("dark");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.info("[useAppSettings] Loading persisted settings");

    void (async () => {
      const [fingerPanValue, soundValue, clearanceValue, schemeValue] = await Promise.all([
        getAppSetting(FINGER_PAN_ONLY_KEY),
        getAppSetting(SOUND_ENABLED_KEY),
        getAppSetting(WIRE_ROUTE_CLEARANCE_KEY),
        getAppSetting(COLOR_SCHEME_KEY),
      ]);

      if (fingerPanValue !== undefined) {
        setFingerPansOnlyState(fingerPanValue === "true");
      }

      if (soundValue !== undefined) {
        setSoundEnabledState(soundValue === "true");
      }

      if (clearanceValue !== undefined) {
        const parsed = Number(clearanceValue);
        if (Number.isFinite(parsed)) {
          setWireRouteClearanceState(parsed);
        }
      }

      if (schemeValue === "light" || schemeValue === "dark") {
        setColorSchemeState(schemeValue);
      }

      setIsReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    document.documentElement.dataset.theme = colorScheme;
  }, [colorScheme, isReady]);

  const setFingerPansOnly = useCallback((enabled: boolean) => {
    console.info("[useAppSettings] Updating finger-pan-only setting", { enabled });

    setFingerPansOnlyState(enabled);
    void setAppSetting(FINGER_PAN_ONLY_KEY, String(enabled));
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    console.info("[useAppSettings] Updating sound-enabled setting", { enabled });

    setSoundEnabledState(enabled);
    void setAppSetting(SOUND_ENABLED_KEY, String(enabled));
  }, []);

  const setWireRouteClearance = useCallback((clearance: number) => {
    console.info("[useAppSettings] Updating wire route clearance", { clearance });

    const clamped = Math.min(320, Math.max(40, Math.round(clearance)));
    setWireRouteClearanceState(clamped);
    void setAppSetting(WIRE_ROUTE_CLEARANCE_KEY, String(clamped));
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    console.info("[useAppSettings] Updating color scheme", { scheme });

    setColorSchemeState(scheme);
    void setAppSetting(COLOR_SCHEME_KEY, scheme);
  }, []);

  return {
    fingerPansOnly,
    soundEnabled,
    wireRouteClearance,
    colorScheme,
    isReady,
    setFingerPansOnly,
    setSoundEnabled,
    setWireRouteClearance,
    setColorScheme,
  };
};

export default useAppSettings;
