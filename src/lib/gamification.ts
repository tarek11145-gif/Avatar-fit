import { byId } from "./exercises";
import type { Category, Session } from "./types";

/** XP total nécessaire pour atteindre le niveau n (n ≥ 1). */
export const xpForLevel = (n: number) => Math.round(120 * Math.pow(n - 1, 1.45));
export function levelOf(xp: number) {
  let n = 1;
  while (xpForLevel(n + 1) <= xp) n++;
  const cur = xpForLevel(n), next = xpForLevel(n + 1);
  return { level: n, into: xp - cur, need: next - cur, pct: (xp - cur) / (next - cur) };
}
export const TITLES = ["Recrue", "Régulier", "Athlète", "Compétiteur", "Élite", "Légende"];
export const titleOf = (lvl: number) => TITLES[Math.min(TITLES.length - 1, Math.floor((lvl - 1) / 4))];

/** XP d'une séance : temps + séries faites. Plafonné : pas plus de 2 séances récompensées par jour (anti-surentraînement). */
export function sessionXp(durationMin: number, setsDone: number, sameDayCount: number) {
  if (sameDayCount >= 2) return 0;
  return Math.min(250, Math.round(durationMin * 3 + setsDone * 4 + 20));
}

export const dayKey = (d: Date | string) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

/** Série : nombre de semaines consécutives avec au moins 2 séances (le repos compte, on ne pousse pas à s'entraîner tous les jours). */
export function weekStreak(sessions: Session[]) {
  const weeks = new Map<number, number>();
  for (const s of sessions) {
    const d = new Date(s.date); const day = (d.getDay() + 6) % 7;
    const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
    weeks.set(m, (weeks.get(m) ?? 0) + 1);
  }
  const now = new Date(); const day = (now.getDay() + 6) % 7;
  let m = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day).getTime();
  let streak = 0;
  if ((weeks.get(m) ?? 0) < 2) m -= 7 * 864e5; // la semaine en cours n'est pas finie
  while ((weeks.get(m) ?? 0) >= 2) { streak++; m -= 7 * 864e5; }
  return streak;
}
export function dayStreak(sessions: Session[]) {
  const days = new Set(sessions.map((s) => dayKey(s.date)));
  let d = new Date(); let n = 0;
  if (!days.has(dayKey(d))) d = new Date(d.getTime() - 864e5);
  while (days.has(dayKey(d))) { n++; d = new Date(d.getTime() - 864e5); }
  return n;
}

export function totals(sessions: Session[]) {
  let minutes = 0, sets = 0, reps = 0, volume = 0;
  const cats: Partial<Record<Category, number>> = {};
  for (const s of sessions) {
    minutes += s.durationMin;
    for (const ex of s.exercises) {
      const e = byId(ex.exerciseId);
      for (const st of ex.sets) if (st.done) {
        sets++; reps += st.reps; volume += st.reps * (st.weight || 0);
        if (e) cats[e.category] = (cats[e.category] ?? 0) + 1;
      }
    }
  }
  return { minutes, sets, reps, volume, cats, count: sessions.length, xp: sessions.reduce((a, s) => a + s.xp, 0) };
}

/** Records personnels : meilleure charge (ou meilleur nombre de rép.) par exercice. */
export function records(sessions: Session[]) {
  const r = new Map<string, { weight: number; reps: number; date: string }>();
  for (const s of sessions) for (const ex of s.exercises) for (const st of ex.sets) if (st.done) {
    const cur = r.get(ex.exerciseId);
    const better = !cur || st.weight > cur.weight || (st.weight === cur.weight && st.reps > cur.reps);
    if (better) r.set(ex.exerciseId, { weight: st.weight, reps: st.reps, date: s.date });
  }
  return [...r.entries()].map(([id, v]) => ({ id, ...v }));
}

/** Compétences (0–100) : ce que tu sais faire, pas à quoi tu ressembles. */
export function skills(sessions: Session[]) {
  const t = totals(sessions);
  const c = t.cats;
  const cap = (v: number, k: number) => Math.round(100 * (1 - Math.exp(-v / k)));
  return [
    { skill: "Force", value: cap((c.musculation ?? 0) + (c.maison ?? 0) * 0.7, 60) },
    { skill: "Cardio", value: cap(c.cardio ?? 0, 30) },
    { skill: "Gainage", value: cap(c.renforcement ?? 0, 30) },
    { skill: "Mobilité", value: cap((c.mobilite ?? 0) + (c.etirements ?? 0), 30) },
    { skill: "Récupération", value: cap(c.recuperation ?? 0, 15) },
    { skill: "Régularité", value: cap(weekStreak(sessions) * 2 + t.count * 0.3, 12) },
  ];
}

export interface Badge { id: string; name: string; desc: string; icon: string; got: boolean }
export function badges(sessions: Session[]): Badge[] {
  const t = totals(sessions), ws = weekStreak(sessions);
  const morning = sessions.some((s) => new Date(s.date).getHours() < 8);
  const recov = (t.cats.recuperation ?? 0) + (t.cats.etirements ?? 0);
  const L = (id: string, name: string, desc: string, icon: string, got: boolean): Badge => ({ id, name, desc, icon, got });
  return [
    L("first", "Premier pas", "Termine ta première séance", "Footprints", t.count >= 1),
    L("five", "Lancé", "5 séances terminées", "Rocket", t.count >= 5),
    L("twenty", "Pilier", "20 séances terminées", "Trophy", t.count >= 20),
    L("streak2", "Constance", "2 semaines d'affilée avec 2 séances ou plus", "Flame", ws >= 2),
    L("streak6", "Habitude", "6 semaines d'affilée", "CalendarCheck", ws >= 6),
    L("hour", "Heure active", "60 minutes cumulées", "Timer", t.minutes >= 60),
    L("ten-hours", "10 heures", "600 minutes cumulées", "Hourglass", t.minutes >= 600),
    L("thousand", "Mille répétitions", "1 000 répétitions au total", "Repeat", t.reps >= 1000),
    L("early", "Lève-tôt", "Une séance avant 8 h", "Sunrise", morning),
    L("recovery", "Sage", "10 exercices de récupération ou d'étirement", "Leaf", recov >= 10),
  ];
}

export interface Challenge { id: string; name: string; target: number; value: number; unit: string; xp: number }
export function challenges(sessions: Session[]): Challenge[] {
  const now = new Date(); const day = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day).getTime();
  const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const wk = sessions.filter((s) => new Date(s.date).getTime() >= monday);
  const mo = sessions.filter((s) => new Date(s.date).getTime() >= month);
  const mob = totals(mo).cats;
  return [
    { id: "w3", name: "3 séances cette semaine", target: 3, value: wk.length, unit: "séances", xp: 60 },
    { id: "w90", name: "90 minutes actives cette semaine", target: 90, value: totals(wk).minutes, unit: "min", xp: 50 },
    { id: "m-mob", name: "10 exercices de mobilité ce mois", target: 10, value: (mob.mobilite ?? 0) + (mob.etirements ?? 0), unit: "exercices", xp: 80 },
  ];
}
