// Proago CRM • App.jsx (v2025-08-29e)
// Changes in this drop:
// • Fonts: Inject Nunito globally; main nav buttons + Settings (right) + Logout use Lora
// • Header: Remove Settings from middle nav; keep only right-side Settings (white bg, black text)
// • Finances: requires re-login each time (separate FinancesLogin gate)

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import {
  load, save, K, DEFAULT_SETTINGS,
  weekNumberISO, startOfWeekMon, titleCase
} from "./util";

// ---- Fonts (Nunito + Lora) ----
if (typeof document !== "undefined") {
  const ensureLink = (href) => {
    if (![...document.styleSheets].some(s => (s.href || "").includes(href))) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  };
  ensureLink("https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap");
  ensureLink("https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap");
}

// Pages
import Inflow from "./pages/Inflow";
import Recruiters from "./pages/Recruiters";
import Planning from "./pages/Planning";
import Wages from "./pages/Wages";
import Finances from "./pages/Finances";
import Settings from "./pages/Settings";

// ---- App-login (general) ----
const LOGIN_KEY = "proago_login_v1";
const VALID_USERS = [
  { user: "Oscar", pass: "Sergio R4mos" },
  { user: "Joao",  pass: "Ruben Di4s"  },
];

const Login = ({ onOk }) => {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const ok = VALID_USERS.some(x => x.user === u && x.pass === p);
    if (!ok) return alert("Invalid credentials.");
    localStorage.setItem(LOGIN_KEY, JSON.stringify({ user: u, at: Date.now() }));
    onOk({ user: u });
  };
  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50" style={{ fontFamily: "Nunito,system-ui,Arial,sans-serif" }}>
      <form onSubmit={submit} className="w-[420px] max-w-[95vw] bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex items-center gap-3 mb-4">
          <img src="/proago-icon.png" alt="" className="h-9 w-9 rounded-full" onError={(e)=>e.currentTarget.style.display="none"} />
          {/* Login title uses Lora */}
          <div className="font-semibold text-xl whitespace-nowrap" style={{ fontFamily: "Lora,serif" }}>
            Proago CRM
          </div>
        </div>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Username</label>
            <input className="h-10 border rounded-md px-3" value={u} onChange={(e)=>setU(e.target.value)} required />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium">Password</label>
            <input className="h-10 border rounded-md px-3" value={p} onChange={(e)=>setP(e.target.value)} required type="password" />
          </div>
          <Button type="submit" style={{ background: "#d9010b", color: "white", fontFamily: "Lora,serif" }} className="mt-1">
            Sign in
          </Button>
        </div>
      </form>
    </div>
  );
};

// ---- Finances re-login gate (always ask again) ----
const FinancesLogin = ({ onOk }) => {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const ok = VALID_USERS.some(x => x.user === u && x.pass === p);
    if (!ok) return alert("Invalid credentials for Finances.");
    onOk({ user: u, at: Date.now() });
  };
  return (
    <div className="min-h-[50vh] grid place-items-center">
      <form onSubmit={submit} className="w-[420px] max-w-[95vw] bg-white rounded-2xl p-6 shadow-sm border"
            style={{ fontFamily: "Nunito,system-ui,Arial,sans-serif" }}>
        <div className="font-semibold text-lg mb-3" style={{ fontFamily: "Lora,serif" }}>Finances • Login</div>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Username</label>
            <input className="h-10 border rounded-md px-3" value={u} onChange={(e)=>setU(e.target.value)} required />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium">Password</label>
            <input className="h-10 border rounded-md px-3" value={p} onChange={(e)=>setP(e.target.value)} required type="password" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="submit" style={{ background: "black", color: "white", fontFamily: "Lora,serif" }}>
              Enter
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

const Shell = ({ tab, setTab, children, weekBadge, onLogout, onOpenSettings }) => (
  <div className="min-h-screen" style={{ fontFamily: "Nunito,system-ui,Arial,sans-serif" }}>
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <img
            src="/proago-icon.png"
            alt="Proago"
            className="h-7 w-7 rounded-full"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          {/* Header title stays Lora (per your rule for main buttons area) */}
          <span className="font-semibold text-lg whitespace-nowrap" style={{ fontFamily: "Lora,serif" }}>
            Proago CRM
          </span>
          {weekBadge && <Badge variant="secondary" className="ml-3 whitespace-nowrap">{weekBadge}</Badge>}
        </div>

        {/* Middle: Nav (NO Settings here) • Lora on buttons */}
        <nav className="flex gap-2 justify-center">
          {[
            ["inflow", "Inflow"],
            ["recruiters", "Recruiters"],
            ["planning", "Planning"],
            ["wages", "Pay"],
            ["finances", "Finances"],
          ].map(([key, label]) => (
            <Button
              key={key}
              onClick={() => setTab(key)}
              className="px-4"
              style={
                tab === key
                  ? { background: "#d9010b", color: "white", fontFamily: "Lora,serif" }
                  : { background: "#fca11c", color: "black", fontFamily: "Lora,serif" }
              }
            >
              {label}
            </Button>
          ))}
        </nav>

        {/* Right: Settings (white/black) + Logout • both use Lora */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenSettings}
            className="px-3"
            style={{ background: "white", color: "black", border: "1px solid #e5e7eb", fontFamily: "Lora,serif" }}
          >
            Settings
          </Button>
          <Button variant="outline" onClick={onLogout} style={{ fontFamily: "Lora,serif" }}>
            Logout
          </Button>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
  </div>
);

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOGIN_KEY)) || null; } catch { return null; }
  });
  const [tab, setTab] = useState("inflow");

  // Local state for routing to Settings since we removed it from nav
  const [showSettings, setShowSettings] = useState(false);

  // Finances re-login state (force every time you enter Finances)
  const [finGateToken, setFinGateToken] = useState(null);
  const requireFinancesLogin = tab === "finances" && !finGateToken;

  const [settings, setSettings]     = useState(load(K.settings,   DEFAULT_SETTINGS));
  const [pipeline, setPipeline]     = useState(load(K.pipeline,   { leads: [], interview: [], formation: [] }));
  const [recruiters, setRecruiters] = useState(load(K.recruiters, []));
  const [planning, setPlanning]     = useState(load(K.planning,   {}));
  const [history, setHistory]       = useState(load(K.history,    []));

  useEffect(() => save(K.settings, settings),     [settings]);
  useEffect(() => save(K.pipeline, pipeline),     [pipeline]);
  useEffect(() => save(K.recruiters, recruiters), [recruiters]);
  useEffect(() => save(K.planning, planning),     [planning]);
  useEffect(() => save(K.history, history),       [history]);

  const onLogout = () => { localStorage.removeItem(LOGIN_KEY); setSession(null); };

  const onHire = (lead) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `r_${Date.now()}`;
    const rec = {
      id,
      name: titleCase(lead.name || ""),
      role: lead.role || "Rookie",
      crewCode: lead.crewCode || "",
      phone: lead.phone || "",
      email: lead.email || "",
      source: lead.source || "",
      isInactive: false,
    };
    setRecruiters((r) => [...r, rec]);
  };

  const badge = tab === "planning" ? `Week ${weekNumberISO(startOfWeekMon(new Date()))}` : "";

  if (!session) return <Login onOk={setSession} />;

  // Settings route: render Settings page when showSettings is true (independent of tab)
  const openSettings = () => setShowSettings(true);

  return (
    <Shell
      tab={tab}
      setTab={(k) => {
        setTab(k);
        if (k !== "finances") setFinGateToken(null); // clear the finance-gate token when leaving Finances
        setShowSettings(false); // leaving settings when switching tabs
      }}
      weekBadge={badge}
      onLogout={onLogout}
      onOpenSettings={openSettings}
    >
      {/* Settings view (from right-side button) */}
      {showSettings ? (
        <Settings
          settings={settings}
          setSettings={setSettings}
          onClearPlanningHistory={() => setHistory([])}
        />
      ) : (
        <>
          {tab === "inflow" && (
            <Inflow
              pipeline={pipeline}
              setPipeline={setPipeline}
              onHire={onHire}
            />
          )}

          {tab === "recruiters" && (
            <Recruiters
              recruiters={recruiters}
              setRecruiters={setRecruiters}
              history={history}
              setHistory={setHistory}
            />
          )}

          {tab === "planning" && (
            <Planning
              recruiters={recruiters}
              planning={planning}
              setPlanning={setPlanning}
              history={history}
              setHistory={setHistory}
            />
          )}

          {tab === "wages" && <Wages recruiters={recruiters} history={history} />}

          {tab === "finances" && (
            requireFinancesLogin ? (
              <FinancesLogin onOk={(tok) => setFinGateToken(tok)} />
            ) : (
              <Finances history={history} />
            )
          )}
        </>
      )}
    </Shell>
  );
}
