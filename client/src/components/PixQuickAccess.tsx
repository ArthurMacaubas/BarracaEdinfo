import { Button } from "@/components/ui/button";
import { getManualPublicPixPayload, getPixPayload, type PixSetting } from "@/lib/pixPayload";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, QrCode } from "lucide-react";
import { toast } from "sonner";

export default function PixQuickAccess() {
  const snapshot = trpc.operations.snapshot.useQuery(undefined, { refetchInterval: 3_000 });
  const utils = trpc.useUtils();
  const settings = (snapshot.data?.settings ?? []) as PixSetting[];
  const pixPayload = getPixPayload(settings);
  const showingPublic = Boolean(getManualPublicPixPayload(settings));
  const showOnPublic = trpc.operations.saveSetting.useMutation({
    onSuccess: (_result, variables) => { toast.success(variables.value === "true" ? "QR PIX exibido na tela pública." : "QR PIX removido da tela pública."); void utils.operations.snapshot.invalidate(); },
    onError: error => toast.error(`Não foi possível atualizar a tela pública: ${error.message}`),
  });
  const toggle = () => {
    if (!pixPayload) { toast.error("Cadastre o código PIX antes de exibi-lo no segundo monitor."); return; }
    showOnPublic.mutate({ key: "public_pix_manual_display", value: String(!showingPublic) });
  };
  return <div className="fixed bottom-5 right-5 z-40 sm:bottom-7 sm:right-7"><Button type="button" disabled={showOnPublic.isPending} onClick={toggle} className="h-12 rounded-2xl bg-orange-400 px-5 font-black text-stone-950 shadow-xl shadow-orange-950/30 hover:bg-orange-300">{showingPublic ? <><EyeOff className="mr-2 h-4 w-4" />Ocultar QR público</> : <><QrCode className="mr-2 h-4 w-4" />Mostrar QR no público</>}</Button></div>;
}
