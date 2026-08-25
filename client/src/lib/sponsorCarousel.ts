export type SponsorTimingSetting = { key: string; value: string };

export function getSponsorCarouselTiming(settings: SponsorTimingSetting[], previewTransition?: number) {
  const configured = Number(settings.find(setting => setting.key === "sponsor_transition_ms")?.value ?? "560");
  const requested = Number.isFinite(previewTransition) ? previewTransition! : configured;
  const transitionMs = Math.min(2_000, Math.max(200, requested || 560));
  return { transitionMs, rotationMs: Math.max(2_000, transitionMs * 4) };
}
