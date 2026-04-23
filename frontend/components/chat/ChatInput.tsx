import { Send, Paperclip } from "lucide-react";

interface ChatInputProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export function ChatInput({ inputValue, setInputValue, onSend, disabled }: ChatInputProps) {
  return (
    <div style={{ padding: "16px", background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", zIndex: 10, flexShrink: 0 }}>
      {disabled && (
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8, fontStyle: "italic" }}>
          Lanjutkan proses di atas sebelum mengetik lagi...
        </div>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        
        <button
          disabled={disabled}
          onClick={() => alert("Membuka Pilihan Lampiran (Kamera / Galeri / Dokumen)")}
          style={{
            width: 44, height: 44, borderRadius: "50%", background: "var(--color-surface)",
            border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center",
            color: disabled ? "var(--color-border)" : "var(--color-navy)",
            cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s", flexShrink: 0
          }}
          onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = "var(--color-bg)"; e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.color = "var(--color-accent)"; } }}
          onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = "var(--color-surface)"; e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-navy)"; } }}
        >
          <Paperclip size={20} style={{ transform: "rotate(45deg)" }} />
        </button>

        <div style={{ flex: 1, background: "var(--color-bg)", borderRadius: 24, border: "1px solid var(--color-border)", display: "flex", alignItems: "center", padding: "4px 4px 4px 16px", transition: "border-color 0.2s" }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !disabled) {
                onSend();
              }
            }}
            disabled={disabled}
            placeholder={disabled ? "Tunggu sebentar..." : "Ketik pesan Anda di sini..."}
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: "var(--color-text-primary)", padding: "10px 0" }}
          />

          <button
            onClick={onSend}
            disabled={disabled || !inputValue.trim()}
            style={{
              width: 36, height: 36,
              borderRadius: "50%",
              background: disabled || !inputValue.trim() ? "var(--color-border)" : "var(--color-accent)",
              border: "none",
              color: "#ffffff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: disabled || !inputValue.trim() ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              marginLeft: 8,
              flexShrink: 0
            }}
          >
            <Send size={16} strokeWidth={2.5} style={{ marginLeft: -2, marginTop: 2, transform: 'rotate(-45deg)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
