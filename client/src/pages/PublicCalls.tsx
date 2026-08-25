import { trpc } from "@/lib/trpc";
import { ChefHat, Clock3, Volume2, Wifi } from "lucide-react";
import { useLocation } from "wouter";

type PublicOrder = { id: number; ticket: number; status: "NEW" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED"; createdAt: Date };
const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export default function PublicCalls() {
  const [, setLocation] = useLocation();
  const snapshot = trpc.operations.snapshot.useQuery(undefined, { refetchInterval: 3000 });
  const ready = ((snapshot.data?.orders ?? []) as PublicOrder[]).filter(order => order.status === "READY");
  const current = ready[0];
  const history = ready.slice(1, 6);

  return (
    <main className="paper-grid min-h-screen overflow-hidden bg-[#21130f] p-6 text-white lg:p-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1800px] flex-col">
        <header className="flex items-center justify-between border-b border-white/15 pb-6">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-400 text-stone-950"><ChefHat className="h-7 w-7" /></div>
            <div><p className="font-display text-2xl font-bold">Barraca Agostina</p><p className="text-sm font-bold uppercase tracking-[.18em] text-orange-300">IFRO • Vilhena</p></div>
          </div>
          <button onClick={() => setLocation("/")} className="hidden rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-stone-200 hover:bg-white/10 md:block">Voltar à operação</button>
        </header>
        <section className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-extrabold uppercase tracking-[.26em] text-orange-300">Senha chamada</p>
          {current ? <>
            <div className="mt-7 grid h-[min(42vw,460px)] w-[min(62vw,650px)] place-items-center rounded-[3.5rem] border border-orange-300/30 bg-[radial-gradient(circle_at_50%_25%,rgba(255,197,101,.32),transparent_32%),linear-gradient(145deg,#9c321e,#5c1b14)] shadow-[0_0_100px_rgba(206,90,39,.3)]"><span className="font-display text-[min(30vw,300px)] font-bold leading-none text-[#fff7e7]">{String(current.ticket).padStart(2, "0")}</span></div>
            <h1 className="font-display mt-9 text-4xl font-bold md:text-6xl">Seu pedido está pronto!</h1>
            <p className="mt-4 flex items-center gap-2 text-lg text-stone-300"><Volume2 className="h-5 w-5 text-orange-300" />Aguarde a entrega no balcão.</p>
          </> : <>
            <div className="mt-8 grid h-52 w-52 place-items-center rounded-[3rem] border border-dashed border-white/20 bg-white/5"><Clock3 className="h-16 w-16 text-orange-300" /></div>
            <h1 className="font-display mt-8 text-4xl font-bold md:text-6xl">Aguardando o próximo pedido</h1>
            <p className="mt-4 text-lg text-stone-300">As senhas prontas aparecerão aqui.</p>
          </>}
        </section>
        <footer className="grid gap-5 border-t border-white/15 pt-6 md:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><Wifi className="h-4 w-4" />Painel conectado</div>
          <div className="flex flex-wrap justify-start gap-3 md:justify-end">
            {history.length ? history.map(order => <div key={order.id} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3"><p className="text-xs font-bold uppercase tracking-[.12em] text-stone-400">Pronto às {time.format(new Date(order.createdAt))}</p><p className="font-display text-2xl font-bold text-orange-200">#{String(order.ticket).padStart(2, "0")}</p></div>) : <p className="text-sm text-stone-400">Histórico de chamadas aparecerá nesta área.</p>}
          </div>
        </footer>
      </div>
    </main>
  );
}
