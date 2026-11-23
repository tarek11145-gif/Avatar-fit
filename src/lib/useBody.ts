"use client";
import { useMemo } from "react";
import { defaultShape, estimateMeasures, KEYS, lerp, measuresOf, projectMeasures, ratios, weeksTo } from "./body";
import { useStore } from "./store";
import type { Measures } from "./types";

/** Tout ce qu'il faut pour afficher l'avatar : forme, mensurations actuelles, objectif, ratios d'affichage. */
export function useBody(t = 0) {
  const { data } = useStore();
  const p = data.profile, av = data.avatar;
  const heightCm = p?.heightCm ?? 175, weight = p?.weightKg ?? 75, target = p?.targetWeightKg ?? weight, goal = p?.goal ?? "forme";
  const current = useMemo<Measures>(() => av.measures ?? estimateMeasures(heightCm, weight), [av.measures, heightCm, weight]);
  const shape = useMemo(() => av.shape ?? defaultShape(heightCm, current, av.look.skin), [av.shape, heightCm, current, av.look.skin]);
  const base = useMemo(() => measuresOf(shape), [shape]);
  const goalM = useMemo(() => projectMeasures(current, weight, target, goal), [current, weight, target, goal]);
  const shown = useMemo(() => { const o = {} as Measures; for (const k of KEYS) o[k] = lerp(current[k], goalM[k], t); return o; }, [current, goalM, t]);
  const r = useMemo(() => ratios(shown, base), [shown, base]);
  const gr = useMemo(() => ratios(goalM, base), [goalM, base]);
  const gain = goal === "muscle" ? Math.max(0, target - weight) : 0;
  const loss = goal !== "muscle" ? Math.max(0, weight - target) : 0;
  return {
    shape, look: av.look, current, goal: goalM, shown, ratios: r, goalRatios: gr,
    mk: 1 + t * Math.min(gain, 12) * 0.025, def: 1 + t * Math.min(loss, 20) * 0.06,
    weeks: weeksTo(weight, target, goal), weight, target, heightCm, goalType: goal, scanned: !!av.shape?.fromPhotos,
  };
}
