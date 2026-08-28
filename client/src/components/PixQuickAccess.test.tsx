// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    operations: {
      snapshot: { useQuery: vi.fn(() => ({ data: { settings: [{ key: "pix_payload", value: "PIX-COPIA-COLA" }] } })) },
      saveSetting: { useMutation: vi.fn(() => ({ isPending: false, mutate: mocks.mutate })) },
    },
    useUtils: vi.fn(() => ({ operations: { snapshot: { invalidate: mocks.invalidate } } })),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import PixQuickAccess from "./PixQuickAccess";

describe("PixQuickAccess", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mantém o botão no topo direito, fora da área de toasts inferiores", () => {
    render(<PixQuickAccess />);

    const button = screen.getByRole("button", { name: "Mostrar QR no público" });
    const containerClass = button.parentElement?.className ?? "";
    expect(containerClass).toContain("fixed");
    expect(containerClass).toContain("right-4");
    expect(containerClass).toContain("top-28");
    expect(containerClass).toContain("z-[60]");
    expect(containerClass).not.toContain("bottom-5");
  });
});
