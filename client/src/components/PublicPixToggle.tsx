import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { isPublicPixEnabled, type PixSetting } from "@/lib/pixPayload";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, MonitorUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PublicPixToggle({ refresh }: { refresh: () => void }) {
  const snapshot = trpc.operations.snapshot.useQuery(undefined, { refetchInterval: 6_000 });
  const configured = isPublicPixEnabled((snapshot.data?.settings ?? []) as PixSetting[]);
  const [enabled, setEnabled] = useState(configured);
  const save = trpc.operations.saveSetting.useMutation({
    onSuccess: (_result, variables) => { toast.success(variables.value === "true" ? "QR Code PIX ativado na tela pública." : "QR Code PIX ocultado da tela pública."); refresh(); },
    onError: error => { setEnabled(configured); toast.error(`Não foi possível atualizar a tela pública: ${error.message}`); },
  });
  useEffect(() => { if (!save.isPending) setEnabled(configured); }, [configured, save.isPending]);
  const update = (next: boolean) => { setEnabled(next); save.mutate({ key: "public_pix_enabled", value: String(next) }); };

  return <section className="mt-5 rounded-2xl border border-orange-200 bg-orange-50/70 p-4"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-[#9c321e]"><MonitorUp className="h-5 w-5" /></div><div><p className="font-bold text-stone-900">QR Code PIX na tela pública</p><p className="mt-1 text-sm text-stone-600">Ative para permitir que campanhas PIX confirmadas apareçam no segundo monitor.</p></div></div><Switch checked={enabled} disabled={save.isPending} onCheckedChange={update} /></div><Button type="button" disabled={save.isPending} onClick={() => update(!enabled)} variant="outline" className="mt-4 h-10 w-full rounded-xl border-orange-300 bg-white font-bold text-[#9c321e] hover:bg-orange-100">{enabled ? <><EyeOff className="mr-2 h-4 w-4" />Desativar QR Code público</> : <><Eye className="mr-2 h-4 w-4" />Ativar QR Code público</>}</Button></section>;
}
