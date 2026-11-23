"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Pause, Play, SkipForward, Trophy, X } from "lucide-react";
import Avatar3D from "@/components/avatar/AvatarLazy";
import { Button, Card, Empty, Ring, cx, inputCls } from "@/components/ui";
import { byId, fmtWork } from "@/lib/exercises";
import { badges, dayKey, sessionXp } from "@/lib/gamification";
import { buildProgram, programWeek, progressed } from "@/lib/programs";
import { uid, useStore } from "@/lib/store";
import { useBody } from "@/lib/useBody";
import type { ExerciseLog, SetLog } from "@/lib/types";

type Phase = "intro" | "work" | "rest" | "done";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, addSession, toast } = useStore();
  const p = data.profile!;
  const body = useBody(0);
  const prog = useMemo(() => buildProgram(p), [p]);
  const week = programWeek(p);
  const w = prog.workouts.find((x) => x.key === id);
  const blocks = useMemo(() => (w ? w.blocks.map((b) => progressed(b, week)) : []), [w, week]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [bi, setBi] = useState(0);
  const [si, setSi] = useState(0);
  const [logs, setLogs] = useState<ExerciseLog[]>(() => blocks.map((b) => ({ exerciseId: b.exerciseId, sets: Array.from({ length: b.sets }, () => ({ reps: b.reps, weight: 0, done: false })) })));
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [feeling, setFeeling] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [quit, setQuit] = useState(false);
  const [saving, setSaving] = useState(false);
  const start = useRef<number>(0);

  const b = blocks[bi], e = b ? byId(b.exerciseId)! : null;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((v) => {
      if (v <= 1) { clearInterval(t); setRunning(false); if (phase === "rest") nextAfterRest(); else if (e?.seconds) completeSet(); return 0; }
      return v - 1;
    }), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase]);

  if (!w || !e) return <Empty icon={<X className="h-5 w-5" />} title="Séance introuvable" text="Retourne à ton programme pour choisir une séance." action={<Button href="/programs">Mon programme</Button>} />;

  function begin() { start.current = Date.now(); setPhase("work"); if (e!.seconds) { setLeft(b.reps); } }
  function setLog(patch: Partial<SetLog>) {
    setLogs((L) => L.map((l, i) => (i !== bi ? l : { ...l, sets: l.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) })));
  }
  function completeSet() {
    setLog({ done: true });
    const lastSet = si >= b.sets - 1, lastEx = bi >= blocks.length - 1;
    if (lastSet && lastEx) { setPhase("done"); return; }
    setPhase("rest"); setLeft(b.restSec); setRunning(true);
  }
  function nextAfterRest() {
    setRunning(false);
    if (si < b.sets - 1) { setSi(si + 1); setPhase("work"); if (e!.seconds) setLeft(b.reps); }
    else goEx(bi + 1);
  }
  function goEx(n: number) {
    setRunning(false);
    if (n >= blocks.length) { setPhase("done"); return; }
    setBi(n); setSi(0); setPhase("work");
    const ne = byId(blocks[n].exerciseId)!; if (ne.seconds) setLeft(blocks[n].reps);
  }
  async function save() {
    setSaving(true);
    const durationMin = Math.max(1, Math.round((Date.now() - (start.current || Date.now())) / 60000));
    const setsDone = logs.reduce((a, l) => a + l.sets.filter((s) => s.done).length, 0);
    const sameDay = data.sessions.filter((s) => dayKey(s.date) === dayKey(new Date())).length;
    const xp = sessionXp(durationMin, setsDone, sameDay);
    const before = new Set(badges(data.sessions).filter((x) => x.got).map((x) => x.id));
    const session = { id: uid(), date: new Date().toISOString(), title: w!.title, programDay: w!.key, durationMin, exercises: logs.map((l) => ({ ...l, sets: l.sets.filter((s) => s.done) })).filter((l) => l.sets.length), xp, feeling };
    await addSession(session);
    toast(xp ? `+${xp} XP · séance enregistrée` : "Séance enregistrée (XP du jour déjà gagnée : repose-toi bien)", "xp");
    badges([session, ...data.sessions]).filter((x) => x.got && !before.has(x.id)).forEach((x) => toast(`Badge débloqué : ${x.name}`, "xp"));
    router.replace("/dashboard");
  }

  const total = blocks.reduce((a, x) => a + x.sets, 0);
  const doneCount = logs.reduce((a, l) => a + l.sets.filter((s) => s.done).length, 0);
  const cur = logs[bi]?.sets[si];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="stage relative overflow-hidden rounded-[24px] border border-line">
        <Avatar3D className="h-[44vh] min-h-[320px] lg:h-[620px]" shape={body.shape} look={body.look} ratios={body.ratios} anim={phase === "rest" || phase === "done" ? "idle" : e.anim} />
        <div className="absolute inset-x-4 top-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-acc transition-all" style={{ width: `${(doneCount / total) * 100}%` }} /></div>
          <button onClick={() => setQuit(true)} aria-label="Quitter la séance" className="grid h-10 w-10 place-items-center rounded-xl bg-black/50 backdrop-blur"><X className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="grid content-start gap-4">
        {quit && (
          <Card className="border-danger/30">
            <p className="font-semibold">Quitter la séance ?</p>
            <p className="mt-1 text-sm text-mute">Les séries faites ne seront pas enregistrées.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="danger" onClick={() => router.replace("/programs")}>Quitter</Button>
              {doneCount > 0 && <Button variant="ghost" onClick={() => { setQuit(false); setPhase("done"); }}>Terminer et enregistrer</Button>}
              <Button variant="subtle" onClick={() => setQuit(false)}>Continuer</Button>
            </div>
          </Card>
        )}

        {phase === "intro" && (
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide text-acc">Semaine {week} · {w.key}</div>
            <h1 className="mt-1 font-display text-3xl font-semibold">{w.title}</h1>
            <p className="text-mute">{w.focus} · environ {w.minutes} min</p>
            <ul className="mt-4 divide-y divide-line">
              {blocks.map((x, i) => { const ex = byId(x.exerciseId)!; return <li key={i} className="flex justify-between py-2.5 text-sm"><span>{ex.name}</span><span className="text-mute">{x.sets > 1 ? `${x.sets} × ` : ""}{fmtWork(ex, x.reps)}</span></li>; })}
            </ul>
            <p className="mt-3 text-xs text-faint">Arrête-toi en cas de douleur. Hydrate-toi entre les exercices.</p>
            <Button size="lg" className="mt-4 w-full" onClick={begin}><Play className="h-5 w-5" /> C&apos;est parti</Button>
          </Card>
        )}

        {phase === "work" && cur && (
          <Card>
            <div className="text-sm text-mute">Exercice {bi + 1}/{blocks.length} · Série {si + 1}/{b.sets}</div>
            <h2 className="mt-1 font-display text-3xl font-semibold">{e.name}</h2>
            <p className="mt-1 text-sm text-mute">{e.steps[1] ?? e.steps[0]}</p>
            {e.seconds ? (
              <div className="mt-5 grid place-items-center gap-4">
                <Ring value={left / b.reps} size={170} stroke={12}><div><div className="font-display text-5xl font-semibold tabular-nums">{left}</div><div className="text-xs text-mute">secondes</div></div></Ring>
                <div className="flex gap-2">
                  <Button size="lg" onClick={() => setRunning(!running)}>{running ? <><Pause className="h-5 w-5" /> Pause</> : <><Play className="h-5 w-5" /> {left === b.reps ? "Démarrer" : "Reprendre"}</>}</Button>
                  <Button size="lg" variant="ghost" onClick={() => { setRunning(false); completeSet(); }}><Check className="h-5 w-5" /> Fait</Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-[13px] text-mute">Répétitions<input className={inputCls} type="number" inputMode="numeric" value={cur.reps} onChange={(ev) => setLog({ reps: Math.max(0, +ev.target.value) })} /></label>
                  <label className="grid gap-1.5 text-[13px] text-mute">Charge (kg)<input className={inputCls} type="number" inputMode="decimal" step="0.5" value={cur.weight} onChange={(ev) => setLog({ weight: Math.max(0, +ev.target.value) })} /></label>
                </div>
                <Button size="lg" onClick={completeSet}><Check className="h-5 w-5" /> Série terminée</Button>
              </div>
            )}
            <button onClick={() => goEx(bi + 1)} className="mt-4 flex items-center gap-1.5 text-sm text-mute hover:text-ink"><SkipForward className="h-4 w-4" /> Passer l&apos;exercice</button>
          </Card>
        )}

        {phase === "rest" && (
          <Card className="text-center">
            <div className="text-sm font-semibold text-acc">Récupération</div>
            <div className="my-4 grid place-items-center"><Ring value={left / Math.max(1, b.restSec)} size={170} stroke={12} color="var(--color-acc-2)"><div className="font-display text-5xl font-semibold tabular-nums">{left}</div></Ring></div>
            <p className="text-sm text-mute">Ensuite : {si < b.sets - 1 ? `${e.name}, série ${si + 2}` : blocks[bi + 1] ? byId(blocks[bi + 1].exerciseId)!.name : "fin"}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="subtle" onClick={() => setLeft((v) => v + 15)}>+15 s</Button>
              <Button onClick={nextAfterRest}>Passer <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {phase === "done" && (
          <Card className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-acc/15 text-acc"><Trophy className="h-7 w-7" /></div>
            <h2 className="mt-3 font-display text-3xl font-semibold">Séance terminée !</h2>
            <p className="text-mute">{doneCount} séries sur {total}. Bravo.</p>
            <div className="mt-5 text-sm font-semibold">Comment tu te sens ?</div>
            <div className="mt-2 flex justify-center gap-2">
              {([1, 2, 3, 4, 5] as const).map((f) => <button key={f} onClick={() => setFeeling(f)} aria-pressed={feeling === f} className={cx("h-11 w-11 rounded-xl border text-sm font-semibold", feeling === f ? "border-acc bg-acc/15 text-acc" : "border-line text-mute")}>{f}</button>)}
            </div>
            <div className="mt-1 flex justify-between px-2 text-[11px] text-faint"><span>Épuisé</span><span>En pleine forme</span></div>
            <Button size="lg" className="mt-5 w-full" onClick={save} loading={saving}>Enregistrer</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
