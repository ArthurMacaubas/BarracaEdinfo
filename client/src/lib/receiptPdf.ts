import { jsPDF } from "jspdf";
import { toast } from "sonner";

export type ReceiptPdfOrder = { ticket: number; total: number; paymentMethod: string; createdAt: Date; pixConfirmedAt?: Date | null; items: Array<{ productName: string; quantity: number; subtotal: number }> };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function downloadReceiptPdf(order: ReceiptPdfOrder, prefix = "comprovante-pedido") {
  const toastId = `pdf-${prefix}-${order.ticket}`;
  toast.loading("Gerando comprovante em PDF…", { id: toastId });
  const pdf = new jsPDF({ unit: "mm", format: "a5" });
  let y = 17;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); pdf.text("Barraca Agostina — IFRO Vilhena", 14, y); y += 9;
  pdf.setFontSize(13); pdf.text(`Comprovante do pedido #${String(order.ticket).padStart(2, "0")}`, 14, y); y += 8;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text(`Data: ${new Date(order.createdAt).toLocaleString("pt-BR")}`, 14, y); y += 6;
  pdf.text(`Pagamento: ${order.paymentMethod}${order.pixConfirmedAt ? ` · PIX confirmado em ${new Date(order.pixConfirmedAt).toLocaleString("pt-BR")}` : ""}`, 14, y); y += 9;
  pdf.setDrawColor(210); pdf.line(14, y, 134, y); y += 7;
  order.items.forEach(item => { const line = `${item.quantity}× ${item.productName}`; pdf.setFont("helvetica", "bold"); pdf.text(pdf.splitTextToSize(line, 85), 14, y); pdf.setFont("helvetica", "normal"); pdf.text(money.format(Number(item.subtotal)), 134, y, { align: "right" }); y += 7; if (y > 185) { pdf.addPage(); y = 17; } });
  y += 4; pdf.line(14, y, 134, y); y += 9; pdf.setFont("helvetica", "bold"); pdf.setFontSize(15); pdf.text(`Total: ${money.format(Number(order.total))}`, 134, y, { align: "right" });
  pdf.save(`${prefix}-${String(order.ticket).padStart(2, "0")}.pdf`);
  toast.success("Comprovante PDF gerado.", { id: toastId });
}
