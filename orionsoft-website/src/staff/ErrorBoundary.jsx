import { Component } from "react";
import { isChunkError, reloadOnce } from "../lib/freshness.js";

// Contains a crash to one section/module instead of blanking the whole app.
// Pass a `resetKey` (e.g. the active section id) so navigating away clears it.
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null, key: props.resetKey }; }
  static getDerivedStateFromError(error) { return { error }; }
  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }
  componentDidCatch(error, info) {
    console.error("[section crashed]", error, info?.componentStack);
    // An outdated tab (open across an update) can't load this section's
    // code: switch to the current version instead of showing an error.
    if (isChunkError(error) && reloadOnce()) this.setState({ updating: true });
  }
  render() {
    if (!this.state.error) return this.props.children;
    const box = { margin: "40px auto", maxWidth: 520, textAlign: "center", fontFamily: "'Instrument Sans', system-ui, sans-serif", background: "#0F1828", border: "1px solid rgba(244,63,94,0.35)", borderRadius: 16, padding: 28 };
    if (this.state.updating) return <div role="status" style={{ ...box, borderColor: "rgba(200,168,80,0.45)", color: "#F2F6FF", fontWeight: 700 }}>Updating to the latest version…</div>;
    const chunk = isChunkError(this.state.error);
    return (
      <div role="alert" style={{ margin: "40px auto", maxWidth: 520, textAlign: "center", fontFamily: "'Instrument Sans', system-ui, sans-serif", background: "#0F1828", border: "1px solid rgba(244,63,94,0.35)", borderRadius: 16, padding: 28 }}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#F2F6FF" }}>This section hit a problem</div>
        <p style={{ fontSize: 13.5, color: "#8391AB", lineHeight: 1.6 }}>The rest of the app still works. Try again, or open another section.</p>
        <button type="button" onClick={() => (chunk ? window.location.reload() : this.setState({ error: null }))} style={{ background: "#C8A850", color: "#060810", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 800, cursor: "pointer" }}>{chunk ? "Reload page" : "Try again"}</button>
        <div style={{ marginTop: 14, fontSize: 11.5, color: "#5B6A85", wordBreak: "break-word" }}>Details: {String(this.state.error?.message || this.state.error).slice(0, 200)}</div>
      </div>
    );
  }
}
