"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useWorkspace } from "@/lib/store";
import { Library, FileCode } from "lucide-react";

const LIBS = [
  { name: "Servo", include: "#include <Servo.h>" },
  { name: "Wire", include: "#include <Wire.h>" },
  { name: "LiquidCrystal_I2C", include: "#include <LiquidCrystal_I2C.h>" },
  { name: "DHT sensor library", include: "#include <DHT.h>" },
  { name: "Adafruit SSD1306", include: "#include <Adafruit_SSD1306.h>" },
  { name: "Adafruit GFX", include: "#include <Adafruit_GFX.h>" },
  { name: "FastLED", include: "#include <FastLED.h>" },
  { name: "SPI", include: "#include <SPI.h>" },
];

export function CodeEditor() {
  const code = useWorkspace((s) => s.code);
  const [libs, setLibs] = useState(false);

  return (
    <div className="flex h-full flex-col bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
        <div className="flex items-center gap-2 text-[12px] text-slate-300">
          <FileCode size={13} className="text-cyan-400" />
          sketch.ino
          <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">Arduino C++</span>
        </div>
        <button
          onClick={() => setLibs((v) => !v)}
          className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
        >
          <Library size={12} /> Library Manager
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <Editor
          height="100%"
          language="cpp"
          theme="vs-dark"
          value={code}
          onChange={(v) => useWorkspace.getState().setCode(v ?? "")}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace",
            automaticLayout: true,
            tabSize: 2,
            scrollBeyondLastLine: false,
            padding: { top: 12 },
          }}
        />
        {libs && (
          <div className="absolute right-4 top-4 z-10 w-72 rounded-lg border border-white/10 bg-[#12151c] p-3 shadow-2xl">
            <div className="mb-2 text-[12px] font-semibold text-slate-200">Arduino Library Manager</div>
            <div className="space-y-1">
              {LIBS.map((l) => (
                <button
                  key={l.name}
                  className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-[12px] text-slate-300 hover:bg-white/5"
                  onClick={() => {
                    const st = useWorkspace.getState();
                    if (!st.code.includes(l.include)) st.setCode(`${l.include}\n${st.code}`);
                  }}
                >
                  <span>{l.name}</span>
                  <span className="text-[10px] text-cyan-400">Include</span>
                </button>
              ))}
            </div>
            <button className="mt-2 text-[11px] text-slate-500" onClick={() => setLibs(false)}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
