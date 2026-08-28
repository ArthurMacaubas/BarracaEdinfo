import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { downloadReceiptPdf } from "@/lib/receiptPdf";
import { BadgeCheck, CheckCircle2, CircleDollarSign, Download, FileDown, Loader2, MessageCircle, Printer } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

type PendingPixItem = { id: number; orderId: number; productName: string; quantity: number; unitPrice: number; subtotal: number };
type PendingPix = { id: number; ticket: number; total: number; paymentMethod: string; createdAt: Date; items: PendingPixItem[] };
type PixReceipt = PendingPix & { pixConfirmedAt: Date };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character); }
function totalUnits(order: PendingPix) { return order.items.reduce((total, item) => total + item.quantity, 0); }

function downloadReceipt(receipt: PixReceipt) {
  const content = JSON.stringify({ type: "COMPROVANTE_PIX_CONFIRMADO", ticket: receipt.ticket, total: Number(receipt.total), createdAt: new Date(receipt.createdAt).toISOString(), pixConfirmedAt: new Date(receipt.pixConfirmedAt).toISOString(), items: receipt.items.map(item => ({ product: item.productName, quantity: item.quantity, unitPrice: Number(item.unitPrice), subtotal: Number(item.subtotal) })) }, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `comprovante-pix-pedido-${String(receipt.ticket).padStart(2, "0")}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  toast.success("Download do comprovante iniciado.");
}

function printReceipt(receipt: PixReceipt) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) { toast.error("Permita pop-ups para imprimir o comprovante."); return; }
  const rows = receipt.items.map(item => `<tr><td>${escapeHtml(item.productName)}</td><td>${item.quantity}×</td><td>${money.format(Number(item.subtotal))}</td></tr>`).join("");
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comprovante PIX — Pedido #${receipt.ticket}</title><style>body{font-family:Arial,sans-serif;color:#1c1917;margin:32px;max-width:520px}h1{font-size:22px;margin:0}p{margin:6px 0;color:#57534e}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border-bottom:1px solid #d6d3d1;padding:10px 4px;text-align:left}th{font-size:11px;text-transform:uppercase;color:#78716c}.total{font-size:20px;font-weight:700;margin-top:18px}.ok{color:#047857;font-weight:700}</style></head><body><h1>Barraca Agostina — IFRO Vilhena</h1><p>Comprovante de pagamento PIX</p><p><strong>Pedido #${String(receipt.ticket).padStart(2, "0")}</strong></p><p class="ok">Pagamento confirmado em ${dateTime.format(new Date(receipt.pixConfirmedAt))}</p><table><thead><tr><th>Produto</th><th>Qtd.</th><th>Subtotal</th></tr></thead><tbody>${rows}</tbody></table><p>${totalUnits(receipt)} unidade${totalUnits(receipt) === 1 ? "" : "s"} no pedido</p><p class="total">Total: ${money.format(Number(receipt.total))}</p></body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
  toast.success("Janela de impressão aberta.");
}

function shareReceiptOnWhatsApp(receipt: PixReceipt) {
  const lines = receipt.items.map(item => `${item.quantity}× ${item.productName}`).join("; ");
  const message = `Comprovante PIX — Barraca Agostina\nPedido #${String(receipt.ticket).padStart(2, "0")}\nItens: ${lines}\nTotal: ${money.format(Number(receipt.total))}\nPagamento confirmado em ${dateTime.format(new Date(receipt.pixConfirmedAt))}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  toast.success("Abrindo o comprovante no WhatsApp.");
}

function ReceiptActions({ receipt, close }: { receipt: PixReceipt; close: () => void }) {
  return <div className="mt-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-300">Pagamento confirmado</p><p className="mt-1 font-display text-xl font-bold">Pedido #{String(receipt.ticket).padStart(2, "0")}</p><p className="mt-1 text-sm text-stone-300">{dateTime.format(new Date(receipt.pixConfirmedAt))} · {totalUnits(receipt)} unidade{totalUnits(receipt) === 1 ? "" : "s"}</p></div><p className="rounded-xl bg-emerald-400 px-3 py-2 font-display text-lg font-bold text-emerald-950">{money.format(Number(receipt.total))}</p></div><div className="mt-4 overflow-hidden rounded-xl border border-white/10"><div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-stone-400"><span>Produtos</span><span>Qtd.</span><span>Subtotal</span></div>{receipt.items.map(item => <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-white/10 px-3 py-2.5 text-sm"><span className="min-w-0 truncate font-semibold text-stone-100" title={item.productName}>{item.productName}</span><span className="font-bold text-stone-300">{item.quantity}×</span><span className="font-bold text-stone-100">{money.format(Number(item.subtotal))}</span></div>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><Button onClick={() => printReceipt(receipt)} variant="outline" className="rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"><Printer className="mr-2 h-4 w-4" />Imprimir</Button><Button onClick={() => downloadReceiptPdf(receipt, "comprovante-pix")} className="rounded-xl bg-emerald-400 font-bold text-emerald-950 hover:bg-emerald-300"><FileDown className="mr-2 h-4 w-4" />Baixar PDF</Button><Button onClick={() => downloadReceipt(receipt)} variant="outline" className="rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"><Download className="mr-2 h-4 w-4" />Baixar JSON</Button><Button onClick={() => shareReceiptOnWhatsApp(receipt)} className="rounded-xl bg-[#25D366] font-bold text-stone-950 hover:bg-[#1fb85a]"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</Button></div><Button onClick={close} variant="ghost" className="mt-2 w-full rounded-xl text-stone-300 hover:bg-white/10 hover:text-white">Voltar aos PIX pendentes</Button></div>;
}

export default function PixPaymentConfirmation() {
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<PixReceipt | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<number | null>(null);
  const pending = trpc.operations.pendingPixPayments.useQuery(undefined, { refetchInterval: 5_000 });
  const utils = trpc.useUtils();
  const confirm = trpc.operations.confirmPixPayment.useMutation({ onError: error => toast.error(`Não foi possível confirmar o PIX: ${error.message}`), onSettled: () => setConfirmingOrderId(null) });
  const orders = (pending.data ?? []) as PendingPix[];
  const closeDialog = (nextOpen: boolean) => { setOpen(nextOpen); if (!nextOpen) setReceipt(null); };
  const submitConfirmation = (order: PendingPix) => { setConfirmingOrderId(order.id); confirm.mutate({ orderId: order.id }, { onSuccess: result => { toast.success(result.alreadyConfirmed ? "Este PIX já havia sido confirmado." : `PIX do pedido #${result.order.ticket} confirmado.`); setReceipt({ ...order, pixConfirmedAt: result.order.pixConfirmedAt ?? new Date() }); void utils.operations.pendingPixPayments.invalidate(); void utils.operations.snapshot.invalidate(); } }); };
  return <div className="fixed bottom-5 left-5 z-40 sm:bottom-7 sm:left-7"><Dialog open={open} onOpenChange={closeDialog}><DialogTrigger asChild><Button type="button" variant="outline" className="h-12 rounded-2xl border-emerald-300 bg-emerald-50 px-5 font-black text-emerald-950 shadow-xl shadow-emerald-950/15 hover:bg-emerald-100"><BadgeCheck className="mr-2 h-4 w-4" />{orders.length ? `Confirmar PIX (${orders.length})` : "Confirmar pagamento PIX"}</Button></DialogTrigger><DialogContent className="max-w-xl border-stone-700 bg-stone-950 text-stone-50"><DialogHeader><DialogTitle className="font-display text-2xl">{receipt ? "Comprovante PIX" : "Confirmar pagamento PIX"}</DialogTitle><DialogDescription className="text-stone-300">{receipt ? "Você pode imprimir ou baixar o comprovante antes de voltar aos pedidos pendentes." : "Confira os itens, as quantidades e o valor recebido antes de confirmar. A ação é registrada na auditoria."}</DialogDescription></DialogHeader>{receipt ? <ReceiptActions receipt={receipt} close={() => setReceipt(null)} /> : <div className="mt-2 max-h-[55vh] space-y-3 overflow-y-auto pr-1">{pending.isLoading ? <div className="grid min-h-32 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-300" /></div> : orders.length ? orders.map(order => { const units = totalUnits(order); const isConfirming = confirm.isPending && confirmingOrderId === order.id; return <div key={order.id} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-300">PIX pendente</p><p className="mt-1 font-display text-xl font-bold">Pedido #{String(order.ticket).padStart(2, "0")}</p><p className="mt-1 text-xs text-stone-400">Criado às {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {units} unidade{units === 1 ? "" : "s"}</p></div><p className="rounded-xl bg-emerald-400 px-3 py-2 font-display text-lg font-bold text-emerald-950">{money.format(Number(order.total))}</p></div><div className="mt-4 overflow-hidden rounded-xl border border-white/10"><div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-stone-400"><span>Produtos</span><span>Qtd.</span><span>Subtotal</span></div>{order.items.length ? order.items.map(item => <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-white/10 px-3 py-2.5 text-sm"><span className="min-w-0 truncate font-semibold text-stone-100" title={item.productName}>{item.productName}</span><span className="font-bold text-stone-300">{item.quantity}×</span><span className="font-bold text-stone-100">{money.format(Number(item.subtotal))}</span></div>) : <p className="border-t border-white/10 px-3 py-3 text-sm text-stone-400">Itens não disponíveis para este pedido.</p>}</div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-stone-400">Total do pedido</p><Button disabled={confirm.isPending} onClick={() => submitConfirmation(order)} className="h-11 min-w-[198px] rounded-xl bg-emerald-400 font-bold text-emerald-950 hover:bg-emerald-300">{isConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirmando pagamento…</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Confirmar {money.format(Number(order.total))}</>}</Button></div></div>; }) : <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-7 text-center"><CircleDollarSign className="mx-auto h-8 w-8 text-emerald-300" /><p className="mt-3 font-bold">Nenhum PIX pendente</p><p className="mt-1 text-sm text-stone-400">Pedidos PIX aguardando conferência aparecerão aqui.</p></div>}</div>}</DialogContent></Dialog></div>;
}
