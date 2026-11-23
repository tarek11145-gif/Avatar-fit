"use client";
import { useState } from "react";
import { Save } from "lucide-react";
import { Button, Card, Field, PageHeader, Ring, cx, inputCls } from "@/components/ui";
import { KEYS, MEASURE_LABEL } from "@/lib/body";
import { levelOf, titleOf, totals } from "@/lib/gamification";
import { EQUIP, GOALS, LEVELS } from "@/lib/programs";
import { useStore } from "@/lib/store";
import type { Equipment, Goal, Level, Measures, Profile } from "@/lib/types";

export default function ProfilePage() {
  const { data, user, saveProfile, saveAvatar, toast } = useStore();
  const [p, setP] = useState<Profile>(data.profile!);
  const [m, setM] = useState<Measures | null>(data.avatar.measures);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((o) => ({ ...o, [k]: v }));
  const t = totals(data.sessions), lv = levelOf(t.xp);
  const y = new Date().getFullYear();
  const err = !p.name.trim() ? "Indique ton prénom." : p.heightCm < 120 || p.heightCm > 230 ? "Taille entre 120 et 230 cm." : p.weightKg < 35 || p.weightKg > 250 || p.targetWeightKg < 35 || p.targetWeightKg > 250 ? "Poids entre 35 et 250 kg." : p.birthYear > y - 14 || p.birthYear < y - 90 ? "Année de naissance invalide." : null;

  async function save() {
    if (err) return;
    setBusy(true);
    const heightChanged = p.heightCm !== data.profile!.heightCm;
    await saveProfile({ ...p, name: p.name.trim() });
    // Un scan dépend de la taille : si elle change, on garde les mensurations mais on recalcule l'avatar estimé.
    await saveAvatar({ ...data.avatar, measures: m, shape: heightChanged ? null : data.avatar.shape });
    setBusy(false); toast("Profil enregistré · programme mis à jour");
  }
  const n = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, (parseFloat(e.target.value) || 0) as never);

  return (
    <div>
      <PageHeader title="Profil" sub={user?.email ?? "Mode local"} right={<Button onClick={save} loading={busy} disabled={!!err}><Save className="h-4 w-4" /> Enregistrer</Button>} />
      {err && <p role="alert" className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{err}</p>}
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="grid content-start justify-items-center gap-3 text-center">
          <Ring value={lv.pct} size={150} stroke={10}><div><div className="font-display text-4xl font-semibold">{lv.level}</div><div className="text-xs text-mute">niveau</div></div></Ring>
          <div className="font-display text-xl font-semibold">{p.name}</div>
          <div className="text-sm text-acc">{titleOf(lv.level)}</div>
          <div className="text-xs text-mute">{lv.into} / {lv.need} XP vers le niveau {lv.level + 1}</div>
          <div className="mt-2 grid w-full grid-cols-2 gap-2 text-left">
            <div className="rounded-xl bg-surface-2 p-3"><div className="text-xs text-mute">Séances</div><div className="font-semibold">{t.count}</div></div>
            <div className="rounded-xl bg-surface-2 p-3"><div className="text-xs text-mute">Minutes</div><div className="font-semibold">{t.minutes}</div></div>
          </div>
        </Card>
        <div className="grid gap-5">
          <Card>
            <h2 className="font-display text-lg font-semibold">Informations</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Prénom"><input className={inputCls} value={p.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Année de naissance"><input className={inputCls} type="number" value={p.birthYear} onChange={n("birthYear")} /></Field>
              <div className="sm:col-span-2"><div className="mb-2 text-[13px] font-medium text-mute">Sexe (besoins caloriques)</div>
                <div className="flex flex-wrap gap-2">{([["homme", "Homme"], ["femme", "Femme"], [undefined, "Non précisé"]] as const).map(([v, l]) => (
                  <button key={l} type="button" aria-pressed={p.sex === v} onClick={() => set("sex", v)} className={cx("h-10 rounded-xl border px-4 text-sm font-medium", p.sex === v ? "border-acc bg-acc/10 text-acc" : "border-line text-mute")}>{l}</button>))}</div></div>
              <Field label="Taille (cm)"><input className={inputCls} type="number" value={p.heightCm} onChange={n("heightCm")} /></Field>
              <Field label="Poids (kg)"><input className={inputCls} type="number" step="0.5" value={p.weightKg} onChange={n("weightKg")} /></Field>
              <Field label="Poids visé (kg)"><input className={inputCls} type="number" step="0.5" value={p.targetWeightKg} onChange={n("targetWeightKg")} /></Field>
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-lg font-semibold">Objectif et programme</h2>
            <Group label="Objectif" items={Object.keys(GOALS) as Goal[]} label2={(g) => GOALS[g].label} value={p.goal} onPick={(v) => set("goal", v)} />
            <Group label="Niveau" items={Object.keys(LEVELS) as Level[]} label2={(l) => LEVELS[l]} value={p.level} onPick={(v) => set("level", v)} />
            <Group label="Matériel" items={Object.keys(EQUIP) as Equipment[]} label2={(e) => EQUIP[e]} value={p.equipment} onPick={(v) => set("equipment", v)} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={`Séances par semaine : ${p.daysPerWeek}`}><input type="range" min={2} max={5} value={p.daysPerWeek} onChange={(e) => set("daysPerWeek", +e.target.value)} className="h-10" /></Field>
              <Field label={`Durée : ${p.minutesPerSession} min`}><input type="range" min={15} max={75} step={5} value={p.minutesPerSession} onChange={(e) => set("minutesPerSession", +e.target.value)} className="h-10" /></Field>
            </div>
          </Card>
          {m && (
            <Card>
              <h2 className="font-display text-lg font-semibold">Mensurations (cm)</h2>
              <p className="text-sm text-mute">{data.avatar.shape?.fromPhotos ? "Mesurées par le scan photo. Corrige-les avec un mètre ruban si besoin." : "Estimées. Scanne-toi ou mesure-toi pour plus de précision."}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {KEYS.map((k) => <Field key={k} label={MEASURE_LABEL[k]}><input className={inputCls} type="number" step="0.5" value={Math.round(m[k] * 10) / 10} onChange={(e) => setM({ ...m, [k]: parseFloat(e.target.value) || m[k] })} /></Field>)}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Group<T extends string>({ label, items, label2, value, onPick }: { label: string; items: T[]; label2: (v: T) => string; value: T; onPick: (v: T) => void }) {
  return (
    <div className="mt-4">
      <div className="mb-2 text-[13px] font-medium text-mute">{label}</div>
      <div className="flex flex-wrap gap-2">{items.map((i) => <button key={i} type="button" aria-pressed={value === i} onClick={() => onPick(i)} className={cx("h-10 rounded-xl border px-4 text-sm font-medium", value === i ? "border-acc bg-acc/10 text-acc" : "border-line text-mute hover:text-ink")}>{label2(i)}</button>)}</div>
    </div>
  );
}
