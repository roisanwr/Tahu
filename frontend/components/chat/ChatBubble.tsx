import { Message } from "../../hooks/useChatLogic";
import { User, MapPin, Map, Camera, FileImage } from "lucide-react";
import { TahuLogo } from "../icons/TahuLogo";

interface ChatBubbleProps {
  message: Message;
  fontSize: string;
  onWidgetAction?: (type: "location" | "upload", data?: any) => void;
}

export function ChatBubble({ message, fontSize, onWidgetAction }: ChatBubbleProps) {
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
          {message.text && <div style={{ marginBottom: message.widget && message.widget !== "none" ? "12px" : "0" }}>{message.text}</div>}

          {/* Location Request Widget */}
          {message.widget === "location_request" && (
            <div style={{ marginTop: 8, padding: 12, border: "1px solid var(--color-border)", borderRadius: 8, backgroundColor: "var(--color-bg)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ background: "var(--color-accent-light)", padding: 6, borderRadius: "50%", color: "var(--color-accent)" }}>
                  <MapPin size={18} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-navy)" }}>Bagikan Lokasi Usaha</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  onClick={() => onWidgetAction?.("location", { address: "Jl. Sudirman No 123, Jakarta Selatan", lat: -6.2, lng: 106.8 })}
                  style={{ flex: 1, padding: "8px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  <MapPin size={14} /> Saat Ini
                </button>
                <button 
                  onClick={() => alert("Membuka Peta Google Maps Manual...")}
                  style={{ flex: 1, padding: "8px", background: "transparent", color: "var(--color-navy)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  <Map size={14} /> Buka Peta
                </button>
              </div>
            </div>
          )}

          {/* Location Result */}
          {message.widget === "location_result" && message.locationData && (
             <div style={{ padding: 12, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
                <div style={{ width: "100%", height: 100, background: "#E2E8F0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8" }}>
                  [Mini Peta]
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <MapPin size={14} strokeWidth={2.5} color="var(--color-accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-navy)", lineHeight: 1.4 }}>{message.locationData.address}</span>
                </div>
             </div>
          )}

          {/* Upload Request Widget */}
          {message.widget === "upload_request" && (
            <div 
              onClick={() => onWidgetAction?.("upload", { text: "Berikut foto struk nota penjualannya.", url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80" })}
              style={{ marginTop: 8, padding: 24, border: "2px dashed var(--color-border)", borderRadius: 12, backgroundColor: "var(--color-bg)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
            >
               <Camera size={32} color="var(--color-text-muted)" />
               <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-navy)" }}>Tap untuk Buka Kamera</span>
            </div>
          )}

          {/* Image Result */}
          {message.widget === "image_result" && message.attachmentUrl && (
             <div style={{ borderRadius: 8, overflow: "hidden", marginTop: message.text ? 8 : 0, maxWidth: 240, border: "1px solid var(--color-border)" }}>
                <img src={message.attachmentUrl} alt="Uploaded" style={{ width: "100%", height: "auto", display: "block" }} />
             </div>
          )}

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
