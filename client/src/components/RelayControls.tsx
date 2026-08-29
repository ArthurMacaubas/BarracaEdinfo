import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Lightbulb, Loader2, Power, Siren, TimerReset } from "lucide-react";
import React from "react";
import { toast } from "sonner";

type RelayState = "ON" | "OFF" | "PENDING" | "UNKNOWN";
type Relay = { label: string; state: RelayState; detail: string; icon: typeof Lightbulb; action: React.ReactNode };
const copy: Record<RelayState, string> = { ON: "LIGADO", OFF: "DESLIGADO", PENDING: "ENVIANDO", UNKNOWN: "SEM LEITURA" };

function RelayCard({ relay }: { relay: Relay }) {
  const active = relay.state === "ON";
  const pending = relay.state === "PENDING";
  return <div className="rounded-2xl border border-stone-200 bg-[#fffdf8] p-4"><div className="flex items-start justify-between gap-3"><div className={cn("grid h-10 w-10 place-items-center rounded-xl", active ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-500")}><relay.icon className="h-5 w-5" /></div><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", active ? "bg-amber-100 text-amber-900" : pending ? "bg-blue-50 text-blue-700" : relay.state === "OFF" ? "bg-stone-100 text-stone-600" : "bg-rose-50 text-rose-700")}>{pending ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}{copy[relay.state]}</span></div><h3 className="mt-4 font-bold text-stone-900">{relay.label}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-stone-600">{relay.detail}</p><div className="mt-4">{relay.action}</div></div>;
}

export default function RelayControls() {
  const status = trpc.connectivity.status.useQuery(undefined, { refetchInterval: 1_000 });
  const utils = trpc.useUtils();
  const online = status.data?.hardware.state === "ONLINE";
  const refresh = () => void utils.connectivity.status.invalidate();
  const led = trpc.connectivity.setLedRelay.useMutation({ onSuccess: result => { toast.success(result.accepted.accepted ? "Comando da fita LED enviado." : "Comando da fita LED já está na fila."); refresh(); }, onError: error => toast.error(error.message) });
  const siren = trpc.connectivity.setSirenRelay.useMutation({ onSuccess: result => { toast.success(result.accepted.accepted ? "Comando da sirene enviado." : "Comando da sirene já está na fila."); refresh(); }, onError: error => toast.error(error.message) });
  const relays = status.data?.hardware.relays ?? { led: "UNKNOWN" as RelayState, siren: "UNKNOWN" as RelayState };
  const disabled = !online || led.isPending || siren.isPending;
  const cards: Relay[] = [{ label: "Relé da fita LED", state: relays.led, detail: online ? "Controle manual da iluminação da barraca." : "Conecte o controlador para liberar o acionamento.", icon: Lightbulb, action: <Button className="w-full rounded-xl" variant={relays.led === "ON" ? "outline" : "default"} disabled={disabled} onClick={() => led.mutate({ enabled: relays.led !== "ON" })}><Power className="mr-2 h-4 w-4" />{relays.led === "ON" ? "Desligar fita" : "Ligar fita"}</Button> }, { label: "Relé da sirene", state: relays.siren, detail: online ? "Usa a duração configurada no painel, com limite seguro de até 5 segundos." : "Conecte o controlador para liberar o acionamento.", icon: Siren, action: <div className="grid grid-cols-2 gap-2"><Button className="rounded-xl bg-[#9c321e] hover:bg-[#7f2819]" disabled={disabled} onClick={() => siren.mutate({ enabled: true })}><TimerReset className="mr-1.5 h-4 w-4" />Tocar duração configurada</Button><Button className="rounded-xl" variant="outline" disabled={disabled} onClick={() => siren.mutate({ enabled: false })}>Desligar</Button></div> }];
  return <section className="mt-6 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-stone-500">Saídas físicas</p><h2 className="font-display text-2xl font-bold text-stone-900">Controle dos relés</h2><p className="mt-1 text-sm text-stone-600">O estado é atualizado após o comando ser confirmado pela ponte do Arduino.</p></div><span className={cn("rounded-full px-3 py-1.5 text-xs font-black", online ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700")}>{online ? "CONTROLADOR ONLINE" : "CONTROLADOR OFFLINE"}</span></div><div className="mt-5 grid gap-4 md:grid-cols-2">{cards.map(relay => <RelayCard key={relay.label} relay={relay} />)}</div>{!online ? <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Os comandos manuais ficam bloqueados enquanto a ponte física não estiver conectada, para evitar estados enganosos.</p> : null}</section>;
}
