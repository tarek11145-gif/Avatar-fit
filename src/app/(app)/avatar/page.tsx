"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, ChevronRight, Loader2, RotateCcw, ShieldCheck, X } from "lucide-react";
import Avatar3D from "@/components/avatar/AvatarLazy";
import { ANIM_LABEL } from "@/components/avatar/poses";
import { Swatches, SKINS, COLORS } from "@/components/Swatches";
import { Button, Card, Chip, PageHeader, cx } from "@/components/ui";
import { KEYS, MEASURE_LABEL, measuresOf } from "@/lib/body";
import { EXERCISES, MUSCLES } from "@/lib/exercises";
import { analysePhoto, drawOverlay, loadImage, postureFromBack, shapeFromPhotos, skinOf, type Analysis } from "@/lib/scan";
import { uid, useStore } from "@/lib/store";
import { useBody } from "@/lib/useBody";
import type { Anim, AvatarLook, Measures, MuscleId } from "@/lib/types";

type Tab = "objectif" | "muscles" | "scan" | "style" | "anim";
const TABS: { id: Tab; label: string }[] = [
  { id: "objectif", label: "Objectif" }, { id: "muscles", label: "Muscles" }, { id: "scan", label: "Scanner" }, { id: "style", label: "Style" }, { id: "anim", label: "Animations" },
];
const VIEWS = [{ l: "Face", v: 0 }, { l: "Profil", v: -Math.PI / 2 }, { l: "Dos", v: Math.PI }];

export default function AvatarPage() {
  const { data, saveAvatar } = useStore();
  const [tab, setTab] = useState<Tab>("objectif");
  const [t, setT] = useState(0);
  const [ghost, setGhost] = useState(true);
  const [sel, setSel] = useState<MuscleId | null>(null);
  const [anim, setAnim] = useState<Anim>("idle");
  const [view, setView] = useState<number | undefined>(undefined);
  const body = useBody(t);
  const showMuscles = tab === "muscles";

  useEffect(() => { if (typeof window !== "undefined" && window.location.hash === "#scan") setTab("scan"); }, []);

  return (
    <div>
      <PageHeader title="Mon avatar" sub={body.scanned ? "Créé à partir de tes photos." : "Estimé depuis ta taille et ton poids. Scanne-toi pour qu'il te ressemble."} />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <div className="stage relative overflow-hidden rounded-[24px] border border-line">
            <Avatar3D className="h-[52vh] min-h-[380px] lg:h-[640px]" shape={body.shape} look={body.look} ratios={body.ratios}
              goalRatios={tab === "objectif" && ghost && t < 1 ? body.goalRatios : null} muscles={showMuscles} selected={sel}
              onSelect={(id) => { setSel(id); if (!showMuscles) setTab("muscles"); }} anim={tab === "anim" ? anim : "idle"} mk={body.mk} def={body.def} view={view} />
            <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              {tab === "objectif" ? (t === 0 ? "Aujourd'hui" : t === 1 ? "Objectif atteint" : `Projection ${Math.round(t * 100)} %`) : tab === "anim" ? ANIM_LABEL[anim] : showMuscles ? "Touche un muscle" : "Glisse pour tourner"}
            </div>
            <div className="absolute right-3 top-3 grid gap-1.5">
              {VIEWS.map((v) => <button key={v.l} onClick={() => setView(v.v)} className="h-9 rounded-xl bg-black/55 px-3 text-xs font-semibold backdrop-blur hover:bg-black/70">{v.l}</button>)}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-4 flex gap-2 overflow-x-auto noscroll">{TABS.map((x) => <Chip key={x.id} active={tab === x.id} onClick={() => setTab(x.id)}>{x.label}</Chip>)}</div>

          {tab === "objectif" && (
            <Card>
              <div className="flex items-center justify-between text-sm"><span className="font-semibold">Aujourd&apos;hui</span><span className="text-mute">{body.weeks ? `Objectif · ~${body.weeks} semaines` : "Objectif"}</span></div>
              <input type="range" min={0} max={100} value={t * 100} onChange={(e) => setT(+e.target.value / 100)} className="mt-2 h-11 w-full" aria-label="Projection vers l'objectif" />
              <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" checked={ghost} onChange={(e) => setGhost(e.target.checked)} className="h-5 w-5 accent-[var(--color-acc)]" /> Afficher la silhouette objectif</label>
              <table className="mt-4 w-full text-sm">
                <thead><tr className="text-left text-xs text-mute"><th className="py-2 font-medium">Mesure</th><th className="text-right font-medium">Actuel</th><th className="text-right font-medium">Objectif</th><th className="text-right font-medium">Écart</th></tr></thead>
                <tbody>
                  <tr className="border-t border-line"><td className="py-2.5">Poids</td><td className="text-right tabular-nums">{body.weight} kg</td><td className="text-right tabular-nums">{body.target} kg</td><Delta d={body.target - body.weight} u="kg" /></tr>
                  {KEYS.map((k) => <tr key={k} className="border-t border-line"><td className="py-2.5">{MEASURE_LABEL[k]}</td><td className="text-right tabular-nums">{body.current[k].toFixed(1)} cm</td><td className="text-right tabular-nums">{body.goal[k].toFixed(1)} cm</td><Delta d={body.goal[k] - body.current[k]} u="cm" /></tr>)}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-faint">Projection selon des répartitions moyennes (≈0,5 kg/sem en perte, ≈0,25 kg/sem en prise de muscle). Ce n&apos;est pas un avis médical. Modifie ton objectif dans <Link className="text-acc" href="/profile">Profil</Link>.</p>
            </Card>
          )}

          {tab === "muscles" && <MusclePanel sel={sel} onClose={() => setSel(null)} current={body.current} goal={body.goal} goalType={body.goalType} />}
          {tab === "scan" && <ScanPanel />}
          {tab === "style" && <StylePanel look={data.avatar.look} onChange={(look) => saveAvatar({ ...data.avatar, look })} />}
          {tab === "anim" && (
            <Card>
              <h3 className="font-display text-lg font-semibold">Démonstrations</h3>
              <p className="mt-1 text-sm text-mute">Ton avatar exécute le mouvement. Tourne autour pour voir l&apos;angle.</p>
              <div className="mt-4 flex flex-wrap gap-2">{(Object.keys(ANIM_LABEL) as Anim[]).map((a) => <Chip key={a} active={anim === a} onClick={() => setAnim(a)}>{ANIM_LABEL[a]}</Chip>)}</div>
              {anim !== "idle" && (
                <div className="mt-5"><div className="text-sm font-semibold">Exercices qui utilisent ce mouvement</div>
                  <div className="mt-2 grid gap-2">{EXERCISES.filter((e) => e.anim === anim).slice(0, 5).map((e) => <Link key={e.id} href={`/exercises/${e.id}`} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm hover:bg-surface-3">{e.name}<ChevronRight className="h-4 w-4 text-mute" /></Link>)}</div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Delta({ d, u }: { d: number; u: string }) {
  return <td className={cx("text-right font-semibold tabular-nums", d < 0 ? "text-acc" : d > 0 ? "text-acc-2" : "text-mute")}>{d > 0 ? "+" : ""}{d.toFixed(1)} {u}</td>;
}

function MusclePanel({ sel, onClose, current, goal, goalType }: { sel: MuscleId | null; onClose: () => void; current: Measures; goal: Measures; goalType: string }) {
  if (!sel) return (
    <Card>
      <h3 className="font-display text-lg font-semibold">Touche un muscle</h3>
      <p className="mt-1 text-sm text-mute">Sur l&apos;avatar, touche un muscle pour voir son rôle, comment le travailler et ce qu&apos;il doit gagner ou perdre pour ton objectif.</p>
      <div className="mt-4 flex flex-wrap gap-2">{(Object.keys(MUSCLES) as MuscleId[]).map((m) => <span key={m} className="rounded-full bg-surface-2 px-3 py-1.5 text-xs text-mute">{MUSCLES[m].name}</span>)}</div>
    </Card>
  );
  const m = MUSCLES[sel], z = m.zone, d = goal[z] - current[z];
  const exs = EXERCISES.filter((e) => e.muscles.includes(sel));
  const plan = goalType === "muscle"
    ? "3–4 séries de 6–12 répétitions, 2 fois par semaine pour ce muscle. Ajoute un peu de charge ou une répétition chaque semaine, et mange en léger surplus."
    : goalType === "perte"
      ? "Circuits de 12–20 répétitions et 2 séances de cardio par semaine. Le gras ne part pas d'un seul endroit : c'est le déficit calorique qui le fait fondre partout, ce muscle se dessinera avec."
      : "2–3 séries de 10–15 répétitions, 2 fois par semaine, en soignant la technique et l'amplitude.";
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div><div className="text-xs font-semibold uppercase tracking-wide text-acc">Muscle</div><h3 className="font-display text-2xl font-semibold">{m.name}</h3></div>
        <button onClick={onClose} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-xl text-mute hover:bg-white/5"><X className="h-5 w-5" /></button>
      </div>
      <p className="mt-2 text-[15px] text-mute">{m.role}</p>
      <div className="mt-4 rounded-2xl border border-acc/25 bg-acc/[.07] p-4">
        <div className="text-sm font-semibold">Pour ton objectif</div>
        <p className="mt-1 text-sm text-mute">{MEASURE_LABEL[z]} : {current[z].toFixed(1)} → {goal[z].toFixed(1)} cm <span className={d < 0 ? "text-acc" : "text-acc-2"}>({d > 0 ? "+" : ""}{d.toFixed(1)} cm)</span></p>
        <p className="mt-2 text-sm text-mute">{plan}</p>
      </div>
      <div className="mt-4 text-sm font-semibold">Exercices ({exs.length})</div>
      <div className="mt-2 grid gap-2">
        {exs.map((e) => <Link key={e.id} href={`/exercises/${e.id}`} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm hover:bg-surface-3"><span>{e.name}<span className="ml-2 text-xs text-faint">{e.equipment === "aucun" ? "maison" : e.equipment === "halteres" ? "haltères" : "salle"}</span></span><ChevronRight className="h-4 w-4 text-mute" /></Link>)}
      </div>
    </Card>
  );
}

function StylePanel({ look, onChange }: { look: AvatarLook; onChange: (l: AvatarLook) => void }) {
  const set = <K extends keyof AvatarLook>(k: K, v: AvatarLook[K]) => onChange({ ...look, [k]: v });
  return (
    <Card>
      <div className="grid gap-6">
        <Swatches label="Teint" colors={SKINS} value={look.skin} onChange={(c) => set("skin", c)} />
        <div><div className="mb-2 text-[13px] font-medium text-mute">Cheveux</div><div className="flex flex-wrap gap-2">{(["court", "rase", "long", "chignon"] as const).map((h) => <Chip key={h} active={look.hair === h} onClick={() => set("hair", h)}>{{ court: "Courts", rase: "Rasés", long: "Longs", chignon: "Chignon" }[h]}</Chip>)}</div></div>
        <Swatches label="Couleur des cheveux" colors={["#1a1410", "#3b2416", "#7a4a24", "#c99a5b", "#e8e1d6", "#7c5cff"]} value={look.hairColor} onChange={(c) => set("hairColor", c)} />
        <div><div className="mb-2 text-[13px] font-medium text-mute">Haut</div><div className="flex flex-wrap gap-2">{(["tshirt", "debardeur", "brassiere", "aucun"] as const).map((h) => <Chip key={h} active={look.top === h} onClick={() => set("top", h)}>{{ tshirt: "T-shirt", debardeur: "Débardeur", brassiere: "Brassière", aucun: "Torse nu" }[h]}</Chip>)}</div></div>
        <Swatches label="Couleur du haut" colors={COLORS} value={look.topColor} onChange={(c) => set("topColor", c)} />
        <div><div className="mb-2 text-[13px] font-medium text-mute">Bas</div><div className="flex flex-wrap gap-2">{(["short", "legging"] as const).map((h) => <Chip key={h} active={look.bottom === h} onClick={() => set("bottom", h)}>{h === "short" ? "Short" : "Legging"}</Chip>)}</div></div>
        <Swatches label="Couleur du bas" colors={COLORS} value={look.bottomColor} onChange={(c) => set("bottomColor", c)} />
        <Swatches label="Chaussures" colors={COLORS} value={look.shoeColor} onChange={(c) => set("shoeColor", c)} />
      </div>
    </Card>
  );
}

type Slot = "face" | "profil" | "dos";
function ScanPanel() {
  const { data, saveAvatar, saveExtra, toast } = useStore();
  const height = data.profile!.heightCm;
  const [res, setRes] = useState<Record<Slot, Analysis | null>>({ face: null, profil: null, dos: null });
  const [state, setState] = useState<Record<Slot, string>>({ face: "", profil: "", dos: "" });
  const [posture, setPosture] = useState<string | null>(null);
  const canv = { face: useRef<HTMLCanvasElement>(null), profil: useRef<HTMLCanvasElement>(null), dos: useRef<HTMLCanvasElement>(null) };
  const busy = Object.values(state).some((s) => s === "…");

  async function onFile(slot: Slot, f: File) {
    setState((s) => ({ ...s, [slot]: "…" }));
    try {
      const cnv = await loadImage(f);
      if (canv[slot].current) drawOverlay(canv[slot].current!, cnv, null);
      const A = await analysePhoto(cnv);
      if (slot === "face") A.skin = skinOf(cnv, A.L);
      if (canv[slot].current) drawOverlay(canv[slot].current!, cnv, A);
      const next = { ...res, [slot]: A };
      setRes(next);
      setState((s) => ({ ...s, [slot]: "ok" }));
      if (slot === "dos") {
        const p = postureFromBack(A, height);
        setPosture(`Épaules décalées de ${p.shoulders.toFixed(1)} cm, bassin de ${p.hips.toFixed(1)} cm. ${p.shoulders > 2 || p.hips > 2 ? "Léger déséquilibre : privilégie le travail d'un côté à la fois (haltères, fentes)." : "Bonne symétrie."}`);
      }
      if (next.face) {
        const shape = shapeFromPhotos(next.face, next.profil, height, data.avatar.look.skin);
        const m = measuresOf(shape);
        await saveAvatar({ ...data.avatar, shape, measures: m, scannedAt: new Date().toISOString(), look: { ...data.avatar.look, skin: shape.skin } });
        const today = new Date().toISOString().slice(0, 10);
        await saveExtra({ ...data.extra, measures: [...data.extra.measures.filter((x) => !(x.source === "scan" && x.date.slice(0, 10) === today)), { id: uid(), date: new Date().toISOString(), m, source: "scan" }] });
        toast(next.profil ? "Avatar créé à tes formes ✓" : "Avatar créé depuis la face. Ajoute le profil pour plus de précision.", "xp");
      }
    } catch (e) {
      setState((s) => ({ ...s, [slot]: e instanceof Error ? e.message : "Erreur" }));
    }
  }
  async function resetScan() {
    await saveAvatar({ ...data.avatar, shape: null, scannedAt: null });
    setRes({ face: null, profil: null, dos: null }); setState({ face: "", profil: "", dos: "" }); setPosture(null);
    toast("Scan supprimé");
  }
  const m = data.avatar.measures;
  return (
    <Card>
      <h3 className="font-display text-lg font-semibold">Scan en 3 photos</h3>
      <ul className="mt-2 grid gap-1 text-sm text-mute">
        <li>• Photo en pied, de la tête aux pieds, bien éclairée.</li>
        <li>• Tenue près du corps, bras écartés à 45°, fond simple.</li>
        <li>• Téléphone à hauteur de la taille, à 2–3 m (pose-le ou fais-toi aider).</li>
      </ul>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {(["face", "profil", "dos"] as Slot[]).map((s) => (
          <label key={s} className={cx("relative grid aspect-[3/4] cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed text-sm font-semibold text-mute", state[s] === "ok" ? "border-acc border-solid" : "border-line hover:border-line-strong")}>
            <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(s, f); }} />
            <canvas ref={canv[s]} className="absolute inset-0 h-full w-full object-contain" />
            {!state[s] && <span className="grid place-items-center gap-1"><Camera className="h-5 w-5" />{s === "face" ? "Face" : s === "profil" ? "Profil" : "Dos"}</span>}
            {state[s] && <span className={cx("absolute inset-x-1.5 bottom-1.5 rounded-lg px-1.5 py-1 text-center text-[11px] backdrop-blur", state[s] === "ok" ? "bg-acc/80 text-acc-ink" : state[s] === "…" ? "bg-black/70 text-ink" : "bg-danger/80 text-white")}>
              {state[s] === "ok" ? <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" />Analysée</span> : state[s] === "…" ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Analyse…</span> : state[s]}
            </span>}
          </label>
        ))}
      </div>
      {posture && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-mute"><b className="text-ink">Posture : </b>{posture}</p>}
      <p className="mt-3 flex items-center gap-2 text-xs text-faint"><ShieldCheck className="h-4 w-4" /> L&apos;IA tourne sur ton appareil. Les photos ne sont ni envoyées ni enregistrées.</p>
      {m && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {KEYS.map((k) => <div key={k} className="rounded-xl bg-surface-2 p-2.5 text-center"><div className="text-[11px] text-mute">{MEASURE_LABEL[k]}</div><div className="font-semibold tabular-nums">{m[k].toFixed(0)} cm</div></div>)}
        </div>
      )}
      {data.avatar.shape?.fromPhotos && <Button variant="ghost" size="sm" className="mt-4" onClick={resetScan}><RotateCcw className="h-4 w-4" /> Revenir à l&apos;avatar estimé</Button>}
    </Card>
  );
}
