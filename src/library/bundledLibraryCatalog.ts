export type BundledLibraryPackId = "digikey" | "jlcpcb";

export type BundledLibraryFile = {
  fileName: string;
  url: string;
  format: "lib" | "kicad_sym";
};

export type BundledLibraryPack = {
  id: BundledLibraryPackId;
  label: string;
  description: string;
  repositoryUrl: string;
  settingKey: string;
  listFiles: () => Promise<BundledLibraryFile[]>;
};

const DIGIKEY_SYMBOLS_BASE =
  "https://raw.githubusercontent.com/Digi-Key/digikey-kicad-library/master/digikey-symbols";

const JLCPCB_SYMBOLS_BASE =
  "https://raw.githubusercontent.com/CDFER/JLCPCB-Kicad-Library/main/symbols";

const JLCPCB_SYMBOL_FILES = [
  "JLCPCB-Analog.kicad_sym",
  "JLCPCB-Capacitors.kicad_sym",
  "JLCPCB-Connectors_Buttons.kicad_sym",
  "JLCPCB-Crystals.kicad_sym",
  "JLCPCB-Diode-Packages.kicad_sym",
  "JLCPCB-Diodes.kicad_sym",
  "JLCPCB-Extended.kicad_sym",
  "JLCPCB-ICs.kicad_sym",
  "JLCPCB-Inductors.kicad_sym",
  "JLCPCB-Interface.kicad_sym",
  "JLCPCB-MCUs.kicad_sym",
  "JLCPCB-Manufacturing.kicad_sym",
  "JLCPCB-Memory.kicad_sym",
  "JLCPCB-Optocouplers.kicad_sym",
  "JLCPCB-Power.kicad_sym",
  "JLCPCB-Resistors.kicad_sym",
  "JLCPCB-Transistor-Packages.kicad_sym",
  "JLCPCB-Transistors.kicad_sym",
] as const;

export const listDigiKeyLibraryFiles = async (): Promise<BundledLibraryFile[]> => {
  console.info("[bundledLibraryCatalog] Listing Digi-Key library files from GitHub");

  const response = await fetch(
    "https://api.github.com/repos/Digi-Key/digikey-kicad-library/contents/digikey-symbols?ref=master",
  );

  if (!response.ok) {
    throw new Error(`Unable to list Digi-Key library files (${response.status})`);
  }

  const payload = (await response.json()) as Array<{ name: string }>;

  return payload
    .filter((entry) => entry.name.toLowerCase().endsWith(".lib"))
    .map((entry) => ({
      fileName: entry.name,
      url: `${DIGIKEY_SYMBOLS_BASE}/${entry.name}`,
      format: "lib" as const,
    }))
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
};

export const listJlcpcbLibraryFiles = async (): Promise<BundledLibraryFile[]> => {
  console.info("[bundledLibraryCatalog] Listing JLCPCB library files");

  return JLCPCB_SYMBOL_FILES.map((fileName) => ({
    fileName,
    url: `${JLCPCB_SYMBOLS_BASE}/${fileName}`,
    format: "kicad_sym" as const,
  }));
};

export const bundledLibraryPacks: BundledLibraryPack[] = [
  {
    id: "digikey",
    label: "Digi-Key KiCad Library",
    description: "Legacy `.lib` symbols from Digi-Key's official KiCad library.",
    repositoryUrl: "https://github.com/Digi-Key/digikey-kicad-library",
    settingKey: "bundled-library:digikey:v1",
    listFiles: listDigiKeyLibraryFiles,
  },
  {
    id: "jlcpcb",
    label: "JLCPCB KiCad Library",
    description: "Modern `.kicad_sym` parts aligned with JLCPCB/LCSC stock.",
    repositoryUrl: "https://github.com/CDFER/JLCPCB-Kicad-Library",
    settingKey: "bundled-library:jlcpcb:v1",
    listFiles: listJlcpcbLibraryFiles,
  },
];

export const getBundledLibraryPack = (packId: BundledLibraryPackId): BundledLibraryPack | undefined => {
  return bundledLibraryPacks.find((pack) => pack.id === packId);
};

export default bundledLibraryPacks;
