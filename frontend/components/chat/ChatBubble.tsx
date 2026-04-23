import { Message } from "../../hooks/useChatLogic";
import { User } from "lucide-react";
import { TahuLogo } from "../icons/TahuLogo";

interface ChatBubbleProps {
  message: Message;
  fontSize: string;
}

export function ChatBubble({ message, fontSize }: ChatBubbleProps) {
  const isUser = message.sender === "user";

  return (
    <div 
      className="gsap-bubble" 
      data-sender={message.sender} 
      style={{ display: "flex", alignItems: "flex-end", gap: 8, justifyContent: isUser ? "flex-end" : "flex-start", opacity: 0 }}
    >
      {!isUser && <TahuLogo size={28} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: "80%", alignItems: isUser ? "flex-end" : "flex-start", transition: "font-size 0.3s" }}>
        <div style={{
          padding: "12px 14px",
          fontSize: fontSize,
          lineHeight: 1.5,
          transition: "font-size 0.3s",
          background: isUser ? "linear-gradient(180deg, #F1FFF7, #E8F5EF)" : "var(--color-surface)",
          color: isUser ? "var(--color-navy)" : "var(--color-text-primary)",
          border: isUser ? "none" : "1px solid var(--color-border)",
          boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.04)",
          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px"
        }}>
          {message.text}
        </div>
        <span style={{ fontSize: 10, color: "var(--color-text-muted)", margin: "0 4px" }}>
          {message.time}
        </span>
      </div>

      {isUser && (
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-surface)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-primary)", flexShrink: 0 }}>
          <User size={14} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}
