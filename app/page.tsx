"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase, Agent, Task, TaskLog, Result, PostQueue, InboxConversation, InboxMessage, Client, Knowledge, Campaign, AgentRun } from "@/lib/supabase";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const Badge = ({ s }: { s: string }) => <span className={`badge b-${s}`}>{s}</span>;

type TabKey = "overview" | "agentes" | "tasks" | "aprovacoes" | "chat" | "conhecimento" | "campanhas" | "clientes" | "metrics";
const NAV: { key: TabKey; label: string; icon: string }[] = [
  { key: "overview", label: "Visão Geral", icon: "grid" },
  { key: "agentes", label: "Agentes", icon: "bot" },
  { key: "tasks", label: "Tarefas", icon: "check" },
  { key: "aprovacoes", label: "Aprovações", icon: "inbox" },
  { key: "chat", label: "Chat", icon: "chat" },
  { key: "conhecimento", label: "Conhecimento", icon: "book" },
  { key: "campanhas", label: "Campanhas", icon: "mega" },
  { key: "clientes", label: "Clientes", icon: "users" },
  { key: "metrics", label: "Métricas", icon: "chart" },
];
const TITLES: Record<TabKey, string> = {
  overview: "Visão Geral", agentes: "Agentes", tasks: "Tarefas", aprovacoes: "Aprovações", chat: "Chat",
  conhecimento: "Conhecimento", campanhas: "Campanhas", clientes: "Clientes", metrics: "Métricas",
};
function Icon({ name }: { name: string }) {
  const p: Record<string, JSX.Element> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    check: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6L5.5 5z" /></>,
    chat: <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
    mega: <><path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z" /><path d="M14 8a4 4 0 0 1 0 8" /><path d="M18 5a8 8 0 0 1 0 14" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M17 8a3.5 3.5 0 0 1 0 7" /><path d="M18 21a7 7 0 0 0-3-5.7" /></>,
    chart: <><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" rx="1" /><rect x="12" y="8" width="3" height="10" rx="1" /><rect x="17" y="5" width="3" height="13" rx="1" /></>,
    bot: <><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 8V4" /><circle cx="9" cy="14" r="1.2" /><circle cx="15" cy="14" r="1.2" /><path d="M2 13v3M22 13v3" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {p[name]}
    </svg>
  );
}

export default function Page() {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div style={{ padding: 40 }} className="muted">Carregando…</div>;
  if (!userEmail) return <Login onEmail={setEmail} email={email} />;
  return <Dashboard userEmail={userEmail} />;
}

function Login({ email, onEmail }: { email: string; onEmail: (v: string) => void }) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr("Não foi possível entrar: " + error.message);
  };

  return (
    <div id="login">
      <div className="card login-card">
        <h1>
          Nexo <span style={{ color: "var(--accent)" }}>Painel</span>
        </h1>
        <p>Entre para acompanhar os agentes e tarefas.</p>
        <label>E-mail</label>
        <input value={email} onChange={(e) => onEmail(e.target.value)} type="email" placeholder="voce@empresa.com" />
        <label>Senha</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          type="password"
          placeholder="••••••••"
        />
        <div style={{ marginTop: 18 }}>
          <button style={{ width: "100%" }} onClick={login} disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </div>
        <div className="err">{err}</div>
      </div>
    </div>
  );
}

function Dashboard({ userEmail }: { userEmail: string }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<TabKey>("overview");
  const [fArea, setFArea] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [queue, setQueue] = useState<PostQueue[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [cost, setCost] = useState<{ ai: number; posts: number; usd: number }>({ ai: 0, posts: 0, usd: 0 });
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const saved = (typeof window !== "undefined" ? localStorage.getItem("nexo-theme") : null) as "dark" | "light" | null;
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("nexo-theme", theme); } catch {}
  }, [theme]);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 864e5).toISOString();
    const [{ data: a }, { data: t }, { data: q }, { data: camps }, airRes, pstRes, { data: rates }] = await Promise.all([
      supabase.from("agents").select("*").order("kind", { ascending: false }).order("area", { nullsFirst: true }),
      supabase.from("tasks").select("id,area,status,priority,objective,created_at,parent_task_id").order("created_at", { ascending: false }).limit(300),
      supabase.from("post_queue").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("inbox_messages").select("id", { count: "exact", head: true }).eq("sender", "ai").gte("created_at", since),
      supabase.from("post_queue").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("ai_cost_rates").select("*"),
    ]);
    setAgents((a as Agent[]) ?? []);
    setTasks((t as Task[]) ?? []);
    setQueue((q as PostQueue[]) ?? []);
    setCampaigns((camps as Campaign[]) ?? []);
    const rateMap: Record<string, number> = {};
    (rates ?? []).forEach((r: any) => {
      rateMap[r.item] = Number(r.unit_cost_usd);
    });
    const aiN = (airRes as { count: number | null }).count ?? 0;
    const postN = (pstRes as { count: number | null }).count ?? 0;
    setCost({ ai: aiN, posts: postN, usd: aiN * (rateMap["sac_reply"] || 0) + postN * (rateMap["post"] || 0) });
  }, []);

  const setPostStatus = async (id: string, status: string) => {
    setQueue((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await supabase.from("post_queue").update({ status }).eq("id", id);
    load();
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("nexo-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_queue" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const pendingCount = queue.filter((p) => p.status === "pending_approval").length;

  const statsForArea = (area: string | null) => {
    const t = tasks.filter((x) => x.area === area);
    return {
      total: t.length,
      running: t.filter((x) => x.status === "running").length,
      pending: t.filter((x) => x.status === "pending").length,
      done: t.filter((x) => x.status === "done").length,
    };
  };

  const orch = agents.find((a) => a.kind === "orchestrator");
  const subs = agents.filter((a) => a.kind === "subagent");
  const areas = useMemo(() => [...new Set(subs.map((a) => a.area).filter(Boolean))] as string[], [subs]);

  const rows = tasks.filter((t) => (!fArea || t.area === fArea) && (!fStatus || t.status === fStatus));
  const count = (s: string) => tasks.filter((t) => t.status === s).length;

  return (
    <div className={`app ${navOpen ? "nav-open" : ""}`}>
      <aside className="sidebar">
        <div className="side-brand">Nexo <span>CRM</span></div>
        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.key} className={`nav-item ${tab === n.key ? "active" : ""}`} onClick={() => { setTab(n.key); setNavOpen(false); }}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {n.key === "aprovacoes" && pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <span className="who">{userEmail}</span>
          <button className="ghost sm" onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </aside>

      <div className="overlay" onClick={() => setNavOpen(false)} />

      <div className="main-col">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setNavOpen((v) => !v)} aria-label="Menu">☰</button>
          <h1>{TITLES[tab]}</h1>
          <span className="badge-live"><span className="dot pulse" />ao vivo</span>
          <div className="spacer" />
          <button className="icon-btn" title="Alternar tema" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button className="ghost sm" onClick={load}>Atualizar</button>
        </header>

        <main className="content">
        {tab === "overview" && (
          <section>
            <div className="grid metrics">
              {[
                ["Tarefas", tasks.length],
                ["Concluídas", count("done")],
                ["Em execução", count("running")],
                ["Na fila", count("pending")],
              ].map(([l, n]) => (
                <div key={l as string} className="card metric">
                  <div className="n">{n as number}</div>
                  <div className="l">{l as string}</div>
                </div>
              ))}
            </div>

            {orch && (
              <div style={{ marginTop: 16 }} className="card agent orch">
                <div className="top">
                  <div>
                    <div className="name">🧭 {orch.name}</div>
                    <div className="area">Orquestrador · roteia e coordena</div>
                  </div>
                  <Badge s={orch.status} />
                </div>
              </div>
            )}

            <div className="section-title">Subagentes por área</div>
            <div className="grid agents">
              {subs.map((a) => {
                const s = statsForArea(a.area);
                const roles = a.config?.roles?.length ?? 0;
                const working = s.running > 0;
                const st = a.is_active ? (working ? "working" : a.status) : "offline";
                return (
                  <div key={a.id} className="card agent">
                    <div className="top">
                      <div>
                        <div className="name">{a.name}</div>
                        <div className="area">
                          {a.area} · {roles} papel(is){a.is_active ? "" : " · fase 2"}
                        </div>
                      </div>
                      <span className={`badge b-${st}`}>
                        {working && <span className="dot pulse"></span>}
                        {st}
                      </span>
                    </div>
                    <div className="stats">
                      <div className="stat">
                        <b>{s.total}</b>total
                      </div>
                      <div className="stat">
                        <b>{s.running}</b>rodando
                      </div>
                      <div className="stat">
                        <b>{s.pending}</b>fila
                      </div>
                      <div className="stat">
                        <b>{s.done}</b>ok
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "tasks" && (
          <section>
            <div className="toolbar">
              <select value={fArea} onChange={(e) => setFArea(e.target.value)}>
                <option value="">Todas as áreas</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="">Todos os status</option>
                {["pending", "running", "done", "needs_review", "failed", "cancelled"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="muted">{rows.length} tarefa(s)</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Área</th>
                  <th>Objetivo</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Criada</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="clickable" onClick={() => setOpenTask(t)}>
                    <td>{t.area || <span className="muted">—</span>}</td>
                    <td className="trunc" title={t.objective}>
                      {t.objective}
                    </td>
                    <td>
                      <Badge s={t.status} />
                    </td>
                    <td>{t.priority}</td>
                    <td className="mono">{fmt(t.created_at)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      Nenhuma tarefa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {tab === "aprovacoes" && (
          <section>
            <div className="section-title">Pendentes de aprovação</div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
              {queue.filter((p) => p.status === "pending_approval").map((p) => (
                <ApprovalCard key={p.id} post={p} onStatus={setPostStatus} campaigns={campaigns} />
              ))}
              {pendingCount === 0 && <span className="muted">Nenhum post pendente. 🎉</span>}
            </div>

            <div className="section-title">Recentes</div>
            <table>
              <thead>
                <tr>
                  <th>Tema</th>
                  <th>Legenda</th>
                  <th>Status</th>
                  <th>Campanha</th>
                  <th>Engaj.</th>
                  <th>Post</th>
                </tr>
              </thead>
              <tbody>
                {queue.filter((p) => p.status !== "pending_approval").slice(0, 20).map((p) => {
                  const fbUrl = p.fb_result ? `https://www.facebook.com/${p.fb_result.split("_")[0]}/posts/${p.fb_result.split("_")[1] || ""}` : null;
                  const igUrl = p.ig_result ? "https://instagram.com/nexo.automacao" : null;
                  const campName = p.campaign_id ? campaigns.find((c) => c.id === p.campaign_id)?.name : null;
                  return (
                    <tr key={p.id}>
                      <td>{p.theme}</td>
                      <td className="trunc" title={p.caption || ""}>{p.caption}</td>
                      <td><Badge s={p.status} /></td>
                      <td className="muted">{campName || "—"}</td>
                      <td className="mono">{p.status === "published" ? `❤️ ${(p.likes ?? 0) + (p.fb_likes ?? 0)} · 💬 ${(p.comments ?? 0) + (p.fb_comments ?? 0)}` : "—"}</td>
                      <td>
                        {igUrl && (
                          <a href={igUrl} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>📸 IG</a>
                        )}
                        {fbUrl && (
                          <a href={fbUrl} target="_blank" rel="noreferrer">📘 FB</a>
                        )}
                        {!igUrl && !fbUrl && <span className="muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {queue.filter((p) => p.status !== "pending_approval").length === 0 && (
                  <tr><td colSpan={6} className="muted">Sem histórico ainda.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {tab === "chat" && <ChatTab />}

        {tab === "agentes" && <AgentesTab />}

        {tab === "campanhas" && <CampanhasTab />}

        {tab === "clientes" && <ClientesTab />}

        {tab === "conhecimento" && <ConhecimentoTab />}

        {tab === "metrics" && (
          <section>
            <div className="grid metrics">
              {[
                ["Total de tarefas", tasks.length],
                ["Concluídas", count("done")],
                ["Em execução", count("running")],
                ["Na fila", count("pending")],
                ["Falhas", count("failed")],
                ["Agentes ativos", agents.filter((a) => a.is_active).length],
              ].map(([l, n]) => (
                <div key={l as string} className="card metric">
                  <div className="n">{n as number}</div>
                  <div className="l">{l as string}</div>
                </div>
              ))}
            </div>
            <div className="section-title">Custo de IA (estimado, 24h)</div>
            <div className="grid metrics">
              <div className="card metric">
                <div className="n">${cost.usd.toFixed(2)}</div>
                <div className="l">Custo estimado (24h)</div>
              </div>
              <div className="card metric">
                <div className="n">{cost.ai}</div>
                <div className="l">Respostas de IA (SAC)</div>
              </div>
              <div className="card metric">
                <div className="n">{cost.posts}</div>
                <div className="l">Posts gerados (24h)</div>
              </div>
            </div>
            <div className="section-title">Tarefas por área</div>
            <div className="card" style={{ padding: 16 }}>
              <Bars items={areas.map((a) => [a, tasks.filter((t) => t.area === a).length])} />
            </div>
            <div className="section-title">Tarefas por status</div>
            <div className="card" style={{ padding: 16 }}>
              <Bars
                items={["pending", "running", "done", "needs_review", "failed", "cancelled"].map((s) => [s, count(s)])}
                badge
              />
            </div>
          </section>
        )}
        </main>
      </div>

      <TaskDrawer task={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}

const LEARN_URL = "https://n8nfloripa.floripacloset.com.br/webhook/nexo-aprender";
const MANUAL_URL = "https://n8nfloripa.floripacloset.com.br/webhook/nexo-enviar-manual";
const MANUAL_SECRET = "nx_sac_2f9a7c";

function ConhecimentoTab() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [items, setItems] = useState<Knowledge[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newClient, setNewClient] = useState("");
  const [saving, setSaving] = useState(false);

  const loadClients = useCallback(async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    const list = (data as Client[]) ?? [];
    setClients(list);
    setClientId((prev) => prev || (list[0]?.id ?? ""));
  }, []);

  const loadItems = useCallback(async (cid: string) => {
    if (!cid) return;
    const { data } = await supabase.from("brand_knowledge").select("id,client_id,title,content,created_at").eq("client_id", cid).order("created_at", { ascending: false });
    setItems((data as Knowledge[]) ?? []);
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (clientId) loadItems(clientId);
    const ch = supabase
      .channel("nexo-kb")
      .on("postgres_changes", { event: "*", schema: "public", table: "brand_knowledge" }, () => clientId && loadItems(clientId))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clientId, loadItems]);

  const addKnowledge = async () => {
    if (!clientId || !content.trim()) return;
    setSaving(true);
    try {
      await fetch(LEARN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, title: title || "Sem título", content }),
      });
    } catch (e) {
      /* realtime trará o item */
    }
    setTitle("");
    setContent("");
    setTimeout(() => {
      loadItems(clientId);
      setSaving(false);
    }, 2500);
  };

  const remove = async (id: string) => {
    await supabase.from("brand_knowledge").delete().eq("id", id);
    loadItems(clientId);
  };

  const addClient = async () => {
    if (!newClient.trim()) return;
    const { data } = await supabase.from("clients").insert({ name: newClient }).select().single();
    setNewClient("");
    await loadClients();
    if (data) setClientId((data as Client).id);
  };

  return (
    <section>
      <div className="toolbar">
        <span className="muted">Cliente:</span>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="Novo cliente" style={{ width: 160 }} />
        <button className="ghost" onClick={addClient} disabled={!newClient.trim()}>
          + Cliente
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="section-title" style={{ marginTop: 0 }}>Adicionar conhecimento</div>
          <label>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Tom de voz, FAQ, Preços…" />
          <label>Conteúdo</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} style={{ width: "100%", resize: "vertical" }} placeholder="Cole aqui as informações da marca/cliente…" />
          <div style={{ marginTop: 10 }}>
            <button onClick={addKnowledge} disabled={saving || !content.trim()}>
              {saving ? "Salvando…" : "Salvar na base"}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "auto", maxHeight: 520 }}>
          <div className="section-title" style={{ margin: 14 }}>Base atual ({items.length})</div>
          {items.map((k) => (
            <div key={k.id} style={{ padding: 14, borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{k.title || "Sem título"}</strong>
                <button className="ghost" style={{ padding: "2px 8px" }} onClick={() => remove(k.id)}>
                  Remover
                </button>
              </div>
              <div className="trunc" style={{ maxWidth: "100%", color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{k.content}</div>
            </div>
          ))}
          {items.length === 0 && <div style={{ padding: 14 }} className="muted">Nenhum conhecimento ainda. Adicione ao lado.</div>}
        </div>
      </div>
    </section>
  );
}

function ChatTab() {
  const [convs, setConvs] = useState<InboxConversation[]>([]);
  const [net, setNet] = useState<"all" | "instagram" | "facebook">("all");
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<InboxMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const loadConvs = useCallback(async () => {
    const { data } = await supabase.from("inbox_conversations").select("*").order("last_message_at", { ascending: false }).limit(200);
    setConvs((data as InboxConversation[]) ?? []);
  }, []);

  const loadMsgs = useCallback(async (id: string) => {
    const { data } = await supabase.from("inbox_messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }).limit(500);
    setMsgs((data as InboxMessage[]) ?? []);
  }, []);

  useEffect(() => {
    loadConvs();
    const ch = supabase
      .channel("nexo-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_conversations" }, loadConvs)
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_messages" }, (p: any) => {
        loadConvs();
        const cid = p?.new?.conversation_id ?? p?.old?.conversation_id;
        if (sel && cid === sel) loadMsgs(sel);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadConvs, loadMsgs, sel]);

  useEffect(() => {
    if (sel) loadMsgs(sel);
  }, [sel, loadMsgs]);

  const filtered = convs.filter((c) => net === "all" || c.network === net);
  const selConv = convs.find((c) => c.id === sel) || null;
  const netIcon = (n: string) => (n === "instagram" ? "📸" : n === "facebook" ? "📘" : "💬");

  const send = async () => {
    if (!sel || !reply.trim()) return;
    setSending(true);
    const text = reply;
    setReply("");
    try {
      const r = await fetch(MANUAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: sel, text, secret: MANUAL_SECRET }),
      });
      if (!r.ok) throw new Error("falha ao enviar");
    } catch {
      // fallback: registra localmente para não perder a mensagem digitada
      await supabase.from("inbox_messages").insert({ conversation_id: sel, direction: "out", sender: "human", text });
      await supabase.from("inbox_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", sel);
    }
    await loadMsgs(sel);
    setSending(false);
  };

  const toggleHuman = async () => {
    if (!selConv) return;
    const next = selConv.status === "human" ? "bot" : "human";
    await supabase.from("inbox_conversations").update({ status: next }).eq("id", selConv.id);
    loadConvs();
  };

  return (
    <section>
      <div className="toolbar">
        {(["all", "instagram", "facebook"] as const).map((n) => (
          <button key={n} className={net === n ? "" : "ghost"} onClick={() => setNet(n)}>
            {n === "all" ? "Todas" : n === "instagram" ? "📸 Instagram" : "📘 Facebook"}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 12 }}>
        <div className="card" style={{ padding: 0, overflow: "auto", maxHeight: 560 }}>
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setSel(c.id)}
              className="clickable"
              style={{ padding: 12, borderBottom: "1px solid var(--line)", background: sel === c.id ? "var(--panel2)" : "transparent", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <strong style={{ fontSize: 13 }}>{netIcon(c.network)} {c.name || c.external_id}</strong>
                {c.status === "human" && <span className="badge b-needs_review">humano</span>}
              </div>
              <div className="mono">{fmt(c.last_message_at)}</div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: 12 }} className="muted">Nenhuma conversa.</div>}
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", maxHeight: 560 }}>
          {!selConv ? (
            <div style={{ padding: 16 }} className="muted">Selecione uma conversa à esquerda.</div>
          ) : (
            <>
              <div className="dhead">
                <strong>{netIcon(selConv.network)} {selConv.name || selConv.external_id}</strong>
                <span className={`badge b-${selConv.status === "human" ? "needs_review" : "running"}`}>{selConv.status === "human" ? "humano" : "IA"}</span>
                <div className="spacer"></div>
                <button className="ghost" onClick={toggleHuman}>{selConv.status === "human" ? "Devolver à IA" : "Assumir (humano)"}</button>
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {msgs.map((m) => (
                  <div key={m.id} style={{ alignSelf: m.direction === "in" ? "flex-start" : "flex-end", maxWidth: "75%" }}>
                    <div
                      style={{
                        background: m.direction === "in" ? "var(--panel2)" : m.sender === "ai" ? "rgba(110,168,254,.18)" : "rgba(49,196,141,.18)",
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        padding: "8px 12px",
                        whiteSpace: "pre-wrap",
                        fontSize: 13,
                      }}
                    >
                      {m.text}
                    </div>
                    <div className="mono" style={{ textAlign: m.direction === "in" ? "left" : "right" }}>
                      {m.direction === "in" ? "cliente" : m.sender === "ai" ? "IA" : "você"} · {fmt(m.created_at)}
                    </div>
                  </div>
                ))}
                {msgs.length === 0 && <span className="muted">Sem mensagens.</span>}
              </div>
              <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--line)" }}>
                <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Responder…" style={{ flex: 1 }} />
                <button onClick={send} disabled={sending || !reply.trim()}>
                  Enviar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const RUN_AGENT_URL = "https://n8nfloripa.floripacloset.com.br/webhook/nexo-run-agent";

function AgentesTab() {
  const [items, setItems] = useState<Agent[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Agent>>({});
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("agents").select("*").order("kind", { ascending: false }).order("name");
    setItems((data as Agent[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const selAgent = items.find((a) => a.id === sel) || null;
  useEffect(() => {
    if (sel) {
      setForm(selAgent ? { ...selAgent } : {});
      supabase.from("agent_runs").select("*").eq("agent_id", sel).order("created_at", { ascending: false }).limit(5).then(({ data }) => setRuns((data as AgentRun[]) ?? []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  const editing = sel !== null || form.name !== undefined;
  const isCustom = form.kind === "custom" || (!sel && form.name !== undefined);

  const novo = () => {
    setSel(null);
    setRuns([]);
    setForm({ name: "", kind: "custom", is_active: true, run_freq: "off", run_hour: 9, system_prompt: "", description: "", objective: "" });
  };

  const save = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    const payload: any = {
      name: form.name,
      description: form.description || null,
      system_prompt: form.system_prompt || null,
      is_active: form.is_active ?? true,
      objective: form.objective || null,
      run_freq: form.run_freq || "off",
      run_hour: form.run_hour ?? 9,
    };
    if (sel) {
      await supabase.from("agents").update(payload).eq("id", sel);
    } else {
      payload.kind = "custom";
      payload.slug = "custom-" + (form.name || "agente").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36) + "-" + Math.random().toString(36).slice(2, 6);
      payload.status = "idle";
      const { data } = await supabase.from("agents").insert(payload).select("id").single();
      if (data) setSel((data as any).id);
    }
    await load();
    setSaving(false);
  };

  const runNow = async () => {
    if (!sel) return;
    setRunning(true);
    try {
      await fetch(RUN_AGENT_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agent_id: sel }) });
    } catch {}
    setTimeout(async () => {
      const { data } = await supabase.from("agent_runs").select("*").eq("agent_id", sel).order("created_at", { ascending: false }).limit(5);
      setRuns((data as AgentRun[]) ?? []);
      setRunning(false);
    }, 6000);
  };

  const ta = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--txt)", fontSize: 13, fontFamily: "inherit" } as const;
  const kindLabel = (k: string) => (k === "orchestrator" ? "Orquestrador" : k === "custom" ? "Custom" : "Subagente");

  return (
    <section>
      <div className="toolbar">
        <button onClick={novo}>+ Novo agente</button>
        <span className="muted">Veja funções e prompts, edite o comportamento e crie agentes com agendamento.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 12 }}>
        <div className="card" style={{ padding: 0, overflow: "auto", maxHeight: 640 }}>
          {items.map((a) => (
            <div key={a.id} onClick={() => setSel(a.id)} className="clickable" style={{ padding: 12, borderBottom: "1px solid var(--line)", background: sel === a.id ? "var(--panel2)" : "transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                <strong style={{ fontSize: 13 }}>{a.name}</strong>
                <span className={`badge b-${a.is_active ? "running" : "offline"}`}>{a.is_active ? "ativo" : "off"}</span>
              </div>
              <div className="mono">{kindLabel(a.kind)}{a.area ? " · " + a.area : ""}</div>
            </div>
          ))}
          {items.length === 0 && <div style={{ padding: 12 }} className="muted">Nenhum agente.</div>}
        </div>

        <div className="card" style={{ padding: 16 }}>
          {!editing ? (
            <div className="muted">Selecione um agente à esquerda ou clique em “Novo agente”.</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
                <div>
                  <label>Nome</label>
                  <input value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, whiteSpace: "nowrap" }}>
                  <input type="checkbox" style={{ width: "auto" }} checked={form.is_active ?? true} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Ativo
                </label>
              </div>
              <label>Função</label>
              <input value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="O que este agente faz" />
              <label>Prompt (comportamento)</label>
              <textarea value={form.system_prompt || ""} onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))} rows={8} style={ta} placeholder="Instruções que definem como o agente age…" />

              {isCustom && (
                <>
                  <label>Objetivo (o que produzir a cada execução)</label>
                  <textarea value={form.objective || ""} onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))} rows={3} style={ta} placeholder="Ex.: Gere 3 ideias de post sobre automação para esta semana." />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label>Agendamento</label>
                      <select value={form.run_freq || "off"} onChange={(e) => setForm((f) => ({ ...f, run_freq: e.target.value }))}>
                        <option value="off">Sob demanda (só Rodar agora)</option>
                        <option value="daily">Todo dia</option>
                        <option value="hourly">A cada hora</option>
                      </select>
                    </div>
                    {form.run_freq === "daily" && (
                      <div>
                        <label>Hora (0–23)</label>
                        <input type="number" min={0} max={23} value={form.run_hour ?? 9} onChange={(e) => setForm((f) => ({ ...f, run_hour: Number(e.target.value) }))} />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={save} disabled={saving || !form.name?.trim()}>{sel ? "Salvar" : "Criar agente"}</button>
                {sel && <button className="ghost" onClick={runNow} disabled={running}>{running ? "Rodando…" : "▶ Rodar agora"}</button>}
                {form.last_run && <span className="muted" style={{ fontSize: 12 }}>Última execução: {fmt(form.last_run)}</span>}
              </div>

              {sel && runs.length > 0 && (
                <>
                  <div className="section-title">Últimas execuções</div>
                  {runs.map((r) => (
                    <div key={r.id} className="result" style={{ marginBottom: 8 }}>
                      <div className="mono" style={{ marginBottom: 6 }}>{fmt(r.created_at)}</div>
                      {r.output}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ClientesTab() {
  const [items, setItems] = useState<Client[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    setItems((data as Client[]) ?? []);
    const { data: k } = await supabase.from("knowledge").select("client_id");
    const c: Record<string, number> = {};
    (k ?? []).forEach((x: any) => {
      if (x.client_id) c[x.client_id] = (c[x.client_id] || 0) + 1;
    });
    setCounts(c);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selClient = items.find((c) => c.id === sel) || null;
  useEffect(() => {
    if (sel) setForm(selClient ? { ...selClient } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  const editing = sel !== null || form.name !== undefined;

  const novo = () => {
    setSel(null);
    setForm({ name: "", status: "active" });
  };

  const save = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name,
      ig_handle: form.ig_handle || null,
      fb_page: form.fb_page || null,
      status: form.status || "active",
      brand_brief: form.brand_brief || null,
      notes: form.notes || null,
    };
    if (sel) {
      await supabase.from("clients").update(payload).eq("id", sel);
    } else {
      const { data } = await supabase.from("clients").insert(payload).select("id").single();
      if (data) setSel((data as any).id);
    }
    await load();
    setSaving(false);
  };

  const ta = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--txt)", fontSize: 13, fontFamily: "inherit" } as const;

  return (
    <section>
      <div className="toolbar">
        <button onClick={novo}>+ Novo cliente</button>
        <span className="muted">Agência multi-cliente — cada cliente com brief, redes e base de conhecimento próprios.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12 }}>
        <div className="card" style={{ padding: 0, overflow: "auto", maxHeight: 560 }}>
          {items.map((c) => (
            <div key={c.id} onClick={() => setSel(c.id)} className="clickable" style={{ padding: 12, borderBottom: "1px solid var(--line)", background: sel === c.id ? "var(--panel2)" : "transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <strong style={{ fontSize: 13 }}>{c.name}</strong>
                <span className={`badge b-${c.status === "active" ? "running" : "cancelled"}`}>{c.status || "active"}</span>
              </div>
              <div className="mono">{c.ig_handle || c.fb_page || "sem redes"} · {counts[c.id] || 0} conh.</div>
            </div>
          ))}
          {items.length === 0 && <div style={{ padding: 12 }} className="muted">Nenhum cliente.</div>}
        </div>
        <div className="card" style={{ padding: 16 }}>
          {!editing ? (
            <div className="muted">Selecione um cliente à esquerda ou clique em “Novo cliente”.</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label>Nome</label>
                  <input value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label>Status</label>
                  <select value={form.status || "active"} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
                <div>
                  <label>Instagram (@)</label>
                  <input value={form.ig_handle || ""} onChange={(e) => setForm((f) => ({ ...f, ig_handle: e.target.value }))} placeholder="@cliente" />
                </div>
                <div>
                  <label>Página do Facebook</label>
                  <input value={form.fb_page || ""} onChange={(e) => setForm((f) => ({ ...f, fb_page: e.target.value }))} placeholder="Nome/ID da página" />
                </div>
              </div>
              <label style={{ marginTop: 12 }}>Brief da marca</label>
              <textarea value={form.brand_brief || ""} onChange={(e) => setForm((f) => ({ ...f, brand_brief: e.target.value }))} rows={8} style={ta} placeholder="Perfil, público, tom de voz, temas recorrentes, o que evitar…" />
              <label style={{ marginTop: 12 }}>Notas internas</label>
              <textarea value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} style={ta} />
              <div style={{ marginTop: 12 }}>
                <button onClick={save} disabled={saving || !form.name?.trim()}>{sel ? "Salvar alterações" : "Criar cliente"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

type CampStat = { posts: number; published: number; likes: number; comments: number };
function CampanhasTab() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Record<string, CampStat>>({});
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    setItems((data as Campaign[]) ?? []);
    const { data: pq } = await supabase.from("post_queue").select("campaign_id,status,likes,comments,fb_likes,fb_comments");
    const c: Record<string, CampStat> = {};
    (pq ?? []).forEach((p: any) => {
      if (!p.campaign_id) return;
      const s = c[p.campaign_id] || { posts: 0, published: 0, likes: 0, comments: 0 };
      s.posts++;
      if (p.status === "published") s.published++;
      s.likes += (p.likes || 0) + (p.fb_likes || 0);
      s.comments += (p.comments || 0) + (p.fb_comments || 0);
      c[p.campaign_id] = s;
    });
    setStats(c);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from("campaigns").insert({ name, objective: objective || null, starts_on: starts || null, ends_on: ends || null });
    setName("");
    setObjective("");
    setStarts("");
    setEnds("");
    await load();
    setSaving(false);
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("campaigns").update({ status }).eq("id", id);
    load();
  };

  return (
    <section>
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Nova campanha</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Lançamento Ferramenta X" />
          </div>
          <div>
            <label>Objetivo</label>
            <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex.: gerar leads / awareness" />
          </div>
          <div>
            <label>Início</label>
            <input type="date" value={starts} onChange={(e) => setStarts(e.target.value)} />
          </div>
          <div>
            <label>Fim</label>
            <input type="date" value={ends} onChange={(e) => setEnds(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={create} disabled={saving || !name.trim()}>Criar campanha</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Campanha</th>
            <th>Objetivo</th>
            <th>Período</th>
            <th>Posts</th>
            <th>Publicados</th>
            <th>Engajamento</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => {
            const s = stats[c.id] || { posts: 0, published: 0, likes: 0, comments: 0 };
            return (
            <tr key={c.id}>
              <td><strong>{c.name}</strong></td>
              <td className="muted">{c.objective || "—"}</td>
              <td className="mono">{c.starts_on || "—"} → {c.ends_on || "—"}</td>
              <td>{s.posts}</td>
              <td>{s.published}</td>
              <td className="mono">❤️ {s.likes} · 💬 {s.comments}</td>
              <td><span className={`badge b-${c.status === "active" ? "running" : "cancelled"}`}>{c.status}</span></td>
              <td>
                <button className="ghost" onClick={() => setStatus(c.id, c.status === "active" ? "archived" : "active")}>
                  {c.status === "active" ? "Arquivar" : "Reativar"}
                </button>
              </td>
            </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">Nenhuma campanha ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

const REGEN_URL = "https://n8nfloripa.floripacloset.com.br/webhook/nexo-regen-imagem";

function ApprovalCard({ post, onStatus, campaigns }: { post: PostQueue; onStatus: (id: string, s: string) => void; campaigns: Campaign[] }) {
  const [caption, setCaption] = useState(post.caption || "");
  const [regenPrompt, setRegenPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [regen, setRegen] = useState(false);
  const [imgUrl, setImgUrl] = useState(post.image_url);
  const [campaignId, setCampaignId] = useState(post.campaign_id || "");

  useEffect(() => {
    setCaption(post.caption || "");
  }, [post.caption]);

  useEffect(() => {
    setImgUrl(post.image_url);
  }, [post.image_url]);

  useEffect(() => {
    setCampaignId(post.campaign_id || "");
  }, [post.campaign_id]);

  const setCampaign = async (val: string) => {
    setCampaignId(val);
    await supabase.from("post_queue").update({ campaign_id: val || null }).eq("id", post.id);
  };

  const saveCaption = async () => {
    setSaving(true);
    await supabase.from("post_queue").update({ caption }).eq("id", post.id);
    setSaving(false);
  };

  const regenerate = async () => {
    setRegen(true);
    const before = post.image_url;
    try {
      await fetch(REGEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id, prompt: regenPrompt }),
      });
    } catch (e) {
      /* segue e busca a nova imagem abaixo */
    }
    let tries = 0;
    const iv = setInterval(async () => {
      tries++;
      const { data } = await supabase.from("post_queue").select("image_url").eq("id", post.id).single();
      const url = (data as { image_url: string | null } | null)?.image_url ?? null;
      if (url && url !== before) {
        setImgUrl(url);
        setRegen(false);
        clearInterval(iv);
      } else if (tries >= 10) {
        setRegen(false);
        clearInterval(iv);
      }
    }, 3000);
  };

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {post.type === "reel" && post.video_url ? (
        <video src={post.video_url} controls playsInline style={{ width: "100%", display: "block", borderBottom: "1px solid var(--line)", background: "#000", maxHeight: 480 }} />
      ) : post.type === "carousel" && post.images && post.images.length > 0 ? (
        <div style={{ display: "flex", overflowX: "auto", gap: 4, borderBottom: "1px solid var(--line)", background: "#000" }}>
          {post.images.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt={`slide ${i + 1}`} style={{ height: 260, width: "auto", flex: "0 0 auto" }} />
          ))}
        </div>
      ) : imgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl}
          alt={post.theme || "post"}
          style={{ width: "100%", display: "block", borderBottom: "1px solid var(--line)", opacity: regen ? 0.4 : 1, transition: "opacity .3s" }}
        />
      ) : null}
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          {post.type === "carousel" && <span className="badge b-approved">🎠 Carrossel {post.images?.length || ""}</span>}
          {post.type === "reel" && <span className="badge b-approved">🎬 Reels</span>}
          <span className="badge b-running">{post.theme || "Post"}</span>
          <span className="mono">{fmt(post.scheduled_for)}</span>
        </div>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} style={{ width: "100%", resize: "vertical", fontSize: 13 }} />
        <div style={{ marginTop: 6 }}>
          <button className="ghost" onClick={saveCaption} disabled={saving || caption === (post.caption || "")}>
            {saving ? "Salvando…" : "Salvar legenda"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <input
            value={regenPrompt}
            onChange={(e) => setRegenPrompt(e.target.value)}
            placeholder="Ajuste da imagem (opcional)"
            style={{ flex: 1, fontSize: 12 }}
          />
          <button className="ghost" onClick={regenerate} disabled={regen}>
            {regen ? "Gerando…" : "🔄 Imagem"}
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 11 }}>Campanha</label>
          <select value={campaignId} onChange={(e) => setCampaign(e.target.value)}>
            <option value="">— sem campanha —</option>
            {campaigns.filter((c) => c.status === "active").map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={{ flex: 1, background: "var(--green)", color: "#04140c" }} onClick={() => onStatus(post.id, "approved")}>
            ✅ Aprovar
          </button>
          <button className="ghost" style={{ flex: 1 }} onClick={() => onStatus(post.id, "rejected")}>
            ❌ Recusar
          </button>
        </div>
      </div>
    </div>
  );
}

function Bars({ items, badge }: { items: [string, number][]; badge?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i[1]));
  if (items.length === 0) return <span className="muted">Sem dados.</span>;
  return (
    <>
      {items.map(([lbl, n]) => (
        <div key={lbl} className="barrow">
          <div className="lbl">{badge ? <Badge s={lbl} /> : lbl}</div>
          <div className="bartrack">
            <div className="barfill" style={{ width: `${(n / max) * 100}%` }}></div>
          </div>
          <div className="muted">{n}</div>
        </div>
      ))}
    </>
  );
}

function TaskDrawer({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!task) return;
    setLoading(true);
    Promise.all([
      supabase.from("task_logs").select("*").eq("task_id", task.id).order("created_at", { ascending: true }),
      supabase.from("results").select("*").eq("task_id", task.id).order("created_at", { ascending: false }),
    ]).then(([l, r]) => {
      setLogs((l.data as TaskLog[]) ?? []);
      setResults((r.data as Result[]) ?? []);
      setLoading(false);
    });
  }, [task]);

  return (
    <>
      <div className={`${"" } ${task ? "open" : ""}`} id="backdrop" onClick={onClose}></div>
      <div id="drawer" className={task ? "open" : ""}>
        <div className="dhead">
          <strong>{task?.area ? task.area + " · " : ""}Tarefa</strong>
          {task && <Badge s={task.status} />}
          <div className="spacer"></div>
          <button className="ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="dbody">
          {!task ? null : loading ? (
            <span className="muted">Carregando…</span>
          ) : (
            <>
              <div className="muted">Objetivo</div>
              <div style={{ margin: "6px 0 4px" }}>{task.objective}</div>
              <div className="mono">id {task.id}</div>

              <div className="section-title">Timeline</div>
              <div className="timeline">
                {logs.length ? (
                  logs.map((l) => (
                    <div key={l.id} className="tl">
                      <div>{l.message}</div>
                      <div className="t">
                        {fmt(l.created_at)} · {l.level}
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="muted">Sem eventos.</span>
                )}
              </div>

              <div className="section-title">Resultado</div>
              {results.length ? (
                results.map((r) => (
                  <div key={r.id} className="result">
                    {r.content}
                  </div>
                ))
              ) : (
                <span className="muted">Sem resultado ainda.</span>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
