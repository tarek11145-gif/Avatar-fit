"use client";
/* Photos de progression : stockées UNIQUEMENT sur l'appareil (IndexedDB), jamais envoyées. */
export interface ProgressPhoto { id: string; date: string; pose: "face" | "profil" | "dos"; blob: Blob }

const DB = "avatarfit-photos", STORE = "photos";
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => { const t = db.transaction(STORE, mode); const q = fn(t.objectStore(STORE)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
export const listPhotos = async () => ((await tx<ProgressPhoto[]>("readonly", (s) => s.getAll() as IDBRequest<ProgressPhoto[]>)) ?? []).sort((a, b) => b.date.localeCompare(a.date));
export const addPhoto = (p: ProgressPhoto) => tx("readwrite", (s) => s.put(p));
export const deletePhoto = (id: string) => tx("readwrite", (s) => s.delete(id));

/** Réduit la photo (max 1280 px) pour économiser la place. */
export function shrink(file: File): Promise<Blob> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1280 / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src);
      c.toBlob((b) => (b ? res(b) : rej(new Error("Conversion impossible"))), "image/jpeg", 0.85);
    };
    im.onerror = () => rej(new Error("Image illisible"));
    im.src = URL.createObjectURL(file);
  });
}
