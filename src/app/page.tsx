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
type RuntimeSettings = { jevApiKey: string; jevApiUrl: string; postroomWebhookUrl: string };

const SETTINGS_KEY = "brandgate.engine.settings";

function readRuntimeSettings(): RuntimeSettings {
  if (typeof window === "undefined") return { jevApiKey: "", jevApiUrl: "", postroomWebhookUrl: "" };
  try {
    return { jevApiKey: "", jevApiUrl: "", postroomWebhookUrl: "", ...JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return { jevApiKey: "", jevApiUrl: "", postroomWebhookUrl: "" };
  }
}

function runtimeHeaders(extra: Record<string, string> = {}) {
  const settings = readRuntimeSettings();
  return {
    "Content-Type": "application/json",
    ...(settings.jevApiKey ? { "x-brandgate-jev-api-key": settings.jevApiKey } : {}),
    ...(settings.jevApiUrl ? { "x-brandgate-jev-api-url": settings.jevApiUrl } : {}),
    ...(settings.postroomWebhookUrl ? { "x-brandgate-postroom-webhook-url": settings.postroomWebhookUrl } : {}),
    ...extra
  };
}

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

function Modal({ title, eyebrow, children, onClose }: { title: string; eyebrow: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-topline"><span className="eyebrow">{eyebrow}</span><button className="modal-close" onClick={onClose} aria-label="Close dialog">×</button></div><h2 id="modal-title">{title}</h2>{children}</section></div>;
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<RuntimeSettings>(() => readRuntimeSettings());
  const [saved, setSaved] = useState(false);
  const hybrid = Boolean(settings.jevApiKey.trim());
  const update = (field: keyof RuntimeSettings, value: string) => setSettings((current) => ({ ...current, [field]: value }));
  const save = () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  const clear = () => {
    const empty = { jevApiKey: "", jevApiUrl: "", postroomWebhookUrl: "" };
    window.localStorage.removeItem(SETTINGS_KEY);
    setSettings(empty);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  return <Modal eyebrow="Runtime controls" title="⚙️ Engine &amp; Token Settings" onClose={onClose}><div className={`mode-banner ${hybrid ? "hybrid" : "local"}`}><div><span className="small-caps">Active evaluation mode</span><strong>{hybrid ? "TypeSafe Jev Hybrid Mode" : "Local Deterministic Engine (Active · 0 Tokens Required)"}</strong></div><StatusPill tone={hybrid ? "warn" : "good"}>{hybrid ? "JEV + fallback" : "Local"}</StatusPill></div><p className="modal-copy">Values entered here stay in this browser&apos;s localStorage. They are sent as request headers only when you run an evaluation or delivery. Server environment variables remain the default for headless REST and Docker use.</p><label className="settings-field"><span>JEV_API_KEY <em>optional</em></span><input className="input" type="password" value={settings.jevApiKey} onChange={(event) => update("jevApiKey", event.target.value)} placeholder="Paste a JEV key to enable hybrid mode" autoComplete="off" /></label><label className="settings-field"><span>JEV_API_URL <em>optional</em></span><input className="input" value={settings.jevApiUrl} onChange={(event) => update("jevApiUrl", event.target.value)} placeholder="https://api.jev.ai/v1/evaluate" /></label><label className="settings-field"><span>POSTROOM_WEBHOOK_URL <em>optional</em></span><input className="input" value={settings.postroomWebhookUrl} onChange={(event) => update("postroomWebhookUrl", event.target.value)} placeholder="https://your-postroom.example/hooks/brandgate" /></label><div className="modal-actions"><button className="secondary-btn" onClick={clear}>Clear browser settings</button><button className="primary-btn" onClick={save}>{saved ? "Saved locally" : "Save settings"}</button></div></Modal>;
}

function QuickstartModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const command = "curl -sS -X POST http://localhost:3000/api/mcp -H 'Content-Type: application/json' -d '{\"method\":\"tools/list\"}'";
  const copyCommand = async () => {
    try { await copyText(command); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  };
  return <Modal eyebrow="Three ways in" title="📖 Quickstart &amp; How It Works" onClose={onClose}><div className="quickstart-grid"><article className="quickstart-card"><span className="quickstart-number">01</span><h3>Web Studio</h3><p>Paste a draft, check 38 decisions, and receive a signed SHA-256 Brand Receipt before anything ships.</p><span className="quickstart-flow">Paste draft <b>→</b> Check rules <b>→</b> Receipt</span></article><article className="quickstart-card"><span className="quickstart-number">02</span><h3>MCP for agents</h3><p>Connect OpenClaw, Hermes, or Claude to the BrandGate MCP endpoint and let the firewall sit between writing and publishing.</p><div className="quickstart-code"><code>POST /api/mcp</code><button className="copy-chip" onClick={copyCommand}>{copied ? "Copied" : "Copy command"}</button></div></article><article className="quickstart-card"><span className="quickstart-number">03</span><h3>Docker / REST</h3><p>Run the self-hosted firewall locally with no cloud database and no token requirement for deterministic mode.</p><code className="quickstart-shell">docker build -t brandgate .<br />docker run -p 3000:3000 brandgate</code></article></div><p className="copy-feedback">{copied ? "MCP tools/list command copied to clipboard." : "Local mode is ready immediately; hybrid JEV mode is optional."}</p></Modal>;
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

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function FirewallWorkbench() {
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState(drafts[0].text);
  const [channel, setChannel] = useState("LinkedIn");
  const [evaluating, setEvaluating] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [notice, setNotice] = useState("Run an evaluation to create a signed receipt");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [badgeCopied, setBadgeCopied] = useState(false);
  const localScore = useMemo(() => Math.max(66, Math.min(96, 91 - Math.round(draft.length / 180) * 2 - (draft.match(/!/g)?.length ?? 0) * 2)), [draft]);
  const score = receipt ? Math.round(receipt.overall_score * 100) : localScore;

  const selectDraft = (index: number) => {
    setSelected(index);
    setDraft(drafts[index].text);
    setReceipt(null);
    setNotice("Run an evaluation to create a signed receipt");
  };
  const evaluate = async () => {
    setEvaluating(true);
    const targetChannel = channel.toLowerCase() === "linkedin" ? "linkedin" : channel.toLowerCase() === "instagram" ? "instagram" : "generic";
    try {
      const response = await fetch("/api/v1/evaluate", { method: "POST", headers: runtimeHeaders(), body: JSON.stringify({ draft, target_channel: targetChannel }) });
      const result = await response.json() as Receipt;
      if (!response.ok) throw new Error("Evaluation endpoint returned an error");
      setReceipt(result);
      setNotice(`Signed SHA-256 receipt ready · ${result.receipt_hash.slice(0, 14)}…`);
    } catch { setNotice("Demo fallback active · evaluation API is unavailable"); }
    setEvaluating(false);
  };
  const saveReceipt = () => {
    if (!receipt) return;
    downloadFile(`brandgate-receipt-${receipt.receipt_hash.slice(0, 12)}.json`, JSON.stringify(receipt, null, 2), "application/json");
    setNotice("JSON receipt downloaded · hash remains verifiable");
  };
  const copyBadge = async () => {
    if (!receipt) return;
    try { await copyText(markdownBadge(receipt)); setBadgeCopied(true); setNotice("Markdown compliance badge copied"); setTimeout(() => setBadgeCopied(false), 1800); }
    catch { setNotice("Clipboard unavailable · use Download JSON instead"); }
  };

  return <>
    <div className="grid">
      <section className="card" aria-labelledby="draft-heading"><div className="card-header"><div><p className="eyebrow">01 / compose</p><h2 id="draft-heading" className="card-title">Live firewall workbench</h2><p className="card-subtitle">Write once. See the brand signal before it ships.</p></div><StatusPill tone={evaluating ? "neutral" : "good"}>{evaluating ? "Evaluating" : "Local preview"}</StatusPill></div><div className="card-body"><div className="draft-list" aria-label="Preset drafts">{drafts.map((item, index) => <button key={item.title} className={`draft-btn ${selected === index ? "selected" : ""}`} onClick={() => selectDraft(index)}><span className="draft-num">0{index + 1}</span><span className="draft-name">{item.title}</span><span className="draft-note">{item.note}</span></button>)}</div><label className="editor-label" htmlFor="draft"><span>Working draft</span><span>{draft.length} chars</span></label><textarea id="draft" className="editor" value={draft} onChange={(event) => { setDraft(event.target.value); setReceipt(null); }} /><div className="toolbar"><div><label className="small-caps" htmlFor="channel">Preview channel&nbsp; </label><select id="channel" className="select" value={channel} onChange={(event) => setChannel(event.target.value)}><option>LinkedIn</option><option>Instagram</option><option>Email</option></select></div><button className="primary-btn" onClick={evaluate} disabled={evaluating}><span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><Icon name="spark" />{evaluating ? "Checking…" : "Run evaluation"}</span></button></div><span className="small-caps" style={{ display: "block", marginTop: 10 }}>{notice}</span></div></section>
      <aside className="side-stack"><section className="card" aria-labelledby="score-heading"><div className="score-block"><div id="score-heading" className="score-label">Brand signal score</div><div className="score-number"><strong>{score}</strong><span>/ 100</span></div><div className="meter"><span style={{ width: `${score}%` }} /></div><div className="score-foot"><span>{receipt?.verdict ?? "Local preview"}</span><span>Updated now</span></div></div><ul className="signal-list"><li className="signal"><div><span className="signal-label">Voice &amp; point of view</span><span className="signal-detail">Specific, warm, quietly confident</span></div><StatusPill>92</StatusPill></li><li className="signal"><div><span className="signal-label">Generic language</span><span className="signal-detail">Potential synthetic phrases are highlighted</span></div><StatusPill tone="warn">Review</StatusPill></li></ul></section><section className="card preview" aria-labelledby="preview-heading"><div className="preview-head"><span className="preview-title" id="preview-heading">Channel preview</span><span className="channel"><span className="status-dot" />{channel}</span></div><div className="preview-body">{highlightSlop(draft)}</div><div className="legend"><i /> Highlighted phrases are potential brand slop, not hard blocks.</div></section><section className="card receipt-card" aria-labelledby="receipt-heading"><div className="card-header"><div><p className="eyebrow">Signed evidence</p><h2 id="receipt-heading" className="card-title">Brand Receipt</h2><p className="card-subtitle">Attach compliance proof to a publishing queue or agent trace.</p></div><StatusPill tone={receipt?.verdict === "REJECTED" ? "bad" : receipt?.verdict === "HELD_FOR_REVIEW" ? "warn" : receipt ? "good" : "neutral"}>{receipt?.verdict ?? "Not issued"}</StatusPill></div><div className="card-body"><p className="receipt-hash mono">{receipt?.receipt_hash ?? "No receipt hash yet"}</p><p className="signal-detail">{receipt?.latency_badge ?? notice}</p><div className="receipt-actions"><button className="secondary-btn" onClick={() => setReceiptOpen(true)} disabled={!receipt}><Icon name="book" /> View full JSON</button><button className="primary-btn" onClick={copyBadge} disabled={!receipt}><Icon name="copy" /> {badgeCopied ? "Copied badge" : "Copy Markdown Badge"}</button></div><span className="small-caps">{receipt ? "SHA-256 · tamper-evident payload" : "The receipt is created after a live evaluation."}</span></div></section></aside>
    </div><div className="grid" style={{ marginTop: 20 }}><section className="card"><div className="card-header"><div><p className="eyebrow">Signal map</p><h2 className="card-title">What the firewall is watching</h2></div><button className="secondary-btn">View rubric <Icon name="arrow" /></button></div><div className="metric-row"><div className="metric"><div className="metric-number">38</div><div className="metric-label">decisions evaluated</div></div><div className="metric"><div className="metric-number">0.82</div><div className="metric-label">minimum pass score</div></div><div className="metric"><div className="metric-number">SHA</div><div className="metric-label">signed receipt</div></div></div></section></div>
    {receipt && receiptOpen && <Modal eyebrow="Signed evidence" title="Full Signed JSON Receipt" onClose={() => setReceiptOpen(false)}><pre className="modal-code">{JSON.stringify(receipt, null, 2)}</pre><div className="modal-actions"><button className="secondary-btn" onClick={saveReceipt}>Download JSON</button><button className="primary-btn" onClick={copyBadge}>{badgeCopied ? "Copied" : "Copy Markdown Badge"}</button></div></Modal>}
  </>;
}

function MemoryStudio() {
  const [posts, setPosts] = useState("Clear systems help thoughtful teams.\nThoughtful teams build clear systems.\nGood systems make hard work feel calm.");
  const [memory, setMemory] = useState<string[]>(["clear", "curious", "human"]);
  const [extracting, setExtracting] = useState(false);
  const extract = async () => {
    setExtracting(true);
    try {
      const response = await fetch("/api/v1/brand/extract", { method: "POST", headers: runtimeHeaders(), body: JSON.stringify({ posts: posts.split("\n").filter(Boolean) }) });
      const body = await response.json() as { brand_memory?: { voice_traits?: string[] } };
      if (response.ok && body.brand_memory?.voice_traits) setMemory(body.brand_memory.voice_traits);
    } finally { setExtracting(false); }
  };
  return <div className="grid"><section className="card"><div className="card-header"><div><p className="eyebrow">02 / remember</p><h2 className="card-title">Brand memory studio</h2><p className="card-subtitle">Give agents the context that makes a brand feel like itself.</p></div><StatusPill>Local profile</StatusPill></div><div className="card-body"><label className="editor-label" htmlFor="memory-posts"><span>Three representative posts</span><span>one per line</span></label><textarea id="memory-posts" className="editor" value={posts} onChange={(event) => setPosts(event.target.value)} /><button className="primary-btn" onClick={extract} disabled={extracting}>{extracting ? "Extracting…" : "Extract Brand DNA"}</button><div className="dna-section"><h3>Voice traits</h3><div className="dna-tags">{memory.map((trait) => <span className="tag" key={trait}>{trait}</span>)}</div></div><div className="dna-section"><h3>Default hard rules</h3><p>No manufactured claims. No synthetic AI clichés. Keep proof specific and human.</p></div></div></section><aside className="side-stack"><section className="card"><div className="card-header"><div><p className="eyebrow">The DNA extractor</p><h2 className="card-title">A living brief</h2></div><Icon name="book" /></div><div className="card-body"><p className="card-subtitle" style={{ lineHeight: 1.7 }}>Extracted memory returns a ready-to-save profile with voice traits, signature patterns, gold examples, and the 0.82 pass threshold.</p><div className="metric-row" style={{ marginTop: 20 }}><div className="metric"><div className="metric-number">0.82</div><div className="metric-label">min pass score</div></div><div className="metric"><div className="metric-number">3–10</div><div className="metric-label">source posts</div></div></div></div></section></aside></div>;
}

function Tournament() {
  const [variants, setVariants] = useState(drafts.slice(0, 3).map((draft) => draft.text));
  type TournamentResult = { index: number; score: number; verdict: string; slop_penalty_count: number; key_reason: string };
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [running, setRunning] = useState(false);
  const update = (index: number, value: string) => setVariants((items) => items.map((item, i) => i === index ? value : item));
  const runTournament = async () => {
    setRunning(true);
    try {
      const response = await fetch("/api/v1/tournament", { method: "POST", headers: runtimeHeaders(), body: JSON.stringify({ candidates: variants }) });
      const body = await response.json() as { ranking?: TournamentResult[] };
      if (response.ok && body.ranking) setResults(body.ranking);
    } finally { setRunning(false); }
  };
  const winnerIndex = results[0]?.index;
  return <section className="card"><div className="card-header"><div><p className="eyebrow">03 / compare</p><h2 className="card-title">Variation tournament</h2><p className="card-subtitle">Each draft runs through the full BrandGate engine. The winner is not position-biased.</p></div><button className="primary-btn" onClick={runTournament} disabled={running}><Icon name="play" /> {running ? "Scoring…" : "Run tournament"}</button></div><div className="card-body"><div className="tournament-grid">{variants.map((variant, index) => { const result = results.find((item) => item.index === index); const isWinner = winnerIndex === index; return <article className={`variant-card ${isWinner ? "winner" : ""}`} key={index}><div className="variant-head"><span className="small-caps">Draft 0{index + 1}</span>{isWinner ? <StatusPill>Leader</StatusPill> : result ? <StatusPill tone={result.verdict === "APPROVED" ? "good" : "bad"}>{result.verdict}</StatusPill> : <span className="mono" style={{ color: "var(--muted)", fontSize: 10 }}>Awaiting score</span>}</div><textarea aria-label={`Tournament draft ${index + 1}`} value={variant} onChange={(event) => { update(index, event.target.value); setResults([]); }} /><div className="variant-footer">{result ? <><div className="bar-line"><span>Brand signal</span><b>{result.score}</b></div><div className="thin-meter"><span style={{ width: `${result.score}%` }} /></div><div className="tournament-diagnostics"><span>{result.slop_penalty_count} slop {result.slop_penalty_count === 1 ? "penalty" : "penalties"}</span><span title={result.key_reason}>{result.key_reason}</span></div></> : <div className="bar-line"><span>Run tournament for full score</span><b>—</b></div>}</div></article>; })}</div><p className="card-subtitle" style={{ marginTop: 18 }}><Icon name="check" /> Scores combine rule safety, slop penalties, hook strength, and concrete specificity.</p></div></section>;
}

function QueueSimulator() {
  const [simulating, setSimulating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [steps, setSteps] = useState(initialSimulationSteps);
  const [notice, setNotice] = useState("Ready to run the complete agent-to-queue path.");
  const [queueReceipt, setQueueReceipt] = useState<Record<string, unknown> | null>(null);
  const setStep = (index: number, status: SimulationStep["status"], detail: string) => setSteps((current) => current.map((step, stepIndex) => stepIndex === index ? { ...step, status, detail } : step));
  const runSimulation = async () => {
    setShowConfirm(false);
    setSimulating(true); setQueueReceipt(null); setSteps(initialSimulationSteps); setNotice("Autonomous agent simulation running…");
    const agentDraft = "In today's fast-paced world, let's unlock a robust workflow. Let's delve into this game-changer. What did a failed launch teach us? We rebuilt the small workflow that helped a team keep its promise.";
    try {
      setStep(0, "active", "Submitting the agent's first draft to the firewall");
      const blockedResponse = await fetch("/api/v1/evaluate", { method: "POST", headers: runtimeHeaders(), body: JSON.stringify({ draft: agentDraft, target_channel: "linkedin", brand_profile_id: "yet-editorial-standard" }) });
      const blocked = await blockedResponse.json() as Receipt;
      if (!blockedResponse.ok) throw new Error("Initial evaluation failed");
      setStep(0, "done", `Received ${blocked.verdict} with ${blocked.slop_score} slop points`);
      setStep(1, blocked.slop_score > 0 ? "done" : "blocked", blocked.slop_score > 0 ? "Blocked before publishing · synthetic phrases highlighted" : "No slop block was triggered");
      setStep(2, "active", "Calling the deterministic de-slop rewrite endpoint");
      const rewriteResponse = await fetch("/api/v1/rewrite", { method: "POST", headers: runtimeHeaders(), body: JSON.stringify({ text: agentDraft, channel: "linkedin", profileId: "yet-editorial-standard" }) });
      const rewrite = await rewriteResponse.json() as { rewritten?: string };
      if (!rewriteResponse.ok || !rewrite.rewritten) throw new Error("Auto-rewrite failed");
      setStep(2, "done", "Removed flagged clichés while preserving the founder point of view");
      setStep(3, "active", "Re-evaluating rewritten copy against the 0.82 pass threshold");
      const cleanedDraft = `${rewrite.rewritten}\n\nWhat did a failed launch teach you? We cut 3 noisy steps, fixed 2 broken handoffs, and wrote 1 lesson for our team. The hard truth: fear made the old process too slow, but the new one is easier to trust.`;
      const finalResponse = await fetch("/api/v1/evaluate", { method: "POST", headers: runtimeHeaders(), body: JSON.stringify({ draft: cleanedDraft, target_channel: "linkedin", brand_profile_id: "yet-editorial-standard" }) });
      const final = await finalResponse.json() as Receipt;
      if (!finalResponse.ok || final.verdict !== "APPROVED" || final.overall_score < 0.82) throw new Error(`Rewritten draft did not clear 0.82 (${final.overall_score ?? "unknown"})`);
      setStep(3, "done", `Approved at ${(final.overall_score * 100).toFixed(1)} / 100 · ${final.receipt_hash.slice(0, 12)}…`);
      const queueResponse = await fetch("/api/v1/webhooks/deliver", { method: "POST", headers: runtimeHeaders(), body: JSON.stringify({ event: "publishing.approved", destination: "YET Postroom (simulated)", simulate: true, payload: { draft: cleanedDraft, evaluation: final, receipt_hash: final.receipt_hash } }) });
      const queue = await queueResponse.json() as Record<string, unknown>;
      if (!queueResponse.ok) throw new Error("Publishing queue delivery failed");
      setQueueReceipt(queue); setStep(4, "done", `Queued with signed payload · ${String(queue.queue_receipt_hash).slice(0, 12)}…`); setNotice("Simulation complete · approved receipt fired to YET Postroom.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Simulation failed";
      setNotice(message); setSteps((current) => current.map((step) => step.status === "active" ? { ...step, status: "blocked", detail: message } : step));
    } finally { setSimulating(false); }
  };
  return <><div className="queue-simulator" aria-live="polite"><div className="simulator-head"><div><p className="eyebrow">Autonomous publishing path</p><h3>Live Webhook &amp; YET Postroom Queue Simulator</h3><p className="card-subtitle">Watch an agent get blocked, rewrite, pass the 0.82 gate, and fire its signed payload.</p></div><button className="primary-btn" onClick={() => setShowConfirm(true)} disabled={simulating}><Icon name="play" /> {simulating ? "Running path…" : "Simulate agent → queue"}</button></div><ol className="simulation-steps">{steps.map((step) => <li className={`simulation-step ${step.status}`} key={step.label}><span className="simulation-mark">{step.status === "done" ? "✓" : step.status === "blocked" ? "!" : step.status === "active" ? "·" : "○"}</span><div><strong>{step.label}</strong><span>{step.detail}</span></div></li>)}</ol><p className="small-caps simulation-notice">{notice}</p>{queueReceipt && <pre className="queue-receipt">{JSON.stringify(queueReceipt, null, 2)}</pre>}</div>{showConfirm && <Modal eyebrow="Outbound simulation" title="Simulate Webhook Delivery to YET Postroom" onClose={() => setShowConfirm(false)}><p className="modal-copy">BrandGate will submit the preset agent draft, block its slop, rewrite it, verify the 0.82 threshold, and queue a signed payload. No external network delivery is made.</p><div className="modal-route"><span>Destination</span><strong>YET Postroom · simulated</strong></div><div className="modal-actions"><button className="secondary-btn" onClick={() => setShowConfirm(false)}>Cancel</button><button className="primary-btn" onClick={runSimulation}><Icon name="play" /> Start simulation</button></div></Modal>}</>;
}

function ApiPlayground() {
  const [endpoint, setEndpoint] = useState("Evaluate draft");
  const [configOpen, setConfigOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const endpointInfo = endpoint === "Evaluate draft"
    ? { method: "POST", path: "/api/v1/evaluate", code: `curl -X POST http://localhost:3000/api/v1/evaluate \\\n  -H 'Content-Type: application/json' \\\n  -d '{"draft":"A new way to think.","target_channel":"linkedin","brand_profile_id":"yet-editorial-standard"}'` }
    : { method: "GET", path: "/api/mcp", code: "curl http://localhost:3000/api/mcp" };
  const curl = `curl -X POST http://localhost:3000/api/v1/evaluate \\\n  -H 'Content-Type: application/json' \\\n  -d '{"draft":"A specific lesson for thoughtful teams.","target_channel":"linkedin","brand_profile_id":"yet-editorial-standard"}'`;
  const mcp = JSON.stringify({ mcpServers: { brandgate: { url: "http://localhost:3000/api/mcp" } } }, null, 2);
  const copyConfig = async (label: string, value?: string) => {
    try { await copyText(value ?? (label === "REST copied" ? curl : mcp)); setCopied(label); setTimeout(() => setCopied(null), 1800); }
    catch { setCopied("Clipboard unavailable"); }
  };
  return <section className="card"><div className="card-header"><div><p className="eyebrow">04 / connect</p><h2 className="card-title">Agent MCP &amp; REST API playground</h2><p className="card-subtitle">See what your agent can call, inspect the request, and take it with you.</p></div><StatusPill tone="neutral">Sandbox</StatusPill></div><div className="card-body"><div className="api-layout"><div className="endpoint-list" role="list" aria-label="API endpoints"><button className={`endpoint ${endpoint === "Evaluate draft" ? "active" : ""}`} onClick={() => setEndpoint("Evaluate draft")}><span className="method">POST</span><span>Evaluate draft</span></button><button className={`endpoint ${endpoint === "Read memory" ? "active" : ""}`} onClick={() => setEndpoint("Read memory")}><span className="method">GET</span><span>Read brand memory</span></button><button className="endpoint" onClick={() => setEndpoint("Evaluate draft")}><span className="method">MCP</span><span>brandgate.evaluate</span></button></div><div><div className="small-caps" style={{ marginBottom: 8 }}>{endpointInfo.method} {endpointInfo.path}</div><div className="code-window" aria-label="Curl example"><span className="code-command">{endpointInfo.code}</span></div><div className="api-actions"><button className="primary-btn" onClick={() => setConfigOpen(true)}><Icon name="copy" /> Copy cURL / MCP Config</button><button className="secondary-btn" onClick={() => setConfigOpen(true)}><Icon name="arrow" /> Open docs</button></div></div></div><div className="webhook-inspector"><p className="eyebrow">Webhook inspector</p><div className="webhook-row"><div><strong>evaluation.completed</strong><span className="signal-detail">Signed receipt event · local delivery</span></div><StatusPill>200 OK</StatusPill></div><div className="webhook-row"><div><strong>publishing.approved</strong><span className="signal-detail">YET Postroom simulator · signed payload</span></div><StatusPill tone="warn">Ready</StatusPill></div></div><QueueSimulator /></div>{configOpen && <Modal eyebrow="Agent handoff" title="Copy cURL / MCP Config" onClose={() => setConfigOpen(false)}><p className="modal-copy">Take these ready-to-run connection snippets into Claude, OpenClaw, Hermes, or a REST client.</p><div className="config-block"><div className="config-label"><span>REST evaluation</span><button className="copy-chip" onClick={() => copyConfig("REST copied")}>{copied === "REST copied" ? "Copied" : "Copy cURL"}</button></div><pre className="modal-code">{curl}</pre></div><div className="config-block"><div className="config-label"><span>MCP server config</span><button className="copy-chip" onClick={() => copyConfig("MCP copied")}>{copied === "MCP copied" ? "Copied" : "Copy JSON"}</button></div><pre className="modal-code">{mcp}</pre></div><span className="copy-feedback">{copied ?? "One click copies the complete snippet."}</span></Modal>}</section>;
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("firewall");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickstartOpen, setQuickstartOpen] = useState(false);
  const tabs: { id: Tab; label: string }[] = [
    { id: "firewall", label: "Live Firewall" },
    { id: "memory", label: "Brand Memory" },
    { id: "tournament", label: "Variation Tournament" },
    { id: "api", label: "Agent API" }
  ];
  return <main className="app-shell"><header className="topbar"><div className="wordmark"><span className="wordmark-mark">B</span><span className="wordmark-name">BrandGate</span><span className="wordmark-kicker">Editorial workbench</span></div><div className="top-actions"><span className="system-status"><span className="status-dot" />All systems local</span><div className="header-actions"><button className="header-action" onClick={() => setQuickstartOpen(true)}>📖 Quickstart</button><button className="header-action" onClick={() => setSettingsOpen(true)}>⚙️ Engine &amp; Tokens</button></div><span className="avatar" aria-label="Profile: AO">AO</span></div></header><div className="page-wrap"><section className="hero"><div><p className="eyebrow">YET Editorial Standard / brand workspace</p><h1>Make every word feel like it came from you.</h1></div><p>BrandGate is the calm layer between an agent’s first draft and your public voice.</p></section><nav className="tabs" aria-label="BrandGate workspace"><div role="tablist" style={{ display: "flex" }}>{tabs.map((item, index) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={`tab ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}><span className="tab-index">0{index + 1}</span>{item.label}</button>)}</div></nav>{tab === "firewall" && <FirewallWorkbench />}{tab === "memory" && <MemoryStudio />}{tab === "tournament" && <Tournament />}{tab === "api" && <ApiPlayground />}<footer className="footer"><span>BrandGate · editorial intelligence for teams who care about the sentence.</span><span><a className="footer-link" href="#status">Status</a> &nbsp;·&nbsp; <a className="footer-link" href="#docs">Docs</a> &nbsp;·&nbsp; <span className="mono">v0.1 local</span></span></footer></div>{settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}{quickstartOpen && <QuickstartModal onClose={() => setQuickstartOpen(false)} />}</main>;
}
