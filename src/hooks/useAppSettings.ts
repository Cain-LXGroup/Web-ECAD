import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_SCHEMATIC_TEXT_SIZE,
  clampSchematicTextSize,
} from "../editor/schematicTextSizing";
import { getAppSetting, setAppSetting } from "../storage/settingsStore";
import {
  applySchematicColors,
  defaultSchematicColorsByScheme,
  defaultSchematicColorsForScheme,
  parseStoredSchematicColorsByScheme,
  serializeSchematicColorsByScheme,
  type SchematicColorRole,
  type SchematicColorsByScheme,
} from "../theme/schematicTheme";

const FINGER_PAN_ONLY_KEY = "editor.fingerPansOnly";
const SOUND_ENABLED_KEY = "editor.soundEnabled";
const WIRE_ROUTE_CLEARANCE_KEY = "editor.wireRouteClearance";
const SCHEMATIC_TEXT_SIZE_KEY = "editor.schematicTextSize";
const COLOR_SCHEME_KEY = "editor.colorScheme";
const SCHEMATIC_COLORS_KEY = "editor.schematicColors";
const NET_HIGHLIGHT_ENABLED_KEY = "editor.netHighlightEnabled";
const STARRED_SYMBOL_IDS_KEY = "library.starredSymbolIds";

const parseStarredSymbolIds = (raw: string | undefined): string[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
};

export type ColorScheme = "dark" | "light";

export const DEFAULT_WIRE_ROUTE_CLEARANCE = 120;

export const useAppSettings = () => {
  console.info("[useAppSettings] Initializing app settings hook");

  const [fingerPansOnly, setFingerPansOnlyState] = useState(true);
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [wireRouteClearance, setWireRouteClearanceState] = useState(DEFAULT_WIRE_ROUTE_CLEARANCE);
  const [schematicTextSize, setSchematicTextSizeState] = useState(DEFAULT_SCHEMATIC_TEXT_SIZE);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("dark");
  const [schematicColorsByScheme, setSchematicColorsBySchemeState] = useState<SchematicColorsByScheme>(
    defaultSchematicColorsByScheme(),
  );
  const [netHighlightEnabled, setNetHighlightEnabledState] = useState(true);
  const [starredSymbolIds, setStarredSymbolIdsState] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  const schematicColors = useMemo(
    () => schematicColorsByScheme[colorScheme],
    [schematicColorsByScheme, colorScheme],
  );

  const persistSchematicColorsByScheme = useCallback((next: SchematicColorsByScheme) => {
    void setAppSetting(SCHEMATIC_COLORS_KEY, serializeSchematicColorsByScheme(next));
  }, []);

  useEffect(() => {
    console.info("[useAppSettings] Loading persisted settings");

    void (async () => {
      const [
        fingerPanValue,
        soundValue,
        clearanceValue,
        textSizeValue,
        schemeValue,
        schematicColorsValue,
        netHighlightValue,
        starredValue,
      ] = await Promise.all([
        getAppSetting(FINGER_PAN_ONLY_KEY),
        getAppSetting(SOUND_ENABLED_KEY),
        getAppSetting(WIRE_ROUTE_CLEARANCE_KEY),
        getAppSetting(SCHEMATIC_TEXT_SIZE_KEY),
        getAppSetting(COLOR_SCHEME_KEY),
        getAppSetting(SCHEMATIC_COLORS_KEY),
        getAppSetting(NET_HIGHLIGHT_ENABLED_KEY),
        getAppSetting(STARRED_SYMBOL_IDS_KEY),
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

      if (textSizeValue !== undefined) {
        const parsed = Number(textSizeValue);
        if (Number.isFinite(parsed)) {
          setSchematicTextSizeState(clampSchematicTextSize(parsed));
        }
      }

      if (schemeValue === "light" || schemeValue === "dark") {
        setColorSchemeState(schemeValue);
      }

      setSchematicColorsBySchemeState(parseStoredSchematicColorsByScheme(schematicColorsValue));

      if (netHighlightValue !== undefined) {
        setNetHighlightEnabledState(netHighlightValue === "true");
      }

      setStarredSymbolIdsState(parseStarredSymbolIds(starredValue));

      setIsReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    document.documentElement.dataset.theme = colorScheme;
  }, [colorScheme, isReady]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    applySchematicColors(schematicColors);
  }, [schematicColors, isReady]);

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

  const setSchematicTextSize = useCallback((size: number) => {
    console.info("[useAppSettings] Updating schematic text size", { size });

    const clamped = clampSchematicTextSize(size);
    setSchematicTextSizeState(clamped);
    void setAppSetting(SCHEMATIC_TEXT_SIZE_KEY, String(clamped));
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    console.info("[useAppSettings] Updating color scheme", { scheme });

    setColorSchemeState(scheme);
    void setAppSetting(COLOR_SCHEME_KEY, scheme);
  }, []);

  const setSchematicColor = useCallback(
    (role: SchematicColorRole, value: string) => {
      console.info("[useAppSettings] Updating schematic color", { role, colorScheme });

      setSchematicColorsBySchemeState((current) => {
        const next: SchematicColorsByScheme = {
          ...current,
          [colorScheme]: {
            ...current[colorScheme],
            [role]: value,
          },
        };
        persistSchematicColorsByScheme(next);
        return next;
      });
    },
    [colorScheme, persistSchematicColorsByScheme],
  );

  const setNetHighlightEnabled = useCallback((enabled: boolean) => {
    console.info("[useAppSettings] Updating net highlight enabled", { enabled });

    setNetHighlightEnabledState(enabled);
    void setAppSetting(NET_HIGHLIGHT_ENABLED_KEY, String(enabled));
  }, []);

  const resetSchematicColors = useCallback(() => {
    console.info("[useAppSettings] Resetting schematic colors for active scheme", { colorScheme });

    setSchematicColorsBySchemeState((current) => {
      const next: SchematicColorsByScheme = {
        ...current,
        [colorScheme]: defaultSchematicColorsForScheme(colorScheme),
      };
      persistSchematicColorsByScheme(next);
      return next;
    });
  }, [colorScheme, persistSchematicColorsByScheme]);

  const toggleStarredSymbol = useCallback((symbolId: string) => {
    console.info("[useAppSettings] Toggling starred symbol", { symbolId });

    setStarredSymbolIdsState((current) => {
      const next = current.includes(symbolId)
        ? current.filter((id) => id !== symbolId)
        : [...current, symbolId];
      void setAppSetting(STARRED_SYMBOL_IDS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isSymbolStarred = useCallback(
    (symbolId: string) => starredSymbolIds.includes(symbolId),
    [starredSymbolIds],
  );

  return {
    fingerPansOnly,
    soundEnabled,
    wireRouteClearance,
    schematicTextSize,
    colorScheme,
    schematicColors,
    starredSymbolIds,
    netHighlightEnabled,
    isReady,
    setFingerPansOnly,
    setSoundEnabled,
    setWireRouteClearance,
    setSchematicTextSize,
    setColorScheme,
    setSchematicColor,
    resetSchematicColors,
    setNetHighlightEnabled,
    toggleStarredSymbol,
    isSymbolStarred,
  };
};

export default useAppSettings;
