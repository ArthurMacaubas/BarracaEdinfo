export type PixSetting = { key: string; value: string };

export function getPixPayload(settings: PixSetting[]) {
  return settings.find(setting => setting.key === "pix_payload")?.value?.trim() ?? "";
}
