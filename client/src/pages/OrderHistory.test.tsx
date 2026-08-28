// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OrderHistory from "./OrderHistory";

const mocks = vi.hoisted(() => ({ toastSuccess: vi.fn(), navigate: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { operations: { orderHistory: { useQuery: () => ({ isLoading: false, data: [{ id: 5, ticket: 8, total: "25.00", status: "DELIVERED", paymentMethod: "PIX", createdAt: new Date("2026-08-27T16:00:00Z"), pixConfirmedAt: new Date("2026-08-27T16:02:00Z"), items: [{ id: 1, productName: "Completo", quantity: 1, unitPrice: "15.00", subtotal: "15.00" }, { id: 2, productName: "Suco", quantity: 2, unitPrice: "5.00", subtotal: "10.00" }] }] }) } } } }));
vi.mock("wouter", () => ({ useLocation: () => ["/historico", mocks.navigate] }));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: vi.fn() } }));

describe("OrderHistory", () => {
  beforeEach(() => { mocks.toastSuccess.mockReset(); mocks.navigate.mockReset(); });
  afterEach(cleanup);

  it("mostra pedidos anteriores, abre o comprovante e baixa o arquivo", () => {
    const createObjectUrl = vi.fn().mockReturnValue("blob:history-receipt");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<OrderHistory />);

    expect(screen.getByText("Histórico de pedidos")).toBeTruthy();
    expect(screen.getByText("#08")).toBeTruthy();
    expect(screen.getByText(/3 unidades · PIX/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Comprovante" }));
    expect(screen.getByText("Pedido #08")).toBeTruthy();
    expect(screen.getByText("Completo")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Baixar comprovante" }));
    expect(createObjectUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Download do comprovante iniciado.");
  });
});
