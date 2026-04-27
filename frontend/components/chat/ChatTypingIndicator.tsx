import { TahuLogo } from "../icons/TahuLogo";

export function ChatTypingIndicator() {
  return (
    <div className="gsap-typing" style={{ display: "flex", alignItems: "flex-end", gap: 8, justifyContent: "flex-start", opacity: 0 }}>
      <TahuLogo size={28} />
      <div style={{
        padding: "12px 14px",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        borderRadius: "14px 14px 14px 4px",
        display: "flex", alignItems: "center", gap: 4, height: 42
      }}>
        <span className="typing-dot" style={{ width: 6, height: 6, background: "var(--color-text-muted)", borderRadius: "50%" }}></span>
        <span className="typing-dot" style={{ width: 6, height: 6, background: "var(--color-text-muted)", borderRadius: "50%" }}></span>
        <span className="typing-dot" style={{ width: 6, height: 6, background: "var(--color-text-muted)", borderRadius: "50%" }}></span>
      </div>
    </div>
  );
}
