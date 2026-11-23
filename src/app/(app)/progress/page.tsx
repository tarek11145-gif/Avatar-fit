"use client";
import { useEffect, useMemo, useState } from "react";
import { Camera, ImageOff, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { LineTrend } from "@/components/charts";
import { Button, Card, Chip, Empty, Field, PageHeader, Stat, cx, inputCls } from "@/components/ui";
import { KEYS, MEASURE_LABEL } from "@/lib/body";
import { dayKey } from "@/lib/gamification";
import { addPhoto, deletePhoto, listPhotos, shrink, type ProgressPhoto } from "@/lib/photos";
import { uid, useStore } from "@/lib/store";
import type { Measures } from "@/lib/types";

const short = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" });

export default function ProgressPage() {
  const { data, saveExtra, saveProfile, saveAvatar, toast } = useStore();
  const p = data.profile!, ex = data.extra;
  const [kg, setKg] = useState(String(p.weightKg));
  const [mk, setMk] = useState<keyof Measures>("waist");
  const cur = data.avatar.measures;
  const [mm, setMm] = useState<Measures | null>(cur);

  const weights = useMemo(() => [...ex.weights].sort((a, b) => a.date.localeCompare(b.date)), [ex.weights]);
  const meas = useMemo(() => [...ex.measures].sort((a, b) => a.date.localeCompare(b.date)), [ex.measures]);
  const first = weights[0]?.kg, last = weights[weights.length - 1]?.kg;

  async function addWeight(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(kg.replace(",", "."));
    if (!(v >= 35 && v <= 250)) return toast("Poids entre 35 et 250 kg", "err");
    const today = dayKey(new Date());
    await saveExtra({ ...ex, weights: [...ex.weights.filter((w) => dayKey(w.date) !== today), { id: uid(), date: new Date().toISOString(), kg: v }] });
    await saveProfile({ ...p, weightKg: v });
    toast("Poids enregistré · objectifs recalculés");
  }
  async function addMeasures() {
    if (!mm) return;
    await saveExtra({ ...ex, measures: [...ex.measures, { id: uid(), date: new Date().toISOString(), m: mm, source: "manuel" }] });
    await saveAvatar({ ...data.avatar, measures: mm });
    toast("Mensurations enregistrées");
  }

  return (
    <div className="grid gap-5">
      <PageHeader title="Progrès" sub="Ton poids, tes mensurations et tes photos, dans le temps." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold">Poids</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="Départ" value={first ?? p.weightKg} unit="kg" />
            <Stat label="Actuel" value={last ?? p.weightKg} unit="kg" />
            <Stat label="Objectif" value={p.targetWeightKg} unit="kg" />
          </div>
          {weights.length >= 2 ? <div className="mt-3"><LineTrend data={weights.map((w) => ({ date: short(w.date), kg: w.kg }))} x="date" y="kg" unit="kg" /></div>
            : <p className="mt-3 text-sm text-mute">Pèse-toi 1 fois par semaine, le matin à jeun : la courbe apparaît dès 2 pesées.</p>}
          <form onSubmit={addWeight} className="mt-4 flex items-end gap-2">
            <Field label="Poids du jour (kg)"><input className={inputCls} inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} /></Field>
            <Button type="submit" className="h-12"><Plus className="h-4 w-4" /> Ajouter</Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-semibold">Mensurations</h2>
          <div className="mt-3 flex gap-2 overflow-x-auto noscroll">{KEYS.map((k) => <Chip key={k} active={mk === k} onClick={() => setMk(k)}>{MEASURE_LABEL[k]}</Chip>)}</div>
          {meas.length >= 2 ? <div className="mt-3"><LineTrend data={meas.map((m) => ({ date: short(m.date), cm: Math.round(m.m[mk] * 10) / 10 }))} x="date" y="cm" unit="cm" /></div>
            : <p className="mt-3 text-sm text-mute">Chaque scan photo et chaque saisie ajoute un point. Mesure-toi toutes les 2 à 4 semaines.</p>}
          {mm && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {KEYS.map((k) => <Field key={k} label={MEASURE_LABEL[k]}><input className={inputCls} type="number" step="0.5" value={Math.round(mm[k] * 10) / 10} onChange={(e) => setMm({ ...mm, [k]: parseFloat(e.target.value) || mm[k] })} /></Field>)}
            </div>
          )}
          <Button variant="ghost" className="mt-3" onClick={addMeasures}><Plus className="h-4 w-4" /> Enregistrer ces mensurations</Button>
        </Card>
      </div>
      <PhotosCard />
    </div>
  );
}

function PhotosCard() {
  const { toast } = useStore();
  const [photos, setPhotos] = useState<ProgressPhoto[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [pose, setPose] = useState<ProgressPhoto["pose"]>("face");
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [split, setSplit] = useState(50);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const l = await listPhotos(); setPhotos(l);
      setUrls((old) => { Object.values(old).forEach((u) => URL.revokeObjectURL(u)); return Object.fromEntries(l.map((x) => [x.id, URL.createObjectURL(x.blob)])); });
    } catch { setPhotos([]); toast("Stockage des photos indisponible sur ce navigateur", "err"); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);
  const list = (photos ?? []).filter((x) => x.pose === pose);
  useEffect(() => { if (list.length >= 2) { setB(list[0].id); setA(list[list.length - 1].id); } else { setA(null); setB(null); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, pose]);

  async function onFile(f: File) {
    setBusy(true);
    try { await addPhoto({ id: uid(), date: new Date().toISOString(), pose, blob: await shrink(f) }); await refresh(); toast("Photo ajoutée"); }
    catch (e) { toast(e instanceof Error ? e.message : "Erreur", "err"); }
    setBusy(false);
  }
  const pa = list.find((x) => x.id === a), pb = list.find((x) => x.id === b);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Photos avant / après</h2>
        <label className={cx("inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-acc px-5 text-[15px] font-semibold text-acc-ink", busy && "opacity-50")}>
          <Camera className="h-4 w-4" /> Ajouter une photo
          <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }} />
        </label>
      </div>
      <p className="mt-1 flex items-center gap-2 text-xs text-faint"><ShieldCheck className="h-4 w-4" /> Les photos restent uniquement sur cet appareil.</p>
      <div className="mt-4 flex gap-2">{(["face", "profil", "dos"] as const).map((x) => <Chip key={x} active={pose === x} onClick={() => setPose(x)}>{x === "face" ? "Face" : x === "profil" ? "Profil" : "Dos"} ({(photos ?? []).filter((y) => y.pose === x).length})</Chip>)}</div>

      {pa && pb && (
        <div className="mt-5">
          <div className="relative mx-auto aspect-[3/4] max-w-sm overflow-hidden rounded-2xl bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[pb.id]} alt="Après" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls[pa.id]} alt="Avant" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <div className="absolute inset-y-0 w-0.5 bg-acc" style={{ left: `${split}%` }} />
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs">Avant · {short(pa.date)}</span>
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs">Après · {short(pb.date)}</span>
          </div>
          <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(+e.target.value)} className="mx-auto mt-2 block h-10 w-full max-w-sm" aria-label="Comparer avant et après" />
        </div>
      )}

      {photos === null ? <p className="mt-4 text-sm text-mute">Chargement…</p> : list.length ? (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {list.map((x) => (
            <div key={x.id} className={cx("relative overflow-hidden rounded-xl border-2", x.id === a ? "border-acc-2" : x.id === b ? "border-acc" : "border-transparent")}>
              <button onClick={() => (x.id === a ? null : x.id === b ? null : setA(x.id))} className="block w-full" aria-label={`Choisir la photo du ${short(x.date)} comme « avant »`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[x.id]} alt={`Photo du ${short(x.date)}`} className="aspect-[3/4] w-full object-cover" />
              </button>
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[11px]">{short(x.date)}</span>
              <button onClick={async () => { await deletePhoto(x.id); refresh(); }} aria-label="Supprimer la photo" className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-lg bg-black/60 text-white hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      ) : <div className="mt-4"><Empty icon={<ImageOff className="h-5 w-5" />} title="Pas encore de photo" text="Prends une photo maintenant, puis toutes les 2 à 4 semaines, même lumière, même tenue. Le curseur compare la première et la dernière." /></div>}
      {list.length >= 2 && <p className="mt-2 text-xs text-faint">Touche une miniature pour la choisir comme « avant ». La plus récente sert d&apos;« après ».</p>}
    </Card>
  );
}
