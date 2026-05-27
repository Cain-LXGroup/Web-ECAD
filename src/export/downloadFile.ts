import { saveAs } from "file-saver";

export const sanitizeFileName = (name: string): string => {
  console.info("[downloadFile] Sanitizing file name", { name });

  const trimmed = name.trim() || "schematic";
  return trimmed.replace(/[^\w.-]+/g, "_");
};

export const downloadBlob = (blob: Blob, fileName: string): void => {
  console.info("[downloadFile] Downloading blob", { fileName, size: blob.size });

  saveAs(blob, fileName);
};

export const downloadText = (contents: string, fileName: string, mimeType: string): void => {
  console.info("[downloadFile] Downloading text file", { fileName, mimeType });

  downloadBlob(new Blob([contents], { type: mimeType }), fileName);
};
