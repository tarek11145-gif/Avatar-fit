"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import Avatar3D from "@/components/avatar/AvatarLazy";
import { Button, Field, Spinner, cx, inputCls } from "@/components/ui";
import { Swatches, SKINS, COLORS } from "@/components/Swatches";
import { defaultShape, estimateMeasures } from "@/lib/body";
import { EQUIP, GOALS, LEVELS } from "@/lib/programs";
import { DEFAULT_AVATAR, uid, useStore } from "@/lib/store";
import type { AvatarLook, Equipment, Goal, Level, Profile } from "@/lib/types";

const STEPS = ["Toi", "Ton corps", "Objectif", "Niveau", "Rythme", "Avatar"];

export default function Onboarding() {
  const { status, user, data, saveProfile, saveAvatar, saveExtra, toast } = useStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const y = new Date().getFullYear();
  const [p, setP] = useState<Profile>(() => data.profile ?? {
    name: "", birthYear: y - 28, heightCm: 175, weightKg: 75, targetWeightKg: 72, level: "debutant", goal: "forme",
    equipment: "aucun", daysPerWeek: 3, minutesPerSession: 35, onboarded: false, createdAt: new Date().toISOString(),
  });
  const [look, setLook] = useState<AvatarLook>(data.avatar.look ?? DEFAULT_AVATAR.look);
  useEffect(() => { if (status === "ready" && !user) router.replace("/auth"); }, [status, user, router]);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((o) => ({ ...o, [k]: v }));
  const m = useMemo(() => estimateMeasures(p.heightCm, p.weightKg), [p.heightCm, p.weightKg]);
  const shape = useMemo(() => defaultShape(p.heightCm, m), [p.heightCm, m]);
  const ones = useMemo(() => ({ chest: 1, waist: 1, hips: 1, thigh: 1, arm: 1 }), []);

  const errors: (string | null)[] = [
    !p.name.trim() ? "Indique ton prénom." : p.birthYear < y - 90 || p.birthYear > y - 14 ? "L'app est prévue pour les 14 ans et plus." : null,
    p.heightCm < 120 || p.heightCm > 230 ? "Taille entre 120 et 230 cm." : p.weightKg < 35 || p.weightKg > 250 ? "Poids entre 35 et 250 kg." : p.targetWeightKg < 35 || p.targetWeightKg > 250 ? "Poids visé entre 35 et 250 kg." : null,
    null, null, null, null,
  ];
  const err = errors[step];

  async function finish() {
    setBusy(true);
    const prof = { ...p, name: p.name.trim(), onboarded: true, createdAt: data.profile?.createdAt ?? new Date().toISOString() };
    await saveAvatar({ ...data.avatar, look, measures: data.avatar.measures ?? m });
    await saveProfile(prof);
    if (!data.extra.weights.length) await saveExtra({ ...data.extra, weights: [{ id: uid(), date: new Date().toISOString(), kg: prof.weightKg }], measures: [{ id: uid(), date: new Date().toISOString(), m, source: "manuel" }] });
    toast(`Bienvenue ${prof.name} ! Ton programme est prêt.`, "xp");
    router.replace("/dashboard");
  }
  if (status !== "ready") return <Spinner />;

  const num = (k: keyof Profile, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value); set(k, (Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : 0) as never);
  };

  return (
    <div className="mx-auto grid min-h-dvh max-w-[1100px] gap-6 px-5 py-6 lg:grid-cols-[1fr_420px] lg:items-center">
      <div>
        <Logo />
        <div className="mt-8 flex gap-1.5">{STEPS.map((s, i) => <div key={s} className={cx("h-1.5 flex-1 rounded-full", i <= step ? "bg-acc" : "bg-white/10")} />)}</div>
        <p className="mt-3 text-sm text-mute">Étape {step + 1} sur {STEPS.length} · {STEPS[step]}</p>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }} className="mt-6 min-h-[340px]">
            {step === 0 && (<>
              <h1 className="font-display text-3xl font-semibold">Faisons connaissance.</h1>
              <div className="mt-6 grid max-w-md gap-4">
                <Field label="Prénom"><input className={inputCls} value={p.name} onChange={(e) => set("name", e.target.value)} autoComplete="given-name" placeholder="Ton prénom" /></Field>
                <div><div className="mb-2 text-[13px] font-medium text-mute">Sexe (pour calculer tes besoins caloriques)</div>
                  <div className="flex flex-wrap gap-2">{([["homme", "Homme"], ["femme", "Femme"], [undefined, "Je préfère ne pas dire"]] as const).map(([v, l]) => (
                    <button key={l} type="button" aria-pressed={p.sex === v} onClick={() => set("sex", v)} className={cx("h-11 rounded-xl border px-4 text-sm font-medium", p.sex === v ? "border-acc bg-acc/10 text-acc" : "border-line text-mute")}>{l}</button>))}</div></div>
                <Field label="Année de naissance" hint="Pour adapter l'intensité et l'impact des exercices."><input className={inputCls} type="number" inputMode="numeric" value={p.birthYear} onChange={num("birthYear", 1900, y)} /></Field>
              </div>
            </>)}
            {step === 1 && (<>
              <h1 className="font-display text-3xl font-semibold">Ton point de départ.</h1>
              <div className="mt-6 grid max-w-md grid-cols-2 gap-4">
                <Field label="Taille (cm)"><input className={inputCls} type="number" inputMode="numeric" value={p.heightCm} onChange={num("heightCm", 0, 260)} /></Field>
                <Field label="Poids (kg)"><input className={inputCls} type="number" inputMode="decimal" step="0.5" value={p.weightKg} onChange={num("weightKg", 0, 300)} /></Field>
                <Field label="Poids visé (kg)" hint="Optionnel : garde le même si ton objectif n'est pas le poids."><input className={inputCls} type="number" inputMode="decimal" step="0.5" value={p.targetWeightKg} onChange={num("targetWeightKg", 0, 300)} /></Field>
              </div>
            </>)}
            {step === 2 && (<>
              <h1 className="font-display text-3xl font-semibold">Ton objectif principal ?</h1>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {(Object.keys(GOALS) as Goal[]).map((g) => <Choice key={g} on={p.goal === g} title={GOALS[g].label} text={GOALS[g].blurb} onClick={() => set("goal", g)} />)}
              </div>
            </>)}
            {step === 3 && (<>
              <h1 className="font-display text-3xl font-semibold">Ton niveau actuel ?</h1>
              <div className="mt-6 grid gap-3">
                {(Object.keys(LEVELS) as Level[]).map((l) => <Choice key={l} on={p.level === l} title={LEVELS[l]} text={{ debutant: "Je débute ou je reprends après une longue pause.", intermediaire: "Je m'entraîne régulièrement depuis quelques mois.", avance: "Je m'entraîne depuis plus d'un an, technique maîtrisée." }[l]} onClick={() => set("level", l)} />)}
              </div>
            </>)}
            {step === 4 && (<>
              <h1 className="font-display text-3xl font-semibold">Ton rythme.</h1>
              <div className="mt-6 grid gap-6">
                <div><div className="mb-2 text-[13px] font-medium text-mute">Matériel</div><div className="grid gap-3 sm:grid-cols-3">{(Object.keys(EQUIP) as Equipment[]).map((e) => <Choice key={e} on={p.equipment === e} title={EQUIP[e]} onClick={() => set("equipment", e)} />)}</div></div>
                <Field label={`Séances par semaine : ${p.daysPerWeek}`}><input type="range" min={2} max={5} value={p.daysPerWeek} onChange={(e) => set("daysPerWeek", +e.target.value)} className="h-10" /></Field>
                <Field label={`Durée d'une séance : ${p.minutesPerSession} min`}><input type="range" min={15} max={75} step={5} value={p.minutesPerSession} onChange={(e) => set("minutesPerSession", +e.target.value)} className="h-10" /></Field>
              </div>
            </>)}
            {step === 5 && (<>
              <h1 className="font-display text-3xl font-semibold">Ton avatar.</h1>
              <p className="mt-2 text-mute">Tu pourras le scanner avec 3 photos et le personnaliser plus tard.</p>
              <div className="mt-6 grid gap-5">
                <Swatches label="Teint" colors={SKINS} value={look.skin} onChange={(c) => setLook({ ...look, skin: c })} />
                <Swatches label="Haut" colors={COLORS} value={look.topColor} onChange={(c) => setLook({ ...look, topColor: c })} />
                <Swatches label="Bas" colors={COLORS} value={look.bottomColor} onChange={(c) => setLook({ ...look, bottomColor: c })} />
              </div>
            </>)}
          </motion.div>
        </AnimatePresence>
        {err && <p role="alert" className="mb-3 text-sm text-danger">{err}</p>}
        <div className="flex gap-3">
          {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Retour</Button>}
          {step < STEPS.length - 1
            ? <Button onClick={() => !err && setStep(step + 1)} disabled={!!err}>Continuer <ArrowRight className="h-4 w-4" /></Button>
            : <Button onClick={finish} loading={busy}><Check className="h-4 w-4" /> Terminer</Button>}
        </div>
      </div>
      <div className="stage hidden overflow-hidden rounded-[28px] border border-line lg:block">
        <Avatar3D className="h-[620px]" shape={shape} look={look} ratios={ones} autoRotate />
      </div>
    </div>
  );
}

function Choice({ on, title, text, onClick }: { on: boolean; title: string; text?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={cx("rounded-2xl border p-4 text-left transition", on ? "border-acc bg-acc/10" : "border-line bg-surface hover:border-line-strong")}>
      <div className="flex items-center justify-between font-semibold">{title}{on && <Check className="h-4 w-4 text-acc" />}</div>
      {text && <div className="mt-1 text-sm text-mute">{text}</div>}
    </button>
  );
}
