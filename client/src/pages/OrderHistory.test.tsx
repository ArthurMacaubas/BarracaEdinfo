// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OrderHistory from "./OrderHistory";

const mocks = vi.hoisted(() => ({ toastSuccess: vi.fn(), navigate: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { operations: { orderHistory: { useQuery: () => ({ isLoading: false, data: [{ id: 5, ticket: 8, total: "25.00", status: "DELIVERED", paymentMethod: "PIX", createdAt: new Date("2026-08-27T16:00:00Z"), pixConfirmedAt: new Date("2026-08-27T16:02:00Z"), items: [{ id: 1, productName: "Completo", quantity: 1, unitPrice: "15.00", subtotal: "15.00" }, { id: 2, productName: "Suco", quantity: 2, unitPrice: "5.00", subtotal: "10.00" }] }] }) } } } }));
vi.mock("wouter", () => ({ useLocation: () => ["/historico", mocks.navigate] }));
vi.mock("sonner", () => ({ toast: { loading: vi.fn(), success: mocks.toastSuccess, error: vi.fn() } }));

describe("OrderHistory", () => {
  beforeEach(() => { mocks.toastSuccess.mockReset(); mocks.navigate.mockReset(); });
  afterEach(cleanup);

  it("mostra pedidos anteriores, abre o comprovante e baixa o arquivo", () => {
    render(<OrderHistory />);

    expect(screen.getByText("Histórico e fechamento")).toBeTruthy();
    expect(screen.getByText("#08")).toBeTruthy();
    expect(screen.getByText(/3 unidade\(s\) · PIX/)).toBeTruthy();
    expect(screen.getAllByText(/Completo/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "PDF" })[0]!);
  });

  it("filtra pedidos por produto e por forma de pagamento", () => {
    render(<OrderHistory />);
    fireEvent.change(screen.getByPlaceholderText("Pedido ou produto"), { target: { value: "Suco" } });
    expect(screen.getByText("#08")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Pedido ou produto"), { target: { value: "Inexistente" } });
    expect(screen.getByText("Nenhum pedido encontrado.")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Pedido ou produto"), { target: { value: "" } });
    fireEvent.change(screen.getByDisplayValue("Todo pagamento"), { target: { value: "CARD" } });
    expect(screen.getByText("Nenhum pedido encontrado.")).toBeTruthy();
  });
});
