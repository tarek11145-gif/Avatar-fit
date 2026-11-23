"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Plus, Trash2 } from "lucide-react";
import { Button, Card, PageHeader, cx } from "@/components/ui";
import { DAYS, MONTHS } from "@/lib/format";
import { dayKey } from "@/lib/gamification";
import { buildProgram } from "@/lib/programs";
import { uid, useStore } from "@/lib/store";

export default function CalendarPage() {
  const { data, setPlanned, toast } = useStore();
  const prog = useMemo(() => buildProgram(data.profile!), [data.profile]);
  const [cur, setCur] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState(dayKey(new Date()));
  const [pick, setPick] = useState(prog.workouts[0]?.key ?? "");
  const today = dayKey(new Date());

  const cells = useMemo(() => {
    const first = new Date(cur), off = (first.getDay() + 6) % 7, out: (Date | null)[] = [];
    for (let i = 0; i < off; i++) out.push(null);
    const n = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= n; d++) out.push(new Date(cur.getFullYear(), cur.getMonth(), d));
    return out;
  }, [cur]);
  const doneOn = (k: string) => data.sessions.filter((s) => dayKey(s.date) === k);
  const planOn = (k: string) => data.planned.filter((p) => p.date === k);

  async function add() {
    const w = prog.workouts.find((x) => x.key === pick); if (!w) return;
    await setPlanned([...data.planned, { id: uid(), date: sel, title: w.title, dayKey: w.key }]);
    toast("Séance planifiée");
  }
  const move = (n: number) => setCur(new Date(cur.getFullYear(), cur.getMonth() + n, 1));
  const selDate = new Date(sel + "T12:00:00");

  return (
    <div>
      <PageHeader title="Calendrier" sub="Tes séances faites et prévues. Garde au moins un jour de repos entre deux grosses séances." />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <button onClick={() => move(-1)} aria-label="Mois précédent" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/5"><ChevronLeft className="h-5 w-5" /></button>
            <div className="font-display text-lg font-semibold capitalize">{MONTHS[cur.getMonth()]} {cur.getFullYear()}</div>
            <button onClick={() => move(1)} aria-label="Mois suivant" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/5"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-mute">{DAYS.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = dayKey(d), done = doneOn(k).length > 0, plan = planOn(k).length > 0;
              return (
                <button key={k} onClick={() => setSel(k)} aria-pressed={sel === k} aria-label={d.toLocaleDateString("fr-FR")}
                  className={cx("relative grid aspect-square place-items-center rounded-xl text-sm transition", sel === k ? "bg-acc text-acc-ink font-semibold" : k === today ? "bg-surface-3" : "hover:bg-white/5")}>
                  {d.getDate()}
                  <span className="absolute bottom-1.5 flex gap-0.5">{done && <span className={cx("h-1.5 w-1.5 rounded-full", sel === k ? "bg-acc-ink" : "bg-acc")} />}{plan && <span className={cx("h-1.5 w-1.5 rounded-full", sel === k ? "bg-acc-ink/60" : "bg-acc-2")} />}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-mute"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-acc" />Fait</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-acc-2" />Prévu</span></div>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-semibold capitalize">{selDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</h2>
          <div className="mt-3 grid gap-2">
            {doneOn(sel).map((s) => <div key={s.id} className="rounded-xl border border-acc/25 bg-acc/[.06] p-3 text-sm"><div className="font-semibold">✓ {s.title}</div><div className="text-xs text-mute">{s.durationMin} min · +{s.xp} XP</div></div>)}
            {planOn(sel).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                <div><div className="font-semibold">{p.title}</div><div className="text-xs text-mute">Prévu</div></div>
                <div className="flex gap-1">
                  {sel === today && <Link href={`/session/${p.dayKey}`} aria-label="Commencer" className="grid h-9 w-9 place-items-center rounded-lg bg-acc text-acc-ink"><Play className="h-4 w-4" /></Link>}
                  <button onClick={() => setPlanned(data.planned.filter((x) => x.id !== p.id))} aria-label="Retirer" className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {!doneOn(sel).length && !planOn(sel).length && <p className="text-sm text-mute">Rien ce jour-là{sel >= today ? " : jour de repos ou séance à planifier." : "."}</p>}
          </div>
          {sel >= today && (
            <div className="mt-5 grid gap-2">
              <div className="text-sm font-semibold">Planifier une séance</div>
              <select value={pick} onChange={(e) => setPick(e.target.value)} className="h-12 rounded-xl border border-line bg-surface-2 px-3 text-ink" aria-label="Séance">
                {prog.workouts.map((w) => <option key={w.key} value={w.key}>{w.key} · {w.title}</option>)}
              </select>
              <Button onClick={add}><Plus className="h-4 w-4" /> Ajouter</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
