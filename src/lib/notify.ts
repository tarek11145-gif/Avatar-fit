"use client";
import { useEffect } from "react";
import { useStore } from "./store";
import { dayKey } from "./gamification";

/** Rappel du jour : si une séance est prévue aujourd'hui et pas encore faite, notification système (si autorisée) une fois par jour. */
export function useNotifications() {
  const { data, toast } = useStore();
  useEffect(() => {
    const today = dayKey(new Date());
    const planned = data.planned.find((p) => p.date === today);
    const done = data.sessions.some((s) => dayKey(s.date) === today);
    if (!planned || done) return;
    let shown = false;
    try { shown = localStorage.getItem("avatarfit:notified") === today; } catch {}
    if (shown) return;
    try { localStorage.setItem("avatarfit:notified", today); } catch {}
    const text = `Séance prévue aujourd'hui : ${planned.title}`;
    if (data.settings.notifications && typeof Notification !== "undefined" && Notification.permission === "granted") {
      try { new Notification("Avatar Fit", { body: text, icon: "/icon.svg" }); } catch { toast(text); }
    } else toast(text);
  }, [data.planned, data.sessions, data.settings.notifications, toast]);
}

export async function askNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  const r = await Notification.requestPermission();
  return r === "granted";
}
