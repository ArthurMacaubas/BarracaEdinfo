import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import PublicPixToggle from "@/components/PublicPixToggle";
import { trpc } from "@/lib/trpc";
import { Pencil, Power, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Sponsor = { id: number; name: string; imageUrl: string; enabled: boolean; sortOrder: number };
type Setting = { key: string; value: string };

export default function SponsorControls({ sponsors, refresh }: { sponsors: Sponsor[]; refresh: () => void }) {
  return <><PixPayloadControl refresh={refresh} /><PublicPixToggle refresh={refresh} />{sponsors.length ? <SponsorManager sponsors={sponsors} refresh={refresh} /> : null}</>;
}

function PixPayloadControl({ refresh }: { refresh: () => void }) {
  const settingsQuery = trpc.operations.snapshot.useQuery(undefined, { refetchInterval: 6_000 });
  const settings = (settingsQuery.data?.settings ?? []) as Setting[];
  const savedValue = settings.find(setting => setting.key === "pix_payload")?.value ?? "";
  const savedUseOrderAmount = settings.find(setting => setting.key === "pix_amount_from_order")?.value !== "false";
  const savedFixedAmount = settings.find(setting => setting.key === "pix_fixed_amount")?.value ?? "";
  const [payload, setPayload] = useState("");
  const [useOrderAmount, setUseOrderAmount] = useState(true);
  const [fixedAmount, setFixedAmount] = useState("");
  const [dirty, setDirty] = useState(false);
  const save = trpc.operations.saveSetting.useMutation({
    onSuccess: () => { setDirty(false); toast.success("Código PIX copia e cola salvo com sucesso."); refresh(); },
    onError: error => toast.error(`Não foi possível salvar o PIX: ${error.message}`),
  });

  useEffect(() => { if (!dirty) { setPayload(savedValue); setUseOrderAmount(savedUseOrderAmount); setFixedAmount(savedFixedAmount); } }, [savedValue, savedUseOrderAmount, savedFixedAmount, dirty]);
  const submit = () => {
    const value = payload.trim();
    if (!value) { toast.error("Cole um código PIX antes de salvar."); return; }
    save.mutate({ key: "pix_payload", value });
    save.mutate({ key: "pix_amount_from_order", value: useOrderAmount ? "true" : "false" });
    save.mutate({ key: "pix_fixed_amount", value: fixedAmount.trim() || "0" });
  };

  return <section className="mt-6 rounded-[2rem] border border-orange-200 bg-[linear-gradient(135deg,_#fff7eb,_#fffdfa)] p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-orange-800">Pagamento</p><h2 className="font-display text-2xl font-bold text-stone-900">PIX copia e cola</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">Este é o código usado para gerar o QR Code automático do pedido PIX na tela pública durante 20 segundos.</p></div><div className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-900">{savedValue ? "Código configurado" : "Ainda não configurado"}</div></div><div className="mt-5"><Label htmlFor="pix-payload-direct">Código PIX “copia e cola”</Label><Textarea id="pix-payload-direct" value={payload} onChange={event => { setPayload(event.target.value); setDirty(true); }} placeholder="Cole aqui o código PIX completo da barraca" className="mt-2 min-h-28 resize-y border-orange-200 bg-white font-mono text-xs leading-5" /></div><div className="mt-4 flex items-center justify-between rounded-2xl border border-orange-200 bg-white px-4 py-3"><div><p className="text-sm font-bold text-stone-900">Usar o total do pedido no QR automático</p><p className="mt-1 text-xs leading-5 text-stone-500">Quando o payload é compatível com o padrão PIX, o QR recebe o valor fixo daquela comanda.</p></div><Switch checked={useOrderAmount} onCheckedChange={checked => { setUseOrderAmount(checked); setDirty(true); }} /></div><div className="mt-3"><Label htmlFor="pix-fixed-amount">Valor PIX fixo opcional (R$)</Label><Input id="pix-fixed-amount" type="number" min="0.01" step="0.01" disabled={useOrderAmount} value={fixedAmount} onChange={event => { setFixedAmount(event.target.value); setDirty(true); }} placeholder="Ex.: 15,00" className="mt-1 border-orange-200 bg-white disabled:cursor-not-allowed disabled:bg-stone-100" /><p className="mt-1 text-xs leading-5 text-stone-500">Desative o uso do total da comanda para usar este valor em todos os QR Codes automáticos.</p></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-stone-500">O valor é aplicado apenas ao QR automático de cada pedido. O QR manual continua usando o código configurado.</p><Button disabled={save.isPending || !payload.trim() || (!useOrderAmount && (!fixedAmount || Number(fixedAmount) <= 0))} onClick={submit} className="rounded-xl bg-[#9c321e] hover:bg-[#7f2819]">{save.isPending ? "Salvando código…" : <><Save className="mr-2 h-4 w-4" />Salvar código PIX</>}</Button></div></section>;
}

function SponsorManager({ sponsors, refresh }: { sponsors: Sponsor[]; refresh: () => void }) {
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const save = trpc.operations.saveSponsor.useMutation({ onSuccess: () => { toast.success("Patrocinador atualizado."); setEditing(null); refresh(); }, onError: error => toast.error(error.message) });
  return <section className="mt-6 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-stone-500">Gestão de mídia</p><h2 className="font-display text-2xl font-bold">Patrocinadores cadastrados</h2><p className="mt-1 text-sm text-stone-600">Edite a identificação ou retire uma marca do rodízio sem apagar seu cadastro.</p></div><div className="mt-5 grid gap-4 lg:grid-cols-2">{sponsors.map(item => <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"><div className="flex gap-4 p-4"><img src={item.imageUrl} alt={item.name} className="h-20 w-28 rounded-xl bg-white object-contain p-2" /><div className="min-w-0 flex-1"><p className="truncate font-bold text-stone-900">{item.name}</p><p className="mt-1 text-xs font-semibold text-stone-500">Ordem {item.sortOrder} · {item.enabled ? "No rodízio" : "Pausado"}</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(item)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button><Button size="sm" variant="outline" disabled={save.isPending} onClick={() => save.mutate({ id: item.id, name: item.name, imageUrl: item.imageUrl, enabled: !item.enabled, sortOrder: item.sortOrder })}><Power className="mr-1 h-3.5 w-3.5" />{item.enabled ? "Pausar" : "Ativar"}</Button></div></div></div></article>)}</div>{editing ? <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50/60 p-4"><p className="font-bold text-stone-900">Editar patrocinador</p><div className="mt-3 grid gap-3 md:grid-cols-2"><Input value={editing.name} onChange={event => setEditing(current => current ? { ...current, name: event.target.value } : current)} placeholder="Nome" /><Input value={editing.imageUrl} onChange={event => setEditing(current => current ? { ...current, imageUrl: event.target.value } : current)} placeholder="URL da imagem" /><Input type="number" min="0" value={editing.sortOrder} onChange={event => setEditing(current => current ? { ...current, sortOrder: Number(event.target.value) || 0 } : current)} placeholder="Ordem" /><div className="flex items-center justify-between rounded-xl border border-orange-200 bg-white px-3"><span className="text-sm font-bold">Exibir no rodízio</span><Switch checked={editing.enabled} onCheckedChange={enabled => setEditing(current => current ? { ...current, enabled } : current)} /></div></div><div className="mt-4 flex gap-3"><Button disabled={!editing.name || !editing.imageUrl || save.isPending} onClick={() => save.mutate(editing)} className="rounded-xl bg-[#9c321e] hover:bg-[#7f2819]">Salvar edição</Button><Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">Cancelar</Button></div></div> : null}</section>;
}
