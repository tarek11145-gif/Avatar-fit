"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarPlus, Check, Clock, Play } from "lucide-react";
import { Bar, Button, Card, PageHeader, cx } from "@/components/ui";
import { byId, fmtWork } from "@/lib/exercises";
import { dayKey } from "@/lib/gamification";
import { EQUIP, GOALS, LEVELS, buildProgram, programWeek, progressed, startOfWeek } from "@/lib/programs";
import { uid, useStore } from "@/lib/store";

export default function ProgramsPage() {
  const { data, setPlanned, toast } = useStore();
  const p = data.profile!;
  const prog = useMemo(() => buildProgram(p), [p]);
  const week = programWeek(p);
  const [open, setOpen] = useState<string | undefined>(prog.workouts[0]?.key);
  const monday = startOfWeek(new Date());
  const doneKeys = new Set(data.sessions.filter((s) => new Date(s.date) >= monday).map((s) => s.programDay));

  async function planWeek() {
    // Répartit les séances sur la semaine en laissant des jours de repos
    const spread: Record<number, number[]> = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5] };
    const today = dayKey(new Date());
    const items = prog.workouts.map((w, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + (spread[prog.perWeek] ?? [0, 2, 4])[i]);
      return { id: uid(), date: dayKey(d), title: w.title, dayKey: w.key };
    }).filter((x) => x.date >= today);
    const weekKeys = new Set(Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return dayKey(d); }));
    await setPlanned([...data.planned.filter((x) => !weekKeys.has(x.date)), ...items]);
    toast(items.length ? `${items.length} séances ajoutées au calendrier` : "Plus de jour disponible cette semaine");
  }

  return (
    <div>
      <PageHeader title="Mon programme" sub={prog.description}
        right={<Button variant="ghost" onClick={planWeek}><CalendarPlus className="h-4 w-4" /> Planifier la semaine</Button>} />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-display text-xl font-semibold">{prog.name}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-mute">
              <span className="rounded-full bg-surface-3 px-2.5 py-1">{GOALS[p.goal].label}</span>
              <span className="rounded-full bg-surface-3 px-2.5 py-1">{LEVELS[p.level]}</span>
              <span className="rounded-full bg-surface-3 px-2.5 py-1">{EQUIP[p.equipment]}</span>
              <span className="rounded-full bg-surface-3 px-2.5 py-1">{prog.perWeek} séances/sem.</span>
            </div>
          </div>
          <div className="min-w-[200px] flex-1 sm:max-w-xs">
            <div className="mb-1.5 flex justify-between text-sm"><span>Semaine {week} sur {prog.weeks}</span><span className="text-mute">{week % 4 === 0 ? "Semaine allégée" : "Progression"}</span></div>
            <Bar value={week / prog.weeks} />
          </div>
        </div>
        <p className="mt-4 text-sm text-mute">Change d&apos;objectif, de niveau ou de matériel dans ton <Link href="/profile" className="text-acc">profil</Link> : le programme se recalcule tout seul.</p>
      </Card>

      <div className="grid gap-3">
        {prog.workouts.map((w) => {
          const done = doneKeys.has(w.key), isOpen = open === w.key;
          return (
            <Card key={w.key} className={cx("p-0", done && "border-acc/30")}>
              <button className="flex w-full items-center justify-between gap-3 p-5 text-left" onClick={() => setOpen(isOpen ? undefined : w.key)} aria-expanded={isOpen}>
                <div className="flex items-center gap-4">
                  <div className={cx("grid h-11 w-11 place-items-center rounded-2xl font-display font-semibold", done ? "bg-acc text-acc-ink" : "bg-surface-3")}>{done ? <Check className="h-5 w-5" /> : w.key}</div>
                  <div><div className="font-semibold">{w.title}</div><div className="text-sm text-mute">{w.focus} · <Clock className="inline h-3.5 w-3.5" /> {w.minutes} min</div></div>
                </div>
                <span className="text-sm text-mute">{isOpen ? "Masquer" : "Détails"}</span>
              </button>
              {isOpen && (
                <div className="border-t border-line px-5 pb-5">
                  <ul className="divide-y divide-line">
                    {w.blocks.map((b0, i) => {
                      const b = progressed(b0, week), e = byId(b.exerciseId)!;
                      return (
                        <li key={i} className="flex items-center justify-between gap-3 py-3 text-sm">
                          <Link href={`/exercises/${e.id}`} className="font-medium hover:text-acc">{e.name}</Link>
                          <span className="shrink-0 text-mute tabular-nums">{b.sets > 1 ? `${b.sets} × ` : ""}{fmtWork(e, b.reps)} · repos {b.restSec} s</span>
                        </li>
                      );
                    })}
                  </ul>
                  <Button className="mt-3" href={`/session/${w.key}`}><Play className="h-4 w-4" /> {done ? "Refaire cette séance" : "Commencer"}</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
