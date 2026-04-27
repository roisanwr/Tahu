import { Message } from "../../hooks/useChatLogic";
import { User, MapPin, Map, Camera, FileImage, Edit2, CheckCircle2, BarChart2, ArrowRight, Loader2 } from "lucide-react";
import { TahuLogo } from "../icons/TahuLogo";
import Link from "next/link";

interface ChatBubbleProps {
  message: Message;
  fontSize: string;
  isEditable?: boolean;
  isCompleting?: boolean;
  onWidgetAction?: (type: "location" | "upload" | "cancel_location" | "cancel_upload" | "complete_session", data?: unknown) => void;
  onOpenMapSheet?: () => void;
  onEdit?: () => void;
}

export function ChatBubble({ message, fontSize, isEditable, isCompleting, onWidgetAction, onOpenMapSheet, onEdit }: ChatBubbleProps) {
  const isUser = message.sender === "user";

  return (
    <div
      className="gsap-bubble"
      data-sender={message.sender}
      style={{ display: "flex", alignItems: "flex-end", gap: 8, justifyContent: isUser ? "flex-end" : "flex-start", opacity: 0 }}
    >
      {!isUser && <TahuLogo size={28} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: "80%", alignItems: isUser ? "flex-end" : "flex-start", transition: "font-size 0.3s" }}>
        <div
          className="chat-bubble-inner"
          style={{
            position: "relative",
            padding: "12px 14px",
            fontSize: fontSize,
            lineHeight: 1.5,
            transition: "font-size 0.3s",
            background: isUser ? "linear-gradient(180deg, #F1FFF7, #E8F5EF)" : "var(--color-surface)",
            color: isUser ? "var(--color-navy)" : "var(--color-text-primary)",
            border: isUser ? "none" : "1px solid var(--color-border)",
            boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.04)",
            borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          }}
        >
          {message.text && (
            <div style={{ marginBottom: message.widget && message.widget !== "none" ? "12px" : "0", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1 }}>{message.text}</div>
              {isUser && isEditable && (
                <button
                  onClick={onEdit}
                  title="Koreksi Jawaban Terakhir"
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--color-accent)", padding: 4, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: -2, marginRight: -6, opacity: 0.8,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "var(--color-accent-light)" }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.background = "transparent" }}
                >
                  <Edit2 size={13} strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}

          {/* ── Location Request Widget ─────────────────────────────── */}
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
                  onClick={() => onWidgetAction?.("location", { address: "Lokasi Saat Ini (GPS)", lat: -6.2, lng: 106.8 })}
                  style={{ flex: 1, padding: "8px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  <MapPin size={14} /> Saat Ini
                </button>
                {/* NOW triggers MapBottomSheet instead of alert() */}
                <button
                  onClick={() => onOpenMapSheet?.()}
                  style={{ flex: 1, padding: "8px", background: "transparent", color: "var(--color-navy)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.color = "var(--color-accent)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-navy)"; }}
                >
                  <Map size={14} /> Buka Peta
                </button>
              </div>
            </div>
          )}

          {/* ── Location Result ─────────────────────────────────────── */}
          {message.widget === "location_result" && message.locationData && (
            <div style={{ padding: 12, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
              <div style={{ width: "100%", height: 80, borderRadius: 8, border: "1px solid var(--color-border)", overflow: "hidden" }}>
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${message.locationData.lng - 0.006},${message.locationData.lat - 0.004},${message.locationData.lng + 0.006},${message.locationData.lat + 0.004}&layer=mapnik&marker=${message.locationData.lat},${message.locationData.lng}`}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title="Mini Map"
                  loading="lazy"
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <MapPin size={14} strokeWidth={2.5} color="var(--color-accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-navy)", lineHeight: 1.4 }}>
                  {message.locationData.address}
                </span>
              </div>
            </div>
          )}

          {/* ── Upload Request Widget ───────────────────────────────── */}
          {message.widget === "upload_request" && (
            <div
              style={{ marginTop: 8, padding: 24, border: "2px dashed var(--color-border)", borderRadius: 12, backgroundColor: "var(--color-bg)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}
              onClick={() => {
                // Trigger the hidden file input in ChatInput via a custom event
                const ev = new CustomEvent("skorinaja:trigger-file-upload");
                window.dispatchEvent(ev);
              }}
            >
              <Camera size={32} color="var(--color-text-muted)" />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-navy)" }}>Tap untuk Pilih / Ambil Foto</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 3 }}>Nota, struk, buku kas, atau KTP</div>
              </div>
            </div>
          )}

          {/* ── Image Result ────────────────────────────────────────── */}
          {message.widget === "image_result" && message.attachmentUrl && (
            <div style={{ borderRadius: 10, overflow: "hidden", marginTop: message.text ? 8 : 0, maxWidth: 240, border: "1px solid var(--color-border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={message.attachmentUrl} alt="Uploaded" style={{ width: "100%", height: "auto", display: "block" }} />
              <div style={{ padding: "6px 10px", background: "var(--color-accent-light)", display: "flex", alignItems: "center", gap: 6 }}>
                <FileImage size={12} color="var(--color-accent)" />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-accent-dark)" }}>Dokumen diterima</span>
              </div>
            </div>
          )}

          {/* ── Summary Card Widget ─────────────────────────────────── */}
          {message.widget === "summary_card" && (
            <div style={{ marginTop: 12, padding: 16, background: "var(--color-accent-light)", border: "1.5px solid var(--color-accent)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={18} color="var(--color-accent)" strokeWidth={2.5} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent-dark)" }}>Profil siap dihitung!</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--color-navy)", lineHeight: 1.5, margin: 0 }}>
                Semua data sudah terkumpul. Klik tombol di bawah untuk menghitung skor kredit usahamu ya Kak 🎯
              </p>
              <button
                onClick={() => onWidgetAction?.("complete_session")}
                disabled={!!isCompleting}
                style={{
                  width: "100%", padding: "10px 16px",
                  background: isCompleting ? "var(--color-text-muted)" : "var(--color-accent)",
                  color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 700, cursor: isCompleting ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => { if (!isCompleting) e.currentTarget.style.background = "var(--color-accent-dark)"; }}
                onMouseLeave={e => { if (!isCompleting) e.currentTarget.style.background = "var(--color-accent)"; }}
              >
                {isCompleting
                  ? (<><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Menghitung Skor...</>)
                  : (<><BarChart2 size={14} /> Hitung Skor Kredit Sekarang</>)
                }
              </button>
            </div>
          )}

          {/* ── Scoring Complete Widget ─────────────────────────────── */}
          {message.widget === "scoring_complete" && message.scoringData && (
            <div style={{ marginTop: 12, padding: 16, background: "linear-gradient(135deg, #E8F5EF, #F0FFF8)", border: "1.5px solid var(--color-accent)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-accent)", marginBottom: 4 }}>Skor Kredit Usaha</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: "var(--color-navy)", lineHeight: 1, fontFamily: "var(--font-serif)" }}>
                  {message.scoringData.finalScore}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>dari 850</div>
                <div style={{ marginTop: 8, display: "inline-block", padding: "4px 12px", background: "var(--color-accent)", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                  {message.scoringData.riskLevel}
                </div>
              </div>
              <Link
                href="/dashboard"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px 16px",
                  background: "var(--color-accent)", color: "#fff",
                  borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-dark)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent)"}
              >
                <BarChart2 size={14} /> Lihat Dashboard Lengkap <ArrowRight size={14} />
              </Link>
            </div>
          )}

        </div>

        <span style={{ fontSize: 10, color: "var(--color-text-muted)", margin: "0 4px" }}>
          {message.time}
        </span>
      </div>

      {isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--color-text-primary)", flexShrink: 0,
        }}>
          <User size={14} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}
