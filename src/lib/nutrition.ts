import { age } from "./programs";
import type { FoodEntry, Profile } from "./types";

/** Besoins journaliers (Mifflin-St Jeor) avec des garde-fous : jamais sous le métabolisme de base, déficit plafonné. */
export function needs(p: Profile) {
  const a = age(p), w = p.weightKg, h = p.heightCm;
  const s = p.sex === "femme" ? -161 : p.sex === "homme" ? 5 : -78;
  const bmr = Math.round(10 * w + 6.25 * h - 5 * a + s);
  const activity = p.daysPerWeek >= 4 ? 1.55 : 1.4;
  const tdee = Math.round(bmr * activity);
  let kcal = tdee, note = "Maintien : tu manges autant que tu dépenses.";
  if (p.goal === "perte" && p.targetWeightKg < p.weightKg) { const d = Math.min(500, Math.round(tdee * 0.2)); kcal = tdee - d; note = `Déficit modéré de ${d} kcal : environ 0,4 à 0,5 kg par semaine, sans fatigue excessive.`; }
  if (p.goal === "muscle") { kcal = tdee + 250; note = "Léger surplus de 250 kcal : du muscle, le moins de gras possible."; }
  if (p.goal === "endurance") { kcal = tdee + 100; note = "Un peu plus de glucides pour tes sorties d'endurance."; }
  const floor = Math.max(bmr, p.sex === "femme" ? 1200 : p.sex === "homme" ? 1500 : 1400);
  kcal = Math.max(kcal, floor);
  const protein = Math.round(w * (p.goal === "muscle" || p.goal === "perte" ? 1.8 : 1.4));
  const fat = Math.max(Math.round(w * 0.9), Math.round((kcal * 0.25) / 9));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const water = Math.round((w * 33 + 500) / 50) * 50;
  const bmiTarget = p.targetWeightKg / (h / 100) ** 2;
  return { bmr, tdee, kcal, protein, fat, carbs, water, note, lowTarget: bmiTarget < 18.5 };
}

export const MEALS: { id: FoodEntry["meal"]; label: string }[] = [
  { id: "petit-dej", label: "Petit-déjeuner" }, { id: "dejeuner", label: "Déjeuner" }, { id: "diner", label: "Dîner" }, { id: "collation", label: "Collation" },
];

/** Aliments courants (portions types, valeurs moyennes). */
export const FOODS: { name: string; kcal: number; protein: number }[] = [
  { name: "2 œufs", kcal: 155, protein: 13 },
  { name: "Flocons d'avoine 50 g", kcal: 190, protein: 7 },
  { name: "Yaourt grec 150 g", kcal: 145, protein: 13 },
  { name: "Fromage blanc 0 % 200 g", kcal: 100, protein: 16 },
  { name: "Banane", kcal: 105, protein: 1 },
  { name: "Pomme", kcal: 80, protein: 0 },
  { name: "Pain complet 2 tranches", kcal: 160, protein: 7 },
  { name: "Riz cuit 200 g", kcal: 260, protein: 5 },
  { name: "Pâtes cuites 200 g", kcal: 300, protein: 11 },
  { name: "Patate douce 200 g", kcal: 180, protein: 3 },
  { name: "Blanc de poulet 150 g", kcal: 165, protein: 35 },
  { name: "Steak haché 5 % 125 g", kcal: 165, protein: 26 },
  { name: "Saumon 125 g", kcal: 260, protein: 26 },
  { name: "Thon en boîte 100 g", kcal: 115, protein: 26 },
  { name: "Lentilles cuites 200 g", kcal: 230, protein: 18 },
  { name: "Tofu 150 g", kcal: 180, protein: 18 },
  { name: "Légumes 300 g", kcal: 90, protein: 5 },
  { name: "Salade composée", kcal: 350, protein: 15 },
  { name: "Huile d'olive 1 c. à s.", kcal: 90, protein: 0 },
  { name: "Amandes 30 g", kcal: 175, protein: 6 },
  { name: "Shaker whey 30 g", kcal: 120, protein: 24 },
  { name: "Sandwich jambon-beurre", kcal: 420, protein: 20 },
  { name: "Pizza 2 parts", kcal: 560, protein: 24 },
  { name: "Burger + frites", kcal: 950, protein: 35 },
  { name: "Kebab", kcal: 850, protein: 40 },
  { name: "Soda 33 cl", kcal: 140, protein: 0 },
];

export const IDEAS: Record<FoodEntry["meal"], string[]> = {
  "petit-dej": ["Flocons d'avoine + yaourt grec + fruits rouges", "2 œufs + pain complet + fruit", "Fromage blanc + banane + amandes"],
  dejeuner: ["Poulet + riz + légumes + filet d'huile d'olive", "Bowl lentilles, patate douce, légumes rôtis", "Saumon + pâtes complètes + brocolis"],
  diner: ["Omelette 3 œufs + salade + pain complet", "Steak haché 5 % + purée de patate douce + haricots verts", "Tofu sauté + riz + légumes wok"],
  collation: ["Yaourt grec + fruit", "Shaker + banane après la séance", "Poignée d'amandes + pomme"],
};

export function dayTotals(food: FoodEntry[], date: string) {
  const f = food.filter((x) => x.date === date);
  return { kcal: f.reduce((a, x) => a + x.kcal, 0), protein: f.reduce((a, x) => a + x.protein, 0), items: f };
}
