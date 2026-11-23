"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Droplets, Minus, Plus, Trash2 } from "lucide-react";
import { Bar, Button, Card, Chip, Field, PageHeader, Ring, Stat, inputCls } from "@/components/ui";
import { dayKey } from "@/lib/gamification";
import { FOODS, IDEAS, MEALS, dayTotals, needs } from "@/lib/nutrition";
import { uid, useStore } from "@/lib/store";
import type { FoodEntry } from "@/lib/types";

export default function NutritionPage() {
  const { data, saveExtra, toast } = useStore();
  const p = data.profile!, ex = data.extra;
  const n = useMemo(() => needs(p), [p]);
  const [date, setDate] = useState(dayKey(new Date()));
  const [meal, setMeal] = useState<FoodEntry["meal"]>("dejeuner");
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [prot, setProt] = useState("");
  const t = dayTotals(ex.food, date);
  const water = ex.water[date] ?? 0;
  const isToday = date === dayKey(new Date());

  const shift = (d: number) => { const x = new Date(date + "T12:00:00"); x.setDate(x.getDate() + d); setDate(dayKey(x)); };
  async function add(item: { name: string; kcal: number; protein: number }) {
    await saveExtra({ ...ex, food: [...ex.food, { id: uid(), date, meal, ...item }] });
    toast(`${item.name} ajouté`);
  }
  async function addCustom(e: React.FormEvent) {
    e.preventDefault();
    const k = parseFloat(kcal), pr = parseFloat(prot) || 0;
    if (!name.trim() || !(k > 0) || k > 5000) return toast("Indique un nom et des calories valides", "err");
    await add({ name: name.trim(), kcal: Math.round(k), protein: Math.round(pr) });
    setName(""); setKcal(""); setProt("");
  }
  const setWater = (v: number) => saveExtra({ ...ex, water: { ...ex.water, [date]: Math.max(0, v) } });

  return (
    <div className="grid gap-5">
      <PageHeader title="Nutrition" sub={n.note} />
      {n.lowTarget && (
        <div className="flex gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Ton poids visé correspond à un IMC sous 18,5. Parles-en à un professionnel de santé avant de viser cet objectif ; l&apos;app ne propose pas de déficit plus fort pour autant.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Objectif" value={n.kcal} unit="kcal" hint={`Dépense estimée ${n.tdee} kcal`} />
        <Stat label="Protéines" value={n.protein} unit="g" />
        <Stat label="Glucides" value={n.carbs} unit="g" />
        <Stat label="Lipides" value={n.fat} unit="g" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <div className="flex items-center justify-between">
            <button onClick={() => shift(-1)} aria-label="Jour précédent" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/5"><ChevronLeft className="h-5 w-5" /></button>
            <div className="font-semibold capitalize">{isToday ? "Aujourd'hui" : new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
            <button onClick={() => shift(1)} disabled={isToday} aria-label="Jour suivant" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/5 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 flex items-center justify-around gap-4">
            <Ring value={t.kcal / n.kcal} size={140} stroke={11} color={t.kcal > n.kcal * 1.1 ? "var(--color-warn)" : undefined}>
              <div><div className="font-display text-3xl font-semibold tabular-nums">{t.kcal}</div><div className="text-xs text-mute">/ {n.kcal} kcal</div></div>
            </Ring>
            <div className="grid gap-3 text-sm">
              <div><div className="mb-1 flex justify-between gap-6"><span className="text-mute">Protéines</span><span className="tabular-nums">{t.protein}/{n.protein} g</span></div><Bar value={t.protein / n.protein} className="w-40" /></div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-6"><span className="flex items-center gap-1 text-mute"><Droplets className="h-4 w-4 text-acc-2" />Eau</span><span className="tabular-nums">{(water * 0.25).toFixed(2).replace(".", ",")}/{(n.water / 1000).toFixed(1).replace(".", ",")} L</span></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setWater(water - 1)} aria-label="Retirer un verre" className="grid h-9 w-9 place-items-center rounded-lg bg-surface-3"><Minus className="h-4 w-4" /></button>
                  <span className="w-16 text-center text-xs text-mute">{water} verre{water > 1 ? "s" : ""}</span>
                  <button onClick={() => setWater(water + 1)} aria-label="Ajouter un verre" className="grid h-9 w-9 place-items-center rounded-lg bg-acc text-acc-ink"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            {MEALS.map((m) => {
              const items = t.items.filter((x) => x.meal === m.id);
              return (
                <div key={m.id}>
                  <div className="flex justify-between text-sm font-semibold"><span>{m.label}</span><span className="text-mute tabular-nums">{items.reduce((a, x) => a + x.kcal, 0)} kcal</span></div>
                  {items.length ? <ul className="mt-1 divide-y divide-line">{items.map((x) => (
                    <li key={x.id} className="flex items-center justify-between py-2 text-sm"><span>{x.name}</span><span className="flex items-center gap-2 text-mute tabular-nums">{x.kcal} kcal · {x.protein} g<button onClick={() => saveExtra({ ...ex, food: ex.food.filter((y) => y.id !== x.id) })} aria-label={`Retirer ${x.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button></span></li>
                  ))}</ul> : <p className="mt-1 text-xs text-faint">Rien pour l&apos;instant.</p>}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid content-start gap-5">
          <Card>
            <h2 className="font-display text-lg font-semibold">Ajouter</h2>
            <div className="mt-3 flex gap-2 overflow-x-auto noscroll">{MEALS.map((m) => <Chip key={m.id} active={meal === m.id} onClick={() => setMeal(m.id)}>{m.label}</Chip>)}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {FOODS.map((f) => <button key={f.name} onClick={() => add(f)} className="rounded-full border border-line px-3 py-1.5 text-xs text-mute hover:border-acc hover:text-ink">{f.name} · {f.kcal}</button>)}
            </div>
            <form onSubmit={addCustom} className="mt-5 grid gap-3 sm:grid-cols-[1fr_110px_110px]">
              <Field label="Autre aliment"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. couscous" /></Field>
              <Field label="kcal"><input className={inputCls} type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} /></Field>
              <Field label="Protéines (g)"><input className={inputCls} type="number" inputMode="numeric" value={prot} onChange={(e) => setProt(e.target.value)} /></Field>
              <Button type="submit" className="sm:col-span-3"><Plus className="h-4 w-4" /> Ajouter au {MEALS.find((m) => m.id === meal)!.label.toLowerCase()}</Button>
            </form>
          </Card>
          <Card>
            <h2 className="font-display text-lg font-semibold">Idées de repas</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {MEALS.map((m) => <div key={m.id}><div className="text-sm font-semibold">{m.label}</div><ul className="mt-1 grid gap-1 text-sm text-mute">{IDEAS[m.id].map((i) => <li key={i}>• {i}</li>)}</ul></div>)}
            </div>
            <p className="mt-4 text-xs text-faint">Calcul : métabolisme de base {n.bmr} kcal (formule de Mifflin-St Jeor) × activité. Valeurs moyennes, à ajuster selon ta faim, ton énergie et ta progression. Ce n&apos;est pas un avis médical.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
