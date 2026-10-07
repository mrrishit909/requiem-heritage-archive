import type { ArchiveItem, Bbox, Intervention, Part, Site, SiteEvent, SiteVersion } from "@requiem/schemas";
export type Data = { sites: Site[]; parts: Part[]; events: SiteEvent[]; archive: ArchiveItem[]; interventions: Intervention[]; versions: SiteVersion[]; manifest: Record<string, Bbox> };
export const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export async function loadData(): Promise<Data> {
  const g = async <T,>(n: string) => (await fetch(`${base}/data/${n}.json`)).json() as Promise<T>;
  const [sites, parts, events, archive, interventions, versions, manifest] = await Promise.all([g<Site[]>("sites"), g<Part[]>("parts"), g<SiteEvent[]>("events"), g<ArchiveItem[]>("archive"), g<Intervention[]>("interventions"), g<SiteVersion[]>("versions"), g<Record<string, Bbox>>("manifest")]);
  return { sites, parts, events, archive, interventions, versions, manifest };
}
