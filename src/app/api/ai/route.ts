import { NextRequest, NextResponse } from "next/server";
import { autoWire } from "@/lib/autowire";
import { generateSketch } from "@/lib/codegen";
import { diagnoseCircuit } from "@/lib/diagnostics";
import { localCopilotReply } from "@/lib/copilot";
import type { Component, Wire } from "@/lib/types";

const SYSTEM = `You are VoltCraft AI, an expert electronics and Arduino copilot embedded in a circuit simulator.
You receive a JSON circuit: components[] (type, label, pins, properties) and wires[] (from/to component+pin).
You can:
1. Propose auto-wiring (standard Arduino pin maps: LED via 220Ω on D13, I2C SDA=A4 SCL=A5, servo PWM 9, DHT data pin, HC-SR04 trig/echo).
2. Generate complete Arduino C++ sketches matching the exact pin connections.
3. Diagnose shorts (VCC-GND), missing LED resistors, reverse polarity, floating buttons, incomplete I2C.
Keep answers concise, use bullet points, and include code fences for sketches.
Never invent components that are not on the canvas unless suggesting an addition.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prompt: string = body.prompt ?? "";
  const circuit = body.circuit as { components: Component[]; wires: Wire[]; code?: string };
  const components = circuit?.components ?? [];
  const wires = circuit?.wires ?? [];

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const q = prompt.toLowerCase();
    let reply = localCopilotReply(prompt, components, wires);
    if (q.includes("auto") && q.includes("connect")) {
      reply = autoWire(components, wires).notes.map((n) => `• ${n}`).join("\n");
    }
    if (q.includes("generate") && q.includes("code")) {
      reply = "```cpp\n" + generateSketch(components, wires) + "\n```";
    }
    if (q.includes("diagnos")) {
      reply = diagnoseCircuit(components, wires)
        .map((d) => `${d.severity}: ${d.title} — ${d.detail}`)
        .join("\n");
    }
    return NextResponse.json({ reply, engine: "local" });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Circuit JSON:\n${JSON.stringify({ components, wires }, null, 2)}\n\nUser: ${prompt}`,
          },
        ],
      }),
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? localCopilotReply(prompt, components, wires);
    return NextResponse.json({ reply, engine: "llm" });
  } catch {
    return NextResponse.json({ reply: localCopilotReply(prompt, components, wires), engine: "local" });
  }
}
