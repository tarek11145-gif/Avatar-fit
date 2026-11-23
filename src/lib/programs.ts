import { EXERCISES, byId } from "./exercises";
import type { Equipment, Exercise, Goal, Level, Profile, Session } from "./types";

export interface Block { exerciseId: string; sets: number; reps: number; restSec: number }
export interface Workout { key: string; title: string; focus: string; blocks: Block[]; minutes: number }
export interface Program { id: string; name: string; goal: Goal; level: Level; weeks: number; perWeek: number; workouts: Workout[]; description: string }

export const GOALS: Record<Goal, { label: string; blurb: string }> = {
  perte: { label: "Perdre du gras", blurb: "Circuits, cardio, dépense régulière" },
  muscle: { label: "Prendre du muscle", blurb: "Charges progressives, volume" },
  forme: { label: "Être en forme", blurb: "Équilibre force, cardio, mobilité" },
  endurance: { label: "Endurance", blurb: "Cœur, souffle, résistance" },
};
export const LEVELS: Record<Level, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" };
export const EQUIP: Record<Equipment, string> = { aucun: "Sans matériel", halteres: "Haltères", salle: "Salle de sport" };

const allowed = (e: Exercise, eq: Equipment) =>
  e.equipment === "aucun" || eq === "salle" || (eq === "halteres" && e.equipment === "halteres");

function pick(ids: string[], eq: Equipment, lowImpact: boolean, maxDiff: number): string[] {
  return ids.filter((id) => {
    const e = byId(id);
    return e && allowed(e, eq) && (!lowImpact || e.lowImpact) && e.difficulty <= maxDiff;
  });
}

const TEMPLATES: Record<Goal, { title: string; focus: string; pool: string[] }[]> = {
  muscle: [
    { title: "Haut du corps — poussée", focus: "Pectoraux, épaules, triceps", pool: ["bench-press", "pushup", "knee-pushup", "ohp", "lat-raise", "dips-chair", "triceps-ext", "plank"] },
    { title: "Bas du corps", focus: "Quadriceps, fessiers, ischios", pool: ["back-squat", "squat-goblet", "bw-squat", "rdl", "lunge", "glute-bridge", "crunch"] },
    { title: "Haut du corps — tirage", focus: "Dos, biceps", pool: ["pulldown", "db-row", "superman", "curl", "lat-raise", "side-plank"] },
    { title: "Corps complet", focus: "Tout le corps", pool: ["squat-goblet", "bw-squat", "pushup", "knee-pushup", "db-row", "rdl", "glute-bridge", "plank"] },
  ],
  perte: [
    { title: "Circuit corps complet", focus: "Dépense et force", pool: ["jumping-jack", "march", "bw-squat", "pushup", "knee-pushup", "lunge", "plank", "high-knees"] },
    { title: "Cardio + gainage", focus: "Souffle et tronc", pool: ["high-knees", "march", "burpee", "crunch", "dead-bug", "side-plank", "jumping-jack"] },
    { title: "Force métabolique", focus: "Grands muscles", pool: ["squat-goblet", "bw-squat", "db-row", "rdl", "pushup", "knee-pushup", "glute-bridge", "bird-dog"] },
    { title: "Endurance active", focus: "Cardio long", pool: ["jog", "march", "walk-cooldown", "hip-circles"] },
  ],
  forme: [
    { title: "Force essentielle", focus: "Mouvements de base", pool: ["bw-squat", "squat-goblet", "pushup", "knee-pushup", "db-row", "glute-bridge", "plank"] },
    { title: "Cardio & mobilité", focus: "Souffle et amplitude", pool: ["march", "jumping-jack", "world-greatest", "hip-circles", "shoulder-dislocates", "cat-cow"] },
    { title: "Gainage & posture", focus: "Tronc et dos", pool: ["plank", "side-plank", "dead-bug", "bird-dog", "superman", "glute-bridge"] },
    { title: "Corps complet", focus: "Tout le corps", pool: ["lunge", "pushup", "knee-pushup", "rdl", "crunch", "high-knees"] },
  ],
  endurance: [
    { title: "Footing facile", focus: "Base aérobie", pool: ["jog", "march", "walk-cooldown"] },
    { title: "Intervalles", focus: "Cardio fractionné", pool: ["high-knees", "jumping-jack", "burpee", "march", "plank"] },
    { title: "Renfo du coureur", focus: "Jambes et gainage", pool: ["lunge", "bw-squat", "glute-bridge", "side-plank", "bird-dog", "hamstring-stretch"] },
    { title: "Sortie longue", focus: "Endurance", pool: ["jog", "walk-cooldown", "quad-stretch"] },
  ],
};

const WARMUP = ["hip-circles", "march"];
const COOLDOWN = ["hamstring-stretch", "chest-stretch", "breathing"];

export function age(p: Profile) { return new Date().getFullYear() - p.birthYear; }

/** Construit le programme personnalisé à partir du profil. */
export function buildProgram(p: Profile): Program {
  const low = age(p) >= 50 || p.level === "debutant";
  const maxDiff = p.level === "debutant" ? 1 : p.level === "intermediaire" ? 2 : 3;
  const per = Math.min(Math.max(p.daysPerWeek, 2), 5);
  const tpl = TEMPLATES[p.goal];
  const n = { debutant: 4, intermediaire: 5, avance: 6 }[p.level];
  const sets = { debutant: 2, intermediaire: 3, avance: 4 }[p.level];
  const workouts: Workout[] = Array.from({ length: per }, (_, i) => {
    const t = tpl[i % tpl.length];
    const ids = pick(t.pool, p.equipment, low, maxDiff).slice(0, n);
    const fallback = ids.length ? ids : pick(t.pool, "aucun", true, 3).slice(0, n);
    const blocks: Block[] = [
      ...pick(WARMUP, "aucun", true, 1).map((id) => ({ exerciseId: id, sets: 1, reps: byId(id)!.reps, restSec: 15 })),
      ...fallback.map((id) => {
        const e = byId(id)!;
        const reps = e.seconds ? e.reps : p.goal === "muscle" ? Math.min(e.reps, 10) : p.goal === "perte" ? Math.max(e.reps, 12) : e.reps;
        return { exerciseId: id, sets: e.seconds && e.reps >= 300 ? 1 : sets, reps, restSec: p.goal === "muscle" ? 90 : 45 };
      }),
      ...COOLDOWN.slice(0, 2).map((id) => ({ exerciseId: id, sets: 1, reps: byId(id)!.reps, restSec: 10 })),
    ];
    return { key: `J${i + 1}`, title: t.title, focus: t.focus, blocks, minutes: estimateMinutes(blocks) };
  });
  return {
    id: `${p.goal}-${p.level}-${p.equipment}-${per}`,
    name: `${GOALS[p.goal].label} · ${LEVELS[p.level]}`,
    goal: p.goal, level: p.level, weeks: 8, perWeek: per, workouts,
    description: `${per} séances par semaine pendant 8 semaines. La charge augmente chaque semaine, avec une semaine plus légère toutes les 4 semaines pour récupérer.${low ? " Exercices à faible impact privilégiés." : ""}`,
  };
}

/** Progression : +1 rép./semaine (ou +5 s), semaine 4 et 8 allégées. */
export function progressed(b: Block, week: number): Block {
  const e = byId(b.exerciseId)!;
  const w = Math.max(1, week);
  const deload = w % 4 === 0;
  const inc = e.seconds ? (e.reps >= 300 ? 60 : 5) : 1;
  const reps = Math.round((b.reps + inc * Math.min(w - 1, 6)) * (deload ? 0.8 : 1));
  return { ...b, reps, sets: deload ? Math.max(1, b.sets - 1) : b.sets };
}

export function estimateMinutes(blocks: Block[]) {
  let s = 0;
  for (const b of blocks) {
    const e = byId(b.exerciseId)!;
    const work = e.seconds ? b.reps : b.reps * 3.5;
    s += b.sets * (work + b.restSec) + 30;
  }
  return Math.max(10, Math.round(s / 60));
}

export function programWeek(p: Profile) {
  const start = new Date(p.createdAt).getTime();
  return Math.min(8, Math.floor((Date.now() - start) / (7 * 864e5)) + 1);
}

/** Prochaine séance : la première du programme pas encore faite cette semaine. */
export function nextWorkout(prog: Program, sessions: Session[]): Workout {
  const monday = startOfWeek(new Date()).getTime();
  const done = new Set(sessions.filter((s) => new Date(s.date).getTime() >= monday).map((s) => s.programDay));
  return prog.workouts.find((w) => !done.has(w.key)) ?? prog.workouts[0];
}

export function startOfWeek(d: Date) {
  const x = new Date(d); const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - day); return x;
}

export const ALL_EXERCISES = EXERCISES;
