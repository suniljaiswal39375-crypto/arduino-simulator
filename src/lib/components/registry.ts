import type { PinSignalState, UniversalComponentSchema } from "./schema";

/** Runtime-extensible registry. Packages can register components without editing canvas code. */
export class ComponentRegistry {
  private schemas = new Map<string, UniversalComponentSchema>();
  private listeners = new Set<() => void>();

  register(schema: UniversalComponentSchema, replace = false) {
    validateSchema(schema);
    if (!replace && this.schemas.has(schema.id)) throw new Error(`Component '${schema.id}' is already registered`);
    this.schemas.set(schema.id, Object.freeze(schema));
    this.emit();
    return () => this.unregister(schema.id);
  }

  registerMany(schemas: UniversalComponentSchema[], replace = false) {
    schemas.forEach((schema) => this.register(schema, replace));
  }

  unregister(id: string) { const changed = this.schemas.delete(id); if (changed) this.emit(); }
  get(id: string) { return this.schemas.get(id); }
  has(id: string) { return this.schemas.has(id); }
  all() { return [...this.schemas.values()]; }
  byCategory(category: string) { return this.all().filter((item) => item.category === category); }
  search(query: string) {
    const q = query.trim().toLowerCase();
    return q ? this.all().filter((x) => `${x.name} ${x.description} ${x.category} ${x.tags?.join(" ") ?? ""}`.toLowerCase().includes(q)) : this.all();
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  updateFrame(id: string, root: SVGElement, pins: Record<string, PinSignalState>, props: Record<string, unknown>) {
    this.schemas.get(id)?.onFrameUpdate?.(root, pins, props);
  }
  private emit() { this.listeners.forEach((listener) => listener()); }
}

export function validateSchema(schema: UniversalComponentSchema) {
  if (!schema.id || !/^[a-z0-9][a-z0-9-]*$/.test(schema.id)) throw new Error("Component id must be a kebab-case identifier");
  if (!(schema.dimensions.width > 0 && schema.dimensions.height > 0)) throw new Error(`${schema.id}: invalid dimensions`);
  const ids = new Set<string>();
  for (const pin of schema.pins) {
    if (!pin.id || ids.has(pin.id)) throw new Error(`${schema.id}: duplicate/empty pin '${pin.id}'`);
    ids.add(pin.id);
    if (![pin.xPct, pin.yPct].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) throw new Error(`${schema.id}.${pin.id}: anchors must be in [0,1]`);
  }
  if (!schema.svgAsset.includes("<")) throw new Error(`${schema.id}: svgAsset is empty`);
}

export const componentRegistry = new ComponentRegistry();
