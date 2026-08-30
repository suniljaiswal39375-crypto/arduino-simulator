import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0e14] px-4 text-center text-slate-200">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-xl font-black text-slate-950 shadow-lg shadow-cyan-500/20">
        V
      </div>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        404
      </h1>
      <h2 className="mt-2 text-lg font-medium text-slate-300">
        Page Not Found
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        The circuit or route you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/25 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0b0e14]"
        >
          Return to Circuit Studio
        </Link>
      </div>
    </div>
  );
}
