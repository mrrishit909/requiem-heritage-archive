export type Collection = "Current" | "Historical" | "Structural" | "Missing";
export type Part = { name: string; label: string; collection: Collection; group: string; material: "stone" | "plaster" | "timber" | "tile" | "ground"; built: number; lost: number | null; damage2026: number; structural: boolean; criticality: number; note: string };
export type SiteEvent = { year: number; label: string; weights: Record<string, number>; note: string };
export type Bbox = { min: [number, number, number]; max: [number, number, number] };
export type ArchiveItem = { id: string; type: "drawing" | "photograph" | "document" | "oral-history"; title: string; year: number; part: string; offset: [number, number, number]; source: string; caption: string; svg?: string; transcript?: string; durationS?: number; speaker?: string };
export type Intervention = { id: string; label: string; parts: string[]; cost: number; reduction: number; status: "done" | "planned" | "proposed"; year: number };
export type Site = { id: string; name: string; country: string; status: string; summary: string; lat: number; lon: number; flagship: boolean; risk: string };
export type SiteVersion = { id: string; label: string; yearStart: number; yearEnd: number; layerManifest: { present: string[]; lost: string[] } };
