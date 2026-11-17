import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const TOKEN_KEY = "computerDepositAdminToken";
const labels = { not_deposited: "Not deposited", deposited: "Deposited", withdrawn: "Retrieved" };
const dateTime = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [admin, setAdmin] = useState(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, not_deposited: 0, deposited: 0, withdrawn: 0 });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ personName: "", computerName: "" });
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState("");

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null); setAdmin(null); setRecords([]);
  }, []);

  useEffect(() => {
    let alive = true;
    async function initialize() {
      try {
        const status = await api("/auth/setup-status");
        if (!alive) return;
        setSetupRequired(status.setupRequired);
        if (token) {
          try {
            const result = await api("/auth/me", { token });
            if (alive) setAdmin(result.admin);
          } catch { if (alive) signOut(); }
        }
      } catch (err) { if (alive) setError(err.message); }
      finally { if (alive) setChecking(false); }
    }
    initialize();
    return () => { alive = false; };
  }, [token, signOut]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (filter !== "all") params.set("status", filter);
      const [list, totals] = await Promise.all([
        api(`/admin/records?${params}`, { token }),
        api("/admin/summary", { token })
      ]);
      setRecords(list); setSummary(totals);
    } catch (err) {
      if (err.status === 401) signOut();
      else setError(err.message);
    }
  }, [token, search, filter, signOut]);

  useEffect(() => {
    if (!admin) return;
    const timer = setTimeout(loadData, 200);
    return () => clearTimeout(timer);
  }, [admin, loadData]);

  async function submitAuth(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = setupRequired
        ? await api("/auth/setup", { method: "POST", body: JSON.stringify(authForm) })
        : await api("/auth/login", { method: "POST", body: JSON.stringify({ email: authForm.email, password: authForm.password }) });
      localStorage.setItem(TOKEN_KEY, result.token);
      setAdmin(result.admin); setToken(result.token); setSetupRequired(false); setAuthForm({ name: "", email: "", password: "" });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function addRecord(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("/admin/records", { token, method: "POST", body: JSON.stringify(form) });
      setForm({ personName: "", computerName: "" });
      await loadData();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function changeStatus(record, status) {
    const note = window.prompt(`Optional note for marking this computer ${labels[status].toLowerCase()}:`, "");
    if (note === null) return;
    setBusy(true); setError("");
    try {
      await api(`/admin/records/${record._id}/status`, { token, method: "PATCH", body: JSON.stringify({ status, note }) });
      await loadData();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const csv = useMemo(() => {
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    return [
      ["Person", "Computer", "Status", "Last updated", "History"].map(quote).join(","),
      ...records.map((record) => [record.personName, record.computerName, labels[record.status], dateTime(record.updatedAt), (record.history || []).map((entry) => `${labels[entry.status]} by ${entry.adminName} at ${dateTime(entry.timestamp)}${entry.note ? ` (${entry.note})` : ""}`).join(" | ")].map(quote).join(","))
    ].join("\r\n");
  }, [records]);

  function downloadCsv() {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "computer-deposit-records.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  if (checking) return <main className="center"><div className="spinner" aria-label="Loading" /></main>;

  if (!admin) return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">CD</div>
        <p className="eyebrow">ADMINISTRATOR PORTAL</p>
        <h1>Computer Deposit Tracker</h1>
        <p className="muted">Securely manage computer deposits, retrievals, and activity history.</p>
        {error && <div className="alert" role="alert">{error}</div>}
        <form onSubmit={submitAuth} className="stack">
          {setupRequired && <label>Administrator name<input required maxLength="100" autoComplete="name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Your name" /></label>}
          <label>Email address<input required type="email" autoComplete="username" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="admin@example.com" /></label>
          <label>Password<input required type="password" minLength={setupRequired ? 12 : undefined} maxLength="128" autoComplete={setupRequired ? "new-password" : "current-password"} value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder={setupRequired ? "At least 12 characters" : "Your password"} /></label>
          <button className="button primary full" disabled={busy}>{busy ? "Please wait…" : setupRequired ? "Create administrator account" : "Sign in"}</button>
        </form>
        <p className="security-note">{setupRequired ? "One-time setup: once created, no further public admin registration is allowed." : "This portal is restricted to authorized administrators."}</p>
      </section>
    </main>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark small">CD</span><span>Computer<span className="brand-light">Track</span></span></a>
        <div className="top-actions"><span className="admin-label"><span className="online-dot" />{admin.name}</span><button className="button ghost" onClick={signOut}>Sign out</button></div>
      </header>
      <main className="dashboard" id="top">
        <div className="heading-row"><div><p className="eyebrow">OVERVIEW</p><h1>Deposit management</h1><p className="muted">Register computers and keep a clear record of every handover.</p></div><button className="button outline" onClick={() => window.print()}>Print report</button></div>
        {error && <div className="alert" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}

        <section className="stats" aria-label="Record summary">
          <article className="stat-card"><span className="stat-icon slate">▤</span><span className="stat-label">Total computers</span><strong>{summary.total}</strong><span className="stat-foot">Registered in system</span></article>
          <article className="stat-card"><span className="stat-icon green">↓</span><span className="stat-label">Deposited</span><strong>{summary.deposited}</strong><span className="stat-foot">Currently in storage</span></article>
          <article className="stat-card"><span className="stat-icon blue">○</span><span className="stat-label">Not deposited</span><strong>{summary.not_deposited}</strong><span className="stat-foot">Awaiting deposit</span></article>
          <article className="stat-card"><span className="stat-icon amber">↑</span><span className="stat-label">Retrieved</span><strong>{summary.withdrawn}</strong><span className="stat-foot">Withdrawn from storage</span></article>
        </section>

        <section className="panel add-panel"><div className="panel-heading"><div><p className="eyebrow">NEW ENTRY</p><h2>Add a person and computer</h2></div><span className="step-badge">New records start as not deposited</span></div>
          <form onSubmit={addRecord} className="entry-form"><label>Person name<input required maxLength="120" value={form.personName} onChange={(e) => setForm({ ...form, personName: e.target.value })} placeholder="Enter full name" /></label><label>Computer name / identifier<input required maxLength="120" value={form.computerName} onChange={(e) => setForm({ ...form, computerName: e.target.value })} placeholder="e.g. Dell Latitude 5420" /></label><button className="button primary" disabled={busy}>＋ Add record</button></form>
        </section>

        <section className="panel records-panel"><div className="panel-heading records-heading"><div><p className="eyebrow">REGISTER</p><h2>Computer records <span className="count-pill">{records.length}</span></h2></div><button className="button outline" onClick={downloadCsv} disabled={!records.length}>↓ Export CSV</button></div>
          <div className="toolbar"><div className="search-wrap"><span aria-hidden="true">⌕</span><input aria-label="Search people or computers" placeholder="Search people or computers…" value={search} onChange={(e) => setSearch(e.target.value)} /></div><label className="filter-label">Status<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option><option value="not_deposited">Not deposited</option><option value="deposited">Deposited</option><option value="withdrawn">Retrieved</option></select></label></div>
          <div className="table-scroll"><table><thead><tr><th>PERSON</th><th>COMPUTER</th><th>STATUS</th><th>LAST ACTIVITY</th><th>HISTORY</th><th className="actions-heading">ADMIN ACTION</th></tr></thead><tbody>
            {records.map((record) => <tr key={record._id}><td><strong className="person-name">{record.personName}</strong></td><td>{record.computerName}</td><td><span className={`status status-${record.status}`}><i />{labels[record.status]}</span></td><td className="date-cell">{dateTime(record.updatedAt)}</td><td><button className="text-button" onClick={() => setExpanded(expanded === record._id ? "" : record._id)}>{expanded === record._id ? "Hide" : `View (${record.history?.length || 0})`}</button></td><td className="action-cell">{record.status !== "deposited" && <button className="button mini green-button" disabled={busy} onClick={() => changeStatus(record, "deposited")}>Mark deposited</button>}{record.status !== "withdrawn" && <button className="button mini amber-button" disabled={busy} onClick={() => changeStatus(record, "withdrawn")}>Mark retrieved</button>}</td></tr>)}
            {records.map((record) => expanded === record._id && <tr className="history-row" key={`${record._id}-history`}><td colSpan="6"><div className="timeline">{(record.history || []).slice().reverse().map((entry, index) => <div className="timeline-item" key={`${entry.timestamp}-${index}`}><span className={`timeline-dot status-dot-${entry.status}`} /><div><strong>{labels[entry.status]}</strong><span> by {entry.adminName} · {dateTime(entry.timestamp)}</span>{entry.note && <p>{entry.note}</p>}</div></div>)}</div></td></tr>)}
            {!records.length && <tr><td colSpan="6" className="empty-state"><span>⌕</span><strong>No records found</strong><p>{search || filter !== "all" ? "Try a different search or status filter." : "Add a person and computer above to get started."}</p></td></tr>}
          </tbody></table></div>
          {records.length >= 500 && <p className="limit-note">Showing up to 500 records. Narrow your search to find specific entries.</p>}
        </section>
        <footer className="footer">Computer Deposit Tracker <span>•</span> Admin-only access</footer>
      </main>
    </div>
  );
}

export default App;
