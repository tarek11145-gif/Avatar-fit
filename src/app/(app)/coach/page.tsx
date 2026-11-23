"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Send, Trash2 } from "lucide-react";
import { Button, PageHeader, cx } from "@/components/ui";
import { byId } from "@/lib/exercises";
import { levelOf, totals, weekStreak } from "@/lib/gamification";
import { EQUIP, GOALS, LEVELS, age, buildProgram, programWeek } from "@/lib/programs";
import { uid, useStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";
import { dayTotals, needs } from "@/lib/nutrition";
import { dayKey } from "@/lib/gamification";

const PROMPTS = ["Propose-moi une séance de 20 min sans matériel", "Explique-moi la technique du soulevé de terre", "Comment bien récupérer après une séance ?", "Analyse mes stats de la semaine", "J'ai des courbatures, je m'entraîne quand même ?"];

/** Mise en forme légère : **gras**, listes à puces. */
function Rich({ text }: { text: string }) {
  return (
    <div className="grid gap-1.5">
      {text.split(/\n+/).map((line, i) => {
        const li = /^\s*([-*•]|\d+\.)\s+/.test(line);
        const parts = line.replace(/^\s*([-*•])\s+/, "").split(/(\*\*[^*]+\*\*)/g).map((p, j) => p.startsWith("**") ? <b key={j} className="text-ink">{p.slice(2, -2)}</b> : <span key={j}>{p}</span>);
        return li ? <div key={i} className="flex gap-2"><span className="text-acc">•</span><span>{parts}</span></div> : <p key={i}>{parts}</p>;
      })}
    </div>
  );
}

export default function CoachPage() {
  const { data, addChat, clearChat } = useStore();
  const p = data.profile!;
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const context = useMemo(() => {
    const t = totals(data.sessions), prog = buildProgram(p);
    const week = data.sessions.filter((s) => Date.now() - new Date(s.date).getTime() < 7 * 864e5);
    const last = data.sessions.slice(0, 5).map((s) => `${new Date(s.date).toLocaleDateString("fr-FR")} : ${s.title}, ${s.durationMin} min, ressenti ${s.feeling ?? "?"}/5, ${s.exercises.map((e) => byId(e.exerciseId)?.name).join(", ")}`).join("\n");
    return [`Prénom : ${p.name}, ${age(p)} ans, ${p.heightCm} cm, ${p.weightKg} kg, poids visé ${p.targetWeightKg} kg.`,
      `Objectif : ${GOALS[p.goal].label}. Niveau : ${LEVELS[p.level]}. Matériel : ${EQUIP[p.equipment]}. ${p.daysPerWeek} séances/sem de ${p.minutesPerSession} min.`,
      `Programme : ${prog.name}, semaine ${programWeek(p)}/8.`,
      `Total : ${t.count} séances, ${t.minutes} min, ${t.sets} séries. 7 derniers jours : ${week.length} séances, ${totals(week).minutes} min. Série : ${weekStreak(data.sessions)} semaines. Niveau XP ${levelOf(t.xp).level}.`,
      (() => { const n = needs(p), e = dayTotals(data.extra.food, dayKey(new Date())); return `Nutrition : objectif ${n.kcal} kcal, ${n.protein} g de protéines ; aujourd'hui ${e.kcal} kcal et ${e.protein} g notés.`; })(),
      data.extra.weights.length ? `Pesées : ${[...data.extra.weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-6).map((w) => `${new Date(w.date).toLocaleDateString("fr-FR")} ${w.kg} kg`).join(", ")}.` : "",
      last ? `Dernières séances :\n${last}` : "Aucune séance enregistrée pour l'instant."].join("\n");
  }, [data.sessions, data.extra, p]);

  async function send(text: string) {
    const content = text.trim(); if (!content || busy) return;
    setErr(null); setInput(""); setBusy(true);
    const mine: ChatMessage = { id: uid(), role: "user", content, at: new Date().toISOString() };
    await addChat(mine);
    try {
      const r = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context, messages: [...data.chat, mine].map(({ role, content }) => ({ role, content })) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.message ?? "Le coach ne répond pas.");
      else await addChat({ id: uid(), role: "coach", content: j.text, at: new Date().toISOString() });
    } catch { setErr("Pas de connexion. Réessaie."); }
    setBusy(false);
  }

  useEffect(() => {
    let d: string | null = null;
    try { d = sessionStorage.getItem("coach:draft"); sessionStorage.removeItem("coach:draft"); } catch {}
    if (d) send(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [data.chat.length, busy]);

  return (
    <div className="flex min-h-[calc(100dvh-180px)] flex-col">
      <PageHeader title="Coach IA" sub="Pose tes questions : exercices, séances, récupération, motivation." right={data.chat.length > 0 && <Button variant="ghost" size="sm" onClick={clearChat}><Trash2 className="h-4 w-4" /> Effacer</Button>} />
      <div className="flex-1">
        {data.chat.length === 0 && !busy ? (
          <div className="grid place-items-center gap-4 py-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-acc/10 text-acc glow"><Bot className="h-8 w-8" /></div>
            <p className="max-w-md text-mute">Salut {p.name} ! Je connais ton programme et tes stats. Par quoi on commence ?</p>
            <div className="flex max-w-2xl flex-wrap justify-center gap-2">{PROMPTS.map((q) => <button key={q} onClick={() => send(q)} className="rounded-full border border-line px-4 py-2 text-sm text-mute hover:border-acc hover:text-ink">{q}</button>)}</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.chat.map((m) => (
              <div key={m.id} className={cx("max-w-[88%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed", m.role === "user" ? "ml-auto rounded-br-lg bg-acc text-acc-ink" : "rounded-bl-lg border border-line bg-surface text-mute")}>
                {m.role === "coach" ? <Rich text={m.content} /> : m.content}
              </div>
            ))}
            {busy && <div className="flex w-fit items-center gap-2 rounded-3xl border border-line bg-surface px-4 py-3 text-sm text-mute"><Loader2 className="h-4 w-4 animate-spin text-acc" /> Le coach réfléchit…</div>}
          </div>
        )}
        {err && <p role="alert" className="mt-4 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-sm text-warn">{err}</p>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="sticky bottom-20 mt-4 flex gap-2 rounded-2xl border border-line bg-surface/95 p-2 backdrop-blur lg:bottom-4">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Écris ta question…" aria-label="Ta question" className="h-12 flex-1 rounded-xl bg-transparent px-3 text-ink placeholder:text-faint focus:outline-none" />
        <button disabled={busy || !input.trim()} className="grid h-12 w-12 place-items-center rounded-xl bg-acc text-acc-ink disabled:opacity-40" aria-label="Envoyer"><Send className="h-5 w-5" /></button>
      </form>
      <p className="mt-2 text-center text-xs text-faint">Le coach ne remplace pas un avis médical.</p>
    </div>
  );
}
