"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0e14] px-4 text-center text-slate-200">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-amber-500 text-xl font-black text-white shadow-lg">
        !
      </div>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        {error.message || "An unexpected error occurred while loading the simulator."}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = "/"}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/20"
        >
          Reload App
        </button>
      </div>
    </div>
  );
}
