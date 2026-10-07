"use client";
import { useMemo } from "react";
import { TYPE_LABEL, itemsAt, partState, plan, riskTable, siteStats, summaryText } from "@requiem/domain";
import type { ArchiveItem } from "@requiem/schemas";
import type { Data } from "../data";
import { live, set, state, useStore, VIEWS, type Layer, type NavMode, type View } from "../store";
import { enterSite, leaveSite } from "./transition";

const usd = (n: number) => "$" + n.toLocaleString("en-US");
const go = (v: View) => { if (v === state.view) return; if (v === "museum") { if (state.space === "site") leaveSite(); else set({ prevView: state.view, view: v }); return; } if (state.space === "museum") enterSite(); set({ prevView: state.view, view: v, ...(v === "conservation" ? { layer: "damage" as Layer } : {}) }); history.replaceState(null, "", `#${v}`); };
const LAYERS: [Layer, string, string][] = [["material", "Material", "Stone, plaster, timber and tile as they stand"], ["structure", "Structure", "Only the load-bearing fabric lit; the rest ghosted"], ["damage", "Damage", "Heat map from parchment to archive red"], ["recon", "Reconstruction", "The clean digital reconstruction of the building as built"]];
const NAVS: [NavMode, string, string][] = [["orbit", "Orbit", "Drag to turn, wheel to zoom"], ["walk", "Walk", "W A S D to move, arrow keys to look; stays on the ground"], ["fly", "Fly", "W A S D to move, Q E up and down, arrows to look"]];

function Museum({ data }: { data: Data }) {
  const s = useStore();
  return (<section aria-labelledby="h-museum"><h2 id="h-museum">The collection</h2>
    <p className="lede">Four rooms, four sites, all fictional. The flagship has a full model, a timeline and an archive; the other three are placeholders that show how the collection would grow.</p>
    <ul className="sites" data-testid="sites">{data.sites.map((x) => (<li key={x.id}><button className={`site ${s.selSite === x.id ? "on" : ""}`} aria-pressed={s.selSite === x.id} onClick={() => set({ selSite: x.id })} data-testid={`site-${x.id}`}><b>{x.name}</b><span>{x.country} · {x.status} · risk {x.risk}</span></button></li>))}</ul>
    {data.sites.find((x) => x.id === s.selSite)!.flagship ? <><p>{data.sites[0].summary}</p><button className="btn primary" onClick={enterSite} data-testid="enter">Enter {data.sites[0].name.replace(" (fictional)", "")} →</button></> : <p className="faint">{data.sites.find((x) => x.id === s.selSite)!.summary}</p>}</section>);
}
function Structure({ data }: { data: Data }) {
  const s = useStore(), st = siteStats(data.parts, data.events, Math.round(s.year)), yr = Math.round(s.year);
  const rows = data.parts.map((p) => ({ p, t: partState(p, data.events, yr) })), stateOf = (t: ReturnType<typeof partState>) => t.built <= 0 ? "not yet built" : t.built < 1 ? "going up" : t.erosion >= 1 ? "lost" : t.erosion > 0 ? "falling" : "standing";
  return (<section aria-labelledby="h-str"><h2 id="h-str">Orisk Caravan House</h2>
    <div className="seg" role="radiogroup" aria-label="Navigation mode">{NAVS.map(([id, label, hint]) => <button key={id} role="radio" aria-checked={s.nav === id} className={s.nav === id ? "on" : ""} title={hint} onClick={() => set({ nav: id })} data-testid={`nav-${id}`}>{label}</button>)}</div><p className="faint" data-testid="nav-hint">{NAVS.find((n) => n[0] === s.nav)![2]}</p>
    <div className="yearrow"><label htmlFor="year">Year</label><output className="yr" data-testid="year-out">{yr}</output><button className="btn" onClick={() => set({ playing: !s.playing, year: s.year >= 2026 ? 1790 : s.year })} data-testid="play">{s.playing ? "Pause" : "Play"}</button></div>
    <div className="scrub"><input id="year" type="range" min={1790} max={2026} step={1} value={yr} onChange={(e) => set({ year: Number(e.target.value), playing: false })} aria-valuetext={`${yr}`} data-testid="year" />
      <div className="ticks" aria-hidden>{data.events.map((e) => <i key={e.year} style={{ left: `${((e.year - 1790) / 236) * 100}%` }} title={`${e.year} ${e.label}`} />)}</div></div>
    <div className="evs" data-testid="events">{data.events.filter((e) => e.year <= yr).slice(-3).map((e) => <button key={e.year} className="link" onClick={() => set({ year: e.year, playing: false })}>{e.year} {e.label}</button>)}</div>
    <fieldset className="layers"><legend>Layer</legend>{LAYERS.map(([id, label, hint]) => <label key={id} className={s.layer === id ? "on" : ""}><input type="radio" name="layer" checked={s.layer === id} onChange={() => set({ layer: id })} data-testid={`layer-${id}`} /><b>{label}</b><span>{hint}</span></label>)}</fieldset>
    <dl className="spec"><div><dt>Standing parts</dt><dd data-testid="standing">{s.layer === "recon" ? data.parts.filter((p) => p.built <= 1802).length : st.standing}</dd></div><div><dt>Lost parts</dt><dd data-testid="lost">{s.layer === "recon" ? 0 : st.lost}</dd></div><div><dt>Mean damage</dt><dd data-testid="mean-damage">{Math.round((s.layer === "recon" ? 0 : st.meanDamage) * 100)}%</dd></div><div><dt>Structural damage</dt><dd>{Math.round((s.layer === "recon" ? 0 : st.structuralDamage) * 100)}%</dd></div></dl>
    <details><summary>All {data.parts.length} parts in {yr}</summary><table className="tbl" data-testid="parts-table"><thead><tr><th>Part</th><th>Collection</th><th>State</th><th>Damage</th></tr></thead><tbody>{rows.map(({ p, t }) => (<tr key={p.name} onMouseEnter={() => (live.hover = p.name)} onMouseLeave={() => (live.hover = "")}><td>{p.label}</td><td>{p.collection}</td><td data-testid={`ps-${p.name}`}>{stateOf(t)}</td><td>{Math.round(t.damage * 100)}%</td></tr>))}</tbody></table></details>
    <button className="btn ghost" onClick={leaveSite} data-testid="leave">Leave through the gate</button></section>);
}
function Wave({ seed, n = 48 }: { seed: number; n?: number }) { return <svg className="wave" viewBox={`0 0 ${n * 4} 24`} aria-hidden>{Array.from({ length: n }, (_, i) => { const h = 4 + Math.abs(Math.sin(i * 0.7 + seed) * Math.cos(i * 0.31 + seed * 2)) * 18; return <rect key={i} x={i * 4} y={12 - h / 2} width="2.4" height={h} />; })}</svg>; }
function Card({ it }: { it: ArchiveItem }) {
  return (<aside className="card" data-testid="item-card" role="dialog" aria-label={it.title}><svg className="leader" width="60" height="70" aria-hidden><line x1="0" y1="70" x2="60" y2="0" /></svg>
    <header><span>{TYPE_LABEL[it.type]} · {it.year}</span><button className="x" aria-label="Close" onClick={() => set({ selItem: null })}>×</button></header><h3>{it.title}</h3>
    {it.svg && <div className="art" dangerouslySetInnerHTML={{ __html: it.svg }} role="img" aria-label={it.caption} />}
    {it.type === "oral-history" && <><Wave seed={it.id.length * 3 + it.year % 7} /><p className="faint">Audio is not included in the demo. {it.speaker}, {Math.floor(it.durationS! / 60)}:{String(it.durationS! % 60).padStart(2, "0")}.</p><blockquote data-testid="transcript">{it.transcript}</blockquote></>}
    <p>{it.caption}</p><p className="faint">{it.source}. Generated for the demo, not a scan.</p></aside>);
}
function Archive({ data }: { data: Data }) {
  const s = useStore(), items = itemsAt(data.archive, data.parts, Math.round(s.year)), sel = data.archive.find((i) => i.id === s.selItem);
  return (<section aria-labelledby="h-arc"><h2 id="h-arc">Archive</h2><p className="lede">{items.length} of {data.archive.length} items exist in {Math.round(s.year)}. Each is pinned to a part of the building; choose one and the camera goes to its anchor.</p>
    <div className="yearrow"><label htmlFor="ayear">Year</label><output className="yr">{Math.round(s.year)}</output></div><input id="ayear" type="range" min={1790} max={2026} value={Math.round(s.year)} onChange={(e) => set({ year: Number(e.target.value), playing: false })} data-testid="archive-year" />
    <ul className="items" data-testid="items">{items.map((i) => (<li key={i.id}><button className={`item ${s.selItem === i.id ? "on" : ""}`} aria-pressed={s.selItem === i.id} onClick={() => set({ selItem: s.selItem === i.id ? null : i.id })} data-testid={`item-${i.id}`}><i>{TYPE_LABEL[i.type]}</i><b>{i.title}</b><span>{i.year} · {data.parts.find((p) => p.name === i.part)!.label}</span></button></li>))}</ul>
    </section>);
}
function Conservation({ data }: { data: Data }) {
  const s = useStore(), yr = 2026, all = data.interventions.map((i) => (s.applied.includes(i.id) ? { ...i, status: "done" as const } : i)), done = all.filter((i) => i.status === "done"), table = riskTable(data.parts, data.events, yr, done).slice(0, 10);
  const pl = useMemo(() => plan(data.parts, data.events, yr, all, s.budget), [data, s.budget, s.applied]); // eslint-disable-line react-hooks/exhaustive-deps
  return (<section aria-labelledby="h-con"><h2 id="h-con">Conservation</h2><p className="lede">Risk blends current damage, exposure to flood, earthquake, conflict and weather, and how much the structure leans on the part. Hazards and costs are invented for the demo.</p>
    <table className="tbl" data-testid="risk-table"><thead><tr><th>Part</th><th>Risk</th><th></th></tr></thead><tbody>{table.map((r) => <tr key={r.part.name} onMouseEnter={() => (live.hover = r.part.name)} onMouseLeave={() => (live.hover = "")}><td>{r.part.label}</td><td data-testid={`risk-${r.part.name}`}><span className="riskbar"><i style={{ width: `${r.risk}%` }} /></span>{r.risk}</td><td>{r.part.structural ? "structural" : ""}</td></tr>)}</tbody></table>
    <h3>Interventions</h3><ul className="ints" data-testid="ints">{data.interventions.map((i) => (<li key={i.id}><label className={i.status === "done" ? "done" : ""}><input type="checkbox" disabled={i.status === "done"} checked={i.status === "done" || s.applied.includes(i.id)} onChange={(e) => set({ applied: e.target.checked ? [...s.applied, i.id] : s.applied.filter((x) => x !== i.id) })} data-testid={`int-${i.id}`} /><b>{i.label}</b><span>{i.status === "done" ? `done ${i.year}` : `${i.status}, ${i.year}`} · {usd(i.cost)}</span></label></li>))}</ul>
    <label className="slider">Budget <input type="range" min={0} max={400000} step={10000} value={s.budget} onChange={(e) => set({ budget: Number(e.target.value) })} data-testid="budget" /><output data-testid="budget-out">{usd(s.budget)}</output></label>
    <p data-testid="plan-line">{pl.chosen.length ? `Within budget: ${pl.chosen.map((c) => c.label.split(" ").slice(0, 3).join(" ")).join("; ")}. Spends ${usd(pl.spent)}; risk ${pl.riskBefore} to ${pl.riskAfter}.` : "No proposed intervention fits this budget."}</p>
    <button className="btn primary" onClick={() => set({ summary: summaryText("Orisk Caravan House (fictional)", yr, data.parts, data.events, all, s.budget) })} data-testid="gen">Generate preservation summary</button>
    {s.summary && <><pre className="sum" data-testid="summary">{s.summary}</pre><button className="btn" onClick={() => navigator.clipboard?.writeText(s.summary).catch(() => {})} data-testid="copy">Copy</button></>}</section>);
}

export default function Panels({ data }: { data: Data }) {
  const s = useStore(), idx = VIEWS.findIndex((v) => v.id === s.view), V = s.view, sel = data.archive.find((i) => i.id === s.selItem);
  return (
    <div className="ui" data-testid="hud">
      <header className="top"><span className="brand">REQUIEM</span><span className="where" data-testid="where">{s.space === "museum" ? "In the museum" : `Orisk Caravan House · ${Math.round(s.year)}`}</span><button className="btn ghost" aria-pressed={s.pauseMotion} onClick={() => set({ pauseMotion: !s.pauseMotion })} data-testid="pause-motion">{s.pauseMotion ? "Resume motion" : "Pause motion"}</button></header>
      <nav className="rail" aria-label="Rooms">{VIEWS.map((v, i) => (<button key={v.id} className={i === idx ? "on" : ""} aria-current={i === idx ? "page" : undefined} onClick={() => go(v.id)} data-testid={`nav-${v.id}`}><b>{v.label}</b><small>{v.blurb}</small></button>))}</nav>
      <main className={`panel ${s.reduced ? "" : "turn"}`} key={V} tabIndex={-1}>{V === "museum" && <Museum data={data} />}{V === "structure" && <Structure data={data} />}{V === "archive" && <Archive data={data} />}{V === "conservation" && <Conservation data={data} />}</main>
      {sel && V === "archive" && s.space === "site" && <div className="anchored"><Card it={sel} /></div>}
    </div>
  );
}
