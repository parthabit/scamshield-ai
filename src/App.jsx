import { useState, useRef, useEffect } from "react";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SCAM_KEYWORDS = ["otp","congratulations","won","lottery","prize","click here","verify now","urgent","act now","free money","claim","bitcoin","crypto","investment","guaranteed","bank account","transfer","winner","selected","reward","gift","inheritance","prince","dear friend","dear customer","₹","$$$","100%","risk free","limited time","expires","suspended","verify your account","update your information","send money","western union","gift card","wire transfer","nigerian","unclaimed","beneficiary","kyc"];

function localAnalyze(text) {
  const lower = text.toLowerCase();
  const found = SCAM_KEYWORDS.filter(k => lower.includes(k));
  let score = Math.min(95, found.length * 11 + (text.length > 80 ? 4 : 0));
  if (found.length === 0) score = Math.floor(Math.random() * 12) + 2;
  return { score, risk: score >= 70 ? "High" : score >= 40 ? "Medium" : "Low", keywords: found };
}

function analyzeURL(url) {
  const sus = ["free","win","prize","click","verify","update","login","secure","bank","account","crypto","bit","coin","lucky","gift","claim","reward","alert","confirm"];
  const hasHTTPS = url.startsWith("https://");
  const domain = url.replace(/https?:\/\//,"").split("/")[0];
  const found = sus.filter(k => domain.toLowerCase().includes(k));
  const badTLD = [".xyz",".top",".click",".tk",".ml",".ga",".cf",".pw"].some(t => domain.endsWith(t));
  let score = Math.min(97, found.length * 14 + (badTLD ? 32 : 0) + (!hasHTTPS ? 22 : 0));
  return { score, risk: score >= 70 ? "Dangerous" : score >= 30 ? "Suspicious" : "Safe", hasHTTPS, domain, flags: [...found.map(k=>`Suspicious keyword: "${k}"`), ...(badTLD?["High-risk domain extension"]:[]), ...(!hasHTTPS?["No HTTPS encryption"]:[])] };
}

async function callGemini(prompt) {
  const res = await fetch(GEMINI_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] }) });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
}

const TIPS = ["Never share your OTP — even with bank officials.","Legitimate orgs never ask for passwords via SMS.","Always verify prize claims on official websites.","Urgent language = pressure tactic. Slow down.","Hover over links before clicking to see real URL.","Never pay to claim a prize.","Enable 2FA on all important accounts.","Report to cybercrime.gov.in or call 1930."];
const RECENT = [
  { type:"OTP Fraud", msg:"Send OTP to verify your SBI account immediately", risk:94, time:"2h ago" },
  { type:"Lottery Scam", msg:"Congratulations! You won ₹10 lakh prize money", risk:91, time:"5h ago" },
  { type:"Crypto Scam", msg:"Double your Bitcoin in 24 hours — guaranteed profit", risk:88, time:"1d ago" },
  { type:"Job Scam", msg:"Work from home earn ₹50,000/month no experience", risk:82, time:"2d ago" },
  { type:"Phishing", msg:"Your account is suspended. Click to verify now", risk:89, time:"3d ago" },
];
const STATS = [
  { label:"Scams Detected", val:"2.4M+", icon:"🛡️" },
  { label:"Threats Blocked", val:"890K+", icon:"🚫" },
  { label:"User Reports", val:"156K+", icon:"📋" },
  { label:"Accuracy Rate", val:"97.3%", icon:"🎯" },
];
const NAV_ITEMS = [
  { id:"home", icon:"🏠", label:"Home" },
  { id:"analyze", icon:"🔍", label:"Analyze" },
  { id:"url", icon:"🔗", label:"URL Scan" },
  { id:"dashboard", icon:"📊", label:"Dashboard" },
  { id:"chat", icon:"🤖", label:"AI Chat" },
];

export default function App() {
  const [dark, setDark] = useState(true);
  const [page, setPage] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [urlVal, setUrlVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgRes, setMsgRes] = useState(null);
  const [urlRes, setUrlRes] = useState(null);
  const [aiNote, setAiNote] = useState("");
  const [chatIn, setChatIn] = useState("");
  const [chatHist, setChatHist] = useState([{ r:"ai", t:"Hi! I'm ScamShield AI by Partha. Ask me anything about scam detection, or paste a suspicious message for instant analysis! 🛡️" }]);
  const [chatLoad, setChatLoad] = useState(false);
  const chatRef = useRef(null);

  // Close menu on page change
  useEffect(() => { setMenuOpen(false); }, [page]);

  // Theme
  const bg   = dark ? "#080d1a" : "#eef2ff";
  const card = dark ? "rgba(16,24,52,0.9)" : "rgba(255,255,255,0.95)";
  const bord = dark ? "rgba(80,140,255,0.18)" : "rgba(40,80,200,0.14)";
  const tx   = dark ? "#ddeaff" : "#07153a";
  const txM  = dark ? "#6a8fc0" : "#4060a0";
  const inp  = dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.95)";
  const surf = dark ? "rgba(255,255,255,0.04)" : "rgba(30,60,180,0.05)";
  const navBg = dark ? "rgba(8,13,26,0.95)" : "rgba(238,242,255,0.97)";
  const ACC  = "#3b82f6";
  const RED  = "#ef4444";
  const YELL = "#f59e0b";
  const GRN  = "#22c55e";
  const glow = `0 0 20px rgba(59,130,246,0.25)`;

  const rc = (r) => r==="High"||r==="Dangerous" ? RED : r==="Medium"||r==="Suspicious" ? YELL : GRN;

  async function analyzeMsg() {
    if (!msg.trim()) return;
    setLoading(true); setMsgRes(null); setAiNote("");
    const local = localAnalyze(msg);
    setMsgRes(local);
    try {
      const reply = await callGemini(`You are ScamShield AI by Partha. Analyze this message for scam indicators. Give EXACTLY 3 bullet points starting with •. Max 18 words each.\n\nMessage: "${msg}"\nRisk: ${local.risk} (${local.score}%). Keywords: ${local.keywords.join(", ")||"none"}`);
      setAiNote(reply);
    } catch {
      setAiNote(`• AI explanation unavailable — check your Gemini API key.\n• Local analysis: ${local.risk} risk, ${local.keywords.length} suspicious keywords found.\n• ${local.risk==="High"?"Do NOT respond or share personal info.":"Verify the sender independently."}`);
    }
    setLoading(false);
  }

  async function sendChat() {
    if (!chatIn.trim() || chatLoad) return;
    const q = chatIn.trim(); setChatIn("");
    setChatHist(h => [...h, {r:"user", t:q}]);
    setChatLoad(true);
    try {
      const ctx = chatHist.slice(-4).map(m=>`${m.r==="user"?"User":"AI"}: ${m.t}`).join("\n");
      const reply = await callGemini(`You are ScamShield AI by Partha. Help identify scams. Max 70 words. Be friendly.\n\n${ctx}\nUser: ${q}\n\nScamShield AI:`);
      setChatHist(h => [...h, {r:"ai", t:reply}]);
    } catch {
      setChatHist(h => [...h, {r:"ai", t:"⚠️ AI unavailable. Add your Gemini API key. Local scam detection still works!"}]);
    }
    setChatLoad(false);
    setTimeout(() => chatRef.current?.scrollTo(0,99999), 100);
  }

  // ── Shared components
  const Card = ({children, style={}}) => (
    <div style={{ background:card, border:`1px solid ${bord}`, borderRadius:16, padding:"1.2rem", backdropFilter:"blur(16px)", boxShadow: dark?"0 8px 32px rgba(0,0,30,0.5)":"0 4px 20px rgba(20,50,180,0.08)", ...style }}>
      {children}
    </div>
  );

  const Btn = ({onClick, children, secondary, disabled, full}) => (
    <button onClick={onClick} disabled={disabled} style={{ background:secondary?"transparent":ACC, border:`1px solid ${secondary?bord:ACC}`, borderRadius:10, padding:"11px 20px", color:secondary?tx:"#fff", cursor:disabled?"not-allowed":"pointer", fontSize:14, fontWeight:600, opacity:disabled?0.45:1, boxShadow:!secondary&&!disabled?glow:"none", transition:"all 0.18s", width:full?"100%":"auto", display:"block" }}>
      {children}
    </button>
  );

  const Bar = ({pct, color}) => (
    <div style={{ height:7, background:surf, borderRadius:100, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:100, transition:"width 0.9s ease" }} />
    </div>
  );

  const Badge = ({risk, score}) => (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:`${rc(risk)}18`, border:`1px solid ${rc(risk)}40`, borderRadius:100, padding:"4px 12px", flexShrink:0 }}>
      <span style={{ width:7, height:7, borderRadius:"50%", background:rc(risk), boxShadow:`0 0 8px ${rc(risk)}`, flexShrink:0 }} />
      <span style={{ color:rc(risk), fontWeight:700, fontSize:13 }}>{risk}</span>
      {score!==undefined && <span style={{ color:rc(risk), fontSize:12, opacity:0.75 }}>· {score}%</span>}
    </span>
  );

  const Section = ({title, sub}) => (
    <div style={{ marginBottom:20 }}>
      <h1 style={{ fontSize:"clamp(1.3rem,4vw,1.7rem)", fontWeight:900, margin:"0 0 4px", letterSpacing:-0.5 }}>{title}</h1>
      {sub && <p style={{ color:txM, margin:0, fontSize:14 }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:bg, color:tx, fontFamily:"'Segoe UI',system-ui,sans-serif", transition:"background 0.3s,color 0.3s" }}>
      {dark && <div style={{ position:"fixed", inset:0, backgroundImage:"radial-gradient(ellipse at 15% 15%,rgba(59,130,246,0.07) 0%,transparent 55%),radial-gradient(ellipse at 85% 85%,rgba(139,92,246,0.06) 0%,transparent 55%)", pointerEvents:"none", zIndex:0 }} />}

      {/* ── NAVBAR */}
      <nav style={{ position:"sticky", top:0, zIndex:200, background:navBg, backdropFilter:"blur(24px)", borderBottom:`1px solid ${bord}` }}>
        <div style={{ maxWidth:1120, margin:"0 auto", padding:"0 1rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>

          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:ACC, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, boxShadow:glow, flexShrink:0 }}>🛡️</div>
            <div style={{ lineHeight:1.1 }}>
              <div style={{ fontWeight:800, fontSize:15, letterSpacing:-0.3 }}>ScamShield <span style={{ color:ACC }}>AI</span></div>
              <div style={{ fontSize:10, color:txM }}>by Partha</div>
            </div>
          </div>

          {/* Desktop nav links — hidden on mobile via minWidth trick */}
          <div style={{ display:"flex", gap:2, alignItems:"center" }} className="desktop-nav">
            {NAV_ITEMS.map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ background:page===n.id?`${ACC}1a`:"transparent", border:`1px solid ${page===n.id?ACC+"55":"transparent"}`, borderRadius:8, padding:"6px 12px", color:page===n.id?ACC:txM, cursor:"pointer", fontSize:13, fontWeight:page===n.id?700:400, display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>
                <span>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>

          {/* Right side: theme toggle + hamburger */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => setDark(d => !d)} style={{ background:surf, border:`1px solid ${bord}`, borderRadius:8, padding:"6px 12px", color:tx, cursor:"pointer", fontSize:13, fontWeight:600, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5 }}>
              {dark ? "☀️" : "🌙"}<span style={{ display:"none" }} className="theme-label">{dark?"Light":"Dark"}</span>
            </button>
            {/* Hamburger — shown only on mobile */}
            <button onClick={() => setMenuOpen(o => !o)} aria-label="Menu" style={{ background:surf, border:`1px solid ${bord}`, borderRadius:8, padding:"7px 10px", color:tx, cursor:"pointer", fontSize:18, lineHeight:1, display:"none" }} className="hamburger">
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div style={{ background:navBg, borderTop:`1px solid ${bord}`, padding:"0.5rem 1rem 1rem" }}>
            {NAV_ITEMS.map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, background:page===n.id?`${ACC}1a`:"transparent", border:"none", borderRadius:10, padding:"11px 14px", color:page===n.id?ACC:tx, cursor:"pointer", fontSize:15, fontWeight:page===n.id?700:400, marginBottom:4, textAlign:"left" }}>
                <span style={{ fontSize:18 }}>{n.icon}</span>{n.label}
                {page===n.id && <span style={{ marginLeft:"auto", color:ACC, fontSize:12 }}>●</span>}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Responsive CSS via style tag */}
      <style>{`
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: flex !important; }
          .theme-label { display: inline !important; }
        }
        @media (min-width: 641px) {
          .theme-label { display: inline !important; }
        }
        * { box-sizing: border-box; }
        textarea, input { box-sizing: border-box; }
      `}</style>

      {/* ── MAIN CONTENT */}
      <div style={{ maxWidth:1120, margin:"0 auto", padding:"1.5rem 1rem 2rem", position:"relative", zIndex:1 }}>

        {/* ══ HOME ══ */}
        {page==="home" && <>
          {/* Hero */}
          <div style={{ textAlign:"center", padding:"2.5rem 0 2rem" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:`${ACC}14`, border:`1px solid ${ACC}33`, borderRadius:100, padding:"5px 14px", fontSize:12, color:ACC, marginBottom:18, fontWeight:600 }}>
              🛡️ Built by Partha · Powered by Gemini AI
            </div>
            <h1 style={{ fontSize:"clamp(1.8rem,6vw,3.2rem)", fontWeight:900, margin:"0 0 0.8rem", lineHeight:1.1, letterSpacing:-1 }}>
              Detect Scams &amp; Fraud<br /><span style={{ color:ACC }}>Before They Strike</span>
            </h1>
            <p style={{ fontSize:"clamp(14px,3vw,17px)", color:txM, maxWidth:480, margin:"0 auto 1.5rem", lineHeight:1.65 }}>
              AI-powered analysis of suspicious messages, URLs, and get instant fraud detection — 100% free.
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <Btn onClick={() => setPage("analyze")}>🔍 Analyze Message</Btn>
              <Btn onClick={() => setPage("url")} secondary>🔗 Scan URL</Btn>
              <Btn onClick={() => setPage("chat")} secondary>🤖 AI Chat</Btn>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:20 }}>
            {STATS.map(s => (
              <Card key={s.label}>
                <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:"clamp(1.2rem,4vw,1.6rem)", fontWeight:900, color:ACC, marginBottom:2 }}>{s.val}</div>
                <div style={{ fontSize:12, color:txM }}>{s.label}</div>
              </Card>
            ))}
          </div>

          {/* Recent detections */}
          <Card style={{ marginBottom:16 }}>
            <h2 style={{ fontSize:16, fontWeight:800, margin:"0 0 12px" }}>🚨 Recent Detections</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {RECENT.map((s,i) => (
                <div key={i} style={{ background:surf, border:`1px solid ${bord}`, borderRadius:10, padding:"10px 12px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4, gap:8 }}>
                    <span style={{ background:`${RED}18`, border:`1px solid ${RED}35`, borderRadius:5, padding:"2px 7px", fontSize:11, color:RED, fontWeight:700, whiteSpace:"nowrap" }}>{s.type}</span>
                    <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
                      <span style={{ color:RED, fontWeight:800, fontSize:13 }}>{s.risk}%</span>
                      <span style={{ fontSize:11, color:txM }}>{s.time}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:13, color:txM, lineHeight:1.4 }}>{s.msg}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Tips */}
          <Card>
            <h2 style={{ fontSize:16, fontWeight:800, margin:"0 0 12px" }}>💡 Safety Tips from Partha</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {TIPS.map((t,i) => (
                <div key={i} style={{ display:"flex", gap:8, background:surf, borderRadius:9, padding:"8px 11px", border:`1px solid ${bord}`, alignItems:"flex-start" }}>
                  <span style={{ color:GRN, flexShrink:0, fontSize:14, marginTop:1 }}>✓</span>
                  <span style={{ fontSize:13, color:txM, lineHeight:1.5 }}>{t}</span>
                </div>
              ))}
            </div>
          </Card>
        </>}

        {/* ══ ANALYZE ══ */}
        {page==="analyze" && <>
          <Section title="🔍 Message Analyzer" sub="Paste any suspicious message for instant AI fraud analysis." />
          <Card style={{ marginBottom:16 }}>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder={"Paste suspicious message here...\n\nExample: Congratulations! You won ₹50,000. Send OTP immediately."} rows={5} style={{ background:inp, border:`1px solid ${bord}`, borderRadius:10, padding:"11px 13px", color:tx, fontSize:14, outline:"none", width:"100%", resize:"vertical", fontFamily:"inherit", minHeight:120 }} />
            <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={analyzeMsg} disabled={loading||!msg.trim()}>
                  {loading ? "⏳ Analyzing..." : "🔍 Analyze"}
                </Btn>
                <Btn onClick={() => { setMsg(""); setMsgRes(null); setAiNote(""); }} secondary>Clear</Btn>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <span style={{ fontSize:12, color:txM, alignSelf:"center" }}>Try:</span>
                {["Congratulations! You won ₹50,000. Send OTP now.","Your account is suspended. Verify immediately.","Hey, free for lunch tomorrow?"].map((ex,i) => (
                  <button key={i} onClick={() => setMsg(ex)} style={{ background:surf, border:`1px solid ${bord}`, borderRadius:6, padding:"4px 9px", color:txM, cursor:"pointer", fontSize:12 }}>Example {i+1}</button>
                ))}
              </div>
            </div>
          </Card>

          {msgRes && <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Card>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:14 }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:800 }}>Result</h2>
                <Badge risk={msgRes.risk} score={msgRes.score} />
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:13, color:txM }}>Scam Probability</span>
                  <span style={{ fontSize:13, fontWeight:800, color:rc(msgRes.risk) }}>{msgRes.score}%</span>
                </div>
                <Bar pct={msgRes.score} color={rc(msgRes.risk)} />
              </div>
              {msgRes.keywords.length > 0
                ? <><div style={{ fontSize:13, color:txM, marginBottom:7 }}>🚩 Suspicious Keywords:</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {msgRes.keywords.map(k => <span key={k} style={{ background:`${RED}14`, border:`1px solid ${RED}38`, borderRadius:6, padding:"3px 8px", fontSize:12, color:RED, fontWeight:600 }}>{k}</span>)}
                    </div></>
                : <div style={{ color:GRN, fontSize:13 }}>✅ No high-risk keywords detected</div>
              }
            </Card>

            {aiNote && <Card>
              <h3 style={{ margin:"0 0 8px", fontSize:14, fontWeight:800 }}>🤖 Gemini AI Explanation</h3>
              <div style={{ fontSize:13, color:txM, lineHeight:1.8, whiteSpace:"pre-line" }}>{aiNote}</div>
            </Card>}

            <Card style={{ borderColor:msgRes.risk==="High"?`${RED}40`:bord }}>
              <h3 style={{ margin:"0 0 10px", fontSize:14, fontWeight:800 }}>🔒 Recommended Actions</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {(msgRes.risk==="High"
                  ? ["🚫 Do NOT respond to this message","🚫 Never share OTP or banking details","📱 Block and report the sender","🏦 Contact your bank if info was shared","🚨 Report at cybercrime.gov.in or call 1930"]
                  : msgRes.risk==="Medium"
                  ? ["⚠️ Verify the source independently","🔍 Visit official websites directly","📞 Call the organization to confirm"]
                  : ["✅ Message appears relatively safe","💡 Stay alert with unknown senders"]
                ).map((r,i) => <div key={i} style={{ fontSize:13, color:txM, padding:"7px 10px", background:surf, borderRadius:8 }}>{r}</div>)}
              </div>
            </Card>
          </div>}
        </>}

        {/* ══ URL SCANNER ══ */}
        {page==="url" && <>
          <Section title="🔗 URL Scanner" sub="Check if a link is safe before clicking." />
          <Card style={{ marginBottom:16 }}>
            <input value={urlVal} onChange={e => setUrlVal(e.target.value)} onKeyDown={e => e.key==="Enter" && urlVal.trim() && (() => { setUrlRes(analyzeURL(urlVal)); })()} placeholder="Paste URL... e.g. https://suspicious-site.xyz/claim" style={{ background:inp, border:`1px solid ${bord}`, borderRadius:10, padding:"11px 13px", color:tx, fontSize:14, outline:"none", width:"100%", fontFamily:"inherit" }} />
            <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={() => urlVal.trim() && setUrlRes(analyzeURL(urlVal))}>🔗 Scan URL</Btn>
                <Btn onClick={() => { setUrlVal(""); setUrlRes(null); }} secondary>Clear</Btn>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <span style={{ fontSize:12, color:txM, alignSelf:"center" }}>Try:</span>
                {["http://win-prize.xyz/claim","https://google.com","http://sbi-verify.tk/secure"].map((ex,i) => (
                  <button key={i} onClick={() => setUrlVal(ex)} style={{ background:surf, border:`1px solid ${bord}`, borderRadius:6, padding:"4px 9px", color:txM, cursor:"pointer", fontSize:12 }}>Ex {i+1}</button>
                ))}
              </div>
            </div>
          </Card>

          {urlRes && <Card>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:14 }}>
              <h2 style={{ margin:0, fontSize:16, fontWeight:800 }}>Result</h2>
              <Badge risk={urlRes.risk} score={urlRes.score} />
            </div>
            <Bar pct={urlRes.score} color={rc(urlRes.risk)} />
            <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:8 }}>
              {[{label:"Domain", val:urlRes.domain, color:tx},{label:"HTTPS", val:urlRes.hasHTTPS?"✅ Secure":"❌ Not Secure", color:urlRes.hasHTTPS?GRN:RED}].map(r => (
                <div key={r.label} style={{ display:"flex", gap:10, padding:"9px 12px", background:surf, borderRadius:8, flexWrap:"wrap" }}>
                  <span style={{ color:txM, fontSize:13, width:70, flexShrink:0 }}>{r.label}:</span>
                  <span style={{ fontSize:13, fontWeight:600, color:r.color, wordBreak:"break-all" }}>{r.val}</span>
                </div>
              ))}
              {urlRes.flags.length > 0
                ? <div style={{ padding:"10px 12px", background:`${RED}0e`, border:`1px solid ${RED}28`, borderRadius:8 }}>
                    <div style={{ fontSize:12, color:txM, marginBottom:5 }}>⚠️ Risk Flags:</div>
                    {urlRes.flags.filter(Boolean).map((f,i) => <div key={i} style={{ fontSize:13, color:RED, padding:"2px 0" }}>• {f}</div>)}
                  </div>
                : <div style={{ padding:"10px 12px", background:`${GRN}0e`, border:`1px solid ${GRN}28`, borderRadius:8, color:GRN, fontSize:13 }}>✅ No suspicious patterns found</div>
              }
            </div>
          </Card>}
        </>}

        {/* ══ DASHBOARD ══ */}
        {page==="dashboard" && <>
          <Section title="📊 Dashboard" sub="Detection metrics — by Partha" />

          {/* 2-col stats on mobile, 4 on desktop */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:16 }}>
            {[
              {label:"Scans Today", val:"1,247", color:ACC},
              {label:"Scams Found", val:"892",   color:RED},
              {label:"Safe",        val:"355",   color:GRN},
              {label:"URLs Scanned",val:"438",   color:YELL},
            ].map(s => (
              <Card key={s.label}>
                <div style={{ fontSize:"clamp(1.2rem,4vw,1.6rem)", fontWeight:900, color:s.color, marginBottom:2 }}>{s.val}</div>
                <div style={{ fontSize:12, color:txM }}>{s.label}</div>
              </Card>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Card>
              <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:800 }}>🍕 Scam Categories</h3>
              {[
                {label:"OTP Fraud",   pct:34, color:RED},
                {label:"Lottery",     pct:22, color:"#f97316"},
                {label:"Phishing",    pct:19, color:YELL},
                {label:"Crypto",      pct:14, color:"#a855f7"},
                {label:"Job Scam",    pct:11, color:ACC},
              ].map(c => (
                <div key={c.label} style={{ marginBottom:11 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:13, color:txM }}>{c.label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:c.color }}>{c.pct}%</span>
                  </div>
                  <Bar pct={c.pct} color={c.color} />
                </div>
              ))}
            </Card>

            <Card>
              <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:800 }}>📈 Weekly Trend</h3>
              <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100 }}>
                {[45,72,58,89,67,94,82].map((v,i) => (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, height:"100%" }}>
                    <div style={{ flex:1, width:"100%", display:"flex", alignItems:"flex-end" }}>
                      <div style={{ width:"100%", height:`${v}%`, background:ACC, borderRadius:"4px 4px 0 0", opacity:0.6+i*0.06 }} />
                    </div>
                    <span style={{ fontSize:10, color:txM }}>{"SMTWTFS"[i]}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:800 }}>🕐 Recent Activity</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {RECENT.map((s,i) => (
                  <div key={i} style={{ background:surf, border:`1px solid ${bord}`, borderRadius:9, padding:"9px 12px" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3, gap:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:s.risk>=80?RED:YELL, flexShrink:0, boxShadow:`0 0 6px ${s.risk>=80?RED:YELL}` }} />
                        <span style={{ fontSize:12, fontWeight:700, color:s.risk>=80?RED:YELL }}>{s.type}</span>
                      </div>
                      <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
                        <span style={{ fontSize:13, fontWeight:800, color:s.risk>=80?RED:YELL }}>{s.risk}%</span>
                        <span style={{ fontSize:11, color:txM }}>{s.time}</span>
                      </div>
                    </div>
                    <div style={{ fontSize:12, color:txM, lineHeight:1.4 }}>{s.msg}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>}

        {/* ══ CHAT ══ */}
        {page==="chat" && <>
          <Section title="🤖 AI Assistant" sub="Powered by Google Gemini (free). Ask about scams." />
          <Card style={{ display:"flex", flexDirection:"column", height:"60vh", minHeight:360 }}>
            <div ref={chatRef} style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10, marginBottom:12, paddingRight:2 }}>
              {chatHist.map((m,i) => (
                <div key={i} style={{ display:"flex", justifyContent:m.r==="user"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"85%", padding:"9px 13px", borderRadius:m.r==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", background:m.r==="user"?ACC:surf, border:`1px solid ${m.r==="user"?"transparent":bord}`, fontSize:13, lineHeight:1.65, color:m.r==="user"?"#fff":tx, wordBreak:"break-word" }}>
                    {m.t}
                  </div>
                </div>
              ))}
              {chatLoad && (
                <div style={{ display:"flex" }}>
                  <div style={{ padding:"9px 13px", borderRadius:"14px 14px 14px 4px", background:surf, border:`1px solid ${bord}`, fontSize:13, color:txM }}>⏳ Thinking...</div>
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={chatIn} onChange={e => setChatIn(e.target.value)} onKeyDown={e => e.key==="Enter" && sendChat()} placeholder="Ask about scams..." style={{ flex:1, background:inp, border:`1px solid ${bord}`, borderRadius:10, padding:"10px 13px", color:tx, fontSize:14, outline:"none", fontFamily:"inherit", minWidth:0 }} />
              <Btn onClick={sendChat} disabled={chatLoad||!chatIn.trim()}>↗</Btn>
            </div>
            <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
              {["What is OTP fraud?","Spot phishing emails?","Is 'You won' a scam?"].map(q => (
                <button key={q} onClick={() => setChatIn(q)} style={{ background:surf, border:`1px solid ${bord}`, borderRadius:6, padding:"4px 9px", color:txM, cursor:"pointer", fontSize:12 }}>{q}</button>
              ))}
            </div>
          </Card>
        </>}
      </div>

      {/* ── FOOTER */}
      <footer style={{ borderTop:`1px solid ${bord}`, padding:"1.5rem 1rem", textAlign:"center" }}>
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginBottom:6 }}>
          <span>🛡️</span>
          <span style={{ fontWeight:800, color:ACC, fontSize:15 }}>ScamShield AI</span>
        </div>
        <p style={{ color:txM, fontSize:13, margin:"0 0 4px" }}>
          Designed &amp; Developed by <span style={{ color:ACC, fontWeight:700 }}>Partha</span> · Google Gemini (Free API)
        </p>
        <p style={{ color:txM, fontSize:12, margin:0 }}>
          🚨 Helpline: <span style={{ color:ACC }}>1930</span> · <span style={{ color:ACC }}>cybercrime.gov.in</span>
        </p>
      </footer>
    </div>
  );
}
