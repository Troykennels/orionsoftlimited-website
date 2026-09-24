import { useCallback, useEffect, useRef, useState } from "react";
import { Hash, Plus, Send, ArrowLeft, Lock, PenSquare } from "lucide-react";
import { C, font } from "../theme.js";
import { api, timeAgo, waLink, firstName } from "../api.js";
import { Avatar, Btn, Input, Textarea, Modal, Select, EmptyState, RichText, Field, toast } from "../components.jsx";
import { useOffice } from "../office.js";

function dayLabel(iso) {
  const d = new Date(iso), t = new Date();
  const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "short" });
}

function Conversation({ convo, onBack, onSent }) {
  const { me, person, directory, openPerson } = useOffice();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef(null);
  const lastAt = useRef("");

  const load = useCallback(async (incremental) => {
    try {
      const j = await api(`/api/staff/messages?channel=${encodeURIComponent(convo.id)}${incremental && lastAt.current ? `&since=${encodeURIComponent(lastAt.current)}` : ""}`);
      if (j.messages.length) lastAt.current = j.messages[j.messages.length - 1].at;
      setMessages(prev => incremental ? [...prev, ...j.messages.filter(m => !prev.some(p => p.id === m.id))] : j.messages);
    } catch (e) { if (!incremental) toast(e.message, "err"); }
  }, [convo.id]);

  useEffect(() => {
    lastAt.current = "";
    const first = setTimeout(() => load(false), 0);
    const t = setInterval(() => load(true), 5000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const j = await api("/api/staff/messages", { method: "POST", body: { channel: convo.id, text: body } });
      setMessages(prev => [...prev, j.message]);
      lastAt.current = j.message.at;
      setText(""); onSent();
    } catch (e) { toast(e.message, "err"); } finally { setSending(false); }
  }

  const partner = convo.partnerId ? person(convo.partnerId) : null;

  return (
    <div className="so-chat-pane" style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
        <button type="button" onClick={onBack} aria-label="Back to conversations" className="so-menu-btn" style={{ background: "none", border: "none", color: C.text, cursor: "pointer", padding: 4 }}><ArrowLeft size={18} /></button>
        {partner ? (
          <>
            <button type="button" onClick={() => openPerson(partner.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}><Avatar src={partner.avatarDataUrl} name={partner.fullName} size={34} presence={partner.presence?.status} /></button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: C.heading, fontSize: 14.5 }}>{partner.fullName}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{partner.roleLabel}</div>
            </div>
            {partner.whatsapp && <a href={waLink(partner.whatsapp, `Hi ${firstName(partner.fullName)}, `)} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn small variant="ghost" style={{ color: "#25D366", borderColor: "#25D36655" }}>WhatsApp</Btn></a>}
          </>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: C.heading, fontSize: 14.5, display: "flex", alignItems: "center", gap: 6 }}>{convo.private ? <Lock size={14} /> : <Hash size={15} />}{convo.name}</div>
            {convo.topic && <div style={{ fontSize: 12, color: C.textMuted }}>{convo.topic}</div>}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", minHeight: 280, maxHeight: "calc(100vh - 290px)" }}>
        {messages.length === 0 && <EmptyState>No messages yet. Say hello 👋</EmptyState>}
        {messages.map((m, i) => {
          const a = person(m.authorId);
          const day = dayLabel(m.at);
          const showDay = i === 0 || dayLabel(messages[i - 1].at) !== day;
          const grouped = !showDay && i > 0 && messages[i - 1].authorId === m.authorId && Date.parse(m.at) - Date.parse(messages[i - 1].at) < 5 * 60000;
          return (
            <div key={m.id}>
              {showDay && <div style={{ textAlign: "center", fontSize: 11.5, color: C.textMuted, fontWeight: 700, margin: "12px 0" }}>{day}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: grouped ? 2 : 12 }}>
                <div style={{ width: 34, flexShrink: 0 }}>{!grouped && <Avatar src={a.avatarDataUrl} name={a.fullName} size={34} />}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {!grouped && <div style={{ fontSize: 13, fontWeight: 800, color: m.authorId === me.id ? C.gold : C.heading }}>{a.fullName} <span style={{ fontWeight: 500, fontSize: 11.5, color: C.textMuted }}>{new Date(m.at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</span></div>}
                  <RichText text={m.text} directory={directory} onMention={openPerson} style={{ fontSize: 14, color: C.text }} />
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div style={{ padding: 12, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "flex-end" }}>
        <Textarea value={text} onChange={e => setText(e.target.value)} placeholder={partner ? `Message ${firstName(partner.fullName)}` : `Message #${convo.name}`} style={{ minHeight: 44, maxHeight: 160 }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} aria-label="Message" />
        <Btn icon={Send} onClick={send} disabled={sending || !text.trim()}>Send</Btn>
      </div>
    </div>
  );
}

export default function Messages({ param }) {
  const { me, person, directory, navigate } = useOffice();
  const [data, setData] = useState({ channels: [], dms: [] });
  const [newDm, setNewDm] = useState(false);
  const [newCh, setNewCh] = useState(false);
  const [ch, setCh] = useState({ name: "", topic: "", private: false, memberIds: [] });

  const load = useCallback(() => api("/api/staff/messages").then(setData).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const active = param ? (data.channels.find(c => c.id === param) || data.dms.find(d => d.id === param) || (param.startsWith("dm--") ? { id: param, partnerId: param.slice(4).split("--").find(x => x !== me.id) } : null)) : null;

  async function startDm(partnerId) {
    try { const j = await api("/api/staff/messages", { method: "POST", body: { action: "open-dm", partnerId } }); setNewDm(false); await load(); navigate("messages", j.id); }
    catch (e) { toast(e.message, "err"); }
  }
  async function createChannel() {
    try { const j = await api("/api/staff/messages", { method: "POST", body: { action: "create-channel", ...ch } }); setNewCh(false); setCh({ name: "", topic: "", private: false, memberIds: [] }); await load(); navigate("messages", j.channel.id); }
    catch (e) { toast(e.message, "err"); }
  }

  const row = (id, content, unread) => (
    <button key={id} type="button" onClick={() => navigate("messages", id)} className="so-row" style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px", border: "none", borderRadius: 9, cursor: "pointer", textAlign: "left", fontFamily: font, background: active?.id === id ? C.goldDim : "none", color: unread ? C.heading : C.text, fontWeight: unread ? 800 : 600 }}>
      {content}
      {unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.rose, flexShrink: 0 }} aria-label="unread" />}
    </button>
  );

  return (
    <div>
      <div className={`so-chat so-card ${active ? "has-active" : ""}`} style={{ border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div className="so-chat-list" style={{ borderRight: `1px solid ${C.border}`, padding: 10, overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <Btn small icon={PenSquare} onClick={() => setNewDm(true)} style={{ flex: 1 }}>New message</Btn>
            <Btn small variant="ghost" icon={Plus} onClick={() => setNewCh(true)} title="New channel" />
          </div>
          <div className="so-nav-group" style={{ margin: "8px 6px" }}>CHANNELS</div>
          {data.channels.map(c => row(c.id, <><span style={{ color: C.textMuted, display: "flex" }}>{c.private ? <Lock size={14} /> : <Hash size={15} />}</span><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13.5 }}>{c.name}</span></>, c.unread))}
          <div className="so-nav-group" style={{ margin: "14px 6px 8px" }}>DIRECT MESSAGES</div>
          {data.dms.length === 0 && <div style={{ fontSize: 12.5, color: C.textMuted, padding: "4px 10px" }}>No conversations yet.</div>}
          {data.dms.map(d => {
            const p = person(d.partnerId);
            return row(d.id, <><Avatar src={p.avatarDataUrl} name={p.fullName} size={26} presence={p.presence?.status} /><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.fullName}</span>{d.preview && <span style={{ display: "block", fontSize: 11.5, color: C.textMuted, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.preview} · {timeAgo(d.lastAt)}</span>}</span></>, d.unread);
          })}
        </div>
        {active ? <Conversation key={active.id} convo={active} onBack={() => navigate("messages")} onSent={load} /> : (
          <div className="so-chat-pane" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 30 }}>
            <EmptyState>Pick a channel or colleague to start chatting.<br />Tip: your daily standup posts automatically to your team channel.</EmptyState>
          </div>
        )}
      </div>

      {newDm && (
        <Modal title="New message" onClose={() => setNewDm(false)} width={460}>
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {directory.filter(p => p.id !== me.id).map(p => (
              <button key={p.id} type="button" onClick={() => startDm(p.id)} className="so-row" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 8px", border: "none", background: "none", cursor: "pointer", borderRadius: 9, fontFamily: font, textAlign: "left" }}>
                <Avatar src={p.avatarDataUrl} name={p.fullName} size={34} presence={p.presence?.status} />
                <div><div style={{ fontSize: 14, fontWeight: 700, color: C.heading }}>{p.fullName}</div><div style={{ fontSize: 12, color: C.textMuted }}>{p.roleLabel} · {p.department || "—"}</div></div>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {newCh && (
        <Modal title="Create a channel" onClose={() => setNewCh(false)} width={480}>
          <Field label="Name" style={{ marginBottom: 12 }}><Input value={ch.name} onChange={e => setCh(c => ({ ...c, name: e.target.value }))} placeholder="e.g. carecore-rollout" /></Field>
          <Field label="Topic (optional)" style={{ marginBottom: 12 }}><Input value={ch.topic} onChange={e => setCh(c => ({ ...c, topic: e.target.value }))} /></Field>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.text, marginBottom: 12 }}><input type="checkbox" checked={ch.private} onChange={e => setCh(c => ({ ...c, private: e.target.checked }))} /> Private (invite-only)</label>
          {ch.private && (
            <Field label="Members" style={{ marginBottom: 12 }}>
              <Select multiple value={ch.memberIds} onChange={e => setCh(c => ({ ...c, memberIds: [...e.target.selectedOptions].map(o => o.value) }))} style={{ minHeight: 140 }}>
                {directory.filter(p => p.id !== me.id).map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </Select>
            </Field>
          )}
          <Btn onClick={createChannel} disabled={!ch.name.trim()}>Create channel</Btn>
        </Modal>
      )}
    </div>
  );
}
