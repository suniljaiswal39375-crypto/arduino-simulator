"use client";

import { useState } from "react";
import { Bot, Sparkles, Bug, Code2, Send } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { localCopilotReply } from "@/lib/copilot";
import { diagnoseCircuit } from "@/lib/diagnostics";

export function Copilot() {
  const chat = useWorkspace((s) => s.chat);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (prompt?: string) => {
    const msg = (prompt ?? text).trim();
    if (!msg) return;
    setText("");
    const st = useWorkspace.getState();
    st.pushChat("user", msg);
    setBusy(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: msg,
          circuit: { components: st.components, wires: st.wires, code: st.code },
        }),
      });
      const data = await res.json();
      if (data.reply) st.pushChat("assistant", data.reply);
      else st.pushChat("assistant", localCopilotReply(msg, st.components, st.wires));
    } catch {
      st.pushChat("assistant", localCopilotReply(msg, st.components, st.wires));
    } finally {
      setBusy(false);
    }
  };

  const autoConnect = () => {
    const notes = useWorkspace.getState().autoConnect();
    useWorkspace.getState().pushChat("assistant", "Auto-wired the canvas:\n" + notes.map((n) => `• ${n}`).join("\n"));
  };

  const gen = () => {
    useWorkspace.getState().generateCodeFromCanvas();
    useWorkspace.getState().pushChat("assistant", "Generated a sketch from the current pin map and opened the Code IDE.");
  };

  const diag = () => {
    const d = diagnoseCircuit(useWorkspace.getState().components, useWorkspace.getState().wires);
    useWorkspace.getState().runDiagnostics();
    useWorkspace.getState().pushChat(
      "assistant",
      d.map((x) => `**${x.severity}** — ${x.title}\n${x.detail}`).join("\n\n")
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2 text-[12px] font-medium text-slate-200">
        <Bot size={14} className="text-cyan-400" /> AI Circuit Copilot
      </div>
      <div className="grid grid-cols-3 gap-1 border-b border-white/5 p-2">
        <Action icon={<Sparkles size={12} />} label="Auto-Connect" onClick={autoConnect} />
        <Action icon={<Code2 size={12} />} label="Generate Code" onClick={gen} />
        <Action icon={<Bug size={12} />} label="Diagnose" onClick={diag} />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {chat.map((m) => (
          <div
            key={m.id}
            className={`whitespace-pre-wrap rounded-lg px-2.5 py-2 text-[12px] leading-relaxed ${
              m.role === "user" ? "ml-6 bg-cyan-500/15 text-cyan-50" : "mr-4 bg-white/5 text-slate-300"
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy && <div className="text-[11px] text-slate-500">Thinking…</div>}
      </div>
      <form
        className="flex gap-1 border-t border-white/5 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about wiring, code, or bugs…"
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[12px] text-slate-100 outline-none"
        />
        <button type="submit" className="rounded-md bg-cyan-500/20 p-2 text-cyan-300 hover:bg-cyan-500/30">
          <Send size={13} />
        </button>
      </form>
    </div>
  );
}

function Action({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-md bg-white/5 px-1 py-1.5 text-[10px] text-slate-300 hover:bg-white/10"
    >
      {icon}
      {label}
    </button>
  );
}


