import { visibleSponsors } from "@/lib/publicCampaign";
import { getManualPublicPixPayload, publicPixCampaign, type PixSetting } from "@/lib/pixPayload";
import { trpc } from "@/lib/trpc";
import QRCode from "qrcode";
import { BellRing, ChefHat, Gift, QrCode, Sparkles, Target, Wifi, Zap } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { useLocation } from "wouter";

type Sponsor = { id: number; name: string; imageUrl: string };
type GoalAlert = { id: number; goalAmount: string; salesAtTrigger: string; message: string };
type PixCampaign = { id: number; ticket: number; pixPayload: string; activeUntil: Date };

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function PublicCalls() {
  const [, setLocation] = useLocation();
  const snapshot = trpc.operations.snapshot.useQuery(undefined, { refetchInterval: 500 });
  const previewParams = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
  const preview = previewParams?.get("preview") ?? null;
  const previewSponsors: Sponsor[] = previewParams?.get("sponsors") === "1" ? [
    { id: -101, name: "Apoiador 1", imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='160'%3E%3Crect width='100%25' height='100%25' rx='18' fill='%23fff7e7'/%3E%3Ctext x='200' y='92' text-anchor='middle' font-family='Georgia' font-weight='700' font-size='36' fill='%239c321e'%3EAPOIADOR 1%3C/text%3E%3C/svg%3E" },
    { id: -102, name: "Apoiador 2", imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='160'%3E%3Crect width='100%25' height='100%25' rx='18' fill='%23b45309'%3EAPOIADOR 2%3C/text%3E%3C/svg%3E" },
    { id: -103, name: "Apoiador 3", imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='160'%3E%3Crect width='100%25' height='100%25' rx='18' fill='%231f6f5b'%3EAPOIADOR 3%3C/text%3E%3C/svg%3E" },
  ] : [];
  const sponsors = visibleSponsors((previewSponsors.length ? previewSponsors : snapshot.data?.sponsors ?? []) as (Sponsor & { enabled?: boolean })[]);
  const goalAlert = (preview === "goal" ? { id: -1, goalAmount: "500.00", salesAtTrigger: "500.00", message: "Pesa o cachorro-quente no local de retirada." } : snapshot.data?.goalAlert) as GoalAlert | null | undefined;
  const pixCampaign = (preview === "pix" ? { id: -1, ticket: 99, pixPayload: "00020101021226880014br.gov.bcb.pix2563pix.example.com/pagamento/ifro520400005303986540510.005802BR5913Barraca IFRO6008Vilhena62070503***6304ABCD", activeUntil: new Date(Date.now() + 45_000) } : snapshot.data?.pixCampaign) as PixCampaign | null | undefined;
  const settings = (snapshot.data?.settings ?? []) as PixSetting[];
  const manualPixPayload = getManualPublicPixPayload(settings);
  const manualPixCampaign = manualPixPayload ? { id: -2, ticket: null, pixPayload: manualPixPayload, activeUntil: new Date(Date.now() + 60_000) } : null;
  const activePixCampaign = preview === "pix" ? (previewParams?.get("pixPublic") !== "0" ? pixCampaign : null) : manualPixCampaign ?? publicPixCampaign(pixCampaign, settings);
  const [qrSource, setQrSource] = useState("");

  useEffect(() => {
    if (!activePixCampaign?.pixPayload) {
      setQrSource("");
      return;
    }
    void QRCode.toDataURL(activePixCampaign.pixPayload, { width: 460, margin: 1, color: { dark: "#07110e", light: "#fbf7ed" } })
      .then(setQrSource)
      .catch(() => setQrSource(""));
  }, [activePixCampaign?.pixPayload]);

  const mode = goalAlert ? "goal" : activePixCampaign ? "pix" : "promotion";

  return (
    <main className="public-stage public-festival min-h-screen overflow-hidden text-white">
      <div className="public-festival-shell">
        <header className="public-topbar">
          <div className="flex items-center gap-3">
            <div className="public-mark grid h-11 w-11 place-items-center rounded-2xl text-[#07110e]"><ChefHat className="h-6 w-6" /></div>
            <div>
              <p className="font-display text-xl font-black leading-none text-[#fbf7ed]">Barraca Agostina</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">IFRO · Vilhena</p>
            </div>
          </div>
          <div className="public-live-status"><span className="public-live-dot" />Evento ao vivo</div>
          <button onClick={() => setLocation("/")} className="public-back-button">Operação <span aria-hidden="true">↗</span></button>
        </header>

        <section className="public-canvas">
          <div className="public-canvas-grid" aria-hidden="true" />
          {mode === "goal" ? <GoalAnnouncement key={goalAlert!.id} goalAlert={goalAlert!} /> : mode === "pix" ? <PixAnnouncement campaign={activePixCampaign!} qrSource={qrSource} /> : <PromotionAnnouncement />}
        </section>

        <footer className="public-sponsor-deck">
          <div className="public-sponsor-label">
            <span className="inline-flex items-center gap-2 text-emerald-300"><Wifi className="h-4 w-4" />Conectado</span>
            <strong>APOIO<br />CULTURAL</strong>
          </div>
          <SponsorCarousel sponsors={sponsors} />
        </footer>
      </div>
    </main>
  );
}

function GoalAnnouncement({ goalAlert }: { goalAlert: GoalAlert }) {
  return <div className="goal-show relative z-10"><ConfettiBurst /><div className="goal-copy"><div className="public-kicker"><Zap className="h-4 w-4" />Alerta de conquista</div><p className="goal-title">META<br /><span>BATIDA.</span></p><div className="goal-value">{money.format(Number(goalAlert.goalAmount))}</div><div className="goal-message"><span>RETIRADA</span><p>{goalAlert.message || "Pesa o cachorro-quente no local de retirada."}</p></div></div><div className="goal-signal"><div className="goal-target"><Target className="h-20 w-20" /></div><p><span>PRÓXIMO SOM</span>Sirene da barraca</p><div className="signal-bars"><i /><i /><i /><i /><i /></div></div></div>;
}

function PromotionAnnouncement() {
  return <div className="promotion-announcement promo-show relative z-10"><div className="promo-orb"><BellRing className="h-12 w-12" /></div><div className="public-kicker"><Gift className="h-4 w-4" />Desafio relâmpago</div><h1 className="promo-title">A SIRENE VAI<br /><em>TOCAR.</em></h1><div className="promotion-reward"><span className="reward-number">01</span><p>O primeiro a chegar à retirada do cachorro-quente quando a sirene tocar ganha um <strong>gratuitamente.</strong></p></div><p className="promo-footnote">Fique atento. A surpresa pode acontecer a qualquer momento.</p></div>;
}

function PixAnnouncement({ campaign, qrSource }: { campaign: Omit<PixCampaign, "ticket"> & { ticket: number | null }; qrSource: string }) {
  return <div className="pix-show relative z-10"><div className="pix-copy"><div className="public-kicker"><Sparkles className="h-4 w-4" />Pagamento instantâneo</div><h1>PIX<br /><em>LIBERADO.</em></h1><div className="pix-caption">{campaign.ticket ? <>Pedido <strong>#{String(campaign.ticket).padStart(2, "0")}</strong> confirmado.</> : <>QR Code ativado pelo caixa.</>} Aponte a câmera e conclua o pagamento.</div></div><div className="pix-qr-frame"><span>ESCANEIE AQUI</span><div className="pix-qr-box">{qrSource ? <img src={qrSource} alt="QR Code PIX" /> : <QrCode className="h-16 w-16 text-[#07110e]" />}</div><small>Pagamento seguro via PIX</small></div></div>;
}

function SponsorCarousel({ sponsors }: { sponsors: Sponsor[] }) {
  const items = sponsors.length > 1 ? [...sponsors, ...sponsors] : sponsors;
  return <div className="sponsor-viewport">{items.length ? <div className={sponsors.length > 1 ? "sponsor-track" : "flex justify-center px-2"}>{items.map((sponsor, index) => <div key={`${sponsor.id}-${index}`} className="sponsor-card"><img src={sponsor.imageUrl} alt={`Patrocinador ${sponsor.name}`} className="object-contain" /></div>)}</div> : <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-[.18em] text-[#fbf7ed]/40">Espaço reservado aos apoiadores da festa</div>}</div>;
}

function ConfettiBurst() {
  const colors = ["#b7ff4a", "#ffb11b", "#57e6c1", "#fbf7ed", "#ff806b"];
  return <div className="confetti-burst" aria-hidden="true">{Array.from({ length: 50 }, (_, index) => {
    const drift = ((index * 47) % 260) - 130;
    const style = { left: `${(index * 37) % 100}%`, top: `${6 + ((index * 29) % 25)}%`, backgroundColor: colors[index % colors.length], "--drift": `${drift}px`, "--delay": `${(index % 11) * 45}ms`, "--turn": `${(index % 2 ? 1 : -1) * (120 + (index % 5) * 35)}deg` } as CSSProperties;
    return <span key={index} className={index % 3 === 0 ? "confetti-piece confetti-ribbon" : "confetti-piece"} style={style} />;
  })}</div>;
}
