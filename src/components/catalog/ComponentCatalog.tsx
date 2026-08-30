"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CATALOG, CATEGORIES } from "@/lib/catalog";

export function ComponentCatalog() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");

  const items = useMemo(() => {
    return CATALOG.filter((c) => {
      if (cat !== "All" && c.category !== cat) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return c.label.toLowerCase().includes(s) || c.type.includes(s) || c.tags.some((t) => t.includes(s));
    });
  }, [q, cat]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/5 px-3 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Component Library</div>
        <div className="relative mt-2">
          <Search size={12} className="absolute left-2 top-2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search parts…"
            className="w-full rounded-md border border-white/10 bg-white/5 py-1 pl-7 pr-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-2 py-0.5 text-[10px] ${cat === c ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-slate-400"}`}
            >
              {c.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {CATEGORIES.filter((c) => cat === "All" || cat === c).map((category) => {
          const list = items.filter((i) => i.category === category);
          if (!list.length) return null;
          return (
            <div key={category} className="mb-3">
              <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {category}
              </div>
              <div className="flex flex-col gap-1">
                {list.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("component-type", item.type);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="cursor-grab rounded-md border border-white/5 bg-white/[0.03] px-2 py-1.5 hover:border-cyan-500/30 hover:bg-white/[0.06] active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: item.accent }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] text-slate-200">{item.label}</div>
                        <div className="truncate text-[10px] text-slate-500">{item.description}</div>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">${item.cost.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/5 px-3 py-2 text-[10px] text-slate-500">
        Drag a part onto the canvas. Click pins to wire.
      </div>
    </div>
  );
}
