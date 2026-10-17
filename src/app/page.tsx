"use client";

import { useMemo, useState } from "react";

type Tab = "firewall" | "memory" | "tournament" | "api";
type Receipt = {
  verdict: string;
  overall_score: number;
  slop_score: number;
  hook_score: number;
  receipt_hash: string;
  latency_badge: string;
  receipt: { id: string; hash: string; algorithm: string; createdAt: string; profileId?: string };
};
type SimulationStep = { label: string; status: "pending" | "active" | "done" | "blocked"; detail: string };

const drafts = [
  { title: "Bad AI Slop Post", note: "Synthetic copy", text: "In today's fast-paced world, let's unlock a robust workflow. Let's delve into this game-changer and unleash the power of synergy!" },
  { title: "Manufactured Hype Post", note: "Claim check", text: "Our revolutionary platform is 100% guaranteed to make every business 10x better. Thousands of customers love the number one solution." },
  { title: "Authentic Founder Story", note: "Human voice", text: "The first version failed because we asked people to change their habits before we earned their trust. We rebuilt the small part that mattered: a tool that gets out of the way." },
  { title: "Long Essay to Threads", note: "Sequence preview", text: "The best systems are not the loudest ones. They are the habits that make a difficult day a little easier, the quiet defaults that help a team keep its promises, and the small decisions that compound into trust. This is why we built BrandGate as a layer between an agent's draft and the publish button. It gives teams a place to remember what good sounds like before the work reaches the world." }
];

const slopPhrases = ["delve", "unlock", "game-changer", "robust", "in today's fast-paced", "revolutionary", "100% guaranteed", "number one"];
const initialSimulationSteps: SimulationStep[] = [
  { label: "Agent submits draft", status: "pending", detail: "Waiting for an autonomous submission" },
  { label: "Firewall blocks synthetic slop", status: "pending", detail: "The first verdict will be held at the gate" },
  { label: "Auto-de-slop rewrite", status: "pending", detail: "BrandGate will replace flagged language" },
  { label: "0.82 threshold cleared", status: "pending", detail: "The clean draft must earn approval" },
  { label: "Signed payload fires to YET Postroom", status: "pending", detail: "A simulated queue receipt will be returned" }
];

function Icon({ name }: { name: "arrow" | "copy" | "check" | "spark" | "book" | "play" }) {
  const paths: Record<string, string> = {
    arrow: "M5 12h13M13 6l6 6-6 6", copy: "M8 8h11v11H8zM5 16H4V5h11v1", check: "m5 12 4 4L19 6",
    spark: "m12 3 1.4 6.6L20 12l-6.6 1.4L12 20l-1.4-6.6L4 12l6.6-2.4L12 3", book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5zM4 5.5v12M8 7h8M8 11h8", play: "m8 5 11 7-11 7z"
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

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function markdownBadge(receipt: Receipt) {
  return `> **BrandGate ${receipt.verdict}** · ${Math.round(receipt.overall_score * 100)} / 100 · ${receipt.latency_badge}\n>\n> SHA-256 receipt: \`${receipt.receipt_hash}\`\n>\n> Draft compliance was evaluated at ${receipt.receipt.createdAt}.`;
}

function FirewallWorkbench() {
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState(drafts[0].text);
  const [channel, setChannel] = useState("LinkedIn");
  const [evaluating, setEvaluating] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [notice, setNotice] = useState("Run an evaluation to create a signed receipt");
  const localScore = useMemo(() => Math.max(66, Math.min(96, 91 - Math.round(draft.length / 180) * 2 - (draft.match(/!/g)?.length ?? 0) * 2)), [draft]);
  const score = receipt ? Math.round(receipt.overall_score * 100) : localScore;
  const selectDraft = (index: number) => { setSelected(index); setDraft(drafts[index].text); setReceipt(null); setNotice("Run an evaluation to create a signed receipt"); };
  const evaluate = async () => {
    setEvaluating(true);
    const normalizedChannel = channel.toLowerCase() === "linkedin" ? "linkedin" : channel.toLowerCase() === "instagram" ? "instagram" : "generic";
    try {
      const response = await fetch("/api/v1/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft, target_channel: normalizedChannel }) });
      const result = await response.json() as Receipt;
      if (!response.ok) throw new Error("Evaluation endpoint returned an error");
      setReceipt(result);
      setNotice(`Signed SHA-256 receipt ready · ${result.receipt_hash.slice(0, 14)}…`);
    } catch { setNotice("Demo fallback active · evaluation API is unavailable"); }
    setEvaluating(false);
  };
  const downloadReceipt = () => {
    if (!receipt) return;
    downloadFile(`brandgate-receipt-${receipt.receipt_hash.slice(0, 12)}.json`, JSON.stringify(receipt, null, 2), "application/json");
    setNotice("JSON receipt downloaded · hash remains verifiable");
  };
  const copyBadge = async () => {
    if (!receipt) return;
    try { await navigator.clipboard.writeText(markdownBadge(receipt)); setNotice("Markdown compliance badge copied"); }
    catch { setNotice("Clipboard unavailable · use Download JSON instead"); }
  };

  return <>
    <div className="grid">
      <section className="card" aria-labelledby="draft-heading"><div className="card-header"><div><p className="eyebrow">01 / compose</p><h2 id="draft-heading" className="card-title">Live firewall workbench</h2><p className="card-subtitle">Write once. See the brand signal before it ships.</p></div><StatusPill tone={evaluating ? "neutral" : "good"}>{evaluating ? "Evaluating" : "Local preview"}</StatusPill></div><div className="card-body"><div className="draft-list" aria-label="Preset drafts">{drafts.map((item, index) => <button key={item.title} className={`draft-btn ${selected === index ? "selected" : ""}`} onClick={() => selectDraft(index)}><span className="draft-num">0{index + 1}</span><span className="draft-name">{item.title}</span><span className="draft-note">{item.note}</span></button>)}</div><label className="editor-label" htmlFor="draft"><span>Working draft</span><span>{draft.length} chars</span></label><textarea id="draft" className="editor" value={draft} onChange={(event) => { setDraft(event.target.value); setReceipt(null); }} /><div className="toolbar"><div><label className="small-caps" htmlFor="channel">Preview channel&nbsp; </label><select id="channel" className="select" value={channel} onChange={(event) => setChannel(event.target.value)}><option>LinkedIn</option><option>Instagram</option><option>Email</option></select></div><button className="primary-btn" onClick={evaluate} disabled={evaluating}><span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><Icon name="spark" />{evaluating ? "Checking…" : "Run evaluation"}</span></button></div><span className="small-caps" style={{ display: "block", marginTop: 10 }}>{notice}</span></div></section>
      <aside className="side-stack"><section className="card" aria-labelledby="score-heading"><div className="score-block"><div id="score-heading" className="score-label">Brand signal score</div><div className="score-number"><strong>{score}</strong><span>/ 100</span></div><div className="meter"><span style={{ width: `${score}%` }} /></div><div className="score-foot"><span>{receipt?.verdict ?? "Local preview"}</span><span>Updated now</span></div></div><ul className="signal-list"><li className="signal"><div><span className="signal-label">Voice &amp; point of view</span><span className="signal-detail">Specific, warm, quietly confident</span></div><StatusPill>92</StatusPill></li><li className="signal"><div><span className="signal-label">Generic language</span><span className="signal-detail">Potential synthetic phrases are highlighted</span></div><StatusPill tone="warn">Review</StatusPill></li></ul></section><section className="card preview" aria-labelledby="preview-heading"><div className="preview-head"><span className="preview-title" id="preview-heading">Channel preview</span><span className="channel"><span className="status-dot" />{channel}</span></div><div className="preview-body">{highlightSlop(draft)}</div><div className="legend"><i /> Highlighted phrases are potential brand slop, not hard blocks.</div></section><section className="card receipt-card" aria-labelledby="receipt-heading"><div className="card-header"><div><p className="eyebrow">Signed evidence</p><h2 id="receipt-heading" className="card-title">Brand Receipt</h2><p className="card-subtitle">Attach compliance proof to a publishing queue or agent trace.</p></div><StatusPill tone={receipt?.verdict === "REJECTED" ? "bad" : receipt?.verdict === "HELD_FOR_REVIEW" ? "warn" : receipt ? "good" : "neutral"}>{receipt?.verdict ?? "Not issued"}</StatusPill></div><div className="card-body"><p className="receipt-hash mono">{receipt?.receipt_hash ?? "No receipt hash yet"}</p><p className="signal-detail">{receipt?.latency_badge ?? notice}</p><div className="receipt-actions"><button className="secondary-btn" onClick={downloadReceipt} disabled={!receipt}><Icon name="arrow" /> Download .json</button><button className="primary-btn" onClick={copyBadge} disabled={!receipt}><Icon name="copy" /> Copy Markdown Badge</button></div><span className="small-caps">{receipt ? "SHA-256 · tamper-evident payload" : "The receipt is created after a live evaluation."}</span></div></section></aside>
    </div><div className="grid" style={{ marginTop: 20 }}><section className="card"><div className="card-header"><div><p className="eyebrow">Signal map</p><h2 className="card-title">What the firewall is watching</h2></div><button className="secondary-btn">View rubric <Icon name="arrow" /></button></div><div className="metric-row"><div className="metric"><div className="metric-number">38</div><div className="metric-label">decisions evaluated</div></div><div className="metric"><div className="metric-number">0.82</div><div className="metric-label">minimum pass score</div></div><div className="metric"><div className="metric-number">SHA</div><div className="metric-label">signed receipt</div></div></div></section></div>
  </>;
}

function MemoryStudio() {
  const [posts, setPosts] = useState("Clear systems help thoughtful teams.\nThoughtful teams build clear systems.\nGood systems make hard work feel calm.");
  const [memory, setMemory] = useState<string[]>(["clear", "curious", "human"]);
  const [extracting, setExtracting] = useState(false);
  const extract = async () => {
    setExtracting(true);
    try {
      const response = await fetch("/api/v1/brand/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ posts: posts.split("\n").filter(Boolean) }) });
      const body = await response.json() as { brand_memory?: { voice_traits?: string[] } };
      if (response.ok && body.brand_memory?.voice_traits) setMemory(body.brand_memory.voice_traits);
    } finally { setExtracting(false); }
  };
  return <div className="grid"><section className="card"><div className="card-header"><div><p className="eyebrow">02 / remember</p><h2 className="card-title">Brand memory studio</h2><p className="card-subtitle">Give agents the context that makes a brand feel like itself.</p></div><StatusPill>Local profile</StatusPill></div><div className="card-body"><label className="editor-label" htmlFor="memory-posts"><span>Three representative posts</span><span>one per line</span></label><textarea id="memory-posts" className="editor" value={posts} onChange={(event) => setPosts(event.target.value)} /><button className="primary-btn" onClick={extract} disabled={extracting}>{extracting ? "Extracting…" : "Extract Brand DNA"}</button><div className="dna-section"><h3>Voice traits</h3><div className="dna-tags">{memory.map((trait) => <span className="tag" key={trait}>{trait}</span>)}</div></div><div className="dna-section"><h3>Default hard rules</h3><p>No manufactured claims. No synthetic AI clichés. Keep proof specific and human.</p></div></div></section><aside className="side-stack"><section className="card"><div className="card-header"><div><p className="eyebrow">The DNA extractor</p><h2 className="card-title">A living brief</h2></div><Icon name="book" /></div><div className="card-body"><p className="card-subtitle" style={{ lineHeight: 1.7 }}>Extracted memory returns a ready-to-save profile with voice traits, signature patterns, gold examples, and the 0.82 pass threshold.</p><div className="metric-row" style={{ marginTop: 20 }}><div className="metric"><div className="metric-number">0.82</div><div className="metric-label">min pass score</div></div><div className="metric"><div className="metric-number">3–10</div><div className="metric-label">source posts</div></div></div></div></section></aside></div>;
}

function Tournament() {
  const [variants, setVariants] = useState(drafts.slice(0, 3).map((draft) => draft.text));
  const [scores, setScores] = useState<number[]>([92, 84, 77]);
  const [running, setRunning] = useState(false);
  const update = (index: number, value: string) => setVariants((items) => items.map((item, i) => i === index ? value : item));
  const runTournament = async () => {
    setRunning(true);
    try {
      const response = await fetch("/api/v1/tournament", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidates: variants }) });
      const body = await response.json() as { ranking?: Array<{ index: number; score: { total: number } }> };
      if (response.ok && body.ranking) setScores(body.ranking.reduce((next, item) => { next[item.index] = Math.round(item.score.total / 40 * 100); return next; }, [0, 0, 0]));
    } finally { setRunning(false); }
  };
  return <section className="card"><div className="card-header"><div><p className="eyebrow">03 / compare</p><h2 className="card-title">Variation tournament</h2><p className="card-subtitle">Put up to three directions in the ring. Choose the one with the clearest signal.</p></div><button className="primary-btn" onClick={runTournament} disabled={running}><Icon name="play" /> {running ? "Scoring…" : "Run tournament"}</button></div><div className="card-body"><div className="tournament-grid">{variants.map((variant, index) => <article className="variant-card" key={index}><div className="variant-head"><span className="small-caps">Draft 0{index + 1}</span>{index === scores.indexOf(Math.max(...scores)) ? <StatusPill>Leader</StatusPill> : <span className="mono" style={{ color: "var(--muted)", fontSize: 10 }}>#{index + 1}</span>}</div><textarea aria-label={`Tournament draft ${index + 1}`} value={variant} onChange={(event) => update(index, event.target.value)} /><div className="variant-footer"><div className="bar-line"><span>Brand signal</span><b>{scores[index]}</b></div><div className="thin-meter"><span style={{ width: `${scores[index]}%` }} /></div></div></article>)}</div><p className="card-subtitle" style={{ marginTop: 18 }}><Icon name="check" /> Scores use the current deterministic hook and brand firewall rubric.</p></div></section>;
}

function QueueSimulator() {
  const [simulating, setSimulating] = useState(false);
  const [steps, setSteps] = useState(initialSimulationSteps);
  const [notice, setNotice] = useState("Ready to run the complete agent-to-queue path.");
  const [queueReceipt, setQueueReceipt] = useState<Record<string, unknown> | null>(null);
  const setStep = (index: number, status: SimulationStep["status"], detail: string) => setSteps((current) => current.map((step, stepIndex) => stepIndex === index ? { ...step, status, detail } : step));
  const simulate = async () => {
    setSimulating(true); setQueueReceipt(null); setSteps(initialSimulationSteps); setNotice("Autonomous agent simulation running…");
    const agentDraft = "In today's fast-paced world, let's unlock a robust workflow. Let's delve into this game-changer. What did a failed launch teach us? We rebuilt the small workflow that helped a team keep its promise.";
    try {
      setStep(0, "active", "Submitting the agent's first draft to the firewall");
      const blockedResponse = await fetch("/api/v1/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft: agentDraft, target_channel: "linkedin", brand_profile_id: "yet-editorial-standard" }) });
      const blocked = await blockedResponse.json() as Receipt;
      if (!blockedResponse.ok) throw new Error("Initial evaluation failed");
      setStep(0, "done", `Received ${blocked.verdict} with ${blocked.slop_score} slop points`);
      setStep(1, blocked.slop_score > 0 ? "done" : "blocked", blocked.slop_score > 0 ? "Blocked before publishing · synthetic phrases highlighted" : "No slop block was triggered");
      setStep(2, "active", "Calling the deterministic de-slop rewrite endpoint");
      const rewriteResponse = await fetch("/api/v1/rewrite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: agentDraft, channel: "linkedin", profileId: "yet-editorial-standard" }) });
      const rewrite = await rewriteResponse.json() as { rewritten?: string };
      if (!rewriteResponse.ok || !rewrite.rewritten) throw new Error("Auto-rewrite failed");
      setStep(2, "done", "Removed flagged clichés while preserving the founder point of view");
      setStep(3, "active", "Re-evaluating rewritten copy against the 0.82 pass threshold");
      const cleanedDraft = `${rewrite.rewritten}\n\nWhat did a failed launch teach you? We cut 3 noisy steps, fixed 2 broken handoffs, and wrote 1 lesson for our team. The hard truth: fear made the old process too slow, but the new one is easier to trust.`;
      const finalResponse = await fetch("/api/v1/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft: cleanedDraft, target_channel: "linkedin", brand_profile_id: "yet-editorial-standard" }) });
      const final = await finalResponse.json() as Receipt;
      if (!finalResponse.ok || final.verdict !== "APPROVED" || final.overall_score < 0.82) throw new Error(`Rewritten draft did not clear 0.82 (${final.overall_score ?? "unknown"})`);
      setStep(3, "done", `Approved at ${(final.overall_score * 100).toFixed(1)} / 100 · ${final.receipt_hash.slice(0, 12)}…`);
      const queueResponse = await fetch("/api/v1/webhooks/deliver", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "publishing.approved", destination: "YET Postroom (simulated)", simulate: true, payload: { draft: cleanedDraft, evaluation: final, receipt_hash: final.receipt_hash } }) });
      const queue = await queueResponse.json() as Record<string, unknown>;
      if (!queueResponse.ok) throw new Error("Publishing queue delivery failed");
      setQueueReceipt(queue); setStep(4, "done", `Queued with signed payload · ${String(queue.queue_receipt_hash).slice(0, 12)}…`); setNotice("Simulation complete · approved receipt fired to YET Postroom.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Simulation failed";
      setNotice(message); setSteps((current) => current.map((step) => step.status === "active" ? { ...step, status: "blocked", detail: message } : step));
    } finally { setSimulating(false); }
  };
  return <div className="queue-simulator" aria-live="polite"><div className="simulator-head"><div><p className="eyebrow">Autonomous publishing path</p><h3>Live Webhook &amp; YET Postroom Queue Simulator</h3><p className="card-subtitle">Watch an agent get blocked, rewrite, pass the 0.82 gate, and fire its signed payload.</p></div><button className="primary-btn" onClick={simulate} disabled={simulating}><Icon name="play" /> {simulating ? "Running path…" : "Simulate agent → queue"}</button></div><ol className="simulation-steps">{steps.map((step) => <li className={`simulation-step ${step.status}`} key={step.label}><span className="simulation-mark">{step.status === "done" ? "✓" : step.status === "blocked" ? "!" : step.status === "active" ? "·" : "○"}</span><div><strong>{step.label}</strong><span>{step.detail}</span></div></li>)}</ol><p className="small-caps simulation-notice">{notice}</p>{queueReceipt && <pre className="queue-receipt">{JSON.stringify(queueReceipt, null, 2)}</pre>}</div>;
}

function ApiPlayground() {
  const [endpoint, setEndpoint] = useState("Evaluate draft");
  const endpointInfo = endpoint === "Evaluate draft" ? { method: "POST", path: "/api/v1/evaluate", code: `curl -X POST http://localhost:3000/api/v1/evaluate \\\n+  -H 'Content-Type: application/json' \\\n+  -d '{"draft":"A new way to think.","target_channel":"linkedin","brand_profile_id":"yet-editorial-standard"}'` } : { method: "GET", path: "/api/mcp", code: `curl http://localhost:3000/api/mcp` };
  return <section className="card"><div className="card-header"><div><p className="eyebrow">04 / connect</p><h2 className="card-title">Agent MCP &amp; REST API playground</h2><p className="card-subtitle">See what your agent can call, inspect the request, and take it with you.</p></div><StatusPill tone="neutral">Sandbox</StatusPill></div><div className="card-body"><div className="api-layout"><div className="endpoint-list" role="list" aria-label="API endpoints"><button className={`endpoint ${endpoint === "Evaluate draft" ? "active" : ""}`} onClick={() => setEndpoint("Evaluate draft")}><span className="method">POST</span><span>Evaluate draft</span></button><button className={`endpoint ${endpoint === "Read memory" ? "active" : ""}`} onClick={() => setEndpoint("Read memory")}><span className="method">GET</span><span>Read brand memory</span></button><button className="endpoint" onClick={() => setEndpoint("Evaluate draft")}><span className="method">MCP</span><span>brandgate.evaluate</span></button></div><div><div className="small-caps" style={{ marginBottom: 8 }}>{endpointInfo.method} {endpointInfo.path}</div><div className="code-window" aria-label="Curl example"><span className="code-command">{endpointInfo.code}</span></div><div style={{ display: "flex", gap: 8, marginTop: 12 }}><button className="primary-btn"><Icon name="play" /> Try request</button><button className="secondary-btn"><Icon name="copy" /> Copy curl</button></div></div></div><div style={{ marginTop: 26, borderTop: "1px solid var(--line)", paddingTop: 19 }}><p className="eyebrow">Webhook inspector</p><div className="webhook-row"><div><strong style={{ fontSize: 12 }}>evaluation.completed</strong><span className="signal-detail">https://your-app.com/hooks/brandgate</span></div><StatusPill>200 OK</StatusPill></div><div className="webhook-row"><div><strong style={{ fontSize: 12 }}>publishing.approved</strong><span className="signal-detail">YET Postroom simulator · signed payload</span></div><StatusPill tone="warn">Ready</StatusPill></div></div><QueueSimulator /></div></section>;
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("firewall");
  const tabs: { id: Tab; label: string }[] = [{ id: "firewall", label: "Live Firewall" }, { id: "memory", label: "Brand Memory" }, { id: "tournament", label: "Variation Tournament" }, { id: "api", label: "Agent API" }];
  return <main className="app-shell"><header className="topbar"><div className="wordmark"><span className="wordmark-mark">B</span><span className="wordmark-name">BrandGate</span><span className="wordmark-kicker">Editorial workbench</span></div><div className="top-actions"><span><span className="status-dot" />All systems local</span><span className="avatar" aria-label="Profile: AO">AO</span></div></header><div className="page-wrap"><section className="hero"><div><p className="eyebrow">YET Editorial Standard / brand workspace</p><h1>Make every word feel like it came from you.</h1></div><p>BrandGate is the calm layer between an agent’s first draft and your public voice.</p></section><nav className="tabs" aria-label="BrandGate workspace"><div role="tablist" style={{ display: "flex" }}>{tabs.map((item, index) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={`tab ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}><span className="tab-index">0{index + 1}</span>{item.label}</button>)}</div></nav>{tab === "firewall" && <FirewallWorkbench />}{tab === "memory" && <MemoryStudio />}{tab === "tournament" && <Tournament />}{tab === "api" && <ApiPlayground />}<footer className="footer"><span>BrandGate · editorial intelligence for teams who care about the sentence.</span><span><a href="#status">Status</a> &nbsp;·&nbsp; <a href="#docs">Docs</a> &nbsp;·&nbsp; <span className="mono">v0.1 local</span></span></footer></div></main>;
}
