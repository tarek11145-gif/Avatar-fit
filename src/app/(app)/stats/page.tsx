"use client";
import * as Icons from "lucide-react";
import { useMemo, useState } from "react";
import { BarsChart, LineTrend, SkillsRadar } from "@/components/charts";
import { Card, Chip, Empty, PageHeader, Stat, cx } from "@/components/ui";
import { byId, CATEGORIES } from "@/lib/exercises";
import { fmtDate, fmtNum } from "@/lib/format";
import { badges, dayKey, levelOf, records, skills, titleOf, totals, weekStreak } from "@/lib/gamification";
import { startOfWeek } from "@/lib/programs";
import { useStore } from "@/lib/store";

export default function StatsPage() {
  const { data, deleteSession, toast } = useStore();
  const S = data.sessions;
  const [range, setRange] = useState<4 | 12>(4);
  const t = totals(S), lv = levelOf(t.xp);

  const weekly = useMemo(() => {
    const out: { semaine: string; minutes: number; seances: number }[] = [];
    const m0 = startOfWeek(new Date());
    for (let i = range - 1; i >= 0; i--) {
      const a = new Date(m0); a.setDate(a.getDate() - 7 * i); const b = new Date(a); b.setDate(b.getDate() + 7);
      const ss = S.filter((s) => { const d = new Date(s.date); return d >= a && d < b; });
      out.push({ semaine: a.toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" }), minutes: totals(ss).minutes, seances: ss.length });
    }
    return out;
  }, [S, range]);
  const volume = useMemo(() => [...S].reverse().slice(-20).map((s) => ({ date: new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" }), series: s.exercises.reduce((a, e) => a + e.sets.length, 0) })), [S]);
  const heat = useMemo(() => {
    const days: { k: string; n: number }[] = []; const end = new Date();
    const start = startOfWeek(new Date(end.getTime() - 15 * 7 * 864e5));
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) { const k = dayKey(d); days.push({ k, n: S.filter((s) => dayKey(s.date) === k).length }); }
    return days;
  }, [S]);
  const recs = records(S);
  const bdg = badges(S);

  if (!S.length) return (
    <div><PageHeader title="Statistiques" /><Empty icon={<Icons.BarChart3 className="h-5 w-5" />} title="Tes stats apparaîtront ici" text="Termine ta première séance pour voir ta progression, tes records et tes compétences." /></div>
  );

  return (
    <div className="grid gap-5">
      <PageHeader title="Statistiques" sub={`Niveau ${lv.level} · ${titleOf(lv.level)} · ${fmtNum(t.xp)} XP`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Séances" value={t.count} />
        <Stat label="Temps actif" value={Math.round(t.minutes / 6) / 10} unit="h" />
        <Stat label="Séries" value={fmtNum(t.sets)} />
        <Stat label="Régularité" value={weekStreak(S)} unit="sem." hint="semaines d'affilée" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Minutes par semaine</h2><div className="flex gap-1.5"><Chip active={range === 4} onClick={() => setRange(4)}>4 sem.</Chip><Chip active={range === 12} onClick={() => setRange(12)}>12 sem.</Chip></div></div>
          <BarsChart data={weekly} x="semaine" y="minutes" unit="min" />
        </Card>
        <Card>
          <h2 className="font-display text-lg font-semibold">Compétences</h2>
          <p className="text-sm text-mute">Ce que tu sais faire, et qui grandit avec la pratique.</p>
          <SkillsRadar data={skills(S)} />
        </Card>
        <Card>
          <h2 className="font-display text-lg font-semibold">Séries par séance</h2>
          <LineTrend data={volume} x="date" y="series" unit="séries" />
        </Card>
        <Card>
          <h2 className="font-display text-lg font-semibold">Calendrier d&apos;activité</h2>
          <div className="mt-4 grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto noscroll">
            {heat.map((d) => <div key={d.k} title={`${d.k} : ${d.n} séance(s)`} className={cx("h-4 w-4 rounded-[5px]", d.n === 0 ? "bg-white/[.06]" : d.n === 1 ? "bg-acc/55" : "bg-acc")} />)}
          </div>
          <h3 className="mt-5 text-sm font-semibold">Répartition</h3>
          <div className="mt-2 flex flex-wrap gap-2">{CATEGORIES.filter((c) => t.cats[c.id]).map((c) => <span key={c.id} className="rounded-full bg-surface-3 px-3 py-1.5 text-xs">{c.label} · {t.cats[c.id]}</span>)}</div>
        </Card>
      </div>
      <Card>
        <h2 className="font-display text-lg font-semibold">Badges · {bdg.filter((b) => b.got).length}/{bdg.length}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {bdg.map((b) => { const I = (Icons as unknown as Record<string, Icons.LucideIcon>)[b.icon] ?? Icons.Award; return (
            <div key={b.id} className={cx("rounded-2xl border p-4", b.got ? "border-acc/30 bg-acc/[.06]" : "border-line opacity-50")}>
              <I className={cx("h-6 w-6", b.got ? "text-acc" : "text-mute")} />
              <div className="mt-2 text-sm font-semibold">{b.name}</div><div className="text-xs text-mute">{b.desc}</div>
            </div>); })}
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold">Records personnels</h2>
          {recs.length ? <ul className="mt-2 divide-y divide-line">{recs.slice(0, 10).map((r) => <li key={r.id} className="flex justify-between py-2.5 text-sm"><span>{byId(r.id)?.name}</span><span className="tabular-nums text-mute">{r.weight ? `${r.weight} kg × ${r.reps}` : byId(r.id)?.seconds ? `${r.reps} s` : `${r.reps} rép.`}</span></li>)}</ul> : <p className="mt-2 text-sm text-mute">Aucun record pour l&apos;instant.</p>}
        </Card>
        <Card>
          <h2 className="font-display text-lg font-semibold">Historique</h2>
          <ul className="mt-2 max-h-[420px] divide-y divide-line overflow-y-auto">
            {S.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div><div className="font-medium">{s.title}</div><div className="text-xs text-mute">{fmtDate(s.date)} · {s.durationMin} min · {s.exercises.length} exercices{s.feeling ? ` · ressenti ${s.feeling}/5` : ""}</div></div>
                <button onClick={() => { deleteSession(s.id); toast("Séance supprimée"); }} aria-label={`Supprimer ${s.title}`} className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:bg-white/5 hover:text-danger"><Icons.Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
