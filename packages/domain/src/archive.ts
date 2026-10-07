import type { ArchiveItem, Bbox, Part } from "@requiem/schemas";
/** World position of an item's anchor: its part's bounding box centre plus the offset in fractions of the box size (glTF axes, metres). */
export function anchorPosition(item: ArchiveItem, man: Record<string, Bbox>): [number, number, number] {
  const b = man[item.part]; if (!b) throw new Error(`no bounding box for ${item.part}`);
  return [0, 1, 2].map((i) => (b.min[i] + b.max[i]) / 2 + item.offset[i] * (b.max[i] - b.min[i])) as [number, number, number];
}
/** Items shown for a year: made by then, and anchored to a part that has been built (the oral histories are filed under the year they speak about). */
export function itemsAt(items: ArchiveItem[], parts: Part[], year: number): ArchiveItem[] {
  const by = new Map(parts.map((p) => [p.name, p])); return items.filter((i) => i.year <= year && (by.get(i.part)?.built ?? 9999) <= year).sort((a, b) => a.year - b.year);
}
export const TYPE_LABEL: Record<ArchiveItem["type"], string> = { drawing: "Drawing", photograph: "Photograph", document: "Document", "oral-history": "Oral history" };
