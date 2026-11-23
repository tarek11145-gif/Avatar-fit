"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Database, Download, LogOut, Timer, Trash2 } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import { askNotificationPermission } from "@/lib/notify";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const { data, mode, user, saveSettings, signOut, resetAll, toast } = useStore();
  const router = useRouter();
  const s = data.settings;
  const [confirm, setConfirm] = useState(false);

  async function toggleNotif() {
    if (!s.notifications) {
      const ok = await askNotificationPermission();
      if (!ok) { toast("Notifications refusées par le navigateur", "err"); return; }
    }
    await saveSettings({ ...s, notifications: !s.notifications });
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "avatar-fit-donnees.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  return (
    <div className="grid max-w-3xl gap-5">
      <PageHeader title="Paramètres" />
      <Card>
        <Row icon={<Bell className="h-5 w-5" />} title="Rappels" text="Une notification le jour d'une séance prévue au calendrier.">
          <Toggle on={s.notifications} onClick={toggleNotif} label="Rappels" />
        </Row>
        <Row icon={<Timer className="h-5 w-5" />} title="Repos par défaut" text={`${s.restSeconds} secondes entre les séries des circuits.`}>
          <input type="range" min={20} max={180} step={10} value={s.restSeconds} onChange={(e) => saveSettings({ ...s, restSeconds: +e.target.value })} className="w-32" aria-label="Repos par défaut" />
        </Row>
      </Card>
      <Card>
        <Row icon={<Database className="h-5 w-5" />} title="Stockage" text={mode === "supabase" ? `Compte en ligne (Supabase) · ${user?.email ?? ""}` : "Mode local : données dans ce navigateur. Ajoute Supabase pour un compte synchronisé (voir LISEZMOI)."}>{null}</Row>
        <Row icon={<Download className="h-5 w-5" />} title="Exporter mes données" text="Fichier JSON avec ton profil, ton avatar et tes séances."><Button variant="ghost" size="sm" onClick={exportData}>Exporter</Button></Row>
        <Row icon={<LogOut className="h-5 w-5" />} title="Déconnexion" text={mode === "local" ? "Tes données locales restent sur cet appareil." : "Tes données restent sur ton compte."}><Button variant="ghost" size="sm" onClick={async () => { await signOut(); router.replace("/"); }}>Se déconnecter</Button></Row>
      </Card>
      <Card className="border-danger/25">
        <Row icon={<Trash2 className="h-5 w-5 text-danger" />} title="Tout effacer" text="Supprime définitivement ton profil, ton avatar, tes séances et la conversation du coach.">
          {confirm
            ? <div className="flex gap-2"><Button variant="danger" size="sm" onClick={async () => { await resetAll(); toast("Données effacées"); router.replace("/onboarding"); }}>Confirmer</Button><Button variant="subtle" size="sm" onClick={() => setConfirm(false)}>Annuler</Button></div>
            : <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>Effacer</Button>}
        </Row>
      </Card>
      <p className="text-xs text-faint">Avatar Fit · Les conseils et projections ne remplacent pas un avis médical.</p>
    </div>
  );
}
function Row({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="flex gap-3"><div className="mt-0.5 text-mute">{icon}</div><div><div className="font-semibold">{title}</div><div className="text-sm text-mute">{text}</div></div></div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`relative h-8 w-14 rounded-full transition ${on ? "bg-acc" : "bg-surface-3"}`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${on ? "left-7" : "left-1"}`} />
    </button>
  );
}
