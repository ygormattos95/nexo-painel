"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase, Agent, Task, TaskLog, Result, PostQueue, InboxConversation, InboxMessage, Client, Knowledge, Campaign } from "@/lib/supabase";

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
  const [tab, setTab] = useState<"overview" | "tasks" | "metrics" | "aprovacoes" | "chat" | "conhecimento" | "campanhas" | "clientes">("overview");
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
        {(["overview", "tasks", "aprovacoes", "chat", "conhecimento", "campanhas", "clientes", "metrics"] as const).map((t) => (
          <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "overview"
              ? "Visão Geral"
              : t === "tasks"
              ? "Tarefas"
              : t === "aprovacoes"
              ? `Aprovações${pendingCount ? ` (${pendingCount})` : ""}`
              : t === "chat"
              ? "Chat"
              : t === "conhecimento"
              ? "Conhecimento"
              : t === "campanhas"
              ? "Campanhas"
              : t === "clientes"
              ? "Clientes"
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
                <ApprovalCard key={p.id} post={p} onStatus={setPostStatus} />
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
                  <th>Post</th>
                </tr>
              </thead>
              <tbody>
                {queue.filter((p) => p.status !== "pending_approval").slice(0, 20).map((p) => {
                  const fbUrl = p.fb_result ? `https://www.facebook.com/${p.fb_result.split("_")[0]}/posts/${p.fb_result.split("_")[1] || ""}` : null;
                  const igUrl = p.ig_result ? "https://instagram.com/nexo.automacao" : null;
                  return (
                    <tr key={p.id}>
                      <td>{p.theme}</td>
                      <td className="trunc" title={p.caption || ""}>{p.caption}</td>
                      <td><Badge s={p.status} /></td>
                      <td className="mono">{fmt(p.scheduled_for)}</td>
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
                  <tr><td colSpan={5} className="muted">Sem histórico ainda.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {tab === "chat" && <ChatTab />}

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

function CampanhasTab() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    setItems((data as Campaign[]) ?? []);
    const { data: pq } = await supabase.from("post_queue").select("campaign_id");
    const c: Record<string, number> = {};
    (pq ?? []).forEach((p: any) => {
      if (p.campaign_id) c[p.campaign_id] = (c[p.campaign_id] || 0) + 1;
    });
    setCounts(c);
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
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td><strong>{c.name}</strong></td>
              <td className="muted">{c.objective || "—"}</td>
              <td className="mono">{c.starts_on || "—"} → {c.ends_on || "—"}</td>
              <td>{counts[c.id] || 0}</td>
              <td><span className={`badge b-${c.status === "active" ? "running" : "cancelled"}`}>{c.status}</span></td>
              <td>
                <button className="ghost" onClick={() => setStatus(c.id, c.status === "active" ? "archived" : "active")}>
                  {c.status === "active" ? "Arquivar" : "Reativar"}
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">Nenhuma campanha ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

const REGEN_URL = "https://n8nfloripa.floripacloset.com.br/webhook/nexo-regen-imagem";

function ApprovalCard({ post, onStatus }: { post: PostQueue; onStatus: (id: string, s: string) => void }) {
  const [caption, setCaption] = useState(post.caption || "");
  const [regenPrompt, setRegenPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [regen, setRegen] = useState(false);
  const [imgUrl, setImgUrl] = useState(post.image_url);

  useEffect(() => {
    setCaption(post.caption || "");
  }, [post.caption]);

  useEffect(() => {
    setImgUrl(post.image_url);
  }, [post.image_url]);

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
      {imgUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl}
          alt={post.theme || "post"}
          style={{ width: "100%", display: "block", borderBottom: "1px solid var(--line)", opacity: regen ? 0.4 : 1, transition: "opacity .3s" }}
        />
      )}
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
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
