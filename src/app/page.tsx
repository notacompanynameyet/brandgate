"use client";

import { useMemo, useState } from "react";

type Tab = "firewall" | "memory" | "tournament" | "api";

const drafts = [
  { title: "Bad AI Slop Post", note: "Synthetic copy", text: "In today's fast-paced world, we are excited to unlock a transformative game-changer. Let's delve into this robust journey and unleash the power of synergy!" },
  { title: "Manufactured Hype Post", note: "Claim check", text: "Our revolutionary platform is 100% guaranteed to make every business 10x better. Thousands of customers love the number one solution." },
  { title: "Authentic Founder Story", note: "Human voice", text: "The first version failed because we asked people to change their habits before we earned their trust. We rebuilt the small part that mattered: a tool that gets out of the way." },
  { title: "Long Essay to Threads", note: "Sequence preview", text: "The best systems are not the loudest ones. They are the habits that make a difficult day a little easier, the quiet defaults that help a team keep its promises, and the small decisions that compound into trust. This is why we built BrandGate as a layer between an agent's draft and the publish button. It gives teams a place to remember what good sounds like before the work reaches the world." }
];

const slopPhrases = ["Meet the", "calmer place", "a little more room", "deserve a longer point of view", "small list"];

function Icon({ name }: { name: "arrow" | "copy" | "check" | "spark" | "book" | "play" }) {
  const paths: Record<string, string> = {
    arrow: "M5 12h13M13 6l6 6-6 6",
    copy: "M8 8h11v11H8zM5 16H4V5h11v1",
    check: "m5 12 4 4L19 6",
    spark: "m12 3 1.4 6.6L20 12l-6.6 1.4L12 20l-1.4-6.6L4 12l6.6-2.4L12 3",
    book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5zM4 5.5v12M8 7h8M8 11h8",
    play: "m8 5 11 7-11 7z"
  };
  return <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

function StatusPill({ children, tone = "good" }: { children: React.ReactNode; tone?: "good" | "warn" | "bad" | "neutral" }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

function highlightSlop(text: string) {
  const escaped = slopPhrases.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const chunks = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  return chunks.map((chunk, index) => slopPhrases.some((phrase) => phrase.toLowerCase() === chunk.toLowerCase()) ? <mark className="slop" key={`${chunk}-${index}`}>{chunk}</mark> : chunk);
}

function FirewallWorkbench() {
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState(drafts[0].text);
  const [channel, setChannel] = useState("LinkedIn");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluated, setEvaluated] = useState(true);
  const [apiNotice, setApiNotice] = useState("Local rubric active · remote engine optional");
  const currentScore = useMemo(() => Math.max(66, Math.min(96, 91 - Math.round(draft.length / 180) * 2 - (draft.match(/!/g)?.length ?? 0) * 2)), [draft]);

  const selectDraft = (index: number) => { setSelected(index); setDraft(drafts[index].text); setEvaluated(true); };
  const evaluate = async () => {
    setEvaluating(true);
    const apiChannel = channel.toLowerCase() === "linkedin" ? "linkedin" : channel.toLowerCase() === "instagram" ? "instagram" : channel.toLowerCase() === "email" ? "email" : "generic";
    try {
      const response = await fetch("/api/v1/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: draft, channel: apiChannel }) });
      if (response.ok) {
        await response.json();
        setApiNotice("Remote evaluation received · local highlights stay visible");
      } else {
        setApiNotice("Demo fallback active · evaluation endpoint returned an error");
      }
    } catch { setApiNotice("Demo fallback active · evaluation API is unavailable"); }
    window.setTimeout(() => { setEvaluated(true); setEvaluating(false); }, 450);
  };

  return <>
    <div className="grid">
      <section className="card" aria-labelledby="draft-heading">
        <div className="card-header"><div><p className="eyebrow">01 / compose</p><h2 id="draft-heading" className="card-title">Live firewall workbench</h2><p className="card-subtitle">Write once. See the brand signal before it ships.</p></div><StatusPill tone={evaluated ? "good" : "neutral"}>{evaluating ? "Evaluating" : "Local preview"}</StatusPill></div>
        <div className="card-body">
          <div className="draft-list" aria-label="Preset drafts">{drafts.map((item, index) => <button key={item.title} className={`draft-btn ${selected === index ? "selected" : ""}`} onClick={() => selectDraft(index)}><span className="draft-num">0{index + 1}</span><span className="draft-name">{item.title}</span><span className="draft-note">{item.note}</span></button>)}</div>
          <label className="editor-label" htmlFor="draft"><span>Working draft</span><span>{draft.length} chars</span></label>
          <textarea id="draft" className="editor" value={draft} onChange={(event) => { setDraft(event.target.value); setEvaluated(false); }} aria-describedby="editor-help" />
          <div className="toolbar"><div><label className="small-caps" htmlFor="channel">Preview channel&nbsp; </label><select id="channel" className="select" value={channel} onChange={(event) => setChannel(event.target.value)}><option>LinkedIn</option><option>Email</option><option>Website</option><option>Instagram</option></select></div><button className="primary-btn" onClick={evaluate} disabled={evaluating}><span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><Icon name="spark" />{evaluating ? "Checking…" : "Run evaluation"}</span></button></div>
          <span id="editor-help" className="small-caps" style={{ display: "block", marginTop: 10 }}>{apiNotice}</span>
        </div>
      </section>
      <aside className="side-stack">
        <section className="card" aria-labelledby="score-heading"><div className="score-block"><div id="score-heading" className="score-label">Brand signal score</div><div className="score-number"><strong>{currentScore}</strong><span>/ 100</span></div><div className="meter"><span style={{ width: `${currentScore}%` }} /></div><div className="score-foot"><span>Strong and considered</span><span>Updated now</span></div></div><ul className="signal-list"><li className="signal"><div><span className="signal-label">Voice &amp; point of view</span><span className="signal-detail">Specific, warm, quietly confident</span></div><StatusPill>92</StatusPill></li><li className="signal"><div><span className="signal-label">Proof over promise</span><span className="signal-detail">Material detail supports the claim</span></div><StatusPill>88</StatusPill></li><li className="signal"><div><span className="signal-label">Generic language</span><span className="signal-detail">{slopPhrases.length} phrases worth a second look</span></div><StatusPill tone="warn">Review</StatusPill></li></ul></section>
        <section className="card preview" aria-labelledby="preview-heading"><div className="preview-head"><span className="preview-title" id="preview-heading">Channel preview</span><span className="channel"><span className="status-dot" />{channel}</span></div><div className="preview-body">{highlightSlop(draft)}</div><div className="legend"><i /> Highlighted phrases are potential brand slop, not hard blocks.</div></section>
      </aside>
    </div>
    <div className="grid" style={{ marginTop: 20 }}><section className="card"><div className="card-header"><div><p className="eyebrow">Signal map</p><h2 className="card-title">What the firewall is watching</h2></div><button className="secondary-btn">View rubric <Icon name="arrow" /></button></div><div className="metric-row"><div className="metric"><div className="metric-number">4</div><div className="metric-label">active principles</div></div><div className="metric"><div className="metric-number">02</div><div className="metric-label">soft flags</div></div><div className="metric"><div className="metric-number">1.2s</div><div className="metric-label">last evaluation</div></div></div></section><section className="card"><div className="card-body"><p className="eyebrow">Today</p><p className="card-title" style={{ marginBottom: 8 }}>Your editorial memory is doing the quiet work.</p><p className="card-subtitle">BrandGate compares against the words, proof points, and edges your team has already approved.</p></div></section></div>
  </>;
}

function MemoryStudio() {
  const [url, setUrl] = useState("fieldnotes.co");
  const [extracting, setExtracting] = useState(false);
  const extract = () => { setExtracting(true); window.setTimeout(() => setExtracting(false), 700); };
  return <div className="grid"><section className="card"><div className="card-header"><div><p className="eyebrow">02 / remember</p><h2 className="card-title">Brand memory studio</h2><p className="card-subtitle">Give agents the context that makes a brand feel like itself.</p></div><StatusPill>Synced 4m ago</StatusPill></div><div className="card-body"><label className="editor-label" htmlFor="brand-url"><span>Source to extract</span><span>website · doc · notes</span></label><div style={{ display: "flex", gap: 8 }}><input id="brand-url" className="input" style={{ marginBottom: 0 }} value={url} onChange={(event) => setUrl(event.target.value)} /><button className="primary-btn" onClick={extract}>{extracting ? "Extracting…" : "Extract DNA"}</button></div><div className="dna-section"><h3>Brand point of view</h3><p>Field Notes believes a useful object can lower the volume of a busy day. It values restraint, tactility, and ideas that are allowed to develop slowly.</p></div><div className="dna-section"><h3>Words to reach for</h3><div className="dna-tags"><span className="tag">considered</span><span className="tag">quietly useful</span><span className="tag">made to last</span><span className="tag">room to think</span><span className="tag">small batches</span></div></div><div className="dna-section"><h3>Words to leave behind</h3><div className="dna-tags"><span className="tag" style={{ color: "var(--red)", background: "var(--red-bg)" }}>game-changer</span><span className="tag" style={{ color: "var(--red)", background: "var(--red-bg)" }}>unlock</span><span className="tag" style={{ color: "var(--red)", background: "var(--red-bg)" }}>seamless</span></div></div></div></section><aside className="side-stack"><section className="card"><div className="card-header"><div><p className="eyebrow">The DNA extractor</p><h2 className="card-title">A living brief</h2></div><Icon name="book" /></div><div className="card-body"><p className="card-subtitle" style={{ lineHeight: 1.7 }}>Pull a useful first draft from a homepage, then keep the parts your team wants agents to remember.</p><button className="secondary-btn" style={{ marginTop: 19 }}>Open extraction history <Icon name="arrow" /></button></div></section><section className="card"><div className="card-body"><p className="small-caps">Memory health</p><div className="metric-number" style={{ marginTop: 7 }}>84%</div><div className="thin-meter" style={{ marginTop: 13 }}><span style={{ width: "84%" }} /></div><p className="card-subtitle" style={{ marginTop: 9 }}>Clear enough to guide, flexible enough to evolve.</p></div></section></aside></div>;
}

function Tournament() {
  const [variants, setVariants] = useState(drafts.slice(0, 3).map((draft) => draft.text));
  const update = (index: number, value: string) => setVariants((items) => items.map((item, i) => i === index ? value : item));
  return <section className="card"><div className="card-header"><div><p className="eyebrow">03 / compare</p><h2 className="card-title">Variation tournament</h2><p className="card-subtitle">Put up to three directions in the ring. Choose the one with the clearest signal.</p></div><button className="primary-btn"><Icon name="play" /> Run tournament</button></div><div className="card-body"><div className="tournament-grid">{variants.map((variant, index) => { const score = [92, 84, 77][index]; return <article className="variant-card" key={index}><div className="variant-head"><span className="small-caps">Draft 0{index + 1}</span>{index === 0 ? <StatusPill>Leader</StatusPill> : <span className="mono" style={{ color: "var(--muted)", fontSize: 10 }}>#{index + 1}</span>}</div><textarea aria-label={`Tournament draft ${index + 1}`} value={variant} onChange={(event) => update(index, event.target.value)} /><div className="variant-footer"><div className="bar-line"><span>Brand signal</span><b>{score}</b></div><div className="thin-meter"><span style={{ width: `${score}%` }} /></div><div className="bar-line"><span>Distinctiveness</span><b>{[88, 91, 73][index]}</b></div><div className="thin-meter"><span style={{ width: `${[88, 91, 73][index]}%`, background: "var(--amber)" }} /></div></div></article>; })}</div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, gap: 15, flexWrap: "wrap" }}><span className="card-subtitle"><Icon name="check" /> Scores use the current Field Notes memory and LinkedIn rubric.</span><button className="secondary-btn">Add a fourth? <span className="mono">coming soon</span></button></div></div></section>;
}

function ApiPlayground() {
  const [endpoint, setEndpoint] = useState("Evaluate draft");
  const endpointInfo = endpoint === "Evaluate draft" ? { method: "POST", path: "/api/v1/evaluate", code: `curl -X POST http://localhost:3000/api/v1/evaluate \\\n  -H 'Content-Type: application/json' \\\n  -d '{"draft":"A new way to think.","target_channel":"linkedin","brand_profile_id":"yet-editorial-standard"}'` } : { method: "GET", path: "/api/mcp", code: `curl http://localhost:3000/api/mcp` };
  return <section className="card"><div className="card-header"><div><p className="eyebrow">04 / connect</p><h2 className="card-title">Agent MCP &amp; REST API playground</h2><p className="card-subtitle">See what your agent can call, inspect the request, and take it with you.</p></div><StatusPill tone="neutral">Sandbox</StatusPill></div><div className="card-body"><div className="api-layout"><div className="endpoint-list" role="list" aria-label="API endpoints"><button className={`endpoint ${endpoint === "Evaluate draft" ? "active" : ""}`} onClick={() => setEndpoint("Evaluate draft")}><span className="method">POST</span><span>Evaluate draft</span></button><button className={`endpoint ${endpoint === "Read memory" ? "active" : ""}`} onClick={() => setEndpoint("Read memory")}><span className="method">GET</span><span>Read brand memory</span></button><button className="endpoint" onClick={() => setEndpoint("Evaluate draft")}><span className="method">MCP</span><span>brandgate.evaluate</span></button></div><div><div className="small-caps" style={{ marginBottom: 8 }}>{endpointInfo.method} {endpointInfo.path}</div><div className="code-window" aria-label="Curl example"><span className="code-command">{endpointInfo.code}</span></div><div style={{ display: "flex", gap: 8, marginTop: 12 }}><button className="primary-btn"><Icon name="play" /> Try request</button><button className="secondary-btn"><Icon name="copy" /> Copy curl</button></div></div></div><div style={{ marginTop: 26, borderTop: "1px solid var(--line)", paddingTop: 19 }}><p className="eyebrow">Webhook inspector</p><div className="webhook-row"><div><strong style={{ fontSize: 12 }}>evaluation.completed</strong><span className="signal-detail">https://your-app.com/hooks/brandgate</span></div><StatusPill>200 OK</StatusPill></div><div className="webhook-row"><div><strong style={{ fontSize: 12 }}>memory.updated</strong><span className="signal-detail">Last delivery · yesterday at 16:42</span></div><StatusPill tone="warn">Test</StatusPill></div></div></div></section>;
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("firewall");
  const tabs: { id: Tab; label: string }[] = [{ id: "firewall", label: "Live Firewall" }, { id: "memory", label: "Brand Memory" }, { id: "tournament", label: "Variation Tournament" }, { id: "api", label: "Agent API" }];
  return <main className="app-shell"><header className="topbar"><div className="wordmark"><span className="wordmark-mark">B</span><span className="wordmark-name">BrandGate</span><span className="wordmark-kicker">Editorial workbench</span></div><div className="top-actions"><span><span className="status-dot" />All systems local</span><span className="avatar" aria-label="Profile: AO">AO</span></div></header><div className="page-wrap"><section className="hero"><div><p className="eyebrow">Field Notes / brand workspace</p><h1>Make every word feel like it came from you.</h1></div><p>BrandGate is the calm layer between an agent’s first draft and your public voice.</p></section><nav className="tabs" aria-label="BrandGate workspace"><div role="tablist" style={{ display: "flex" }}>{tabs.map((item, index) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={`tab ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}><span className="tab-index">0{index + 1}</span>{item.label}</button>)}</div></nav>{tab === "firewall" && <FirewallWorkbench />}{tab === "memory" && <MemoryStudio />}{tab === "tournament" && <Tournament />}{tab === "api" && <ApiPlayground />}<footer className="footer"><span>BrandGate · editorial intelligence for teams who care about the sentence.</span><span><a href="#status">Status</a> &nbsp;·&nbsp; <a href="#docs">Docs</a> &nbsp;·&nbsp; <span className="mono">v0.1 local</span></span></footer></div></main>;
}
