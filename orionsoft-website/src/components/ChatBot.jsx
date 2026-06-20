import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  bg: "#060810", surface: "#0B1120", card: "#0F1828",
  border: "rgba(255,255,255,0.07)", white: "#FFFFFF",
  heading: "#F2F6FF", text: "#C8D0E0", textMuted: "#6B7A96",
  gold: "#C8A850", goldDim: "rgba(200,168,80,0.12)",
  blue: "#4F8EF7", mint: "#10B981", rose: "#F43F5E",
};
const font = "'Instrument Sans', 'DM Sans', system-ui, sans-serif";
const CONV_SK = "orionsoft_conversations_v1";
const HIST_SK = "orionsoft_chat_history_v1";
const API_URL = "/api/chat";

const QUICK_REPLIES = [
  "What products do you offer?",
  "I manage a hospital",
  "I run a school",
  "Book a demo",
  "What's the pricing?",
];

const LEAD_FIELDS = [
  { key: "name",  label: "Your full name",       type: "text",  placeholder: "John Okafor" },
  { key: "email", label: "Email address",         type: "email", placeholder: "john@company.com" },
  { key: "phone", label: "Phone number",          type: "tel",   placeholder: "08012345678" },
  { key: "org",   label: "Organisation name",     type: "text",  placeholder: "Faith General Hospital" },
];

const DEMO_SLOTS = [
  "Tomorrow morning (9am–12pm)",
  "Tomorrow afternoon (1pm–5pm)",
  "This week — any time",
  "Next week — I'll confirm",
];

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function saveConversation(session) {
  try {
    const raw = localStorage.getItem(CONV_SK);
    const convs = raw ? JSON.parse(raw) : [];
    const idx = convs.findIndex(c => c.id === session.id);
    if (idx >= 0) convs[idx] = session;
    else convs.unshift(session);
    if (convs.length > 200) convs.length = 200;
    localStorage.setItem(CONV_SK, JSON.stringify(convs));
    window.dispatchEvent(new Event("localstoreupdate"));
  } catch {}
}

function loadHistory() {
  try { const r = localStorage.getItem(HIST_SK); return r ? JSON.parse(r) : []; } catch { return []; }
}

function saveHistory(msgs) {
  try { localStorage.setItem(HIST_SK, JSON.stringify(msgs.slice(-50))); } catch {}
}

export default function ChatBot({ setCurrentPage }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadHistory());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(genId);
  const [sessionStart] = useState(() => new Date().toISOString());
  const [lead, setLead] = useState({});
  const [hasNew, setHasNew] = useState(false);
  // UI flow state
  const [flowState, setFlowState] = useState(null); // null | "BOOK_DEMO" | "COLLECT_LEAD" | "ESCALATE" | "DEMO_SLOT" | "DONE"
  const [leadStep, setLeadStep] = useState(0);
  const [leadInput, setLeadInput] = useState("");
  const [demoProduct, setDemoProduct] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sessionMessages = useRef(messages);
  sessionMessages.current = messages;

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, flowState]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  // Mark new when closed
  useEffect(() => {
    if (!open && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant" && !lastMsg.seen) setHasNew(true);
    }
  }, [messages, open]);

  // Greet on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = {
        id: genId(), role: "assistant", seen: true,
        content: "Hi! I'm **Ori**, Orion Soft's AI assistant 👋\n\nI can help you find the right software for your business, answer product questions, or book a free demo. What brings you here today?",
        ts: new Date().toISOString(),
      };
      const updated = [greeting];
      setMessages(updated);
      saveHistory(updated);
    }
  }, [open]);

  const addMessage = useCallback((msg) => {
    setMessages(prev => {
      const updated = [...prev, { id: genId(), ts: new Date().toISOString(), seen: false, ...msg }];
      saveHistory(updated);
      return updated;
    });
  }, []);

  async function sendToAI(userContent, extraMessages = []) {
    setLoading(true);
    const allMsgs = [...sessionMessages.current, ...extraMessages, { role: "user", content: userContent }]
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMsgs, sessionId }),
      });

      let data = { text: "I'm having a moment — please try again or reach us at orionsoftlimited@gmail.com", action: null };
      if (res.ok) data = await res.json();

      const assistantMsg = { role: "assistant", content: data.text || data.message || data, seen: open };
      addMessage(assistantMsg);

      // Handle actions
      if (data.action === "BOOK_DEMO" || data.action === "BOOK_DEMO:carecore") {
        setTimeout(() => setFlowState("BOOK_DEMO"), 600);
      } else if (data.action === "COLLECT_LEAD") {
        setTimeout(() => setFlowState("COLLECT_LEAD"), 600);
      } else if (data.action === "ESCALATE") {
        setTimeout(() => { setFlowState("ESCALATE"); handleEscalate(); }, 600);
      } else if (data.action === "PRODUCT" && data.product) {
        setDemoProduct(data.product);
      }

      // Auto-save conversation
      persistConversation([...sessionMessages.current, { role: "user", content: userContent }, assistantMsg]);
    } catch {
      addMessage({ role: "assistant", content: "I couldn't connect right now. You can reach us directly at **orionsoftlimited@gmail.com** or call **08169577059**." });
    }
    setLoading(false);
  }

  function persistConversation(msgs) {
    const session = {
      id: sessionId, startedAt: sessionStart, updatedAt: new Date().toISOString(),
      status: flowState === "ESCALATE" || flowState === "DONE" ? "completed" : "active",
      messages: msgs.map(m => ({ role: m.role, content: m.content, ts: m.ts || new Date().toISOString() })),
      lead: Object.keys(lead).length > 0 ? lead : null,
      escalated: flowState === "ESCALATE",
    };
    saveConversation(session);
  }

  function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setHasNew(false);
    addMessage({ role: "user", content: msg });
    sendToAI(msg);
  }

  function handleQuickReply(text) {
    addMessage({ role: "user", content: text });
    sendToAI(text);
  }

  // Lead collection flow
  function handleLeadNext() {
    const val = leadInput.trim();
    if (!val) return;
    const field = LEAD_FIELDS[leadStep];
    const updatedLead = { ...lead, [field.key]: val };
    setLead(updatedLead);
    setLeadInput("");

    if (leadStep < LEAD_FIELDS.length - 1) {
      setLeadStep(leadStep + 1);
    } else {
      // All fields collected
      setFlowState(flowState === "BOOK_DEMO" ? "DEMO_SLOT" : "DONE");
      addMessage({ role: "assistant", content: `Thanks, ${updatedLead.name}! I've got your details. ${flowState === "BOOK_DEMO" ? "Now let's pick a time for your demo." : "Our team will reach out to you at **" + updatedLead.email + "** within 24 hours."}` });
      persistConversation(sessionMessages.current);
      if (flowState !== "BOOK_DEMO") {
        setLeadStep(0);
      }
    }
  }

  function handleDemoSlot(slot) {
    const finalLead = { ...lead, demoSlot: slot, demoProduct: demoProduct || "general" };
    setLead(finalLead);
    setFlowState("DONE");
    addMessage({ role: "assistant", content: `Perfect! I've booked you in for **${slot}**. Our team will confirm the exact time and send you a meeting link.\n\nIs there anything else I can help you with?` });
    persistConversation([...sessionMessages.current, {
      role: "assistant",
      content: `Demo booked: ${slot}. Lead: ${JSON.stringify(finalLead)}`,
    }]);
  }

  function handleEscalate() {
    addMessage({
      role: "assistant",
      content: "I've flagged this conversation for our team. Someone will reach out to you within 2 hours during business hours (Mon–Fri, 8am–6pm WAT).\n\nYou can also reach us directly:\n📧 **orionsoftlimited@gmail.com**\n📞 **08169577059**",
    });
    setFlowState("DONE");
    persistConversation(sessionMessages.current);
  }

  function handleClearHistory() {
    setMessages([]);
    setFlowState(null);
    setLeadStep(0);
    setLead({});
    try { localStorage.removeItem(HIST_SK); } catch {}
  }

  const showQuickReplies = messages.length <= 1 && !flowState && !loading;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: isMobile ? 0 : 90,
          right: isMobile ? 0 : 24,
          width: isMobile ? "100vw" : 380,
          height: isMobile ? "100dvh" : 560,
          background: C.bg,
          border: isMobile ? "none" : `1px solid ${C.border}`,
          borderRadius: isMobile ? 0 : 20,
          display: "flex", flexDirection: "column",
          zIndex: 2000,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          overflow: "hidden",
          animation: "chatSlideUp 0.25s ease",
        }}>
          {/* Header */}
          <div style={{
            background: C.surface, borderBottom: `1px solid ${C.border}`,
            padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
          }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: C.goldDim, border: `2px solid ${C.gold}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
              <div style={{ position: "absolute", bottom: -1, right: -1, width: 11, height: 11, borderRadius: "50%", background: C.mint, border: `2px solid ${C.bg}` }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>Ori</div>
              <div style={{ fontSize: 12, color: C.mint, fontFamily: font }}>● Online · Orion Soft Assistant</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={handleClearHistory} title="Clear history"
                style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 6, fontSize: 15, borderRadius: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = C.card}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                🗑️
              </button>
              <button type="button" onClick={() => setOpen(false)} title="Close"
                style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 6, fontSize: 18, borderRadius: 6, lineHeight: 1 }}
                onMouseEnter={e => e.currentTarget.style.background = C.card}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                ×
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((msg, i) => (
              <MessageBubble key={msg.id || i} msg={msg} />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: C.goldDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🤖</div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px 16px 16px 4px", padding: "10px 14px", display: "flex", gap: 4 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.textMuted, animation: `typingDot 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick replies */}
            {showQuickReplies && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {QUICK_REPLIES.map(q => (
                  <button key={q} type="button" onClick={() => handleQuickReply(q)} style={{
                    padding: "7px 12px", background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 20, fontSize: 12.5, color: C.text, fontFamily: font, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold + "66"; e.currentTarget.style.color = C.gold; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Lead collection form */}
            {(flowState === "COLLECT_LEAD" || flowState === "BOOK_DEMO") && leadStep < LEAD_FIELDS.length && (
              <LeadStep
                field={LEAD_FIELDS[leadStep]}
                value={leadInput}
                onChange={setLeadInput}
                onSubmit={handleLeadNext}
                step={leadStep}
                total={LEAD_FIELDS.length}
              />
            )}

            {/* Demo slot selection */}
            {flowState === "DEMO_SLOT" && (
              <div style={{ background: C.card, border: `1px solid ${C.gold}33`, borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, fontFamily: font, marginBottom: 10 }}>When works for you?</div>
                {DEMO_SLOTS.map(slot => (
                  <button key={slot} type="button" onClick={() => handleDemoSlot(slot)} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    marginBottom: 6, background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 10, fontSize: 13.5, color: C.text, fontFamily: font, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold + "66"; e.currentTarget.style.background = C.goldDim; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}>
                    {slot}
                  </button>
                ))}
              </div>
            )}

            {/* Done state — CTA */}
            {flowState === "DONE" && !loading && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <button type="button" onClick={() => setCurrentPage("contact")} style={{
                  padding: "8px 14px", background: C.goldDim, border: `1px solid ${C.gold}44`, color: C.gold,
                  borderRadius: 20, fontSize: 12.5, fontFamily: font, fontWeight: 600, cursor: "pointer",
                }}>
                  Contact page →
                </button>
                <button type="button" onClick={() => { setFlowState(null); addMessage({ role: "assistant", content: "Is there anything else I can help you with?" }); }} style={{
                  padding: "8px 14px", background: C.card, border: `1px solid ${C.border}`, color: C.text,
                  borderRadius: 20, fontSize: 12.5, fontFamily: font, cursor: "pointer",
                }}>
                  Ask another question
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          {(!flowState || flowState === "DONE") && (
            <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 14px", background: C.surface, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Ask me anything about our software…"
                  rows={1}
                  style={{
                    flex: 1, background: C.card, border: `1px solid ${C.border}`, color: C.text,
                    borderRadius: 12, padding: "10px 14px", fontSize: 14, fontFamily: font,
                    outline: "none", resize: "none", maxHeight: 100, lineHeight: 1.5,
                    boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = C.gold + "66"}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
                <button type="button" onClick={() => handleSend()} disabled={!input.trim() || loading} style={{
                  width: 40, height: 40, borderRadius: 12, border: "none", flexShrink: 0,
                  background: input.trim() && !loading ? C.gold : C.card,
                  color: input.trim() && !loading ? "#060810" : C.textMuted,
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                  transition: "all 0.2s",
                }}>
                  ↑
                </button>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: font, marginTop: 6, textAlign: "center" }}>
                Powered by Orion Soft · <a href="mailto:orionsoftlimited@gmail.com" style={{ color: C.textMuted }}>orionsoftlimited@gmail.com</a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating toggle button */}
      <button type="button" onClick={() => { setOpen(!open); setHasNew(false); }}
        aria-label={open ? "Close chat" : "Chat with Ori, our AI assistant"}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1999,
          width: 60, height: 60, borderRadius: "50%", border: "none", cursor: "pointer",
          background: open ? C.card : `linear-gradient(135deg, ${C.gold} 0%, #E8C96A 100%)`,
          color: open ? C.text : "#060810",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, boxShadow: open ? "none" : `0 8px 32px rgba(200,168,80,0.4)`,
          transition: "all 0.3s",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}>
        {open ? "✕" : "💬"}
        {/* Unread badge */}
        {hasNew && !open && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            width: 18, height: 18, borderRadius: "50%",
            background: C.rose, color: "white", fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #060810", fontFamily: font,
          }}>!</span>
        )}
        {/* Pulse ring (when closed) */}
        {!open && (
          <span style={{
            position: "absolute", inset: -4, borderRadius: "50%",
            border: `2px solid rgba(200,168,80,0.4)`,
            animation: "chatPulse 2.5s infinite",
          }} />
        )}
      </button>

      {/* Label */}
      {!open && (
        <div className="chat-label" style={{
          position: "fixed", bottom: 32, right: 92, zIndex: 1998,
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 20, padding: "6px 14px",
          fontSize: 13, fontWeight: 600, color: C.text, fontFamily: font,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          animation: "chatLabelFade 3s ease 2s forwards",
          whiteSpace: "nowrap",
        }}>
          Ask Ori ✨
        </div>
      )}
    </>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const content = formatMessage(msg.content || "");

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: isUser ? "row-reverse" : "row" }}>
      {!isUser && (
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(200,168,80,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🤖</div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isUser ? "rgba(200,168,80,0.15)" : "rgba(15,24,40,1)",
        border: `1px solid ${isUser ? "rgba(200,168,80,0.3)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        padding: "10px 14px",
        fontSize: 14, color: "#C8D0E0", fontFamily: font, lineHeight: 1.65,
      }} dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

function LeadStep({ field, value, onChange, onSubmit, step, total }) {
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, [field.key]);

  return (
    <div style={{ background: "rgba(15,24,40,1)", border: "1px solid rgba(200,168,80,0.25)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: 12, color: "#C8A850", fontFamily: font, fontWeight: 600, marginBottom: 8, letterSpacing: "0.05em" }}>
        STEP {step + 1} OF {total}
      </div>
      <div style={{ fontSize: 14, color: "#F2F6FF", fontFamily: font, marginBottom: 10 }}>{field.label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          ref={inputRef}
          type={field.type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
          placeholder={field.placeholder}
          style={{
            flex: 1, background: "rgba(11,17,32,1)", border: "1px solid rgba(255,255,255,0.07)",
            color: "#C8D0E0", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: font, outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(200,168,80,0.5)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
        />
        <button type="button" onClick={onSubmit} disabled={!value.trim()} style={{
          padding: "10px 18px", background: "#C8A850", color: "#060810", border: "none",
          borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: font,
          cursor: value.trim() ? "pointer" : "not-allowed", opacity: value.trim() ? 1 : 0.5,
        }}>
          {step < 3 ? "Next" : "Done"}
        </button>
      </div>
    </div>
  );
}

function formatMessage(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}
