import { Loader2 } from "lucide-react";

export default function LoadingScreen({
  message = "Loading todo app...",
}: {
  message?: string;
}) {
  return (
    <main className="flex h-screen items-center justify-center bg-[#1e1e1e] text-white">
      <div className="flex items-center gap-3 text-[13px] text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{message}</span>
      </div>
    </main>
  );
}
