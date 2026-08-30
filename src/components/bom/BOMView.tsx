"use client";

import { bomRows } from "@/lib/diagnostics";
import { useWorkspace } from "@/lib/store";

export function BOMView() {
  const components = useWorkspace((s) => s.components);
  const wires = useWorkspace((s) => s.wires);
  const rows = bomRows(components);
  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="h-full overflow-auto bg-[#0b0e14] p-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Bill of Materials</h2>
          <p className="text-[12px] text-slate-500">Auto-generated from the canvas netlist</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Est. total</div>
          <div className="font-mono text-xl text-emerald-400">${total.toFixed(2)}</div>
        </div>
      </div>
      <table className="w-full border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
            <th className="py-2">Component</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Total</th>
            <th>Description</th>
            <th>Instances / pins</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.type} className="border-b border-white/5 text-slate-300">
              <td className="py-2 font-medium text-slate-100">{r.name}</td>
              <td className="font-mono">{r.quantity}</td>
              <td className="font-mono">${r.unitCost.toFixed(2)}</td>
              <td className="font-mono">${r.total.toFixed(2)}</td>
              <td className="text-slate-400">{r.description}</td>
              <td className="text-slate-500">{r.connections}</td>
            </tr>
          ))}
          <tr className="text-slate-400">
            <td className="py-2">Jumper wires</td>
            <td className="font-mono">{wires.length}</td>
            <td className="font-mono">$0.05</td>
            <td className="font-mono">${(wires.length * 0.05).toFixed(2)}</td>
            <td>Assorted 22 AWG jumpers</td>
            <td>{wires.length} nets</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
