"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Apple, ArrowRight, Bot, ChevronRight, Clock, Flame, Lightbulb, Play, Send, TrendingUp, Trophy, Zap } from "lucide-react";
import Avatar3D from "@/components/avatar/AvatarLazy";
import { BarsChart } from "@/components/charts";
import { Bar, Button, Card, Empty, Ring, Stat, cx, inputCls } from "@/components/ui";
import { byId } from "@/lib/exercises";
import { DAYS, fmtDate, hello } from "@/lib/format";
import { challenges, dayKey, levelOf, titleOf, totals, weekStreak } from "@/lib/gamification";
import { buildProgram, nextWorkout, programWeek, startOfWeek } from "@/lib/programs";
import { useStore } from "@/lib/store";
import { useBody } from "@/lib/useBody";
import { dayTotals, needs } from "@/lib/nutrition";

export default function Dashboard() {
  const { data } = useStore();
  const router = useRouter();
  const p = data.profile!;
  const body = useBody(0);
  const prog = useMemo(() => buildProgram(p), [p]);
  const today = nextWorkout(prog, data.sessions);
  const week = programWeek(p);
  const monday = startOfWeek(new Date());
  const weekSessions = data.sessions.filter((s) => new Date(s.date) >= monday);
  const tot = totals(data.sessions), wk = totals(weekSessions);
  const lv = levelOf(tot.xp), streak = weekStreak(data.sessions);
  const [q, setQ] = useState("");
  const nut = useMemo(() => needs(p), [p]);
  const eaten = dayTotals(data.extra.food, dayKey(new Date()));
  const ws = [...data.extra.weights].sort((a, b) => a.date.localeCompare(b.date));
  const w0 = ws[0]?.kg ?? p.weightKg, w1 = ws[ws.length - 1]?.kg ?? p.weightKg;
  const wProg = p.targetWeightKg === w0 ? 1 : Math.max(0, Math.min(1, (w0 - w1) / (w0 - p.targetWeightKg)));

  const last14 = useMemo(() => {
    const out: { jour: string; minutes: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d);
      out.push({ jour: d.toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" }), minutes: data.sessions.filter((s) => dayKey(s.date) === k).reduce((a, s) => a + s.durationMin, 0) });
    }
    return out;
  }, [data.sessions]);

  const tips = useMemo(() => {
    const t: string[] = [];
    const lastDate = data.sessions[0] ? new Date(data.sessions[0].date) : null;
    const days = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / 864e5) : null;
    if (!data.sessions.length) t.push("Commence par ta séance du jour : 1 séance réussie vaut mieux qu'un plan parfait.");
    else if (days !== null && days >= 4) t.push(`Ta dernière séance date de ${days} jours. Une séance courte aujourd'hui relance la machine.`);
    if (weekSessions.length >= p.daysPerWeek) t.push("Objectif de la semaine atteint ! Un jour de repos ou une séance de mobilité, c'est aussi progresser.");
    if (!body.scanned) t.push("Scanne-toi en 3 photos pour que ton avatar ait tes vraies formes.");
    if ((tot.cats.mobilite ?? 0) + (tot.cats.etirements ?? 0) < 3) t.push("Ajoute 10 minutes de mobilité : moins de raideurs, meilleure technique.");
    if (week % 4 === 0) t.push("Semaine plus légère dans ton programme : laisse ton corps récupérer.");
    return t.slice(0, 3);
  }, [data.sessions, weekSessions.length, p.daysPerWeek, body.scanned, tot.cats, week]);

  function ask(e: React.FormEvent) {
    e.preventDefault();
    try { sessionStorage.setItem("coach:draft", q); } catch {}
    router.push("/coach");
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-mute">{fmtDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="font-display text-[30px] font-semibold tracking-tight sm:text-[38px]">{hello()}, {p.name} <span className="text-acc">·</span></h1>
        </div>
        <Link href="/profile" className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5">
          <Zap className="h-4 w-4 text-acc" /><span className="text-sm font-semibold">Niv. {lv.level} · {titleOf(lv.level)}</span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-acc" style={{ width: `${lv.pct * 100}%` }} /></div>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <Card className="stage relative overflow-hidden p-0">
          <Avatar3D className="h-[360px] sm:h-[420px]" shape={body.shape} look={body.look} ratios={body.ratios} autoRotate />
          <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold backdrop-blur">{body.scanned ? "Scanné à tes formes" : "Avatar estimé"}</div>
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-2">
            <Button size="sm" variant="subtle" href="/avatar">Voir mon objectif <ArrowRight className="h-4 w-4" /></Button>
            {!body.scanned && <Button size="sm" href="/avatar#scan">Scanner</Button>}
          </div>
        </Card>

        <div className="grid gap-5">
          <Card delay={0.05} className="relative overflow-hidden">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-acc/15 blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-acc">Entraînement du jour · Semaine {week}/8</div>
                <h2 className="mt-1.5 font-display text-2xl font-semibold">{today.title}</h2>
                <p className="text-sm text-mute">{today.focus}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-mute">
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{today.minutes} min</span>
                  <span>{today.blocks.length} exercices</span>
                </div>
              </div>
              <Ring value={weekSessions.length / p.daysPerWeek} size={92} stroke={8}>
                <div><div className="font-display text-xl font-semibold">{weekSessions.length}/{p.daysPerWeek}</div><div className="text-[11px] text-mute">semaine</div></div>
              </Ring>
            </div>
            <div className="relative mt-4 flex gap-2 overflow-x-auto noscroll">
              {today.blocks.slice(0, 6).map((b) => <span key={b.exerciseId} className="shrink-0 rounded-full bg-surface-3 px-3 py-1.5 text-xs text-mute">{byId(b.exerciseId)?.name}</span>)}
            </div>
            <Button className="relative mt-5 w-full sm:w-auto" size="lg" href={`/session/${today.key}`}><Play className="h-5 w-5" /> Commencer la séance</Button>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Minutes (semaine)" value={wk.minutes} unit="min" />
            <Stat label="Séances" value={tot.count} hint="au total" />
            <Stat label="Série" value={streak} unit="sem." hint="2 séances/sem." />
            <Stat label="XP" value={tot.xp} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" delay={0.08}>
          <div className="flex items-center justify-between"><h3 className="font-display text-lg font-semibold">Activité · 14 jours</h3><Link href="/stats" className="flex items-center text-sm text-mute hover:text-ink">Stats <ChevronRight className="h-4 w-4" /></Link></div>
          <BarsChart data={last14} x="jour" y="minutes" unit="min" />
        </Card>
        <Card delay={0.1}>
          <h3 className="font-display text-lg font-semibold">Cette semaine</h3>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {DAYS.map((d, i) => {
              const day = new Date(monday); day.setDate(monday.getDate() + i); const k = dayKey(day);
              const done = data.sessions.some((s) => dayKey(s.date) === k), plan = data.planned.some((x) => x.date === k), isToday = k === dayKey(new Date());
              return (
                <Link key={d} href="/calendar" className={cx("grid place-items-center gap-1 rounded-xl py-2 text-xs", isToday ? "bg-surface-3" : "")}>
                  <span className="text-mute">{d}</span><span className="font-semibold">{day.getDate()}</span>
                  <span className={cx("h-1.5 w-1.5 rounded-full", done ? "bg-acc" : plan ? "bg-acc-2" : "bg-white/10")} />
                </Link>
              );
            })}
          </div>
          <h4 className="mt-5 text-sm font-semibold">Défis</h4>
          <div className="mt-2 grid gap-3">
            {challenges(data.sessions).map((c) => (
              <div key={c.id}><div className="mb-1 flex justify-between text-xs"><span className="text-mute">{c.name}</span><span className="tabular-nums">{Math.min(c.value, c.target)}/{c.target}</span></div><Bar value={c.value / c.target} /></div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Link href="/nutrition"><Card delay={0.1} className="h-full transition hover:border-line-strong">
          <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-display text-lg font-semibold"><Apple className="h-5 w-5 text-acc" /> Nutrition</h3><ChevronRight className="h-4 w-4 text-mute" /></div>
          <div className="mt-3 flex items-baseline gap-1.5"><span className="font-display text-3xl font-semibold tabular-nums">{eaten.kcal}</span><span className="text-sm text-mute">/ {nut.kcal} kcal aujourd&apos;hui</span></div>
          <Bar value={eaten.kcal / nut.kcal} className="mt-3" />
          <p className="mt-2 text-xs text-mute">Protéines : {eaten.protein}/{nut.protein} g</p>
        </Card></Link>
        <Link href="/progress"><Card delay={0.11} className="h-full transition hover:border-line-strong">
          <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-display text-lg font-semibold"><TrendingUp className="h-5 w-5 text-acc" /> Objectif poids</h3><ChevronRight className="h-4 w-4 text-mute" /></div>
          <div className="mt-3 flex items-baseline gap-1.5"><span className="font-display text-3xl font-semibold tabular-nums">{w1}</span><span className="text-sm text-mute">kg → {p.targetWeightKg} kg</span></div>
          <Bar value={wProg} className="mt-3" />
          <p className="mt-2 text-xs text-mute">{ws.length} pesée{ws.length > 1 ? "s" : ""} · photos avant/après dans Progrès</p>
        </Card></Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card delay={0.12}>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><Lightbulb className="h-5 w-5 text-acc" /> Pour toi</h3>
          <ul className="mt-3 grid gap-3">{tips.map((t) => <li key={t} className="rounded-xl bg-surface-2 p-3 text-sm text-mute">{t}</li>)}</ul>
        </Card>
        <Card delay={0.14}>
          <div className="flex items-center justify-between"><h3 className="font-display text-lg font-semibold">Historique</h3><Link href="/stats" className="text-sm text-mute hover:text-ink">Tout voir</Link></div>
          {data.sessions.length ? (
            <ul className="mt-3 divide-y divide-line">
              {data.sessions.slice(0, 4).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                  <div><div className="font-medium">{s.title}</div><div className="text-xs text-mute">{fmtDate(s.date)} · {s.durationMin} min</div></div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-acc"><Flame className="h-3.5 w-3.5" />+{s.xp} XP</span>
                </li>
              ))}
            </ul>
          ) : <div className="mt-3"><Empty icon={<Trophy className="h-5 w-5" />} title="Pas encore de séance" text="Ta première séance débloque ton premier badge." /></div>}
        </Card>
        <Card delay={0.16} className="relative overflow-hidden">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><Bot className="h-5 w-5 text-acc" /> Coach IA</h3>
          <p className="mt-1 text-sm text-mute">Une question sur un exercice, la récup, ta séance ?</p>
          <form onSubmit={ask} className="mt-4 flex gap-2">
            <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex. : j'ai 20 min, que faire ?" aria-label="Question au coach" />
            <button className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-acc text-acc-ink" aria-label="Envoyer"><Send className="h-5 w-5" /></button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Comment récupérer ?", "Explique le squat", "Analyse ma semaine"].map((s) => (
              <button key={s} onClick={() => { try { sessionStorage.setItem("coach:draft", s); } catch {} router.push("/coach"); }} className="rounded-full border border-line px-3 py-1.5 text-xs text-mute hover:text-ink">{s}</button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
