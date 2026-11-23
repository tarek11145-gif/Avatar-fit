import type { BodyShape, Goal, Measures } from "./types";

export const R = (a: number, b: number) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
export const semi = (C: number, k: number): [number, number] => { const a = C / R(1, k); return [a, a * k]; };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Niveaux du torse : 0 = articulation de la hanche, 1 = épaules. */
export const T = [-0.22, -0.1, 0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.82, 0.92, 1];
export const TK = [0.85, 0.74, 0.72, 0.72, 0.74, 0.76, 0.72, 0.68, 0.62, 0.55, 0.5];
/** Niveaux de jambe : 0 = cheville, 1 = hanche. */
export const U = [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1];
export const KEYS: (keyof Measures)[] = ["chest", "waist", "hips", "thigh", "arm"];
export const MEASURE_LABEL: Record<keyof Measures, string> = { chest: "Poitrine", waist: "Taille", hips: "Hanches", thigh: "Cuisse", arm: "Bras" };

/** Mensurations moyennes estimées depuis taille + poids (point de départ avant le scan). */
export function estimateMeasures(heightCm: number, weightKg: number): Measures {
  const bmi = weightKg / (heightCm / 100) ** 2;
  const k = (bmi - 22) / 10;
  return {
    chest: Math.round(heightCm * 0.56 * (1 + k * 0.45)),
    waist: Math.round(heightCm * 0.46 * (1 + k * 0.85)),
    hips: Math.round(heightCm * 0.56 * (1 + k * 0.5)),
    thigh: Math.round(heightCm * 0.32 * (1 + k * 0.5)),
    arm: Math.round(heightCm * 0.18 * (1 + k * 0.45)),
  };
}

export function defaultShape(heightCm: number, m: Measures, skin = "#c98e6b"): BodyShape {
  const H = heightCm / 100, fH = 0.53, fS = 0.8, c = (v: number) => v / 100;
  const C = [m.hips * 0.86, m.hips * 0.97, m.hips, m.hips * 0.96, (m.hips + 2 * m.waist) / 3, m.waist, (2 * m.waist + m.chest) / 3, m.chest, m.chest, m.chest * 0.98, m.chest * 0.8];
  const torso = T.map((t, i) => { const [a, b] = semi(c(C[i]), TK[i]); return { t, f: fH + t * (fS - fH), a, b, z: 0 }; });
  const LC = [23, 24, m.thigh * 0.64, m.thigh * 0.6, m.thigh * 0.82, m.thigh * 0.95, m.thigh * 1.02];
  const legX = torso[2].a * 0.5;
  const legs = U.map((u, i) => { const [a, b] = semi(c(LC[i]), 0.95); return { u, f: 0.045 + u * (0.5 - 0.045), a, b, z: 0, x: legX * (i < 2 ? 0.9 : 1) }; });
  const ru = c(m.arm) / (2 * Math.PI), xS = torso[9].a + ru * 0.2;
  return { H, torso, legs, arm: { fS: 0.795, fE: 0.625, fW: 0.47, xS, xE: xS + 0.04, xW: xS + 0.075, ru, rf: ru * 0.85 }, headR: 0.062 * H, headF: 0.935, skin, fromPhotos: false };
}

export function measuresOf(s: BodyShape): Measures {
  const tc = s.torso.map((q) => R(q.a, q.b) * 100);
  return { hips: Math.max(tc[1], tc[2], tc[3]), waist: Math.min(tc[4], tc[5], tc[6]), chest: tc[7], thigh: R(s.legs[5].a, s.legs[5].b) * 100, arm: 2 * Math.PI * s.arm.ru * 100 };
}

/** Projection des mensurations à l'objectif (répartitions moyennes, cm par kg). */
const COEF: Record<"loss" | "gain", Measures> = {
  loss: { chest: 0.6, waist: 1, hips: 0.7, thigh: 0.45, arm: 0.25 },
  gain: { chest: 1, waist: 0.2, hips: 0.25, thigh: 0.6, arm: 0.6 },
};
export function projectMeasures(m: Measures, weightKg: number, targetKg: number, goal: Goal): Measures {
  const d = targetKg - weightKg;
  const kind = goal === "muscle" ? "gain" : "loss";
  const s = kind === "loss" ? Math.min(d, 0) : Math.max(d, 0);
  const o = { ...m };
  for (const k of KEYS) o[k] = Math.max(m[k] + COEF[kind][k] * s, k === "arm" ? 20 : 40);
  // Objectif forme/endurance sans changement de poids : légère recomposition
  if (goal === "forme" || goal === "endurance") { o.waist = Math.max(40, o.waist - 2); o.thigh += 0.5; }
  return o;
}
export function weeksTo(weightKg: number, targetKg: number, goal: Goal) {
  const d = Math.abs(targetKg - weightKg);
  return d < 0.1 ? 0 : Math.ceil(d / (goal === "muscle" ? 0.25 : 0.5));
}
export const rT = (t: number, r: Measures) =>
  t <= 0.05 ? r.hips : t <= 0.4 ? lerp(r.hips, r.waist, (t - 0.05) / 0.35) : t <= 0.7 ? lerp(r.waist, r.chest, (t - 0.4) / 0.3) : r.chest;
export function ratios(target: Measures, base: Measures): Measures {
  const o = {} as Measures;
  for (const k of KEYS) o[k] = target[k] / base[k];
  return o;
}
