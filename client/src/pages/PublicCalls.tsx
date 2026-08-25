import { visibleSponsors } from "@/lib/publicCampaign";
import { getManualPublicPixPayload, publicPixCampaign, type PixSetting } from "@/lib/pixPayload";
import { trpc } from "@/lib/trpc";
import QRCode from "qrcode";
import { BellRing, Flame, Gift, QrCode, Sparkles, Target, Wifi, Zap } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import "./public-screen.css";

type Sponsor = { id: number; name: string; imageUrl: string };
type GoalAlert = { id: number; goalAmount?: string; salesAtTrigger?: string; unitsAtTrigger?: number; message: string; goal?: { name: string; targetUnits: number } | null };
type PixCampaign = { id: number; orderId?: number; ticket: number; pixPayload: string; activeUntil: Date };
type PixOrder = { id: number; pixConfirmedAt: Date | null };

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function PublicCalls() {
  const [, setLocation] = useLocation();
  const snapshot = trpc.operations.snapshot.useQuery(undefined, { refetchInterval: 500 });
  const previewParams = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
  const preview = previewParams?.get("preview") ?? null;
  const [previewPixActiveUntil] = useState(() => new Date(Date.now() + 20_000));
  const previewSponsors: Sponsor[] = previewParams?.get("sponsors") === "1" ? [
    { id: -101, name: "Apoiador 1", imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='160'%3E%3Crect width='100%25' height='100%25' rx='18' fill='%23fff7e7'/%3E%3Ctext x='200' y='92' text-anchor='middle' font-family='Georgia' font-weight='700' font-size='36' fill='%239c321e'%3EAPOIADOR 1%3C/text%3E%3C/svg%3E" },
    { id: -102, name: "Apoiador 2", imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='160'%3E%3Crect width='100%25' height='100%25' rx='18' fill='%23b45309'/%3E%3Ctext x='200' y='92' text-anchor='middle' font-family='Georgia' font-weight='700' font-size='36' fill='%23fff7e7'%3EAPOIADOR 2%3C/text%3E%3C/svg%3E" },
    { id: -103, name: "Apoiador 3", imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='160'%3E%3Crect width='100%25' height='100%25' rx='18' fill='%231f6f5b'/%3E%3Ctext x='200' y='92' text-anchor='middle' font-family='Georgia' font-weight='700' font-size='36' fill='%23fff7e7'%3EAPOIADOR 3%3C/text%3E%3C/svg%3E" },
  ] : [];
  const sponsors = visibleSponsors((previewSponsors.length ? previewSponsors : snapshot.data?.sponsors ?? []) as (Sponsor & { enabled?: boolean })[]);
  const goalAlert = (preview === "goal" ? { id: -1, unitsAtTrigger: 50, message: "Pesa o cachorro-quente no local de retirada.", goal: { name: "50 completos", targetUnits: 50 } } : snapshot.data?.goalAlert) as GoalAlert | null | undefined;
  const pixCampaign = (preview === "pix" ? { id: -1, ticket: 99, pixPayload: "00020101021226260014br.gov.bcb.pix0104test5204000053039865802BR5903ABC6003RIO62070503***6304ABCD", activeUntil: previewPixActiveUntil } : snapshot.data?.pixCampaign) as PixCampaign | null | undefined;
  const settings = (snapshot.data?.settings ?? []) as PixSetting[];
  const manualPixPayload = getManualPublicPixPayload(settings);
  const manualPixCampaign = manualPixPayload ? { id: -2, orderId: undefined, ticket: null, pixPayload: manualPixPayload, activeUntil: new Date(Date.now() + 60_000) } : null;
  const activePixCampaign = preview === "pix" ? (previewParams?.get("pixPublic") !== "0" ? pixCampaign : null) : preview ? null : manualPixCampaign ?? publicPixCampaign(pixCampaign, settings);
  const [qrSource, setQrSource] = useState("");
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const previewWelcome = previewParams?.get("welcome") === "1";
  const pixOrder = ((snapshot.data?.orders ?? []) as PixOrder[]).find(order => order.id === activePixCampaign?.orderId);
  const pixConfirmed = previewParams?.get("pixConfirmed") === "1" || Boolean(pixOrder?.pixConfirmedAt);
  const remainingSeconds = activePixCampaign?.ticket ? Math.max(0, Math.ceil((new Date(activePixCampaign.activeUntil).getTime() - clock) / 1_000)) : null;

  useEffect(() => {
    if (!activePixCampaign?.ticket) return;
    const timer = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [activePixCampaign?.id, activePixCampaign?.ticket]);

  useEffect(() => {
    if (!activePixCampaign?.pixPayload) {
      setQrSource("");
      return;
    }
    void QRCode.toDataURL(activePixCampaign.pixPayload, { width: 520, margin: 1, color: { dark: "#311111", light: "#fffaf0" } }).then(setQrSource).catch(() => setQrSource(""));
  }, [activePixCampaign?.pixPayload]);

  const shouldWelcome = previewWelcome || (!preview && !goalAlert && !activePixCampaign);
  useEffect(() => {
    if (previewWelcome) {
      setWelcomeVisible(true);
      return;
    }
    if (!shouldWelcome) {
      setWelcomeVisible(false);
      return;
    }
    setWelcomeVisible(true);
    const timeout = window.setTimeout(() => setWelcomeVisible(false), 5200);
    return () => window.clearTimeout(timeout);
  }, [previewWelcome, shouldWelcome]);

  const mode = goalAlert ? "goal" : activePixCampaign ? "pix" : "promotion";

  return <main className="public-stage public-hotdog-screen min-h-screen overflow-hidden text-[#fff8e8]">
    <div className="hotdog-layout">
      <header className="hotdog-header">
        <div className="hotdog-brand"><div className="brand-stamp"><HotDogIcon className="h-6 w-6" /></div><div><p className="brand-name">Barraca Agostina</p><p className="brand-subtitle">CACHORRO-QUENTE • IFRO VILHENA</p></div></div>
        <div className="hotdog-status"><span /><strong>Barraca aberta</strong><small>quente direto da chapa</small></div>
        <button className="hotdog-back" onClick={() => setLocation("/")}>Operação <span>↗</span></button>
      </header>

      <section className={`public-canvas hotdog-stage ${mode}`}>
        <div className="ketchup-swipe" aria-hidden="true" />
        <HotDogIllustration />
        {mode === "goal" ? <GoalAnnouncement key={goalAlert!.id} goalAlert={goalAlert!} /> : mode === "pix" ? <PixAnnouncement campaign={activePixCampaign!} qrSource={qrSource} remainingSeconds={remainingSeconds} confirmed={pixConfirmed} /> : <PromotionAnnouncement />}
        {welcomeVisible ? <WelcomeOverlay persistent={previewWelcome} onDismiss={() => setWelcomeVisible(false)} /> : null}
      </section>

      <footer className="sponsor-spotlight">
        <div className="sponsor-intro"><span><Sparkles className="h-4 w-4" />Nossos parceiros</span><strong>QUEM FAZ<br />A FESTA</strong><small><Wifi className="h-3.5 w-3.5" />Painel conectado</small></div>
        <SponsorCarousel sponsors={sponsors} />
      </footer>
    </div>
  </main>;
}

function HotDogIllustration() { return <div className="hotdog-illustration" aria-hidden="true"><span className="hotdog-bun top" /><span className="hotdog-sausage" /><span className="hotdog-mustard" /><span className="hotdog-ketchup" /><span className="hotdog-bun bottom" /><span className="hotdog-spark one" /><span className="hotdog-spark two" /><span className="hotdog-spark three" /></div>; }

function HotDogIcon({ className }: { className?: string }) { return <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true"><path d="M4 12c0-4 3-7 7-7h10c4 0 7 3 7 7v8c0 4-3 7-7 7H11c-4 0-7-3-7-7v-8Z" fill="currentColor" opacity=".34" /><path d="M4 14c0-3 3-5 7-5h10c4 0 7 2 7 5v4c0 3-3 5-7 5H11c-4 0-7-2-7-5v-4Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M8 16h16" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" /><path d="M10 13.5c1.5-1.4 3-1.4 4.5 0s3 1.4 4.5 0 3-1.4 4.5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }

function WelcomeOverlay({ onDismiss, persistent }: { onDismiss: () => void; persistent: boolean }) { return <div className={`welcome-overlay${persistent ? " welcome-preview" : ""}`}><div className="welcome-card"><div className="welcome-steam"><i /><i /><i /></div><div className="welcome-icon"><Flame className="h-10 w-10" /></div><p className="welcome-kicker">CHEGOU A HORA DO LANCHE</p><h1>BEM-VINDOS<br />À NOSSA <em>BARRACA!</em></h1><p className="welcome-copy">Cachorro-quente quentinho, feito na hora e preparado com carinho.</p><button onClick={onDismiss}>Vamos começar <span>→</span></button></div></div>; }

function GoalAnnouncement({ goalAlert }: { goalAlert: GoalAlert }) { const unitGoal = goalAlert.goal; const value = unitGoal ? `${unitGoal.targetUnits} UNID.` : money.format(Number(goalAlert.goalAmount)); return <div className="goal-show relative z-10"><div className="goal-copy"><span className="stage-label"><Target className="h-4 w-4" />{unitGoal ? unitGoal.name : "Meta do lanche"}</span><h1 className="goal-title">META<br /><em>BATIDA!</em></h1><div className="goal-value">{value}</div><div className="goal-message"><span>{unitGoal ? `${goalAlert.unitsAtTrigger ?? unitGoal.targetUnits} unidades contabilizadas` : "AVISO"}</span><p>{goalAlert.message || "Pesa o cachorro-quente no local de retirada."}</p></div><p className="goal-siren"><Zap className="h-4 w-4" />A sirene vai tocar!</p></div><div className="goal-side"><div className="goal-bell"><BellRing className="h-16 w-16" /></div><span>COMEMORE<br />COM A GENTE</span></div><ConfettiBurst /></div>; }

function PromotionAnnouncement() { return <div className="promotion-announcement promotion-show relative z-10"><span className="stage-label"><Gift className="h-4 w-4" />Desafio da barraca</span><h1>PREPARE-SE<br /><em>PARA A SIRENE!</em></h1><div className="promotion-reward"><span className="reward-sticker">GRÁTIS</span><p>O primeiro a chegar à retirada quando a sirene tocar ganha um cachorro-quente.</p></div><p className="promotion-note">Fique de olho no painel. A surpresa pode chegar a qualquer hora.</p></div>; }

function PixAnnouncement({ campaign, qrSource, remainingSeconds, confirmed }: { campaign: Omit<PixCampaign, "ticket"> & { ticket: number | null }; qrSource: string; remainingSeconds: number | null; confirmed: boolean }) { return <div className="pix-show relative z-10"><div className="pix-copy"><span className="stage-label"><QrCode className="h-4 w-4" />Pagamento rápido</span><h1>PIX<br /><em>NA HORA.</em></h1><p className="pix-caption">{campaign.ticket ? <>Pedido <strong>#{String(campaign.ticket).padStart(2, "0")}</strong> confirmado.</> : <>PIX liberado pelo caixa.</>} Escaneie o QR Code e conclua o pagamento.</p><span className="pix-dynamic-note"><span />QR Code dinâmico e atualizado</span>{remainingSeconds !== null ? <div className="pix-countdown"><div className="pix-countdown-ring" style={{ "--progress": `${Math.max(0, Math.min(1, remainingSeconds / 20))}` } as CSSProperties}><strong>{remainingSeconds}</strong><small>s</small></div><div><strong>QR disponível</strong><p>O código fecha automaticamente em {remainingSeconds} segundos.</p></div></div> : null}<div className={confirmed ? "pix-payment-status confirmed" : "pix-payment-status pending"}>{confirmed ? <><CheckCircle2Icon />Pagamento confirmado no caixa.</> : <>Aguardando confirmação do pagamento no caixa.</>}</div></div><div className="pix-qr-frame"><div className="pix-qr-head"><Sparkles className="h-4 w-4" />Aponte a câmera</div><div className="pix-qr-shell">{qrSource ? <img src={qrSource} alt="QR Code PIX dinâmico" /> : <QrCode className="h-16 w-16 text-[#311111]" />}<i className="pix-scan-line" /></div><small>Pagamento via PIX</small></div></div>; }

function SponsorCarousel({ sponsors }: { sponsors: Sponsor[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    setActiveIndex(0);
    if (sponsors.length < 2) return;
    const timer = window.setInterval(() => setActiveIndex(current => (current + 1) % sponsors.length), 6_000);
    return () => window.clearInterval(timer);
  }, [sponsors.length]);
  const visible = sponsors.slice(0, Math.min(3, sponsors.length)).map((_, offset) => sponsors[(activeIndex + offset) % sponsors.length]);
  if (!visible.length) return <div className="sponsor-viewport"><p className="empty-sponsors">Este espaço é dos parceiros da Barraca Agostina.</p></div>;
  return <div className="sponsor-viewport"><div className="sponsor-three-grid">{visible.map((sponsor, index) => <article key={`${sponsor.id}-${activeIndex}`} className={`sponsor-tile sponsor-tile-${index}`}><img src={sponsor.imageUrl} alt={`Patrocinador ${sponsor.name}`} /><p>{sponsor.name}</p></article>)}</div>{sponsors.length > 3 ? <div className="sponsor-dots" aria-label={`Grupo ${activeIndex + 1} de ${sponsors.length}`}>{sponsors.map((sponsor, index) => <span key={sponsor.id} className={index === activeIndex ? "active" : ""} />)}</div> : null}</div>;
}

function CheckCircle2Icon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.4 9.2 17 19 7" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

function ConfettiBurst() { const colors = ["#f9c74f", "#ef476f", "#90be6d", "#fff8e8", "#f77f00"]; return <div className="confetti-burst" aria-hidden="true">{Array.from({ length: 46 }, (_, index) => { const style = { left: `${(index * 37) % 100}%`, top: `${6 + ((index * 29) % 28)}%`, backgroundColor: colors[index % colors.length], "--drift": `${((index * 47) % 220) - 110}px`, "--delay": `${(index % 11) * 45}ms`, "--turn": `${(index % 2 ? 1 : -1) * (120 + (index % 5) * 35)}deg` } as CSSProperties; return <span key={index} className={index % 3 === 0 ? "confetti-piece confetti-ribbon" : "confetti-piece"} style={style} />; })}</div>; }
