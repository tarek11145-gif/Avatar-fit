"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase, hasBackend } from "./supabase";
import type { AvatarData, ChatMessage, Extra, PlannedItem, Profile, Session, UserData } from "./types";

export const DEFAULT_AVATAR: AvatarData = {
  look: { skin: "#c98e6b", top: "tshirt", topColor: "#16191c", bottom: "short", bottomColor: "#0b0d0e", shoeColor: "#39ff88", hair: "court", hairColor: "#1a1410" },
  shape: null, measures: null, scannedAt: null,
};
export const EMPTY_EXTRA: Extra = { weights: [], measures: [], food: [], water: {} };
const EMPTY: UserData = {
  profile: null, avatar: DEFAULT_AVATAR, sessions: [], planned: [], chat: [], extra: EMPTY_EXTRA,
  settings: { notifications: false, units: "metric", reduceMotion: false, restSeconds: 60 },
};
const LS = "avatarfit:data:v1";
const LS_USER = "avatarfit:user:v1";

export interface AuthUser { id: string; email: string | null; local: boolean }
type Status = "loading" | "ready";
interface Toast { id: number; text: string; tone: "ok" | "err" | "xp" }

interface Store {
  status: Status;
  mode: "supabase" | "local";
  user: AuthUser | null;
  data: UserData;
  error: string | null;
  signUp(email: string, password: string): Promise<string | null>;
  signIn(email: string, password: string): Promise<string | null>;
  startLocal(): void;
  signOut(): Promise<void>;
  saveProfile(p: Profile): Promise<void>;
  saveAvatar(a: AvatarData): Promise<void>;
  addSession(s: Session): Promise<void>;
  deleteSession(id: string): Promise<void>;
  setPlanned(p: PlannedItem[]): Promise<void>;
  addChat(m: ChatMessage): Promise<void>;
  clearChat(): Promise<void>;
  saveSettings(s: UserData["settings"]): Promise<void>;
  saveExtra(e: Extra): Promise<void>;
  resetAll(): Promise<void>;
  toasts: Toast[];
  toast(text: string, tone?: Toast["tone"]): void;
}
const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore hors du StoreProvider");
  return c;
};

function readLocal(): UserData {
  try { const s = localStorage.getItem(LS); if (s) { const d = JSON.parse(s); return { ...EMPTY, ...d, extra: { ...EMPTY_EXTRA, ...(d.extra ?? {}) } }; } } catch {}
  return EMPTY;
}
function writeLocal(d: UserData) {
  try { localStorage.setItem(LS, JSON.stringify(d)); } catch {}
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<UserData>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dataRef = useRef(data);
  dataRef.current = data;
  const mode = hasBackend ? "supabase" : "local";

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  /* ---------- Chargement ---------- */
  const loadRemote = useCallback(async (uid: string) => {
    if (!supabase) return;
    const [ud, ss, ch] = await Promise.all([
      supabase.from("user_data").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("sessions").select("data").eq("user_id", uid).order("date", { ascending: false }),
      supabase.from("chat_messages").select("*").eq("user_id", uid).order("created_at", { ascending: true }).limit(200),
    ]);
    const err = ud.error || ss.error || ch.error;
    if (err) { setError(`Base de données : ${err.message}. As-tu exécuté supabase/schema.sql ?`); return; }
    setData({
      profile: ud.data?.profile ?? null,
      avatar: ud.data?.avatar ?? DEFAULT_AVATAR,
      settings: { ...EMPTY.settings, ...(ud.data?.settings ?? {}) },
      planned: ud.data?.planned ?? [],
      extra: { ...EMPTY_EXTRA, ...(ud.data?.extra ?? {}) },
      sessions: (ss.data ?? []).map((r: { data: Session }) => r.data),
      chat: (ch.data ?? []).map((r: { id: string; role: "user" | "coach"; content: string; created_at: string }) => ({ id: r.id, role: r.role, content: r.content, at: r.created_at })),
    });
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      if (supabase) {
        const { data: s } = await supabase.auth.getSession();
        const u = s.session?.user;
        if (u) { setUser({ id: u.id, email: u.email ?? null, local: false }); await loadRemote(u.id); }
        const sub = supabase.auth.onAuthStateChange(async (_e, sess) => {
          const uu = sess?.user;
          if (uu) { setUser({ id: uu.id, email: uu.email ?? null, local: false }); }
          else { setUser(null); setData(EMPTY); }
        });
        unsub = () => sub.data.subscription.unsubscribe();
      } else {
        try { const u = localStorage.getItem(LS_USER); if (u) { setUser(JSON.parse(u)); setData(readLocal()); } } catch {}
      }
      setStatus("ready");
    })();
    return () => unsub?.();
  }, [loadRemote]);

  /* ---------- Écriture ---------- */
  const commit = useCallback((next: UserData) => { dataRef.current = next; setData(next); if (!hasBackend) writeLocal(next); }, []);
  const upsertUserData = useCallback(async (patch: Partial<{ profile: Profile; avatar: AvatarData; settings: UserData["settings"]; planned: PlannedItem[]; extra: Extra }>) => {
    if (!supabase || !user || user.local) return;
    const d = dataRef.current;
    const { error: e } = await supabase.from("user_data").upsert({
      user_id: user.id, profile: d.profile, avatar: d.avatar, settings: d.settings, planned: d.planned, extra: d.extra, ...patch, updated_at: new Date().toISOString(),
    });
    if (e) toast(`Sauvegarde impossible : ${e.message}`, "err");
  }, [user, toast]);

  const api: Store = useMemo(() => ({
    status, mode, user, data, error, toasts, toast,
    async signUp(email, password) {
      if (!supabase) return "Supabase n'est pas configuré.";
      const { data: r, error: e } = await supabase.auth.signUp({ email, password });
      if (e) return e.message;
      if (!r.session) return "Compte créé : confirme ton e-mail puis connecte-toi.";
      setUser({ id: r.user!.id, email, local: false }); await loadRemote(r.user!.id); return null;
    },
    async signIn(email, password) {
      if (!supabase) return "Supabase n'est pas configuré.";
      const { data: r, error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) return e.message === "Invalid login credentials" ? "E-mail ou mot de passe incorrect." : e.message;
      setUser({ id: r.user.id, email, local: false }); await loadRemote(r.user.id); return null;
    },
    startLocal() {
      const u: AuthUser = { id: "local", email: null, local: true };
      try { localStorage.setItem(LS_USER, JSON.stringify(u)); } catch {}
      setUser(u); setData(readLocal());
    },
    async signOut() {
      if (supabase && user && !user.local) await supabase.auth.signOut();
      try { localStorage.removeItem(LS_USER); } catch {}
      setUser(null); setData(EMPTY);
    },
    async saveProfile(p) { const n = { ...dataRef.current, profile: p }; commit(n); await upsertUserData({ profile: p }); },
    async saveAvatar(a) { const n = { ...dataRef.current, avatar: a }; commit(n); await upsertUserData({ avatar: a }); },
    async saveSettings(s) { const n = { ...dataRef.current, settings: s }; commit(n); await upsertUserData({ settings: s }); },
    async saveExtra(e) { const n = { ...dataRef.current, extra: e }; commit(n); await upsertUserData({ extra: e }); },
    async setPlanned(p) { const n = { ...dataRef.current, planned: p }; commit(n); await upsertUserData({ planned: p }); },
    async addSession(s) {
      const n = { ...dataRef.current, sessions: [s, ...dataRef.current.sessions] }; commit(n);
      if (supabase && user && !user.local) {
        const { error: e } = await supabase.from("sessions").insert({ id: s.id, user_id: user.id, date: s.date, data: s });
        if (e) toast(`Séance non sauvegardée : ${e.message}`, "err");
      }
    },
    async deleteSession(id) {
      const n = { ...dataRef.current, sessions: dataRef.current.sessions.filter((s) => s.id !== id) }; commit(n);
      if (supabase && user && !user.local) await supabase.from("sessions").delete().eq("id", id);
    },
    async addChat(m) {
      setData((d) => { const n = { ...d, chat: [...d.chat, m] }; if (!hasBackend) writeLocal(n); return n; });
      if (supabase && user && !user.local) await supabase.from("chat_messages").insert({ id: m.id, user_id: user.id, role: m.role, content: m.content, created_at: m.at });
    },
    async clearChat() {
      commit({ ...dataRef.current, chat: [] });
      if (supabase && user && !user.local) await supabase.from("chat_messages").delete().eq("user_id", user.id);
    },
    async resetAll() {
      if (supabase && user && !user.local) {
        await Promise.all([
          supabase.from("sessions").delete().eq("user_id", user.id),
          supabase.from("chat_messages").delete().eq("user_id", user.id),
          supabase.from("user_data").delete().eq("user_id", user.id),
        ]);
      }
      commit(EMPTY);
    },
  }), [status, mode, user, data, error, toasts, toast, commit, upsertUserData, loadRemote]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
