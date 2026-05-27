import { db, type AppSettingRecord } from "./db";

export const getAppSetting = async (key: string): Promise<string | undefined> => {
  console.info("[settingsStore] Reading app setting", { key });

  const record = await db.settings.get(key);
  return record?.value;
};

export const setAppSetting = async (key: string, value: string): Promise<void> => {
  console.info("[settingsStore] Writing app setting", { key });

  const record: AppSettingRecord = {
    key,
    value,
    updatedAt: Date.now(),
  };

  await db.settings.put(record);
};

export const deleteAppSetting = async (key: string): Promise<void> => {
  console.info("[settingsStore] Deleting app setting", { key });

  await db.settings.delete(key);
};

export default getAppSetting;
