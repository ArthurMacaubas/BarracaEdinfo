export type PublicDisplayMode = "goal" | "pix" | "ready" | "waiting";

export function getPublicDisplayMode(hasGoalAlert: boolean, hasPixCampaign: boolean, hasReadyOrder: boolean): PublicDisplayMode {
  if (hasGoalAlert) return "goal";
  if (hasPixCampaign) return "pix";
  return hasReadyOrder ? "ready" : "waiting";
}

export function visibleSponsors<T extends { enabled?: boolean }>(sponsors: T[]) {
  return sponsors.filter(sponsor => sponsor.enabled !== false);
}
