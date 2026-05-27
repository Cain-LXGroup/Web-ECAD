import { useCallback, useEffect, useState } from "react";

import { getAppSetting, setAppSetting } from "../storage/settingsStore";

const FINGER_PAN_ONLY_KEY = "editor.fingerPansOnly";
const SOUND_ENABLED_KEY = "editor.soundEnabled";

export const useAppSettings = () => {
  console.info("[useAppSettings] Initializing app settings hook");

  const [fingerPansOnly, setFingerPansOnlyState] = useState(true);
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.info("[useAppSettings] Loading persisted settings");

    void (async () => {
      const [fingerPanValue, soundValue] = await Promise.all([
        getAppSetting(FINGER_PAN_ONLY_KEY),
        getAppSetting(SOUND_ENABLED_KEY),
      ]);

      if (fingerPanValue !== undefined) {
        setFingerPansOnlyState(fingerPanValue === "true");
      }

      if (soundValue !== undefined) {
        setSoundEnabledState(soundValue === "true");
      }

      setIsReady(true);
    })();
  }, []);

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

  return {
    fingerPansOnly,
    soundEnabled,
    isReady,
    setFingerPansOnly,
    setSoundEnabled,
  };
};

export default useAppSettings;
