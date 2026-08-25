import { describe, expect, it } from "vitest";
import { getSponsorCarouselTiming } from "./sponsorCarousel";

describe("temporização do carrossel de patrocinadores", () => {
  it("usa a duração persistida para a transição e o intervalo de rotação", () => {
    expect(getSponsorCarouselTiming([{ key: "sponsor_transition_ms", value: "900" }])).toEqual({ transitionMs: 900, rotationMs: 3600 });
  });

  it("mantém limites operacionais seguros para valores inválidos", () => {
    expect(getSponsorCarouselTiming([{ key: "sponsor_transition_ms", value: "0" }])).toEqual({ transitionMs: 560, rotationMs: 2240 });
  });
});
