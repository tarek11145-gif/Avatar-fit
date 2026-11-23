"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Camera, Dumbbell, LineChart, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import Avatar3D from "@/components/avatar/AvatarLazy";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";
import { defaultShape, estimateMeasures } from "@/lib/body";
import { DEFAULT_AVATAR, useStore } from "@/lib/store";
import type { Anim } from "@/lib/types";

const FEATURES = [
  { icon: Camera, title: "Scan en 3 photos", text: "Face, profil, dos : l'IA crée ton avatar à tes vraies formes, directement sur ton téléphone." },
  { icon: Sparkles, title: "Vois ton objectif", text: "Fais glisser le curseur : ton avatar se transforme jusqu'au corps que tu vises." },
  { icon: Dumbbell, title: "Programmes sur mesure", text: "Selon ton niveau, ton âge, ton matériel et ton temps. Progressifs, semaine après semaine." },
  { icon: Bot, title: "Coach IA", text: "Pose tes questions, demande une séance, il analyse tes stats et t'encourage." },
  { icon: LineChart, title: "Tes progrès, clairement", text: "Records, régularité, minutes actives et compétences qui grandissent." },
  { icon: Trophy, title: "XP, niveaux, badges", text: "Des défis motivants qui récompensent aussi le repos. Jamais le surentraînement." },
];
const DEMO: { anim: Anim; label: string }[] = [
  { anim: "idle", label: "Repos" }, { anim: "squat", label: "Squat" }, { anim: "jack", label: "Jumping jack" }, { anim: "curl", label: "Curl" }, { anim: "run", label: "Course" },
];

export default function Landing() {
  const { user, data } = useStore();
  const [anim, setAnim] = useState<Anim>("squat");
  const [mus, setMus] = useState(false);
  const m = useMemo(() => estimateMeasures(178, 76), []);
  const shape = useMemo(() => defaultShape(178, m), [m]);
  const ones = useMemo(() => ({ chest: 1, waist: 1, hips: 1, thigh: 1, arm: 1 }), []);
  const cta = user ? (data.profile?.onboarded ? "/dashboard" : "/onboarding") : "/auth";

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" href="/auth">Connexion</Button>
          <Button size="sm" href={cta}>Commencer</Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1180px] items-center gap-6 px-5 pb-10 pt-4 lg:grid-cols-[1.05fr_1fr] lg:pt-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-acc/30 bg-acc/10 px-3 py-1 text-xs font-semibold text-acc"><Sparkles className="h-3.5 w-3.5" /> Nouvelle génération</span>
          <h1 className="mt-5 font-display text-[42px] font-semibold leading-[1.02] tracking-tight sm:text-[60px]">
            Ton corps de demain,<br /><span className="grad-text">en 3D dès aujourd&apos;hui.</span>
          </h1>
          <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-mute">
            Avatar Fit crée ton double 3D à partir de 3 photos, te montre ton objectif, te donne le programme pour l&apos;atteindre et un coach IA pour t&apos;accompagner chaque jour.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" href={cta}>Créer mon avatar <ArrowRight className="h-5 w-5" /></Button>
            <Button size="lg" variant="ghost" href="#fonctions">Découvrir</Button>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-faint"><ShieldCheck className="h-4 w-4" /> Les photos sont analysées sur ton appareil, jamais envoyées.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="stage relative overflow-hidden rounded-[28px] border border-line">
          <Avatar3D className="h-[460px] sm:h-[560px]" shape={shape} look={DEFAULT_AVATAR.look} ratios={ones} anim={anim} muscles={mus} autoRotate={anim === "idle"} />
          <div className="absolute inset-x-3 bottom-3 flex gap-2 overflow-x-auto noscroll">
            {DEMO.map((d) => (
              <button key={d.anim} onClick={() => setAnim(d.anim)} className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold backdrop-blur ${anim === d.anim ? "bg-acc text-acc-ink" : "bg-black/50 text-ink"}`}>{d.label}</button>
            ))}
            <button onClick={() => setMus((v) => !v)} className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold backdrop-blur ${mus ? "bg-acc-2 text-black" : "bg-black/50 text-ink"}`}>Muscles</button>
          </div>
        </motion.div>
      </section>

      <section id="fonctions" className="mx-auto max-w-[1180px] px-5 py-16">
        <h2 className="font-display text-[30px] font-semibold tracking-tight sm:text-[40px]">Tout ce qu&apos;il faut pour progresser.<br /><span className="text-mute">Rien de plus.</span></h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-acc/10 text-acc"><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-mute">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 pb-20">
        <div className="card relative overflow-hidden p-8 sm:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-acc/20 blur-3xl" />
          <h2 className="relative font-display text-[28px] font-semibold tracking-tight sm:text-[36px]">3 étapes. 5 minutes.</h2>
          <ol className="relative mt-8 grid gap-6 sm:grid-cols-3">
            {[["1", "Ton profil", "Niveau, objectif, matériel, temps disponible."], ["2", "Ton avatar", "3 photos ou tes mensurations, et ton style."], ["3", "Ton plan", "Ta séance du jour t'attend sur le tableau de bord."]].map(([n, t, d]) => (
              <li key={n}><div className="font-display text-5xl font-semibold text-acc/80">{n}</div><div className="mt-2 font-semibold">{t}</div><p className="text-sm text-mute">{d}</p></li>
            ))}
          </ol>
          <Button size="lg" href={cta} className="relative mt-10">C&apos;est parti <ArrowRight className="h-5 w-5" /></Button>
        </div>
      </section>
      <footer className="border-t border-line px-5 py-8 text-center text-sm text-faint">Avatar Fit · Les conseils ne remplacent pas un avis médical.</footer>
    </div>
  );
}
