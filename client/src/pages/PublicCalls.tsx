import { visibleSponsors } from "@/lib/publicCampaign";
import { getManualPublicPixPayload, publicPixCampaign, type PixSetting } from "@/lib/pixPayload";
import { trpc } from "@/lib/trpc";
import QRCode from "qrcode";
import { BellRing, ChefHat, Flame, Gift, QrCode, Sparkles, Target, Wifi, Zap } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import "./public-screen.css";

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
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const previewWelcome = previewParams?.get("welcome") === "1";

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
        <div className="hotdog-brand"><div className="brand-stamp"><ChefHat className="h-6 w-6" /></div><div><p className="brand-name">Barraca Agostina</p><p className="brand-subtitle">CACHORRO-QUENTE • IFRO VILHENA</p></div></div>
        <div className="hotdog-status"><span /><strong>Barraca aberta</strong><small>quente direto da chapa</small></div>
        <button className="hotdog-back" onClick={() => setLocation("/")}>Operação <span>↗</span></button>
      </header>

      <section className={`public-canvas hotdog-stage ${mode}`}>
        <div className="ketchup-swipe" aria-hidden="true" />
        <HotDogIllustration />
        {mode === "goal" ? <GoalAnnouncement key={goalAlert!.id} goalAlert={goalAlert!} /> : mode === "pix" ? <PixAnnouncement campaign={activePixCampaign!} qrSource={qrSource} /> : <PromotionAnnouncement />}
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

function WelcomeOverlay({ onDismiss, persistent }: { onDismiss: () => void; persistent: boolean }) { return <div className={`welcome-overlay${persistent ? " welcome-preview" : ""}`}><div className="welcome-card"><div className="welcome-steam"><i /><i /><i /></div><div className="welcome-icon"><Flame className="h-10 w-10" /></div><p className="welcome-kicker">CHEGOU A HORA DO LANCHE</p><h1>BEM-VINDOS<br />À NOSSA <em>BARRACA!</em></h1><p className="welcome-copy">Cachorro-quente quentinho, feito na hora e preparado com carinho.</p><button onClick={onDismiss}>Vamos começar <span>→</span></button></div></div>; }

function GoalAnnouncement({ goalAlert }: { goalAlert: GoalAlert }) { return <div className="goal-show relative z-10"><div className="goal-copy"><span className="stage-label"><Target className="h-4 w-4" />Meta do lanche</span><h1 className="goal-title">META<br /><em>BATIDA!</em></h1><div className="goal-value">{money.format(Number(goalAlert.goalAmount))}</div><div className="goal-message"><span>AVISO</span><p>{goalAlert.message || "Pesa o cachorro-quente no local de retirada."}</p></div><p className="goal-siren"><Zap className="h-4 w-4" />A sirene vai tocar!</p></div><div className="goal-side"><div className="goal-bell"><BellRing className="h-16 w-16" /></div><span>COMEMORE<br />COM A GENTE</span></div><ConfettiBurst /></div>; }

function PromotionAnnouncement() { return <div className="promotion-announcement promotion-show relative z-10"><span className="stage-label"><Gift className="h-4 w-4" />Desafio da barraca</span><h1>PREPARE-SE<br /><em>PARA A SIRENE!</em></h1><div className="promotion-reward"><span className="reward-sticker">GRÁTIS</span><p>O primeiro a chegar à retirada quando a sirene tocar ganha um cachorro-quente.</p></div><p className="promotion-note">Fique de olho no painel. A surpresa pode chegar a qualquer hora.</p></div>; }

function PixAnnouncement({ campaign, qrSource }: { campaign: Omit<PixCampaign, "ticket"> & { ticket: number | null }; qrSource: string }) { return <div className="pix-show relative z-10"><div className="pix-copy"><span className="stage-label"><QrCode className="h-4 w-4" />Pagamento rápido</span><h1>PIX<br /><em>NA HORA.</em></h1><p className="pix-caption">{campaign.ticket ? <>Pedido <strong>#{String(campaign.ticket).padStart(2, "0")}</strong> confirmado.</> : <>PIX liberado pelo caixa.</>} Escaneie o QR Code e conclua o pagamento.</p><span className="pix-dynamic-note"><span />QR Code dinâmico e atualizado</span></div><div className="pix-qr-frame"><div className="pix-qr-head"><Sparkles className="h-4 w-4" />Aponte a câmera</div><div className="pix-qr-shell">{qrSource ? <img src={qrSource} alt="QR Code PIX dinâmico" /> : <QrCode className="h-16 w-16 text-[#311111]" />}<i className="pix-scan-line" /></div><small>Pagamento via PIX</small></div></div>; }

function SponsorCarousel({ sponsors }: { sponsors: Sponsor[] }) { const items = sponsors.length > 1 ? [...sponsors, ...sponsors] : sponsors; return <div className="sponsor-viewport">{items.length ? <div className={sponsors.length > 1 ? "sponsor-track" : "flex h-full items-center justify-center"}>{items.map((sponsor, index) => <div key={`${sponsor.id}-${index}`} className="sponsor-card"><img src={sponsor.imageUrl} alt={`Patrocinador ${sponsor.name}`} className="object-contain" /></div>)}</div> : <p className="empty-sponsors">Este espaço é dos parceiros da Barraca Agostina.</p>}</div>; }

function ConfettiBurst() { const colors = ["#f9c74f", "#ef476f", "#90be6d", "#fff8e8", "#f77f00"]; return <div className="confetti-burst" aria-hidden="true">{Array.from({ length: 46 }, (_, index) => { const style = { left: `${(index * 37) % 100}%`, top: `${6 + ((index * 29) % 28)}%`, backgroundColor: colors[index % colors.length], "--drift": `${((index * 47) % 220) - 110}px`, "--delay": `${(index % 11) * 45}ms`, "--turn": `${(index % 2 ? 1 : -1) * (120 + (index % 5) * 35)}deg` } as CSSProperties; return <span key={index} className={index % 3 === 0 ? "confetti-piece confetti-ribbon" : "confetti-piece"} style={style} />; })}</div>; }
