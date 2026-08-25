import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getPixPayload, type PixSetting } from "@/lib/pixPayload";
import { trpc } from "@/lib/trpc";
import QRCode from "qrcode";
import { Check, Copy, QrCode, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PixQuickAccess() {
  const snapshot = trpc.operations.snapshot.useQuery(undefined, { refetchInterval: 5_000 });
  const preview = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
  const [open, setOpen] = useState(() => preview?.get("showPix") === "1");
  const [copied, setCopied] = useState(false);
  const [qrSource, setQrSource] = useState("");
  const savedPayload = getPixPayload((snapshot.data?.settings ?? []) as PixSetting[]);
  const pixPayload = savedPayload || (preview?.get("previewPix") ?? "");
  useEffect(() => { if (!pixPayload) { setQrSource(""); return; } void QRCode.toDataURL(pixPayload, { width: 440, margin: 1, color: { dark: "#180d09", light: "#fffdf7" } }).then(setQrSource).catch(() => setQrSource("")); }, [pixPayload]);
  const copy = async () => {
    if (!pixPayload) { toast.error("Nenhum código PIX foi configurado."); return; }
    try {
      await navigator.clipboard.writeText(pixPayload);
      setCopied(true);
      toast.success("Código PIX copiado.");
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o código para copiar.");
    }
  };

  return <div className="fixed bottom-5 right-5 z-40 sm:bottom-7 sm:right-7"><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button type="button" className="h-12 rounded-2xl bg-orange-400 px-5 font-black text-stone-950 shadow-xl shadow-orange-950/30 hover:bg-orange-300"><QrCode className="mr-2 h-4 w-4" />Mostrar QR Code PIX</Button></DialogTrigger><DialogContent className="max-w-xl border-stone-700 bg-stone-950 text-stone-50"><DialogHeader><DialogTitle className="font-display text-2xl">QR Code PIX</DialogTitle><DialogDescription className="text-stone-300">Aponte a câmera para este QR Code ou copie o código abaixo para orientar o pagamento no caixa.</DialogDescription></DialogHeader>{pixPayload ? <div className="mt-2 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center"><div className="rounded-3xl bg-[#fffdf7] p-3 shadow-[0_0_36px_rgba(251,146,60,.2)]">{qrSource ? <img src={qrSource} alt="QR Code PIX" className="h-52 w-52" /> : <div className="grid h-52 w-52 place-items-center text-stone-800"><QrCode className="h-12 w-12" /></div>}</div><div><div className="max-h-32 overflow-y-auto rounded-2xl border border-orange-300/25 bg-white/5 p-3 font-mono text-[11px] leading-5 text-orange-100 break-all">{pixPayload}</div><Button type="button" onClick={copy} className="mt-3 h-11 w-full rounded-xl bg-orange-400 font-bold text-stone-950 hover:bg-orange-300">{copied ? <><Check className="mr-2 h-4 w-4" />Copiado</> : <><Copy className="mr-2 h-4 w-4" />Copiar código PIX</>}</Button></div></div> : <div className="mt-2 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center"><Smartphone className="mx-auto h-8 w-8 text-orange-300" /><p className="mt-3 font-bold text-stone-100">Código PIX ainda não configurado</p><p className="mt-1 text-sm text-stone-400">Cadastre-o em Cadastro & hardware antes de iniciar os pedidos.</p></div>}</DialogContent></Dialog></div>;
}
