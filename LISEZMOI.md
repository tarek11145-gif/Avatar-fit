# Avatar Fit — V2

App fitness 3D : avatar créé depuis 3 photos (IA sur l'appareil), muscles cliquables, projection vers l'objectif, programmes progressifs, séances guidées, coach IA (Gemini), nutrition (calories, macros, journal, eau), progrès (poids, mensurations, photos avant/après), stats, calendrier, XP/badges.

Stack : Next.js 16 · React 19 · TypeScript · Tailwind 4 · Framer Motion · Three.js / React Three Fiber · Recharts · Supabase · MediaPipe Pose.

## 1. Lancer sur ton PC (gratuit)

1. Installe **Node.js LTS** : https://nodejs.org
2. Dézippe le dossier, ouvre-le, tape `cmd` dans la barre d'adresse de l'explorateur puis Entrée.
3. Tape :
   ```
   npm install
   npm run dev
   ```
4. Ouvre **http://localhost:3000** dans ton navigateur.

Sans configuration, l'app marche en **mode local** : tout fonctionne, les données restent dans le navigateur. Le coach IA et les comptes en ligne demandent les clés ci-dessous.

## 2. Tester sur ton iPhone

- **Même Wi-Fi que le PC** : `npm run dev` affiche une adresse « Network » (ex. `http://192.168.1.20:3000`). Ouvre-la dans Safari sur l'iPhone.
- **Vraie adresse en ligne (gratuit)** : mets le dossier sur GitHub, puis sur https://vercel.com → *Add New Project* → importe le dépôt → ajoute les variables d'environnement (étapes 3 et 4) → *Deploy*. Dans Safari : Partager → « Sur l'écran d'accueil » pour l'avoir comme une app.

## 3. Coach IA (Gemini, offre gratuite)

1. Crée une clé sur https://aistudio.google.com/apikey
2. Copie `.env.example` en `.env.local` et colle la clé dans `GEMINI_API_KEY=`
3. Relance `npm run dev`.

La clé reste côté serveur (route `/api/coach`), jamais dans le navigateur.

## 4. Comptes en ligne (Supabase, offre gratuite)

1. Crée un projet sur https://supabase.com
2. *SQL Editor* → *New query* → colle le contenu de `supabase/schema.sql` → *Run* (à refaire après chaque mise à jour du fichier, sans risque).
3. *Project Settings* → *API* : copie l'URL et la clé `anon` dans `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Relance. La page de connexion propose alors inscription / connexion par e-mail. Chaque utilisateur ne voit que ses données (Row Level Security).

## Structure

```
src/app/                 pages (landing, auth, onboarding, (app)/… 11 pages, api/coach)
src/components/avatar/   avatar 3D articulé (build.ts), animations (poses.ts), canvas (Avatar3D.tsx)
src/lib/                 store (Supabase ou local), scan IA, corps/projection, programmes, exercices, gamification
supabase/schema.sql      tables + sécurité
public/mp/               fichiers de l'IA de détection du corps (copiés automatiquement à l'installation)
```

## Où sont stockées les données

- Profil, séances, nutrition, poids, mensurations : Supabase (si configuré) ou le navigateur (mode local).
- Photos du scan : analysées puis oubliées, jamais enregistrées.
- Photos avant/après : uniquement sur l'appareil (IndexedDB), jamais envoyées.

## Limites connues

- L'avatar est un mannequin 3D articulé construit à partir de tes mesures, pas encore un modèle photoréaliste (prochaine étape : modèle GLB/Blender déformé par le scan).
- Pas encore d'abonnement payant : il faudra un compte Stripe (étape suivante).
- Précision du scan : environ ±2–4 cm, meilleure avec une tenue près du corps et la photo de profil.
- Notifications : rappels dans l'app ; les notifications système demandent une adresse HTTPS (Vercel).
