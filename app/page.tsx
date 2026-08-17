"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase, Agent, Task, TaskLog, Result, PostQueue } from "@/lib/supabase";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const Badge = ({ s }: { s: string }) => <span className={`badge b-${s}`}>{s}</span>;

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
  const [tab, setTab] = useState<"overview" | "tasks" | "metrics" | "aprovacoes">("overview");
  const [fArea, setFArea] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [queue, setQueue] = useState<PostQueue[]>([]);

  const load = useCallback(async () => {
    const [{ data: a }, { data: t }, { data: q }] = await Promise.all([
      supabase.from("agents").select("*").order("kind", { ascending: false }).order("area", { nullsFirst: true }),
      supabase.from("tasks").select("id,area,status,priority,objective,created_at,parent_task_id").order("created_at", { ascending: false }).limit(300),
      supabase.from("post_queue").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setAgents((a as Agent[]) ?? []);
    setTasks((t as Task[]) ?? []);
    setQueue((q as PostQueue[]) ?? []);
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
    <div>
      <header>
        <div className="brand">
          Nexo <span>Painel</span>
        </div>
        <span className="badge b-working">
          <span className="dot pulse"></span>ao vivo
        </span>
        <div className="spacer"></div>
        <span className="who">{userEmail}</span>
        <button className="ghost" onClick={load}>
          Atualizar
        </button>
        <button className="ghost" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </header>

      <div className="tabs">
        {(["overview", "tasks", "aprovacoes", "metrics"] as const).map((t) => (
          <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "overview"
              ? "Visão Geral"
              : t === "tasks"
              ? "Tarefas"
              : t === "aprovacoes"
              ? `Aprovações${pendingCount ? ` (${pendingCount})` : ""}`
              : "Métricas"}
          </div>
        ))}
      </div>

      <main>
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
                <div key={p.id} className="card" style={{ overflow: "hidden" }}>
                  {p.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.theme || "post"} style={{ width: "100%", display: "block", borderBottom: "1px solid var(--line)" }} />
                  )}
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <span className="badge b-running">{p.theme || "Post"}</span>
                      <span className="mono">{fmt(p.scheduled_for)}</span>
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 13, maxHeight: 160, overflow: "auto" }}>{p.caption}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button style={{ flex: 1, background: "var(--green)", color: "#04140c" }} onClick={() => setPostStatus(p.id, "approved")}>
                        ✅ Aprovar
                      </button>
                      <button className="ghost" style={{ flex: 1 }} onClick={() => setPostStatus(p.id, "rejected")}>
                        ❌ Recusar
                      </button>
                    </div>
                  </div>
                </div>
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
                  <th>Agendado</th>
                </tr>
              </thead>
              <tbody>
                {queue.filter((p) => p.status !== "pending_approval").slice(0, 20).map((p) => (
                  <tr key={p.id}>
                    <td>{p.theme}</td>
                    <td className="trunc" title={p.caption || ""}>{p.caption}</td>
                    <td><Badge s={p.status} /></td>
                    <td className="mono">{fmt(p.scheduled_for)}</td>
                  </tr>
                ))}
                {queue.filter((p) => p.status !== "pending_approval").length === 0 && (
                  <tr><td colSpan={4} className="muted">Sem histórico ainda.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        )}

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

      <TaskDrawer task={openTask} onClose={() => setOpenTask(null)} />
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
