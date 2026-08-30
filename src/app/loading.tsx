export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0e14] text-slate-200">
      <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 text-sm font-black text-slate-950">
        V
      </div>
      <div className="mt-4 text-xs font-medium tracking-wide text-slate-400">
        Loading VoltCraft AI Studio…
      </div>
    </div>
  );
}
