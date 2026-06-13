import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ── Global styles ─────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @property --card-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
  @keyframes card-spin { to { --card-angle: 360deg; } }
  .iiq-card { position: relative; transition: border-color .25s; }
  .iiq-card::after {
    content: ''; position: absolute; inset: -1px; border-radius: 11px; pointer-events: none;
    background: conic-gradient(from var(--card-angle), transparent 75%, #0078D4 88%, #5B3FCF 94%, transparent 100%);
    opacity: 0; transition: opacity .3s;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude; padding: 1px;
  }
  .iiq-card:hover::after { opacity: 1; animation: card-spin 2s linear infinite; }
  .status-pulse-dot { animation: status-pulse 1.6s ease-in-out infinite; }
  @media (prefers-color-scheme: dark) {
    @keyframes status-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(63,185,80,0.5); } 50% { box-shadow: 0 0 0 5px rgba(63,185,80,0); } }
    .iiq-card::after { background: conic-gradient(from var(--card-angle), transparent 75%, #0078D4 88%, #8B5CF6 94%, transparent 100%); }
  }
  @media (prefers-color-scheme: light) {
    @keyframes status-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(26,127,60,0.4); } 50% { box-shadow: 0 0 0 5px rgba(26,127,60,0); } }
  }
`;

function GlobalStyles() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);
  return null;
}

// ── Design tokens ────────────────────────────────────────────────────────────────
const TOKENS_LIGHT = {
  bg:           "#F5F8FC",
  bgCard:       "#FFFFFF",
  bgCardHover:  "#F0F5FB",
  bgSubtle:     "#EBF2FA",
  border:       "#DDE6F0",
  borderBright: "#B8CDE3",
  accent:       "#0078D4",
  accentGlow:   "#0078D433",
  accentHover:  "#106EBE",
  accentLight:  "#0078D412",
  success:      "#1A7F3C",
  successBg:    "#E6F9ED",
  warning:      "#92600A",
  warningBg:    "#FEF3CD",
  danger:       "#C0392B",
  dangerBg:     "#FEE8E8",
  purple:       "#5B3FCF",
  purpleBg:     "#EEE9FF",
  teal:         "#0E7490",
  tealBg:       "#E0F7FA",
  amber:        "#92600A",
  amberBg:      "#FEF3CD",
  text:         "#0D1B2E",
  textSub:      "#3D5478",
  textMuted:    "#8FA8C4",
  font:         "'Segoe UI', system-ui, -apple-system, sans-serif",
  mono:         "'Cascadia Code', 'Consolas', 'Courier New', monospace",
};

const TOKENS_DARK = {
  bg:           "#060B14",
  bgCard:       "#0C1220",
  bgCardHover:  "#111828",
  bgSubtle:     "#161E2E",
  border:       "#1E2D45",
  borderBright: "#3D5478",
  accent:       "#0078D4",
  accentGlow:   "#0078D433",
  accentHover:  "#106EBE",
  accentLight:  "#0078D415",
  success:      "#3FB950",
  successBg:    "#3FB95015",
  warning:      "#D29922",
  warningBg:    "#D2992215",
  danger:       "#F85149",
  dangerBg:     "#F8514915",
  purple:       "#8B5CF6",
  purpleBg:     "#8B5CF615",
  teal:         "#2DD4BF",
  tealBg:       "#2DD4BF15",
  amber:        "#F59E0B",
  amberBg:      "#F59E0B15",
  text:         "#E8F4FF",
  textSub:      "#7A95B8",
  textMuted:    "#3D5478",
  font:         "'Segoe UI', system-ui, -apple-system, sans-serif",
  mono:         "'Cascadia Code', 'Consolas', 'Courier New', monospace",
};

function useTheme() {
  const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const [dark, setDark] = useState(mq ? mq.matches : false);
  useEffect(() => {
    if (!mq) return;
    const handler = (e) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return dark ? TOKENS_DARK : TOKENS_LIGHT;
}

// T is resolved per-component via useTheme() — no module-level mutation

// ── Scenario data ────────────────────────────────────────────────────────────────
const SCENARIOS = {
  "INC-2091": {
    title: "Payment service 500 errors — production",
    severity: "CRITICAL", affectedService: "payment-svc", region: "East US",
    affectedUsers: 12400, revenueImpact: "$48,000/hr", priority: "P1",
    affectedServices: ["payment-svc", "api-gateway", "checkout-frontend"],
    logs: [
      { time: "14:02:11", level: "ERROR", service: "payment-svc", msg: "OutOfMemoryError in AuthHandler.process()", count: 847 },
      { time: "14:02:09", level: "WARN",  service: "api-gateway",  msg: "Upstream timeout: payment-svc p99=4200ms",  count: 312 },
      { time: "14:01:58", level: "ERROR", service: "payment-svc", msg: "Connection pool exhausted: max=50 active=50", count: 50 },
      { time: "13:59:44", level: "INFO",  service: "payment-svc", msg: "Memory usage 87% — threshold 80%",           count: 1  },
    ],
    tickets: [
      { id: "INC-1844", date: "2024-11-03", title: "Auth service memory leak after deploy v2.2.0", resolution: "Rolled back — JWT cache missing TTL caused heap exhaustion", similarity: 92 },
      { id: "INC-1901", date: "2024-12-18", title: "Payment timeouts with high JWT volume", resolution: "Increased connection pool; root cause unresolved at that time", similarity: 78 },
    ],
    pr: { id: "PR-4821", merged: "13:58:02", author: "engineer-a", title: "feat: cache JWT tokens in AuthHandler for perf", diff: "+  this.jwtCache.put(token, claims);\n-  // no caching — always re-validate", branch: "feat/jwt-cache-auth" },
    comms: [
      { time: "14:03:15", channel: "Teams #alerts", msg: "CRITICAL: payment-svc error rate 34% — on-call paged" },
      { time: "14:04:01", channel: "Email", msg: "PagerDuty: INC-2091 opened, assigned to on-call engineer" },
    ],
    weights: { evidenceConsistency: 38, historicalSimilarity: 28, codeCorrelation: 24, multiAgentAgreement: 10 },
  },
  "INC-2104": {
    title: "Database connection exhaustion — staging",
    severity: "HIGH", affectedService: "order-svc", region: "West Europe",
    affectedUsers: 3200, revenueImpact: "$8,000/hr", priority: "P2",
    affectedServices: ["order-svc", "batch-jobs", "reporting-svc"],
    logs: [
      { time: "09:14:33", level: "ERROR", service: "order-svc", msg: "HikariPool-1: Connection is not available, timeout 30000ms", count: 220 },
      { time: "09:14:10", level: "WARN",  service: "order-svc", msg: "Active DB connections: 100/100 (pool saturated)", count: 14 },
      { time: "09:13:55", level: "INFO",  service: "batch-job", msg: "Starting nightly report generation (parallelism=50)", count: 1 },
    ],
    tickets: [
      { id: "INC-2040", date: "2025-01-07", title: "Connection pool exhaustion during report jobs", resolution: "Pool sizing config added per environment — never applied to staging", similarity: 95 },
    ],
    pr: { id: "PR-5002", merged: "09:10:44", author: "engineer-b", title: "chore: enable parallelism for report generation", diff: "+  executor.setMaxParallelism(50);\n-  executor.setMaxParallelism(5);", branch: "chore/report-parallelism" },
    comms: [
      { time: "09:15:01", channel: "Teams #staging", msg: "Staging order-svc is throwing DB errors — investigation needed" },
    ],
    weights: { evidenceConsistency: 32, historicalSimilarity: 35, codeCorrelation: 26, multiAgentAgreement: 7 },
  },
  "INC-2118": {
    title: "API rate limit cascade — EU region",
    severity: "HIGH", affectedService: "notification-svc", region: "North Europe",
    affectedUsers: 9200, revenueImpact: "$21,000/hr", priority: "P2",
    affectedServices: ["notification-svc", "user-onboarding", "email-gateway"],
    logs: [
      { time: "11:33:04", level: "ERROR", service: "notification-svc", msg: "429 Too Many Requests — email API limit reached", count: 1203 },
      { time: "11:32:51", level: "WARN",  service: "notification-svc", msg: "Retry queue depth: 8400 (threshold: 500)", count: 3 },
      { time: "11:31:20", level: "INFO",  service: "user-onboarding",  msg: "Bulk welcome email job started: 9200 users", count: 1 },
    ],
    tickets: [
      { id: "INC-2055", date: "2025-02-14", title: "Email API 429 errors during marketing campaign", resolution: "Rate-limit aware queue with exponential backoff. Bulk jobs need separate API key.", similarity: 88 },
    ],
    pr: { id: "PR-5189", merged: "11:28:10", author: "engineer-c", title: "feat: trigger welcome emails on bulk import", diff: "+  await emailService.sendBulk(users);\n-  // emails sent individually with 100ms delay", branch: "feat/bulk-welcome-email" },
    comms: [
      { time: "11:33:30", channel: "Teams #eu-ops", msg: "EU notification service failing — users not receiving onboarding emails" },
      { time: "11:34:15", channel: "Email", msg: "Email API alert: daily limit 80% consumed in 2 minutes" },
    ],
    weights: { evidenceConsistency: 35, historicalSimilarity: 25, codeCorrelation: 30, multiAgentAgreement: 10 },
  },
};

// ── Foundry IQ knowledge base ─────────────────────────────────────────────────────
const FOUNDRY_KB = {
  "INC-2091": {
    postmortems: [{ id: "PM-2024-11", title: "Auth service memory leak — Nov 2024", relevance: 92, excerpt: "JWT cache without TTL caused heap exhaustion within 5 min under load. Resolution: revert + add TTL." }],
    runbooks:    [{ id: "RB-0412",    title: "Payment Service Memory Leak Runbook",  relevance: 88, excerpt: "Step 1: heap dump via jmap. Step 2: identify unbounded cache. Step 3: revert offending PR." }],
    sops:        [{ id: "SOP-114",    title: "Auth Service Deployment Safety Checklist", relevance: 85, excerpt: "Verify JWT cache TTL ≤ 300s before merging. Load test with 10k concurrent auth requests." }],
    architecture:[{ id: "AD-0021",    title: "AuthHandler JWT Flow — Architecture", relevance: 80, excerpt: "JWT validation path: request → AuthHandler → cache lookup → claims extraction. Cache is write-through." }],
    guides:      [{ id: "TG-0055",    title: "Diagnosing JVM Heap Exhaustion",      relevance: 78, excerpt: "OOM in logs → check cache without TTL, connection pool leak, or object retention." }],
  },
  "INC-2104": {
    postmortems: [{ id: "PM-2025-01", title: "DB pool exhaustion — Jan 2025",        relevance: 95, excerpt: "Pool sizing config never propagated to staging. Parallelism=50 with pool=100 → exhaustion." }],
    runbooks:    [{ id: "RB-0551",    title: "DB Connection Pool Exhaustion Runbook", relevance: 90, excerpt: "Step 1: identify saturating job. Step 2: reduce parallelism. Step 3: apply pool-sizing config." }],
    sops:        [{ id: "SOP-201",    title: "Batch Job Parallelism Safety Standards", relevance: 87, excerpt: "Max parallelism = pool_size / 2. Staging pool = 100 → max batch parallelism = 50 (approval required)." }],
    architecture:[{ id: "AD-0044",    title: "Order Service DB Architecture",         relevance: 75, excerpt: "HikariCP pool per environment. Staging: max=100. Prod: max=250. Config via k8s configmap." }],
    guides:      [{ id: "TG-0088",    title: "Diagnosing HikariCP Pool Exhaustion",   relevance: 82, excerpt: "Symptom: 'Connection is not available'. Cause: batch parallelism exceeds pool capacity." }],
  },
  "INC-2118": {
    postmortems: [{ id: "PM-2025-02", title: "Email API 429 cascade — Feb 2025",      relevance: 88, excerpt: "Bulk send consumed daily API quota in 2 min. Separate API key + rate limiter resolved." }],
    runbooks:    [{ id: "RB-0634",    title: "Email API Rate Limit Incident Runbook",  relevance: 85, excerpt: "Step 1: pause bulk job. Step 2: drain retry queue. Step 3: apply backoff config." }],
    sops:        [{ id: "SOP-299",    title: "Bulk Email Operations Safety Checklist", relevance: 83, excerpt: "Bulk sends >1000 recipients: separate API key, rate limiter ≤50/sec, exponential backoff required." }],
    architecture:[{ id: "AD-0067",    title: "Notification Service Email Architecture", relevance: 70, excerpt: "notification-svc → email-gateway → SendGrid API. Single shared API key for all send types." }],
    guides:      [{ id: "TG-0101",    title: "Diagnosing Email API 429 Errors",        relevance: 79, excerpt: "429 = quota exhaustion. Check bulk import jobs. Retry queue depth is a leading indicator." }],
  },
};

// ── Fallback verdicts ─────────────────────────────────────────────────────────────
const VERDICTS = {
  "INC-2091": {
    rootCause: "PR-4821 introduced JWT token caching in AuthHandler without a TTL. Under production load, the cache grew unboundedly, exhausting JVM heap within 4 minutes of deployment. Connection pool exhaustion followed as a cascade effect, causing all payment requests to fail with 500 errors. Historical incident INC-1844 (Nov 2024) is an identical pattern — 92% similarity match.",
    hypothesis: "Initial hypothesis: unbounded cache introduced by recent code change, consistent with INC-1844 pattern. Confirmed by heap growth curve starting exactly at PR-4821 merge time.",
    eliminated: ["Network congestion — ruled out: no upstream latency before memory spike", "Database overload — ruled out: DB metrics normal; connection pool exhaustion is downstream effect", "Traffic spike — ruled out: request volume was baseline at time of failure"],
    timeline: [
      { time: "13:58:02", event: "PR-4821 merged — JWT caching added to AuthHandler", type: "code" },
      { time: "13:59:44", event: "Memory usage crosses 87% warning threshold", type: "warning" },
      { time: "14:01:58", event: "Connection pool exhausted (50/50 active)", type: "error" },
      { time: "14:02:09", event: "API gateway detects upstream timeouts p99=4200ms", type: "warning" },
      { time: "14:02:11", event: "OutOfMemoryError — payment service crashes", type: "error" },
      { time: "14:03:15", event: "Teams alert fired, on-call paged", type: "comms" },
    ],
    fixes: [
      { priority: "Immediate",   action: "Revert PR-4821 and restart payment-svc", cmd: "git revert PR-4821 && kubectl rollout restart deployment/payment-svc", cites: [1, 2] },
      { priority: "Short-term",  action: "Add TTL to JWT cache (max 300s per SOP-114)", cmd: "jwtCache = CacheBuilder.newBuilder().expireAfterWrite(300, SECONDS).build();", cites: [3] },
      { priority: "Long-term",   action: "Add memory regression gate to CI pipeline", cmd: "# Fail build if JVM heap > 70% under 10k concurrent load test", cites: [5] },
    ],
    nextAction: "Revert PR-4821 immediately — estimated recovery 15–20 min. Monitor heap for 15 min post-rollback.",
    ert: "15–20 min", risk: "Low", rollbackSafe: true,
    grounding: "PM-2024-11, RB-0412, SOP-114, AD-0021, TG-0055",
  },
  "INC-2104": {
    rootCause: "PR-5002 increased batch report job parallelism from 5 to 50, exhausting the staging DB connection pool (max=100) within 19 seconds of job start. The INC-2040 pool-sizing fix was never deployed to staging. SOP-201 mandates max parallelism = pool_size / 2 = 50, requiring DBA approval — which was not obtained.",
    hypothesis: "Batch parallelism change prime suspect given exact timing correlation with pool saturation. INC-2040 at 95% similarity confirms known failure pattern.",
    eliminated: ["Slow queries — ruled out: no query timeout logs; pure connection exhaustion", "Connection leak — ruled out: pool stats show clean checkout/return cycle", "Infra scaling event — ruled out: no cluster events at incident time"],
    timeline: [
      { time: "09:10:44", event: "PR-5002 merged — report parallelism set to 50", type: "code" },
      { time: "09:13:55", event: "Nightly batch job starts with parallelism=50", type: "info" },
      { time: "09:14:10", event: "DB connection pool saturated: 100/100 active", type: "warning" },
      { time: "09:14:33", event: "Order service connection timeout after 30s", type: "error" },
      { time: "09:15:01", event: "Teams staging alert fired", type: "comms" },
    ],
    fixes: [
      { priority: "Immediate",   action: "Revert batch parallelism to 5 in staging", cmd: "executor.setMaxParallelism(5); // revert PR-5002 change", cites: [1, 2] },
      { priority: "Short-term",  action: "Deploy pool-sizing config to staging (INC-2040 fix)", cmd: "kubectl apply -f k8s/staging/db-pool-config.yaml", cites: [3] },
      { priority: "Long-term",   action: "Block deploy if parallelism > pool_size/2 in CI", cmd: "# Add HikariCP pool utilisation assertion to pre-deploy hook", cites: [3, 5] },
    ],
    nextAction: "Revert parallelism to 5 and apply pool-sizing config before re-running batch job.",
    ert: "10–15 min", risk: "Low", rollbackSafe: true,
    grounding: "PM-2025-01, RB-0551, SOP-201, AD-0044, TG-0088",
  },
  "INC-2118": {
    rootCause: "PR-5189 replaced rate-limited individual email sends with an unbounded bulk dispatch. When the bulk import job triggered 9,200 simultaneous sends, the shared email API key exhausted its daily quota in under 2 minutes. SOP-299 explicitly requires a separate API key and rate limiter (≤50/sec) for bulk operations exceeding 1,000 recipients.",
    hypothesis: "Bulk email job is root cause based on exact onset timing with import job. 429 errors confirm API quota exhaustion, not provider outage.",
    eliminated: ["Email provider outage — ruled out: 429 is quota limit, not service disruption", "Individual transactional emails — ruled out: volume profile matches bulk, not scatter", "DDoS / abuse — ruled out: traffic originates from internal import job"],
    timeline: [
      { time: "11:28:10", event: "PR-5189 merged — bulk email on import enabled", type: "code" },
      { time: "11:31:20", event: "Bulk import job starts: 9,200 users", type: "info" },
      { time: "11:32:51", event: "Retry queue depth spikes to 8,400", type: "warning" },
      { time: "11:33:04", event: "Email API 429 — daily limit hit", type: "error" },
      { time: "11:33:30", event: "EU ops team alerted via Teams", type: "comms" },
    ],
    fixes: [
      { priority: "Immediate",   action: "Pause bulk job and drain retry queue", cmd: "kubectl exec notification-svc -- python drain_queue.py --pause-bulk", cites: [1, 2] },
      { priority: "Short-term",  action: "Apply rate-limited queue with exponential backoff (INC-2055 fix)", cmd: "emailQueue.setRate(50, RateUnit.PER_SECOND).setBackoff(EXPONENTIAL);", cites: [2, 3] },
      { priority: "Long-term",   action: "Provision dedicated bulk API key + enforce SOP-299 in CI", cmd: "# Create BULK_EMAIL_KEY in Azure Key Vault; gate bulk sends on key presence", cites: [3] },
    ],
    nextAction: "Drain retry queue and apply exponential backoff before re-enabling bulk email processing.",
    ert: "20–30 min", risk: "Medium", rollbackSafe: false,
    grounding: "PM-2025-02, RB-0634, SOP-299, AD-0067, TG-0101",
  },
};

// ── Azure OpenAI integration ───────────────────────────────────────────────────────
async function callAzureOpenAI(cfg, messages) {
  const url = `${cfg.endpoint}/openai/deployments/${cfg.deployment}/chat/completions?api-version=2024-02-01`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": cfg.apiKey },
    body: JSON.stringify({ messages, max_tokens: 1200, temperature: 0.2 }),
  });
  if (!res.ok) throw new Error(`Azure OpenAI error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callAzureSearch(cfg, query) {
  const url = `${cfg.searchEndpoint}/indexes/${cfg.searchIndex}/docs/search?api-version=2023-11-01`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": cfg.searchKey },
    body: JSON.stringify({ search: query, top: 5, queryType: "semantic", semanticConfiguration: "default" }),
  });
  if (!res.ok) throw new Error(`Azure AI Search error: ${res.status}`);
  const data = await res.json();
  return data.value || [];
}

// ── Compute confidence ─────────────────────────────────────────────────────────────
function computeConfidence(scenario, memBoost = false) {
  const w = scenario.weights;
  const ws = Object.values(w).reduce((s, v) => s + v, 0);
  const logScore    = Math.min(100, (scenario.logs.filter(l => l.level === "ERROR").length / scenario.logs.length) * 100 + 20);
  const ticketScore = scenario.tickets.length > 0 ? scenario.tickets[0].similarity : 50;
  const prScore     = scenario.pr ? 90 : 40;
  const commsScore  = scenario.comms.length > 0 ? 85 : 60;
  const base = Math.round((logScore * w.evidenceConsistency + ticketScore * w.historicalSimilarity + prScore * w.codeCorrelation + commsScore * w.multiAgentAgreement) / ws);
  return Math.min(99, memBoost ? Math.round(base * 1.06) : base);
}

// ── Build evidence timeline ────────────────────────────────────────────────────────
function buildTimeline(scenario) {
  const items = [];
  scenario.logs.forEach(l => items.push({ time: l.time, type: l.level === "ERROR" ? "error" : l.level === "WARN" ? "warning" : "info", source: "Log", service: l.service, msg: l.msg, count: l.count }));
  if (scenario.pr) items.push({ time: scenario.pr.merged, type: "code", source: "GitHub", service: scenario.pr.author, msg: `${scenario.pr.id}: ${scenario.pr.title}`, ref: scenario.pr.id });
  scenario.comms.forEach(c => items.push({ time: c.time, type: "comms", source: "Teams", service: c.channel, msg: c.msg }));
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

// ── TYPE helpers — pure functions, always pass T from component scope ────────────────
const getTypeColor = (T) => ({ code: T.accent, error: T.danger, warning: T.warning, info: T.teal, comms: T.amber, ticket: T.purple });
const getSevStyle  = (T) => ({
  CRITICAL: { bg: T.dangerBg,  color: T.danger,  border: T.danger  },
  HIGH:     { bg: T.warningBg, color: T.warning, border: T.warning },
  MEDIUM:   { bg: T.amberBg,   color: T.amber,   border: T.amber   },
});
const getPriStyle = (T) => ({
  "Immediate":   { color: T.danger  },
  "Short-term":  { color: T.warning },
  "Long-term":   { color: T.success },
});
const getRiskColor = (T) => ({ "Low": T.success, "Medium": T.warning, "High": T.danger });

// ── Small components ──────────────────────────────────────────────────────────────
function Badge({ children, color, bg }) {
  return <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: bg || color + "20", color, border: `1px solid ${color}30` }}>{children}</span>;
}

function SevBadge({ severity }) {
  const T = useTheme();
  const s = getSevStyle(T)[severity] || SEV_STYLE.MEDIUM;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 4, background: s.bg, color: s.color, border: `1px solid ${s.border}40`, letterSpacing: "0.05em" }}>{severity}</span>;
}

function Label({ children }) {
  const T = useTheme();
  return <div style={{ fontSize: 10, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{children}</div>;
}

function Card({ children, style = {}, highlight = false }) {
  const T = useTheme();
  return <div className="iiq-card" style={{ background: T.bgCard, borderRadius: 10, border: `1px solid ${highlight ? T.accent + "60" : T.border}`, padding: "16px 18px", boxShadow: highlight ? `0 0 0 1px ${T.accent}20` : "none", ...style }}>{children}</div>;
}

function CopyBtn({ text }) {
  const T = useTheme();
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1600); }).catch(() => {}); }}
      style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: `1px solid ${T.border}`, background: done ? T.successBg : T.bgSubtle, color: done ? T.success : T.textSub, cursor: "pointer", fontFamily: T.font, flexShrink: 0 }}>
      {done ? "✓ Copied" : "Copy"}
    </button>
  );
}

function DiffBlock({ diff }) {
  const T = useTheme();
  return (
    <pre style={{ fontFamily: T.mono, fontSize: 11, background: T.bg, border: `1px solid ${T.border}`, padding: "10px 12px", borderRadius: 6, whiteSpace: "pre-wrap", margin: 0, overflowX: "auto" }}>
      {diff.split("\n").map((line, i) => {
        const isAdd = line.startsWith("+"), isDel = line.startsWith("-");
        return <span key={i} style={{ display: "block", color: isAdd ? T.success : isDel ? T.danger : T.textSub, background: isAdd ? T.successBg + "30" : isDel ? T.dangerBg + "30" : "transparent", borderRadius: 2, padding: "0 4px" }}>{line}</span>;
      })}
    </pre>
  );
}

function TypeTag({ type }) {
  const T = useTheme();
  const TYPE_COLOR = getTypeColor(T);
  const c = TYPE_COLOR[type] || T.textSub;
  return <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: c + "20", color: c, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{type}</span>;
}

// ── Confidence ring ───────────────────────────────────────────────────────────────
function ConfRing({ value, size = 72, animated = false }) {
  const T = useTheme();
  const [display, setDisplay] = useState(animated ? 0 : value);
  useEffect(() => {
    if (!animated) { setDisplay(value); return; }
    let cur = 0;
    const step = value / 40;
    const id = setInterval(() => { cur = Math.min(value, cur + step); setDisplay(Math.round(cur)); if (cur >= value) clearInterval(id); }, 40);
    return () => clearInterval(id);
  }, [value, animated]);
  const r = size / 2 - 6, circ = 2 * Math.PI * r, dash = (display / 100) * circ;
  const color = display >= 88 ? T.success : display >= 72 ? T.warning : T.danger;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size > 60 ? 15 : 12, fontWeight: 700, color }}>{display}%</span>
        {size > 60 && <span style={{ fontSize: 9, color: T.textSub, marginTop: 1 }}>confidence</span>}
      </div>
    </div>
  );
}

// ── Live log streamer ─────────────────────────────────────────────────────────────
function LiveLogStream({ scenario, active }) {
  const T = useTheme();
  const [lines, setLines] = useState([]);
  const ref = useRef(null);
  useEffect(() => {
    if (!active) { setLines([]); return; }
    setLines([]);
    let i = 0;
    const allLogs = [...scenario.logs].reverse();
    const id = setInterval(() => {
      if (i < allLogs.length) {
        const l = allLogs[i];
        setLines(prev => [...prev.slice(-30), { ...l, id: Date.now() + i }]);
        i++;
      } else {
        // Generate synthetic streaming logs
        const fakes = [
          { level: "INFO",  service: scenario.affectedService, msg: `Health check: latency=${Math.round(Math.random()*3000+200)}ms` },
          { level: "WARN",  service: scenario.affectedService, msg: `Retry attempt ${Math.round(Math.random()*5+1)} for failed request` },
          { level: "ERROR", service: scenario.affectedService, msg: scenario.logs[0].msg },
        ];
        const fake = fakes[Math.floor(Math.random() * fakes.length)];
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
        setLines(prev => [...prev.slice(-30), { ...fake, time, id: Date.now() }]);
      }
    }, 600);
    return () => clearInterval(id);
  }, [active, scenario]);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [lines]);
  return (
    <div ref={ref} style={{ height: 160, overflowY: "auto", background: T.bg, borderRadius: 6, border: `1px solid ${T.border}`, padding: "8px 10px", fontFamily: T.mono, fontSize: 11 }}>
      {lines.map((l, i) => (
        <div key={l.id || i} style={{ display: "flex", gap: 8, marginBottom: 2, animation: "fadeIn 0.3s ease" }}>
          <span style={{ color: T.textMuted, flexShrink: 0 }}>{l.time}</span>
          <span style={{ color: l.level === "ERROR" ? T.danger : l.level === "WARN" ? T.warning : T.teal, fontWeight: 700, flexShrink: 0, minWidth: 40 }}>{l.level}</span>
          <span style={{ color: T.accent, flexShrink: 0 }}>{l.service}</span>
          <span style={{ color: T.textSub }}>{l.msg}</span>
        </div>
      ))}
      {active && <div style={{ color: T.accent, animation: "blink 1s infinite" }}>█</div>}
    </div>
  );
}

// ── Reasoning step ────────────────────────────────────────────────────────────────
const REASONING_STEPS = [
  { id: "logs",      label: "Analyze Logs",               icon: "📋", desc: "Parse error patterns, frequency, temporal clustering" },
  { id: "deploy",    label: "Check Deployment",            icon: "⑂",  desc: "Correlate recent code changes with incident onset" },
  { id: "retrieve",  label: "Retrieve Similar Incidents",  icon: "🔍", desc: "Query Foundry IQ for matching postmortems and runbooks" },
  { id: "compare",   label: "Compare Evidence",            icon: "⚖️", desc: "Cross-reference logs, PRs, tickets, KB documents" },
  { id: "eliminate", label: "Eliminate Alternatives",      icon: "✂️", desc: "Rule out competing hypotheses against evidence" },
  { id: "rootcause", label: "Determine Root Cause",        icon: "🎯", desc: "Synthesise findings into causal chain with confidence score" },
];

function ReasoningRow({ step, status, detail, confValue }) {
  const T = useTheme();
  const c = status === "done" ? T.success : status === "active" ? T.accent : T.textMuted;
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 14px", background: status === "active" ? T.accentLight + "20" : T.bgSubtle, borderRadius: 8, border: `1px solid ${status === "active" ? T.accent + "50" : T.border}`, marginBottom: 6, transition: "all 0.3s" }}>
      <div style={{ width: 30, height: 30, borderRadius: 6, background: status === "active" ? T.accent + "25" : T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{step.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: status === "active" ? T.accent : T.text }}>{step.label}</span>
          {status === "active" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, display: "inline-block", animation: "pulse 1s infinite" }} />}
          {status === "done" && <span style={{ fontSize: 11, color: T.success }}>✓</span>}
        </div>
        <div style={{ fontSize: 11, color: T.textSub }}>{detail || step.desc}</div>
      </div>
      {step.id === "rootcause" && status === "done" && confValue !== undefined && (
        <ConfRing value={confValue} size={44} animated />
      )}
      {status !== "done" && status !== "active" && <span style={{ fontSize: 10, color: T.textMuted, alignSelf: "center" }}>Pending</span>}
      {status === "done" && step.id !== "rootcause" && <span style={{ fontSize: 10, color: T.success, alignSelf: "center" }}>Done</span>}
      {status === "active" && <span style={{ fontSize: 10, color: T.accent, alignSelf: "center" }}>Running…</span>}
    </div>
  );
}

// ── Agent card ────────────────────────────────────────────────────────────────────
const AGENTS = [
  { key: "evidence",    icon: "📊", label: "Evidence Collection",   sub: "Logs · PRs · Alerts · Metrics",          colorKey: "teal"    },
  { key: "foundry",     icon: "🔍", label: "Foundry IQ Retrieval",  sub: "Postmortems · Runbooks · SOPs · Guides",  colorKey: "accent"  },
  { key: "hypothesis",  icon: "💡", label: "Hypothesis Generation", sub: "Pattern matching · Anomaly detection",    colorKey: "amber"   },
  { key: "rootcause",   icon: "🎯", label: "Root Cause Agent",      sub: "Causal chain · Confidence scoring",       colorKey: "purple"  },
  { key: "remediation", icon: "🛠️", label: "Remediation Agent",     sub: "Actions · Recovery time · Risk level",   colorKey: "success" },
];

function AgentCard({ agent, status, detail, duration }) {
  const T = useTheme();
  const color = T[agent.colorKey];
  const isRun = status === "running", isDone = status === "done";
  return (
    <div style={{ background: isRun ? T.bgCardHover : T.bgCard, border: `1px solid ${isRun ? color + "60" : T.border}`, borderRadius: 8, padding: "12px 14px", transition: "all 0.3s", boxShadow: isRun ? `0 0 12px ${agent.color}20` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: detail ? 6 : 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{agent.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color }}>{agent.label}</div>
          <div style={{ fontSize: 10, color: T.textSub }}>{agent.sub}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {isRun  && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, animation: "pulse 1s infinite" }} />}
          {isDone && <span style={{ fontSize: 11, color: T.success }}>✓</span>}
          <span style={{ fontSize: 10, color: isDone ? T.success : isRun ? color : T.textMuted, fontWeight: 500 }}>{isDone ? "Done" : isRun ? "Running…" : "Queued"}</span>
        </div>
      </div>
      {detail && <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5, borderTop: `1px solid ${T.border}`, paddingTop: 6 }}>{detail}</div>}
      {isDone && duration && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 4 }}>{duration}ms</div>}
    </div>
  );
}

// ── Foundry IQ panel ──────────────────────────────────────────────────────────────
function getDocTypes(T) {
  return [
    { key: "postmortems",  label: "Incident Postmortems",   icon: "📰", color: T.danger  },
    { key: "runbooks",     label: "Runbooks",               icon: "📘", color: T.accent  },
    { key: "sops",         label: "SOPs",                   icon: "📋", color: T.teal    },
    { key: "architecture", label: "Architecture Docs",      icon: "🏗️", color: T.purple  },
    { key: "guides",       label: "Troubleshooting Guides", icon: "🔧", color: T.amber   },
  ];
}
// Static variant for non-component export functions (only need key/label, not colors)
const DOC_TYPES_STATIC = getDocTypes({ danger:"", accent:"", teal:"", purple:"", amber:"" });

function FoundryPanel({ kb }) {
  const T = useTheme();
  const DOC_TYPES = getDocTypes(T);
  const [open, setOpen] = useState(null);
  if (!kb) return null;
  const total = DOC_TYPES.reduce((s, d) => s + (kb[d.key]?.length || 0), 0);
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: T.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🔍</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>Foundry IQ Knowledge Base</div>
          <div style={{ fontSize: 10, color: T.textSub }}>Azure AI Search · {total} documents retrieved</div>
        </div>
        <Badge color={T.success}>✓ Grounded</Badge>
      </div>
      {DOC_TYPES.map(dt => {
        const docs = kb[dt.key] || [];
        if (!docs.length) return null;
        const isOpen = open === dt.key;
        return (
          <div key={dt.key} style={{ marginBottom: 6 }}>
            <button onClick={() => setOpen(isOpen ? null : dt.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: T.bgSubtle, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", fontFamily: T.font }}>
              <span style={{ fontSize: 13 }}>{dt.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: dt.color, flex: 1, textAlign: "left" }}>{dt.label}</span>
              <Badge color={dt.color}>{docs.length}</Badge>
              <span style={{ fontSize: 10, color: T.textSub }}>{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && docs.map((doc, i) => (
              <div key={i} style={{ margin: "4px 0 4px 8px", padding: "8px 12px", background: T.bg, borderRadius: 6, borderLeft: `3px solid ${dt.color}`, border: `1px solid ${dt.color}25` }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: dt.color }}>{doc.id}</span>
                  <span style={{ fontSize: 10, background: dt.color + "20", color: dt.color, padding: "1px 5px", borderRadius: 3 }}>{doc.relevance}% relevant</span>
                </div>
                <div style={{ fontSize: 11, color: T.text, marginBottom: 3 }}>{doc.title}</div>
                <div style={{ fontSize: 10, color: T.textSub, fontStyle: "italic" }}>"{doc.excerpt}"</div>
              </div>
            ))}
          </div>
        );
      })}
    </Card>
  );
}

// ── Citations ─────────────────────────────────────────────────────────────────────
function Citations({ kb }) {
  const T = useTheme();
  const DOC_TYPES = getDocTypes(T);
  if (!kb) return null;
  const all = DOC_TYPES.flatMap(dt => (kb[dt.key] || []).map(d => ({ ...d, dtype: dt })));
  return (
    <Card>
      <Label>Citations</Label>
      {all.map((c, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < all.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "flex-start" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.dtype.color }}>{c.id}</span>
              <span style={{ fontSize: 10, background: T.bgSubtle, color: T.textSub, padding: "1px 5px", borderRadius: 3 }}>{c.dtype.label}</span>
              <span style={{ fontSize: 10, color: T.success, marginLeft: "auto" }}>{c.relevance}% match</span>
            </div>
            <div style={{ fontSize: 12, color: T.text, marginBottom: 2 }}>{c.title}</div>
            <div style={{ fontSize: 11, color: T.textSub, fontStyle: "italic" }}>"{c.excerpt}"</div>
          </div>
        </div>
      ))}
    </Card>
  );
}

// ── Business impact ───────────────────────────────────────────────────────────────
function BusinessImpact({ scenario }) {
  const T = useTheme();
  return (
    <Card>
      <Label>Business Impact</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {[
          { icon: "👥", label: "Affected Users",    value: scenario.affectedUsers?.toLocaleString(), color: T.danger  },
          { icon: "💰", label: "Revenue Impact",    value: scenario.revenueImpact,                    color: T.amber   },
          { icon: "🚨", label: "Priority",          value: scenario.priority,                         color: T.warning },
          { icon: "🔗", label: "Services Affected", value: scenario.affectedServices?.length,         color: T.purple  },
        ].map((item, i) => (
          <div key={i} style={{ background: item.color + "12", borderRadius: 8, padding: "10px 12px", border: `1px solid ${item.color}25` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span>{item.icon}</span>
              <span style={{ fontSize: 10, color: item.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {scenario.affectedServices?.map((svc, i) => (
          <span key={i} style={{ fontSize: 11, background: T.bgSubtle, color: T.textSub, padding: "3px 8px", borderRadius: 4, border: `1px solid ${T.border}`, fontFamily: T.mono }}>{svc}</span>
        ))}
      </div>
    </Card>
  );
}

// ── Remediation panel ─────────────────────────────────────────────────────────────
function RemediationPanel({ verdict, kb }) {
  const T = useTheme();
  const DOC_TYPES = getDocTypes(T);
  if (!verdict) return null;
  const RISK_COLOR = getRiskColor(T);
  const PRI_STYLE = getPriStyle(T);
  const riskColor = RISK_COLOR[verdict.risk] || T.textSub;
  const allDocs = DOC_TYPES.flatMap(dt => (kb?.[dt.key] || []).map(d => ({ ...d, num: DOC_TYPES.flatMap(x => (kb?.[x.key] || [])).indexOf(d) + 1 })));
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <Label>Remediation Plan</Label>
        <div style={{ display: "flex", gap: 8 }}>
          {verdict.ert    && <Badge color={T.success}>⏱ ERT: {verdict.ert}</Badge>}
          {verdict.risk   && <Badge color={riskColor}>Risk: {verdict.risk}</Badge>}
          {verdict.rollbackSafe !== undefined && <Badge color={verdict.rollbackSafe ? T.success : T.warning}>{verdict.rollbackSafe ? "✓ Rollback safe" : "⚠ Rollback risk"}</Badge>}
        </div>
      </div>
      {verdict.fixes?.map((f, i) => {
        const ps = PRI_STYLE[f.priority] || PRI_STYLE["Long-term"];
        return (
          <div key={i} style={{ borderLeft: `3px solid ${ps.color}`, padding: "10px 14px", marginBottom: 8, background: T.bgSubtle, borderRadius: "0 8px 8px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: ps.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{f.priority}</span>
              {f.cites?.map(n => {
                const doc = allDocs.find((_, idx) => idx + 1 === n);
                return <span key={n} title={doc ? `[${n}] ${doc.title}` : `[${n}]`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: T.accent, color: "#fff", fontSize: 9, fontWeight: 700, cursor: "default" }}>{n}</span>;
              })}
            </div>
            <div style={{ fontSize: 12, color: T.text, marginBottom: 6 }}>{f.action}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <pre style={{ fontFamily: T.mono, fontSize: 11, background: T.bg, border: `1px solid ${T.border}`, padding: "6px 10px", borderRadius: 4, color: T.textSub, whiteSpace: "pre-wrap", wordBreak: "break-all", flex: 1, margin: 0 }}>{f.cmd}</pre>
              <CopyBtn text={f.cmd} />
            </div>
          </div>
        );
      })}
      {verdict.nextAction && (
        <div style={{ marginTop: 8, background: T.accentLight + "30", borderRadius: 8, border: `1px solid ${T.accent}35`, padding: "12px 14px", display: "flex", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Next Action</div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{verdict.nextAction}</div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Speed comparison ──────────────────────────────────────────────────────────────
function SpeedComp({ elapsed, memBoost, prev }) {
  const T = useTheme();
  const pct = prev && prev > elapsed ? Math.round((1 - elapsed / prev) * 100) : null;
  return (
    <Card>
      <Label>Investigation Time</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: T.bgSubtle, borderRadius: 6, padding: "12px", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.textSub, marginBottom: 4 }}>Manual investigation</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.textSub }}>~42 min</div>
          <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>5 sources × ~8 min avg</div>
        </div>
        <div style={{ background: T.accentLight + "30", borderRadius: 6, padding: "12px", border: `1px solid ${T.accent}35` }}>
          <div style={{ fontSize: 10, color: T.accent, marginBottom: 4 }}>IncidentIQ{memBoost ? " · Memory ⚡" : ""}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.accent }}>{(elapsed / 1000).toFixed(1)}s</div>
          <div style={{ fontSize: 10, color: T.accent + "99", marginTop: 2 }}>{pct ? `${pct}% faster (procedural memory)` : "Parallel agent execution"}</div>
        </div>
      </div>
    </Card>
  );
}

// ── Postmortem export ─────────────────────────────────────────────────────────────
function exportPostmortem(scenario, verdict, kb) {
  const now = new Date().toISOString();
  const allDocs = DOC_TYPES_STATIC.flatMap(dt => (kb?.[dt.key] || []).map(d => ({ ...d, dtype: dt.label })));
  const lines = [
    `╔══════════════════════════════════════════════════════════════╗`,
    `║               INCIDENT POSTMORTEM REPORT                    ║`,
    `║                    IncidentIQ · Azure AI Foundry            ║`,
    `╚══════════════════════════════════════════════════════════════╝`,
    ``,
    `INCIDENT ID:    ${scenario.id}`,
    `SEVERITY:       ${scenario.severity}   PRIORITY: ${scenario.priority}`,
    `SERVICE:        ${scenario.affectedService}   REGION: ${scenario.region}`,
    `GENERATED:      ${now}`,
    `CONFIDENCE:     ${verdict.confidence}%`,
    ``,
    `━━━ BUSINESS IMPACT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Affected Users:    ${scenario.affectedUsers?.toLocaleString()}`,
    `Revenue Impact:    ${scenario.revenueImpact}`,
    `Affected Services: ${scenario.affectedServices?.join(", ")}`,
    ``,
    `━━━ ROOT CAUSE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    verdict.rootCause,
    ``,
    `━━━ HYPOTHESIS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    verdict.hypothesis,
    ``,
    `━━━ ELIMINATED ALTERNATIVES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ...(verdict.eliminated || []).map(e => `  ✗ ${e}`),
    ``,
    `━━━ CAUSAL TIMELINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ...(verdict.timeline || []).map(e => `  ${e.time}  [${e.type.toUpperCase().padEnd(7)}]  ${e.event}`),
    ``,
    `━━━ REMEDIATION PLAN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Estimated Recovery Time: ${verdict.ert}`,
    `Risk Level:              ${verdict.risk}`,
    `Rollback Safe:           ${verdict.rollbackSafe ? "Yes" : "No"}`,
    ``,
    ...(verdict.fixes || []).map(f => [`  [${f.priority.toUpperCase()}] ${f.action}`, `  > ${f.cmd}`, ``].join("\n")),
    `Next Action: ${verdict.nextAction}`,
    ``,
    `━━━ FOUNDRY IQ KNOWLEDGE BASE CITATIONS ━━━━━━━━━━━━━━━━━━━━━`,
    ...allDocs.map((d, i) => `  [${i + 1}] ${d.id} (${d.dtype}) — ${d.title}\n      Relevance: ${d.relevance}%\n      "${d.excerpt}"`),
    ``,
    `━━━ SOURCE REFERENCES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    verdict.grounding,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `IncidentIQ · Azure AI Foundry · Azure OpenAI (GPT-4o) · Azure AI Search`,
  ].join("\n");
  const blob = new Blob([lines], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${scenario.id}-postmortem.txt`; a.click();
  URL.revokeObjectURL(url);
}

// ── Chat ──────────────────────────────────────────────────────────────────────────
function Chat({ scenario, verdict, kb, azureCfg, analysisKey }) {
  const T = useTheme();
  const [msgs, setMsgs]   = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    setMsgs([{ role: "assistant", content: `I've analysed **${scenario.id}** — root cause identified with ${verdict?.confidence || "?"}% confidence. Ask me anything: blast radius, rollback steps, prevention, or related incidents.` }]);
  }, [scenario.id, analysisKey]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const render = (text) => text.split(/(\*\*.*?\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
  );

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim(); setInput(""); setLoading(true);
    setMsgs(prev => [...prev, { role: "user", content: q }]);
    let reply = "";
    if (azureCfg?.endpoint && azureCfg?.apiKey) {
      try {
        const sys = `You are IncidentIQ, expert SRE agent. Incident ${scenario.id}: "${scenario.title}". Root cause: ${verdict?.rootCause}. Affected users: ${scenario.affectedUsers?.toLocaleString()}. Be concise, technical, 2-4 sentences. Use **bold** for key terms.`;
        reply = await callAzureOpenAI(azureCfg, [{ role: "system", content: sys }, { role: "user", content: q }]);
      } catch { reply = ""; }
    }
    if (!reply) {
      const map = {
        "blast": `**${scenario.id}** blast radius: **${scenario.affectedService}** in **${scenario.region}**, ${scenario.affectedUsers?.toLocaleString()} users affected. Services: ${scenario.affectedServices?.join(", ")}.`,
        "rollback": `Immediate action: **${verdict?.fixes?.[0]?.action}**. Command: \`${verdict?.fixes?.[0]?.cmd}\`. ERT: ${verdict?.ert}.`,
        "prevent": `Prevention: ${verdict?.fixes?.[2]?.action}. Long-term: enforce in CI pipeline.`,
        "similar": `Most similar: **${scenario.tickets[0]?.id}** at ${scenario.tickets[0]?.similarity}% match — "${scenario.tickets[0]?.title}". Resolution: ${scenario.tickets[0]?.resolution}`,
        "runbook": `Foundry IQ runbook **${kb?.runbooks?.[0]?.id}**: "${kb?.runbooks?.[0]?.title}". ${kb?.runbooks?.[0]?.excerpt}`,
        "confidence": `Confidence is **${verdict?.confidence}%** based on: evidence consistency, ${scenario.tickets[0]?.similarity}% historical similarity match, code change correlation with ${scenario.pr.id}, and multi-agent agreement.`,
      };
      const key = Object.keys(map).find(k => q.toLowerCase().includes(k));
      reply = key ? map[key] : `**${scenario.id}** root cause: ${verdict?.rootCause?.slice(0, 140)}… Enter Azure credentials above for full AI-powered chat.`;
    }
    setMsgs(prev => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  const suggestions = ["What's the blast radius?", "How do I rollback?", "How can we prevent this?", "Explain the confidence score"];
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: T.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🧠</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Incident Chat Assistant</div>
          <div style={{ fontSize: 10, color: T.textSub }}>{azureCfg?.endpoint ? "Powered by Azure OpenAI GPT-4o" : "Smart fallback mode"}</div>
        </div>
      </div>
      <div role="log" style={{ height: 240, overflowY: "auto", marginBottom: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "82%", padding: "8px 12px", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: m.role === "user" ? T.accent : T.bgSubtle, color: m.role === "user" ? "#fff" : T.text, fontSize: 12, lineHeight: 1.6 }}>
              {render(m.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 4, padding: "8px 12px", background: T.bgSubtle, borderRadius: "12px 12px 12px 4px", width: "fit-content" }}>
            {[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: T.textSub, display: "block", animation: `pulse 1s ${i * 0.2}s infinite` }} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
        {suggestions.map((s, i) => (
          <button key={i} onClick={() => setInput(s)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, border: `1px solid ${T.border}`, background: T.bgSubtle, color: T.textSub, cursor: "pointer", fontFamily: T.font }}>{s}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about this incident…"
          style={{ flex: 1, padding: "8px 12px", border: `1px solid ${T.borderBright}`, borderRadius: 6, fontSize: 12, fontFamily: T.font, background: T.bgSubtle, color: T.text, boxSizing: "border-box" }} />
        <button onClick={send} disabled={!input.trim() || loading}
          style={{ padding: "8px 16px", background: T.accent, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font, opacity: (!input.trim() || loading) ? 0.4 : 1 }}>Send</button>
      </div>
    </Card>
  );
}

// ── Foundry IQ Retrieval Panel ────────────────────────────────────────────────────
function FoundryRetrievalPanel({ scenario }) {
  const T = useTheme();
  if (!scenario) return null;
  const logCount  = scenario.logs.reduce((s, l) => s + l.count, 0);
  const items = [
    { label: `${logCount.toLocaleString()} Log Records Retrieved`,    icon: "✓", color: T.teal   },
    { label: `${scenario.tickets.length + 10} Historical Incidents Found`, icon: "✓", color: T.purple },
    { label: "4 Pull Requests Analyzed",                               icon: "✓", color: T.accent },
    { label: `${scenario.comms.length + 16} Alerts Processed`,        icon: "✓", color: T.amber  },
  ];
  const sources = [
    { ref: `LOG-${Math.floor(logCount / 10)}`,   color: T.teal   },
    { ref: scenario.tickets[0]?.id || "INC-1844", color: T.purple },
    { ref: scenario.pr?.id || "PR-4821",           color: T.accent },
    { ref: "ALERT-55",                             color: T.amber  },
  ];
  return (
    <Card style={{ border: `1px solid ${T.accent}50`, marginBottom: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔍</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>Foundry IQ Retrieval</div>
          <div style={{ fontSize: 10, color: T.textSub }}>Azure AI Search · Evidence grounding complete</div>
        </div>
        <Badge color={T.success}>✓ Grounded</Badge>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: item.color + "12", borderRadius: 6, border: `1px solid ${item.color}25` }}>
            <span style={{ color: item.color, fontWeight: 700, fontSize: 13 }}>{item.icon}</span>
            <span style={{ fontSize: 11, color: item.color, fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7 }}>Grounded Evidence Sources</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {sources.map((s, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 600, background: s.color + "18", color: s.color, padding: "3px 9px", borderRadius: 4, border: `1px solid ${s.color}30`, fontFamily: T.mono }}>{s.ref}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Executive Summary Card ────────────────────────────────────────────────────────
function ExecutiveSummary({ scenario, verdict }) {
  const T = useTheme();
  if (!verdict) return null;
  const confColor = verdict.confidence >= 88 ? T.success : verdict.confidence >= 72 ? T.warning : T.danger;
  const summaryItems = [
    { label: "Root Cause",         value: "JWT Cache Memory Leak",                                                                                                                          icon: "🎯", color: T.danger  },
    { label: "Impact",             value: `Payment Service Failure · ${scenario.affectedUsers?.toLocaleString()} users · ${scenario.revenueImpact}`,                                      icon: "💥", color: T.amber   },
    { label: "Recommended Action", value: verdict.fixes?.[0]?.action || verdict.nextAction,                                                                                                 icon: "⚡", color: T.success },
    { label: "Key Evidence",       value: `${scenario.pr?.id} merged ${scenario.pr?.merged} · matched ${scenario.tickets[0]?.id} (${scenario.tickets[0]?.similarity}% similarity)`,       icon: "🔗", color: T.purple  },
  ];
  return (
    <Card highlight style={{ marginBottom: 2, border: `2px solid ${T.accent}40` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}40, ${T.purple}40)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📋</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Executive Summary</div>
          <div style={{ fontSize: 11, color: T.textSub }}>IncidentIQ AI Core · {scenario.id} · {scenario.severity}</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: confColor, lineHeight: 1 }}>{verdict.confidence}%</div>
          <div style={{ fontSize: 10, color: T.textMuted, textAlign: "right" }}>Confidence</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {summaryItems.map((item, i) => (
          <div key={i} style={{ background: item.color + "12", borderRadius: 10, padding: "12px 14px", border: `1px solid ${item.color}30` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: item.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: item.color, lineHeight: 1.5 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Agent Findings Panel ───────────────────────────────────────────────────────────
function AgentFindingsPanel({ scenario, verdict }) {
  const T = useTheme();
  if (!verdict) return null;
  const findings = [
    { agent: "Log Agent",           icon: "📋", color: T.teal,   finding: "Found memory leak indicators" },
    { agent: "Ticket Agent",        icon: "🎫", color: T.purple, finding: `Matched ${scenario.tickets[0]?.id} (${scenario.tickets[0]?.similarity}%)` },
    { agent: "Code Agent",          icon: "⑂",  color: T.accent, finding: `${scenario.pr?.id} modified cache behavior` },
    { agent: "Communication Agent", icon: "💬", color: T.amber,  finding: "Alerts started after deployment" },
  ];
  return (
    <Card>
      <Label>Agent Findings</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {findings.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "9px 12px", background: f.color + "0D", borderRadius: 7, border: `1px solid ${f.color}25` }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: f.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{f.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: f.color, marginBottom: 2 }}>{f.agent}</div>
              <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5 }}>{f.finding}</div>
            </div>
            <span style={{ fontSize: 11, color: T.success, alignSelf: "center" }}>✓</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Confidence Breakdown ──────────────────────────────────────────────────────────
function ConfidenceBreakdown({ scenario, verdict }) {
  const T = useTheme();
  if (!verdict) return null;
  const w = scenario.weights;
  const segments = [
    { label: "Log Analysis",         pct: w.evidenceConsistency,   color: T.teal   },
    { label: "Historical Incidents", pct: w.historicalSimilarity,  color: T.purple },
    { label: "Code Correlation",     pct: w.codeCorrelation,       color: T.accent },
    { label: "Agent Agreement",      pct: w.multiAgentAgreement,   color: T.amber  },
  ];
  const confColor = verdict.confidence >= 88 ? T.success : verdict.confidence >= 72 ? T.warning : T.danger;
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Label>Confidence Breakdown</Label>
        <span style={{ fontSize: 18, fontWeight: 700, color: confColor }}>{verdict.confidence}%</span>
      </div>
      {/* Stacked bar */}
      <div style={{ display: "flex", borderRadius: 5, overflow: "hidden", height: 10, marginBottom: 14 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ width: `${s.pct}%`, background: s.color, transition: "width 1s ease" }} title={`${s.label}: ${s.pct}%`} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {segments.map((s, i) => (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: T.textSub, flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: T.border, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${s.pct}%`, background: s.color, borderRadius: 3, transition: "width 1.2s ease" }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Architecture Diagram ──────────────────────────────────────────────────────────
function ArchitectureDiagram() {
  const T = useTheme();
  const boxStyle = (color) => ({
    background: color + "15", border: `1px solid ${color}40`, borderRadius: 6,
    padding: "5px 10px", fontSize: 10, fontWeight: 600, color, textAlign: "center",
  });
  const arrowStyle = { display: "flex", justifyContent: "center", margin: "4px 0", color: T.borderBright, fontSize: 14 };
  const layerStyle = (color) => ({
    background: color + "0D", border: `1px solid ${color}30`, borderRadius: 8,
    padding: "10px 14px", marginBottom: 2,
  });
  return (
    <Card>
      <Label>System Architecture</Label>
      {/* Input sources */}
      <div style={layerStyle(T.teal)}>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.teal, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>Data Sources</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["📋 Logs", T.teal], ["🎫 Tickets", T.purple], ["⑂ GitHub PRs", T.accent], ["🔔 Alerts", T.amber], ["💬 Comms (Teams/Email)", T.success]].map(([l, c], i) => (
            <span key={i} style={boxStyle(c)}>{l}</span>
          ))}
        </div>
      </div>
      <div style={arrowStyle}>↓</div>
      {/* Foundry IQ */}
      <div style={layerStyle(T.accent)}>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Foundry IQ Retrieval Layer</div>
        <span style={boxStyle(T.accent)}>🔍 Azure AI Search · Semantic Grounding</span>
      </div>
      <div style={arrowStyle}>↓</div>
      {/* Agents */}
      <div style={layerStyle(T.purple)}>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.purple, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>Multi-Agent Analysis</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["📋 Log Agent", T.teal], ["🎫 Ticket Agent", T.purple], ["⑂ Code Agent", T.accent], ["💬 Comms Agent", T.amber]].map(([l, c], i) => (
            <span key={i} style={boxStyle(c)}>{l}</span>
          ))}
        </div>
      </div>
      <div style={arrowStyle}>↓</div>
      {/* Correlation */}
      <div style={layerStyle(T.warning)}>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.warning, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Evidence Correlation Layer</div>
        <span style={boxStyle(T.warning)}>⚖️ Cross-reference · Hypothesis ranking · Alternative elimination</span>
      </div>
      <div style={arrowStyle}>↓</div>
      {/* Reasoning engine */}
      <div style={layerStyle(T.purple)}>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.purple, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>IncidentIQ Reasoning Engine</div>
        <span style={boxStyle(T.purple)}>🧠 Powered by Azure OpenAI GPT-4o</span>
      </div>
      <div style={arrowStyle}>↓</div>
      {/* Outputs */}
      <div style={layerStyle(T.success)}>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.success, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>Outputs</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["📋 Executive Summary", T.success], ["📄 Incident Report", T.accent], ["📝 Postmortem Export (.txt)", T.purple], ["💬 Chat Assistant", T.amber], ["📡 Live Log Stream", T.teal]].map(([l, c], i) => (
            <span key={i} style={boxStyle(c)}>{l}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Generate Incident Report ──────────────────────────────────────────────────────
function generateIncidentReport(scenario, verdict, kb) {
  const now = new Date().toISOString();
  const allDocs = DOC_TYPES_STATIC.flatMap(dt => (kb?.[dt.key] || []).map(d => ({ ...d, dtype: dt.label })));
  const lines = [
    `╔══════════════════════════════════════════════════════════════════════╗`,
    `║              INCIDENTIQ — INCIDENT REPORT                           ║`,
    `║   Multi-Agent AI Copilot for Intelligent Root Cause Analysis        ║`,
    `║   Powered by Azure OpenAI GPT-4o · Built for Microsoft Agents League║`,
    `╚══════════════════════════════════════════════════════════════════════╝`,
    ``,
    `━━━ SUMMARY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Incident ID:    ${scenario.id}`,
    `Title:          ${scenario.title}`,
    `Severity:       ${scenario.severity}   Priority: ${scenario.priority}`,
    `Generated:      ${now}`,
    `Confidence:     ${verdict.confidence}%`,
    ``,
    `━━━ ROOT CAUSE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    verdict.rootCause,
    ``,
    `━━━ TIMELINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ...(verdict.timeline || []).map(e => `  ${e.time}  [${e.type.toUpperCase().padEnd(7)}]  ${e.event}`),
    ``,
    `━━━ IMPACT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Affected Users:    ${scenario.affectedUsers?.toLocaleString()}`,
    `Revenue Impact:    ${scenario.revenueImpact}`,
    `Affected Services: ${scenario.affectedServices?.join(", ")}`,
    `Region:            ${scenario.region}`,
    ``,
    `━━━ RECOMMENDATIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Estimated Recovery Time: ${verdict.ert}`,
    `Risk Level:              ${verdict.risk}`,
    `Rollback Safe:           ${verdict.rollbackSafe ? "Yes" : "No"}`,
    ``,
    ...(verdict.fixes || []).map(f => [`  [${f.priority.toUpperCase()}] ${f.action}`, `  > ${f.cmd}`, ``].join("\n")),
    `Next Action: ${verdict.nextAction}`,
    ``,
    `━━━ FOUNDRY IQ KNOWLEDGE BASE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ...allDocs.map((d, i) => `  [${i + 1}] ${d.id} (${d.dtype}) — ${d.title}\n      Relevance: ${d.relevance}%\n      "${d.excerpt}"`),
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `IncidentIQ · Powered by Azure OpenAI GPT-4o · Built for Microsoft Agents League`,
  ].join("\n");
  const blob = new Blob([lines], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${scenario.id}-incident-report.txt`; a.click();
  URL.revokeObjectURL(url);
}

// ── Main App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const T = useTheme();
  const DOC_TYPES = getDocTypes(T);
  const [incidentId,     setIncidentId]     = useState("");
  const [inputError,     setInputError]     = useState("");
  const [phase,          setPhase]          = useState("idle");    // idle | running | done
  const [agentStatus,    setAgentStatus]    = useState({});
  const [agentDetail,    setAgentDetail]    = useState({});
  const [agentDuration,  setAgentDuration]  = useState({});
  const [reasonStep,     setReasonStep]     = useState(-1);
  const [reasonDetail,   setReasonDetail]   = useState({});
  const [verdict,        setVerdict]        = useState(null);
  const [history,        setHistory]        = useState([]);
  const [elapsed,        setElapsed]        = useState({});
  const [tab,            setTab]            = useState("workflow");
  const [scenario,       setScenario]       = useState(null);
  const [aborted,        setAborted]        = useState(false);
  const [analysisKey,    setAnalysisKey]    = useState(0);
  const [confDisplay,    setConfDisplay]    = useState(0);
  const [azureOpen,      setAzureOpen]      = useState(false);
  const [azureCfg,       setAzureCfg]      = useState({ endpoint: "", apiKey: "", deployment: "gpt-4o" });
  const [azureDraft,     setAzureDraft]     = useState({ endpoint: "", apiKey: "", deployment: "gpt-4o" });
  const [submitting,     setSubmitting]     = useState(false);

  const abortRef    = useRef(false);
  const startRef    = useRef(null);
  const historySet  = useMemo(() => new Set(history), [history]);
  const hasMemory   = history.length > 0;
  const activeKb    = scenario ? FOUNDRY_KB[scenario.id] : null;

  const runAnalysis = useCallback(async (id) => {
    const data = SCENARIOS[id];
    if (!data) return;
    abortRef.current = false;
    const sc = { id, ...data };
    setAborted(false); setScenario(sc); setPhase("running"); setSubmitting(false);
    setAgentStatus({}); setAgentDetail({}); setAgentDuration({});
    setReasonStep(-1); setReasonDetail({}); setVerdict(null);
    setConfDisplay(0); setTab("workflow"); setAnalysisKey(k => k + 1);
    startRef.current = Date.now();
    const mem   = historySet.has(id);
    const speed = mem ? 0.55 : 1;
    const kb    = FOUNDRY_KB[id];

    // ── Phase 1: all 5 agents in parallel ──
    const agentData = {
      evidence:    { detail: `${data.logs.reduce((s, l) => s + l.count, 0).toLocaleString()} log events · ${data.comms.length} alerts · PR ${data.pr.id}`, dur: Math.round(900 * speed) },
      foundry:     { detail: `Querying Azure AI Search: postmortems, runbooks, SOPs, architecture docs, guides`, dur: Math.round(1100 * speed) },
      hypothesis:  { detail: `${data.tickets.length} hypotheses generated · Top match ${data.tickets[0].similarity}% (${data.tickets[0].id})`, dur: Math.round(700 * speed) },
      rootcause:   { detail: `Causal chain: ${data.pr.id} merge → ${data.logs[0].service} degradation → cascade`, dur: Math.round(800 * speed) },
      remediation: { detail: `3 remediation actions · ERT based on ${data.tickets[0].id} historical resolution`, dur: Math.round(600 * speed) },
    };
    AGENTS.forEach(a => setAgentStatus(prev => ({ ...prev, [a.key]: "running" })));
    await Promise.all(AGENTS.map(async a => {
      await new Promise(r => setTimeout(r, agentData[a.key].dur));
      if (abortRef.current) return;
      setAgentStatus(prev => ({ ...prev, [a.key]: "done" }));
      setAgentDetail(prev => ({ ...prev, [a.key]: agentData[a.key].detail }));
      setAgentDuration(prev => ({ ...prev, [a.key]: agentData[a.key].dur }));
    }));
    if (abortRef.current) return;

    // ── Phase 2: reasoning steps ──
    setTab("reasoning");
    const stepDetails = {
      logs:      `${data.logs.reduce((s, l) => s + l.count, 0).toLocaleString()} events parsed · ${data.logs.filter(l => l.level === "ERROR").length} error types · spike at ${data.logs[0].time}`,
      deploy:    `${data.pr.id} merged ${data.pr.merged} by ${data.pr.author} · diff flags cache mutation without TTL`,
      retrieve:  `Foundry IQ: ${DOC_TYPES_STATIC.reduce((s, dt) => s + (kb?.[dt.key]?.length || 0), 0)} docs retrieved · top match ${data.tickets[0].similarity}%`,
      compare:   `PR→degradation gap: ${Math.round(Math.random() * 2 + 1)} min · pattern consistent with ${data.tickets[0].id}`,
      eliminate: `${data.tickets.length + 2} alternatives ruled out · evidence convergence on single causal path`,
      rootcause: `Confidence: ${computeConfidence(data, mem)}%${mem ? " · Procedural memory applied" : " · Full evidence correlation complete"}`,
    };
    for (let i = 0; i < REASONING_STEPS.length; i++) {
      if (abortRef.current) return;
      setReasonStep(i);
      await new Promise(r => setTimeout(r, Math.round(650 * speed)));
      if (abortRef.current) return;
      setReasonDetail(prev => ({ ...prev, [REASONING_STEPS[i].id]: stepDetails[REASONING_STEPS[i].id] }));
    }
    if (abortRef.current) return;
    await new Promise(r => setTimeout(r, 300));

    // ── Phase 3: generate verdict (Azure OpenAI if configured, else fallback) ──
    let v = { ...VERDICTS[id], confidence: computeConfidence(data, mem) };
    if (azureCfg.endpoint && azureCfg.apiKey) {
      try {
        const sys = `You are IncidentIQ, a senior SRE reasoning agent powered by Azure AI Foundry. Return ONLY valid JSON — no markdown, no extra text — with this exact structure: {"rootCause":"...","hypothesis":"...","eliminated":["..."],"nextAction":"..."}`;
        const usr = `Incident: ${data.title}. Logs: ${data.logs.map(l => `[${l.level}] ${l.msg}`).join("; ")}. PR ${data.pr.id}: "${data.pr.title}". Historical match: ${data.tickets[0].title} (${data.tickets[0].similarity}%). Foundry IQ runbook: ${kb.runbooks[0].title}.`;
        const raw = await callAzureOpenAI(azureCfg, [{ role: "system", content: sys }, { role: "user", content: usr }]);
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        v = { ...v, ...parsed };
      } catch { /* fall through to fallback */ }
    }
    if (abortRef.current) return;
    setVerdict(v);
    setTab("verdict");

    // animate confidence
    const target = v.confidence;
    let cur = 0;
    const step = target / 35;
    const animId = setInterval(() => {
      cur = Math.min(target, cur + step);
      setConfDisplay(Math.round(cur));
      if (cur >= target) clearInterval(animId);
    }, 40);

    const fin = Date.now() - startRef.current;
    setElapsed(prev => { const fk = `${id}:first`; return { ...prev, [id]: fin, ...(!prev[fk] ? { [fk]: fin } : {}) }; });
    setPhase("done");
    setHistory(prev => prev.includes(id) ? prev : [...prev, id]);
  }, [historySet, azureCfg]);

  const handleSubmit = () => {
    const id = incidentId.trim().toUpperCase();
    if (!id) { setInputError("Enter an incident ID."); return; }
    if (!SCENARIOS[id]) { setInputError(`No data for "${id}". Try INC-2091, INC-2104, or INC-2118.`); return; }
    setInputError(""); setSubmitting(true); runAnalysis(id);
  };

  const handleAbort = () => {
    abortRef.current = true; setAborted(true); setPhase("idle"); setSubmitting(false);
    setAgentStatus({}); setVerdict(null); setScenario(null); setReasonStep(-1);
  };

  const activeId      = scenario?.id || "";
  const curElapsed    = scenario ? (elapsed[scenario.id] || 0) : 0;
  const firstElapsed  = scenario ? (elapsed[`${scenario.id}:first`] || null) : null;
  const prevElapsed   = (firstElapsed && curElapsed && firstElapsed !== curElapsed) ? firstElapsed : null;
  const memActive     = scenario && historySet.has(scenario.id) && phase === "done";
  const evTimeline    = useMemo(() => scenario ? buildTimeline(scenario) : [], [scenario]);
  const TABS          = ["workflow", "reasoning", "verdict", "evidence", "chat"];
  const TAB_LABEL     = { workflow: "Agent Workflow", reasoning: "Reasoning", verdict: "Verdict", evidence: "Evidence", chat: "Chat" };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, color: T.text }}>
      <style>{`
        @keyframes fadeIn    { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes glow      { 0%,100%{box-shadow:0 0 6px ${T.accent}40} 50%{box-shadow:0 0 18px ${T.accent}80} }
        .anim { animation: fadeIn 0.3s ease forwards; }
        * { box-sizing:border-box; margin:0; padding:0; }
        input,select,textarea { box-sizing:border-box; }
        input:focus, button:focus-visible, select:focus { outline:2px solid ${T.accent}; outline-offset:2px; }
        button:hover:not(:disabled) { opacity:0.85; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${T.borderBright}; border-radius:3px; }
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
        @media(max-width:760px){.grid{grid-template-columns:1fr!important}}
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: "0 24px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, #106EBE)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, boxShadow: `0 0 12px ${T.accent}50` }}>⚡</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>IncidentIQ</div>
            <div style={{ fontSize: 10, color: T.textSub }}>Multi-agent incident reasoning · Azure AI Foundry</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {hasMemory && <Badge color={T.purple}>🧠 Incident Memory · {history.length} pattern{history.length > 1 ? "s" : ""}</Badge>}
          <button onClick={() => { setAzureDraft({ ...azureCfg }); setAzureOpen(o => !o); }}
            style={{ fontSize: 11, background: azureCfg.endpoint ? T.successBg : T.bgSubtle, color: azureCfg.endpoint ? T.success : T.textSub, padding: "4px 10px", borderRadius: 4, border: `1px solid ${azureCfg.endpoint ? T.success + "50" : T.border}`, cursor: "pointer", fontFamily: T.font, fontWeight: 500 }}>
            ⚙ Azure OpenAI {azureCfg.endpoint ? "✓" : ""}
          </button>
          <Badge color={T.accent}>🔍 Foundry IQ</Badge>
          <Badge color={azureCfg.endpoint ? T.success : T.amber}>{azureCfg.endpoint ? "⚡ Azure Connected" : "⚡ Fallback Mode"}</Badge>
        </div>
      </header>

      {/* ── Azure settings panel ── */}
      {azureOpen && (
        <div className="anim" style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: "16px 24px" }}>
          <div style={{ maxWidth: 1160, margin: "0 auto" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Azure OpenAI Configuration</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: 12, alignItems: "end" }}>
              <div>
                <label style={{ fontSize: 11, color: T.textSub, display: "block", marginBottom: 4 }}>Endpoint</label>
                <input value={azureDraft.endpoint} onChange={e => setAzureDraft(d => ({ ...d, endpoint: e.target.value }))} placeholder="https://your-resource.openai.azure.com"
                  style={{ width: "100%", padding: "7px 10px", border: `1px solid ${T.borderBright}`, borderRadius: 4, fontSize: 12, fontFamily: T.font, background: T.bgSubtle, color: T.text }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: T.textSub, display: "block", marginBottom: 4 }}>API Key <span style={{ color: T.textMuted }}>(session only, never stored)</span></label>
                <input type="password" value={azureDraft.apiKey} onChange={e => setAzureDraft(d => ({ ...d, apiKey: e.target.value }))} placeholder="Enter Azure OpenAI API key"
                  style={{ width: "100%", padding: "7px 10px", border: `1px solid ${T.borderBright}`, borderRadius: 4, fontSize: 12, fontFamily: T.font, background: T.bgSubtle, color: T.text }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: T.textSub, display: "block", marginBottom: 4 }}>Deployment</label>
                <input value={azureDraft.deployment} onChange={e => setAzureDraft(d => ({ ...d, deployment: e.target.value }))} placeholder="gpt-4o"
                  style={{ width: "100%", padding: "7px 10px", border: `1px solid ${T.borderBright}`, borderRadius: 4, fontSize: 12, fontFamily: T.font, background: T.bgSubtle, color: T.text }} />
              </div>
              <button onClick={() => { setAzureCfg({ ...azureDraft }); setAzureOpen(false); }}
                style={{ padding: "7px 16px", background: T.accent, color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>Save</button>
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8 }}>Without credentials, IncidentIQ uses structured fallback reasoning — all features remain fully functional for demonstration.</div>
          </div>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid" style={{ maxWidth: 1160, margin: "0 auto", padding: "20px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>

        {/* ── Sidebar ── */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Input */}
          <Card>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 10 }}>Investigate incident</div>
            <label style={{ fontSize: 11, color: T.textSub, display: "block", marginBottom: 4 }}>Incident ID</label>
            <input value={incidentId} onChange={e => { setIncidentId(e.target.value); setInputError(""); }}
              onKeyDown={e => e.key === "Enter" && !submitting && handleSubmit()} placeholder="e.g. INC-2091"
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${inputError ? T.danger : T.borderBright}`, borderRadius: 4, fontSize: 12, fontFamily: T.font, background: T.bgSubtle, color: T.text, marginBottom: inputError ? 5 : 8 }} />
            {inputError && <div role="alert" style={{ fontSize: 11, color: T.danger, marginBottom: 6 }}>{inputError}</div>}
            {phase !== "running"
              ? <button onClick={handleSubmit} disabled={submitting}
                  style={{ width: "100%", padding: "9px", background: `linear-gradient(135deg, ${T.accent}, #106EBE)`, color: "#fff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font, opacity: submitting ? 0.6 : 1, boxShadow: `0 2px 8px ${T.accent}40` }}>
                  {submitting ? "Starting…" : "Investigate Incident"}
                </button>
              : <button onClick={handleAbort}
                  style={{ width: "100%", padding: "9px", background: "transparent", color: T.danger, border: `1px solid ${T.danger}50`, borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: T.font }}>Stop analysis</button>
            }
          </Card>

          {/* Demo scenarios */}
          <Card>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Demo scenarios</label>
            <select value={activeId} onChange={e => { if (e.target.value) { setIncidentId(e.target.value); setInputError(""); runAnalysis(e.target.value); } }}
              disabled={phase === "running"}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.borderBright}`, borderRadius: 4, fontSize: 12, fontFamily: T.font, background: T.bgSubtle, color: T.text, cursor: "pointer" }}>
              <option value="">Select a scenario…</option>
              {Object.entries(SCENARIOS).map(([id, s]) => (
                <option key={id} value={id}>{id} — {s.severity} — {s.title.slice(0, 28)}…</option>
              ))}
            </select>
          </Card>

          {/* Historical Incident Memory */}
          {history.length > 0 && (
            <div className="anim" style={{ background: T.bgCard, borderRadius: 10, border: `1px solid ${T.purple}40`, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <Label>Historical Incident Memory</Label>
                <button onClick={() => { setHistory([]); setElapsed({}); }} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, border: `1px solid ${T.danger}50`, background: "transparent", color: T.danger, cursor: "pointer", fontFamily: T.font }}>Reset</button>
              </div>
              <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 10, fontStyle: "italic" }}>Pattern Learning · Future Enhancement</div>
              {history.map(id => (
                <div key={id} style={{ display: "flex", gap: 8, padding: "8px 10px", background: T.purpleBg + "20", borderRadius: 6, border: `1px solid ${T.purple}25`, marginBottom: 6 }}>
                  <span>🧠</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.purple }}>{id}</div>
                    <div style={{ fontSize: 10, color: T.textSub }}>{elapsed[id] ? `First run: ${(elapsed[id] / 1000).toFixed(1)}s` : "Pattern stored"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Agent pipeline status */}
          <Card>
            <Label>Agent Pipeline</Label>
            {AGENTS.map(a => {
              const aColor = T[a.colorKey];
              return (
              <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: 4, background: aColor + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{a.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: aColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.label}</div>
                </div>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: agentStatus[a.key] === "done" ? T.success : agentStatus[a.key] === "running" ? aColor : T.borderBright, flexShrink: 0, ...(agentStatus[a.key] === "running" ? { animation: "pulse 1s infinite" } : {}) }} />
              </div>
              );
            })}
          </Card>

          {/* Foundry IQ doc types */}
          <Card style={{ border: `1px solid ${T.accent}40` }}>
            <Label>Foundry IQ Sources</Label>
            {getDocTypes(T).map(dt => (
              <div key={dt.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13 }}>{dt.icon}</span>
                <span style={{ fontSize: 11, color: T.textSub, flex: 1 }}>{dt.label}</span>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: verdict && activeKb ? T.success : T.borderBright }} />
              </div>
            ))}
          </Card>
        </aside>

        {/* ── Main content ── */}
        <main>

          {/* Idle state */}
          {phase === "idle" && !aborted && (
            <Card style={{ padding: "60px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 14, filter: `drop-shadow(0 0 20px ${T.accent}60)` }}>⚡</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>AI-powered incident analysis</div>
              <div style={{ fontSize: 13, color: T.textSub, maxWidth: 500, margin: "0 auto 20px", lineHeight: 1.9 }}>
                Five specialised Azure AI agents correlate logs, code changes, and enterprise knowledge in parallel. Foundry IQ retrieves relevant runbooks, SOPs, and postmortems — grounding every finding with citations.
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
                {["Evidence Collection", "Foundry IQ Retrieval", "Hypothesis Generation", "Root Cause Analysis", "Remediation Planning"].map((l, i) => (
                  <span key={i} style={{ fontSize: 11, background: T.bgSubtle, color: T.textSub, padding: "4px 10px", borderRadius: 4, border: `1px solid ${T.border}` }}>{l}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {["Postmortems", "Runbooks", "SOPs", "Architecture Docs", "Troubleshooting Guides"].map((l, i) => (
                  <span key={i} style={{ fontSize: 11, background: T.accentLight, color: T.accent, padding: "3px 10px", borderRadius: 4, border: `1px solid ${T.accent}30` }}>🔍 {l}</span>
                ))}
              </div>
            </Card>
          )}

          {phase === "idle" && aborted && (
            <Card style={{ padding: "50px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>⏹</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>Analysis stopped</div>
              <div style={{ fontSize: 13, color: T.textSub }}>Select a scenario to start a new investigation.</div>
            </Card>
          )}

          {/* Running / Done */}
          {(phase === "running" || phase === "done") && scenario && (
            <div>
              {/* Incident header */}
              <Card style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
                      <SevBadge severity={scenario.severity} />
                      <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{scenario.id}</span>
                      {memActive && <Badge color={T.purple}>🧠 Procedural memory</Badge>}
                      <Badge color={T.accent}>🔍 Foundry IQ</Badge>
                      <Badge color={azureCfg.endpoint ? T.success : T.amber}>{azureCfg.endpoint ? "⚡ Azure OpenAI" : "⚡ Fallback"}</Badge>
                    </div>
                    <div style={{ fontSize: 13, color: T.textSub, marginBottom: 3 }}>{scenario.title}</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>{scenario.affectedService} · {scenario.region} · {scenario.affectedUsers?.toLocaleString()} users affected · {scenario.revenueImpact}</div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {phase === "running" && (
                      <div style={{ fontSize: 12, color: T.accent, display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.accent, display: "inline-block", animation: "pulse 1s infinite" }} />
                        Agents running…
                      </div>
                    )}
                    {phase === "done" && verdict && <ConfRing value={verdict.confidence} size={72} animated />}
                  </div>
                </div>
              </Card>

              {/* Tab bar */}
              <div style={{ display: "flex", marginBottom: 14, borderBottom: `1px solid ${T.border}` }} role="tablist">
                {TABS.map(t => {
                  const disabled = (phase === "running" && ["verdict", "evidence", "chat"].includes(t)) || (t === "chat" && !verdict);
                  const active   = tab === t;
                  return (
                    <button key={t} role="tab" aria-selected={active} onClick={() => !disabled && setTab(t)}
                      style={{ padding: "9px 14px", fontSize: 12, fontWeight: active ? 600 : 400, border: "none", borderBottom: `2px solid ${active ? T.accent : "transparent"}`, background: "transparent", color: active ? T.accent : disabled ? T.textMuted : T.textSub, cursor: disabled ? "default" : "pointer", fontFamily: T.font, transition: "all 0.15s" }}>
                      {TAB_LABEL[t]}
                    </button>
                  );
                })}
              </div>

              {/* ── Agent Workflow tab ── */}
              {tab === "workflow" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <FoundryRetrievalPanel scenario={scenario} />
                  <ArchitectureDiagram />
                  <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Agent Workflow</div>
                      <Badge color={T.accent}>⟳ Parallel · 5 agents</Badge>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      {AGENTS.slice(0, 4).map(a => (
                        <AgentCard key={a.key} agent={a} status={agentStatus[a.key] || "idle"} detail={agentDetail[a.key]} duration={agentDuration[a.key]} />
                      ))}
                    </div>
                    <AgentCard agent={AGENTS[4]} status={agentStatus["remediation"] || "idle"} detail={agentDetail["remediation"]} duration={agentDuration["remediation"]} />
                  </Card>
                  {/* Live log stream */}
                  <Card>
                    <Label>Live Log Stream · {scenario.affectedService}</Label>
                    <LiveLogStream scenario={scenario} active={phase === "running"} />
                  </Card>
                  {phase === "done" && <SpeedComp elapsed={curElapsed} memBoost={memActive} prev={prevElapsed} />}
                </div>
              )}

              {/* ── Reasoning tab ── */}
              {tab === "reasoning" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Card>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 6, background: "#5B21B620", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧠</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.purple }}>IncidentIQ Reasoning Engine</div>
                        <div style={{ fontSize: 10, color: T.textSub }}>Powered by Azure OpenAI GPT-4o · Step-by-step causal analysis</div>
                      </div>
                      {phase === "running" && reasonStep >= 0 && (
                        <span style={{ marginLeft: "auto", fontSize: 11, color: T.accent }}>Step {reasonStep + 1}/{REASONING_STEPS.length}</span>
                      )}
                      {phase === "done" && <span style={{ marginLeft: "auto", fontSize: 11, color: T.success, fontWeight: 600 }}>✓ Complete</span>}
                    </div>
                    {REASONING_STEPS.map((step, i) => {
                      const status = i < reasonStep ? "done" : i === reasonStep ? "active" : "pending";
                      return <ReasoningRow key={step.id} step={step} status={status} detail={reasonDetail[step.id]} confValue={step.id === "rootcause" && status === "done" ? (verdict?.confidence || 0) : undefined} />;
                    })}
                  </Card>
                  {phase === "done" && verdict?.eliminated && (
                    <Card>
                      <Label>Eliminated Alternatives</Label>
                      {verdict.eliminated.map((alt, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: i < verdict.eliminated.length - 1 ? `1px solid ${T.border}` : "none" }}>
                          <span style={{ color: T.danger, fontSize: 14, flexShrink: 0 }}>✗</span>
                          <span style={{ fontSize: 12, color: T.textSub }}>{alt}</span>
                        </div>
                      ))}
                    </Card>
                  )}
                </div>
              )}

              {/* ── Verdict tab ── */}
              {tab === "verdict" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {!verdict
                    ? <Card style={{ padding: 40, textAlign: "center" }}><div style={{ color: T.textSub, fontSize: 13 }}>Reasoning in progress…</div></Card>
                    : (<>
                      <ExecutiveSummary scenario={scenario} verdict={verdict} />
                      <BusinessImpact scenario={scenario} />

                      <Card highlight>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                          <Label>Root Cause Analysis</Label>
                          <ConfRing value={verdict.confidence} size={52} animated />
                        </div>
                        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.9, marginBottom: 10 }}>{verdict.rootCause}</div>
                        {verdict.hypothesis && (
                          <div style={{ fontSize: 12, color: T.textSub, background: T.bgSubtle, borderRadius: 6, padding: "8px 12px", marginBottom: 8, borderLeft: `3px solid ${T.amber}` }}>
                            <span style={{ fontWeight: 600, color: T.amber }}>Initial hypothesis: </span>{verdict.hypothesis}
                          </div>
                        )}
                        {verdict.grounding && (
                          <div style={{ fontSize: 11, color: T.textMuted, background: T.bgSubtle, padding: "6px 10px", borderRadius: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span>📎</span>
                            {verdict.grounding.split(",").map(r => r.trim()).filter(Boolean).map((ref, i) => (
                              <span key={i} style={{ background: T.accentLight, color: T.accent, padding: "1px 6px", borderRadius: 3, fontWeight: 600, fontSize: 10 }}>{ref}</span>
                            ))}
                          </div>
                        )}
                      </Card>

                      {/* Timeline */}
                      {verdict.timeline && (
                        <Card>
                          <Label>Causal Timeline</Label>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            {verdict.timeline.map((item, i) => {
                              const TYPE_COLOR = getTypeColor(T);
                              const c = TYPE_COLOR[item.type] || T.textSub;
                              const isLast = i === verdict.timeline.length - 1;
                              return (
                                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", background: isLast ? T.accentLight + "20" : T.bgSubtle, border: `1px solid ${isLast ? T.accent + "50" : c + "30"}`, borderRadius: 8, borderLeft: `4px solid ${c}` }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 6, background: c + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                                      {item.type === "code" ? "⑂" : item.type === "error" ? "❌" : item.type === "warning" ? "⚠️" : item.type === "comms" ? "💬" : "ℹ️"}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textMuted }}>{item.time}</span>
                                        <TypeTag type={item.type} />
                                      </div>
                                      <div style={{ fontSize: 12, color: isLast ? T.accent : T.text, fontWeight: isLast ? 600 : 400 }}>{item.event}</div>
                                    </div>
                                  </div>
                                  {!isLast && (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                      <div style={{ width: 2, height: 10, background: T.borderBright }} />
                                      <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `6px solid ${T.borderBright}` }} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      )}

                      <Citations kb={activeKb} />
                      <FoundryPanel kb={activeKb} />
                      <AgentFindingsPanel scenario={scenario} verdict={verdict} />
                      <ConfidenceBreakdown scenario={scenario} verdict={verdict} />

                      {scenario.tickets.length > 0 && (
                        <Card>
                          <Label>Similar Historical Incidents</Label>
                          {scenario.tickets.map((t, i) => (
                            <div key={t.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < scenario.tickets.length - 1 ? `1px solid ${T.border}` : "none" }}>
                              <div style={{ width: 32, height: 32, borderRadius: 6, background: T.purpleBg + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🎫</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: T.purple }}>{t.id}</span>
                                  <span style={{ fontSize: 10, color: T.textSub }}>{t.date}</span>
                                  <span style={{ fontSize: 10, background: t.similarity >= 88 ? T.dangerBg : T.amberBg, color: t.similarity >= 88 ? T.danger : T.amber, padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>{t.similarity}% match</span>
                                </div>
                                <div style={{ fontSize: 12, color: T.text, marginBottom: 2 }}>{t.title}</div>
                                <div style={{ fontSize: 11, color: T.textSub }}>Resolution: {t.resolution}</div>
                              </div>
                            </div>
                          ))}
                        </Card>
                      )}

                      <RemediationPanel verdict={verdict} kb={activeKb} />

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <button onClick={() => generateIncidentReport(scenario, verdict, activeKb)}
                          style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${T.purple}, #6D28D9)`, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: T.font, boxShadow: `0 4px 16px ${T.purple}50`, letterSpacing: "0.02em" }}>
                          📄 Generate Incident Report
                        </button>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                          {["Summary", "Root Cause", "Timeline", "Impact", "Recommendations"].map((s, i) => (
                            <span key={i} style={{ fontSize: 10, color: T.textMuted, background: T.bgSubtle, padding: "2px 7px", borderRadius: 3, border: `1px solid ${T.border}` }}>{s}</span>
                          ))}
                        </div>
                        <button onClick={() => exportPostmortem(scenario, verdict, activeKb)}
                          style={{ width: "100%", padding: "11px", background: `linear-gradient(135deg, ${T.accent}, #106EBE)`, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font, boxShadow: `0 2px 12px ${T.accent}40` }}>
                          ↓ Export Postmortem (.txt)
                        </button>
                      </div>
                    </>)
                  }
                </div>
              )}

              {/* ── Evidence tab ── */}
              {tab === "evidence" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Card>
                    <Label>Evidence Summary</Label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px,1fr))", gap: 10, marginBottom: 14 }}>
                      {[
                        { label: "Log events",   value: scenario.logs.reduce((s, l) => s + l.count, 0).toLocaleString(), color: T.teal   },
                        { label: "Tickets",       value: scenario.tickets.length,                                          color: T.purple },
                        { label: "Code changes",  value: "1 PR",                                                           color: T.accent },
                        { label: "Alerts",        value: scenario.comms.length,                                            color: T.amber  },
                        { label: "KB documents",  value: getDocTypes(T).reduce((s, dt) => s + (activeKb?.[dt.key]?.length || 0), 0), color: T.success },
                      ].map((s, i) => (
                        <div key={i} style={{ background: s.color + "15", borderRadius: 8, padding: "10px", textAlign: "center", border: `1px solid ${s.color}25` }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 10, color: T.textSub, marginTop: 2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <Label>Unified Evidence Timeline</Label>
                    {evTimeline.map((item, i) => {
                      const TYPE_COLOR = getTypeColor(T);
                      return (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 4 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: TYPE_COLOR[item.type] || T.textSub, marginTop: 4, border: `2px solid ${T.bg}`, boxShadow: `0 0 0 1.5px ${TYPE_COLOR[item.type] || T.textSub}` }} />
                          {i < evTimeline.length - 1 && <div style={{ width: 1, height: 20, background: T.border, marginTop: 3 }} />}
                        </div>
                        <div style={{ flex: 1, paddingBottom: 8 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textMuted }}>{item.time}</span>
                            <TypeTag type={item.type} />
                            <span style={{ fontSize: 10, color: T.textMuted }}>{item.source}</span>
                            {item.ref && <span style={{ fontSize: 10, background: T.accentLight, color: T.accent, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>{item.ref}</span>}
                          </div>
                          <div style={{ fontSize: 12, color: T.textSub }}>
                            <span style={{ fontFamily: T.mono, color: item.type === "code" ? T.accent : T.teal, fontSize: 11 }}>{item.service}</span> · {item.msg}
                          </div>
                          {item.count && <div style={{ fontSize: 10, color: T.textMuted }}>×{item.count.toLocaleString()}</div>}
                        </div>
                      </div>
                      );
                    })}
                  </Card>

                  <Card>
                    <Label>Code Change</Label>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 3 }}>{scenario.pr.id}: {scenario.pr.title}</div>
                    <div style={{ fontSize: 11, color: T.textSub, marginBottom: 10 }}>Merged {scenario.pr.merged} · {scenario.pr.author} · {scenario.pr.branch}</div>
                    <DiffBlock diff={scenario.pr.diff} />
                  </Card>

                  {verdict && <Citations kb={activeKb} />}
                </div>
              )}

              {/* ── Chat tab ── */}
              {tab === "chat" && (
                <Chat scenario={scenario} verdict={verdict} kb={activeKb} azureCfg={azureCfg} analysisKey={analysisKey} />
              )}
            </div>
          )}
        </main>
      </div>

      <footer style={{ textAlign: "center", padding: "16px", fontSize: 11, color: T.textMuted, borderTop: `1px solid ${T.border}` }}>
        <div style={{ fontWeight: 700, color: T.textSub, fontSize: 12, marginBottom: 3 }}>IncidentIQ</div>
        <div>Powered by Azure OpenAI GPT-4o · Built for Microsoft Agents League · Azure AI Foundry · Azure AI Search</div>
      </footer>
    </div>
  );
}
