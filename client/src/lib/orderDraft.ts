export function readActiveCart(): Record<number, number> {
  try {
    const stored = JSON.parse(localStorage.getItem("barraca-active-order-cart") ?? "{}");
    if (!stored || typeof stored !== "object") return {};
    return Object.fromEntries(
      Object.entries(stored)
        .filter(([id, quantity]) => Number.isInteger(Number(id)) && Number.isInteger(quantity) && Number(quantity) > 0)
        .map(([id, quantity]) => [Number(id), Number(quantity)]),
    );
  } catch {
    return {};
  }
}

export function readActivePayment(): "PIX" | "CASH" | "CARD" {
  const value = localStorage.getItem("barraca-active-order-payment");
  return value === "CASH" || value === "CARD" ? value : "PIX";
}
