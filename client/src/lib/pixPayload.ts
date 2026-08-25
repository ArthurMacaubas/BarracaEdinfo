export type PixSetting = { key: string; value: string };

export function getPixPayload(settings: PixSetting[]) {
  return settings.find(setting => setting.key === "pix_payload")?.value?.trim() ?? "";
}

export function isPublicPixEnabled(settings: PixSetting[]) {
  return settings.find(setting => setting.key === "public_pix_enabled")?.value !== "false";
}

export function publicPixCampaign<T>(campaign: T | null | undefined, settings: PixSetting[]) {
  return isPublicPixEnabled(settings) ? campaign ?? null : null;
}

export function getManualPublicPixPayload(settings: PixSetting[]) {
  if (!isPublicPixEnabled(settings)) return "";
  return settings.find(setting => setting.key === "public_pix_manual_display")?.value === "true" ? getPixPayload(settings) : "";
}
