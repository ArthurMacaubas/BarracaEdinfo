import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, CheckCircle2, CircleDollarSign, Loader2 } from "lucide-react";
import React from "react";
import { toast } from "sonner";

type PendingPixItem = { id: number; orderId: number; productName: string; quantity: number; unitPrice: string; subtotal: string };
type PendingPix = { id: number; ticket: number; total: string; createdAt: Date; items: PendingPixItem[] };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function PixPaymentConfirmation() {
  const pending = trpc.operations.pendingPixPayments.useQuery(undefined, { refetchInterval: 5_000 });
  const utils = trpc.useUtils();
  const confirm = trpc.operations.confirmPixPayment.useMutation({
    onSuccess: result => {
      toast.success(result.alreadyConfirmed ? "Este PIX já havia sido confirmado." : `PIX do pedido #${result.order.ticket} confirmado.`);
      void utils.operations.pendingPixPayments.invalidate();
      void utils.operations.snapshot.invalidate();
    },
    onError: error => toast.error(`Não foi possível confirmar o PIX: ${error.message}`),
  });
  const orders = (pending.data ?? []) as PendingPix[];
  return <div className="fixed bottom-5 left-5 z-40 sm:bottom-7 sm:left-7"><Dialog><DialogTrigger asChild><Button type="button" variant="outline" className="h-12 rounded-2xl border-emerald-300 bg-emerald-50 px-5 font-black text-emerald-950 shadow-xl shadow-emerald-950/15 hover:bg-emerald-100"><BadgeCheck className="mr-2 h-4 w-4" />{orders.length ? `Confirmar PIX (${orders.length})` : "Confirmar pagamento PIX"}</Button></DialogTrigger><DialogContent className="max-w-xl border-stone-700 bg-stone-950 text-stone-50"><DialogHeader><DialogTitle className="font-display text-2xl">Confirmar pagamento PIX</DialogTitle><DialogDescription className="text-stone-300">Confira os itens, as quantidades e o valor recebido antes de confirmar. A ação é registrada na auditoria.</DialogDescription></DialogHeader><div className="mt-2 max-h-[55vh] space-y-3 overflow-y-auto pr-1">{pending.isLoading ? <div className="grid min-h-32 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-300" /></div> : orders.length ? orders.map(order => { const totalUnits = order.items.reduce((total, item) => total + item.quantity, 0); return <div key={order.id} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-300">PIX pendente</p><p className="mt-1 font-display text-xl font-bold">Pedido #{String(order.ticket).padStart(2, "0")}</p><p className="mt-1 text-xs text-stone-400">Criado às {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {totalUnits} unidade{totalUnits === 1 ? "" : "s"}</p></div><p className="rounded-xl bg-emerald-400 px-3 py-2 font-display text-lg font-bold text-emerald-950">{money.format(Number(order.total))}</p></div><div className="mt-4 overflow-hidden rounded-xl border border-white/10"><div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-stone-400"><span>Produtos</span><span>Qtd.</span><span>Subtotal</span></div>{order.items.length ? order.items.map(item => <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-white/10 px-3 py-2.5 text-sm"><span className="min-w-0 truncate font-semibold text-stone-100" title={item.productName}>{item.productName}</span><span className="font-bold text-stone-300">{item.quantity}×</span><span className="font-bold text-stone-100">{money.format(Number(item.subtotal))}</span></div>) : <p className="border-t border-white/10 px-3 py-3 text-sm text-stone-400">Itens não disponíveis para este pedido.</p>}</div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-stone-400">Total do pedido</p><Button disabled={confirm.isPending} onClick={() => confirm.mutate({ orderId: order.id })} className="h-11 rounded-xl bg-emerald-400 font-bold text-emerald-950 hover:bg-emerald-300">{confirm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" />Confirmar {money.format(Number(order.total))}</>}</Button></div></div>; }) : <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-7 text-center"><CircleDollarSign className="mx-auto h-8 w-8 text-emerald-300" /><p className="mt-3 font-bold">Nenhum PIX pendente</p><p className="mt-1 text-sm text-stone-400">Pedidos PIX aguardando conferência aparecerão aqui.</p></div>}</div></DialogContent></Dialog></div>;
}
