// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PixPaymentConfirmation from "./PixPaymentConfirmation";

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    operations: {
      pendingPixPayments: { useQuery: () => ({ isLoading: false, data: [{ id: 91, ticket: 24, total: "35.00", createdAt: new Date("2026-08-27T15:40:00Z"), items: [{ id: 1, orderId: 91, productName: "Cachorro-quente completo", quantity: 2, unitPrice: "15.00", subtotal: "30.00" }, { id: 2, orderId: 91, productName: "Suco", quantity: 1, unitPrice: "5.00", subtotal: "5.00" }] }] }) },
      confirmPixPayment: { useMutation: (options: { onSuccess: (value: { alreadyConfirmed: boolean; order: { ticket: number } }) => void }) => ({ isPending: false, mutate: (input: unknown) => { mocks.confirm(input); options.onSuccess({ alreadyConfirmed: false, order: { ticket: 24 } }); } }) },
    },
    useUtils: () => ({ operations: { pendingPixPayments: { invalidate: mocks.invalidate }, snapshot: { invalidate: mocks.invalidate } } }),
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("PixPaymentConfirmation", () => {
  beforeEach(() => { mocks.confirm.mockReset(); mocks.invalidate.mockReset(); });
  afterEach(cleanup);

  it("mostra produtos, quantidades, subtotais e total antes da confirmação", () => {
    render(<PixPaymentConfirmation />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar PIX (1)" }));
    expect(screen.getByText("Pedido #24")).toBeTruthy();
    expect(screen.getByText("Cachorro-quente completo")).toBeTruthy();
    expect(screen.getByText("Suco")).toBeTruthy();
    expect(screen.getByText("2×")).toBeTruthy();
    expect(screen.getByText("1×")).toBeTruthy();
    expect(screen.getAllByText(/R\$\s*35,00/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Confirmar\s+R\$\s*35,00/ }));
    expect(mocks.confirm).toHaveBeenCalledWith({ orderId: 91 });
    expect(mocks.invalidate).toHaveBeenCalledTimes(2);
  });
});
