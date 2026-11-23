"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HardDrive, Info } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, Field, cx, inputCls } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function AuthPage() {
  const { mode, user, data, status, signIn, signUp, startLocal } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === "ready" && user) router.replace(data.profile?.onboarded ? "/dashboard" : "/onboarding");
  }, [status, user, data.profile, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg("Entre une adresse e-mail valide.");
    if (pw.length < 8) return setMsg("Le mot de passe doit faire au moins 8 caractères.");
    setBusy(true);
    const err = tab === "up" ? await signUp(email, pw) : await signIn(email, pw);
    setBusy(false);
    if (err) setMsg(err);
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold">{tab === "up" ? "Crée ton compte" : "Bon retour"}</h1>
          <p className="mt-1 text-sm text-mute">{tab === "up" ? "Ton avatar et tes progrès, sauvegardés." : "Connecte-toi pour retrouver ton avatar."}</p>

          {mode === "supabase" ? (
            <>
              <div className="mt-6 grid grid-cols-2 rounded-xl bg-surface-2 p-1">
                {(["up", "in"] as const).map((t) => (
                  <button key={t} onClick={() => { setTab(t); setMsg(null); }} className={cx("h-10 rounded-lg text-sm font-semibold", tab === t ? "bg-surface-3 text-ink" : "text-mute")}>{t === "up" ? "Inscription" : "Connexion"}</button>
                ))}
              </div>
              <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
                <Field label="E-mail"><input className={inputCls} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.fr" /></Field>
                <Field label="Mot de passe" hint={tab === "up" ? "8 caractères minimum" : undefined}><input className={inputCls} type="password" autoComplete={tab === "up" ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
                {msg && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{msg}</p>}
                <Button type="submit" size="lg" loading={busy}>{tab === "up" ? "Créer mon compte" : "Me connecter"}</Button>
              </form>
            </>
          ) : (
            <div className="mt-6 grid gap-4">
              <div className="flex gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Les comptes en ligne ne sont pas encore branchés : ajoute tes clés Supabase dans <code className="rounded bg-black/30 px-1">.env.local</code> (voir le fichier LISEZMOI). En attendant, tu peux tout utiliser en mode local.</p>
              </div>
              <Button size="lg" onClick={startLocal}><HardDrive className="h-5 w-5" /> Continuer en mode local</Button>
              <p className="text-center text-xs text-faint">Mode local : tes données restent dans ce navigateur, sur cet appareil.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
