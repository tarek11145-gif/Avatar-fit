"use client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const Avatar3D = dynamic(() => import("./Avatar3D"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[300px] place-items-center text-sm text-mute">
      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-acc" /> Chargement de l&apos;avatar…</span>
    </div>
  ),
});
export default Avatar3D;
