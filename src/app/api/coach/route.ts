// Coach IA — appelle l'API Gemini côté serveur (la clé ne part jamais dans le navigateur).
export const runtime = "nodejs";

const SYSTEM = `Tu es le coach sportif d'Avatar Fit. Tu parles français, tu tutoies, tu es pédagogue, positif et motivant, avec des réponses courtes et concrètes (listes courtes quand c'est utile).
Tu réponds aux questions sportives, expliques les exercices (consignes techniques, erreurs fréquentes), proposes des séances adaptées au niveau, à l'âge, au matériel et au temps de la personne, construis des programmes progressifs, donnes des conseils de récupération et analyses ses statistiques d'entraînement.
Sécurité, toujours :
- Jamais de pratiques extrêmes ou dangereuses : pas de jeûne prolongé, pas de déficit calorique sévère, pas de perte de plus d'environ 1 % du poids par semaine, pas de surentraînement, pas de produits dopants ni de médicaments.
- Rappelle l'importance du repos, du sommeil, de l'échauffement et de l'hydratation quand c'est pertinent.
- En cas de douleur, blessure, malaise, grossesse, maladie ou traitement : conseille de consulter un professionnel de santé avant de continuer.
- Tu n'es pas médecin et tu ne poses pas de diagnostic.
- Ne juge jamais le corps de la personne ; valorise ses progrès, sa régularité et ses compétences.`;

interface Msg { role: "user" | "coach"; content: string }

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: "missing_key", message: "Le coach IA n'est pas encore branché : ajoute GEMINI_API_KEY dans .env.local (clé gratuite sur aistudio.google.com) puis relance l'app." }, { status: 503 });
  }
  let body: { messages?: Msg[]; context?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "bad_request", message: "Requête invalide." }, { status: 400 }); }
  const messages = (body.messages ?? []).slice(-16).filter((m) => typeof m.content === "string" && m.content.trim()).map((m) => ({ role: m.role === "coach" ? "model" : "user", parts: [{ text: m.content.slice(0, 4000) }] }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return Response.json({ error: "bad_request", message: "Message vide." }, { status: 400 });
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${SYSTEM}\n\nContexte de la personne (données de l'app) :\n${(body.context ?? "").slice(0, 4000)}` }] },
        contents: messages,
        generationConfig: { temperature: 0.7, maxOutputTokens: 900 },
      }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = r.status === 429 ? "Le coach a atteint sa limite gratuite pour le moment. Réessaie dans une minute." : j?.error?.message ? `Gemini : ${j.error.message}` : `Erreur Gemini (${r.status}).`;
      return Response.json({ error: "upstream", message: msg }, { status: 502 });
    }
    const text: string = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim() ?? "";
    if (!text) return Response.json({ error: "empty", message: "Le coach n'a pas pu répondre à cette question. Reformule-la." }, { status: 502 });
    return Response.json({ text });
  } catch {
    return Response.json({ error: "network", message: "Impossible de joindre Gemini. Vérifie ta connexion." }, { status: 502 });
  }
}
