import { Dispatch, SetStateAction, useState } from "react";
import { Menu, HelpCircle } from "lucide-react";
import { TahuLogo } from "../icons/TahuLogo";

interface ChatHeaderProps {
  onOpenDrawer: () => void;
  textSize: "small" | "medium" | "large";
  setTextSize: Dispatch<SetStateAction<"small" | "medium" | "large">>;
  currentStep: number;
}

export function ChatHeader({ onOpenDrawer, textSize, setTextSize, currentStep }: ChatHeaderProps) {
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showTextSizeMenu, setShowTextSizeMenu] = useState(false);

  const totalSteps = 5;

  const renderProgressBar = () => {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {[...Array(totalSteps)].map((_, i) => {
            const step = i + 1;
            let bgColor = "var(--color-border)";
            let width = 22;
            let isLocked = false;

            if (step < currentStep || step === currentStep) {
              bgColor = "var(--color-accent-light)"; 
              width = 36;
            } else if (step >= 5) {
              isLocked = true;
            }

            return (
              <div key={step} style={{ position: "relative", width, height: 6, borderRadius: 99, background: bgColor, transition: "width 0.4s, background 0.4s" }}>
                {isLocked && (
                  <svg style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
          {currentStep} / {totalSteps}
        </span>
      </div>
    );
  };

  return (
    <header style={{ padding: "0 24px", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)", zIndex: 10, flexShrink: 0 }}>
      {/* Left Area */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
        <button
          onClick={onOpenDrawer}
          style={{ width: 36, height: 36, border: "none", background: "transparent", cursor: "pointer", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-primary)", transition: "background 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <Menu size={22} strokeWidth={2} />
        </button>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TahuLogo size={28} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, userSelect: "none" }}>
            <span style={{ color: "var(--color-accent)", fontWeight: 800, fontSize: 15, letterSpacing: "-0.5px" }}>TAHU</span>
            <span style={{ color: "var(--color-navy)", fontSize: 9, fontWeight: 700 }}>NILAI KREDIT AI</span>
          </div>
        </div>
      </div>

      {/* Center Area */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-navy)", letterSpacing: "0.2px" }}>Wawancara</span>
        {renderProgressBar()}
      </div>

      {/* Right Area */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flex: 1 }}>
        {/* Help Dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowHelpMenu(!showHelpMenu)}
            style={{ width: 32, height: 32, border: "none", background: showHelpMenu ? "var(--color-bg)" : "transparent", cursor: "pointer", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: showHelpMenu ? "var(--color-navy)" : "var(--color-text-primary)", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"}
            onMouseLeave={e => e.currentTarget.style.background = showHelpMenu ? "var(--color-bg)" : "transparent"}
            title="Bantuan Pusat"
          >
            <HelpCircle size={20} />
          </button>

          {showHelpMenu && (
            <>
              <div onClick={() => setShowHelpMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
                borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: "16px",
                display: "flex", flexDirection: "column", gap: 12, zIndex: 50,
                width: "240px",
                animation: "fade-in-down 0.2s ease-out forwards"
              }}>
                <div style={{ fontSize: "14px", color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                  Apakah kamu menghadapi kendala teknis?
                </div>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); alert("Dummy: Akan diarahkan ke Email / WhatsApp Support"); setShowHelpMenu(false); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "10px 16px", background: "var(--color-surface)", border: "1px solid var(--color-border)",
                    borderRadius: 8, color: "var(--color-navy)", fontSize: "13px", fontWeight: 600,
                    textDecoration: "none", transition: "all 0.2s", textAlign: "center"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.color = "var(--color-accent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-navy)"; }}
                >
                  Silakan kontak kami
                </a>
              </div>
            </>
          )}
        </div>

        {/* Font Size Dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowTextSizeMenu(!showTextSizeMenu)}
            style={{ width: 32, height: 32, border: "none", background: showTextSizeMenu ? "var(--color-bg)" : "transparent", cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: showTextSizeMenu ? "var(--color-navy)" : "var(--color-text-primary)", fontWeight: 700, fontSize: "16px", fontFamily: "serif", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--color-accent)"}
            onMouseLeave={e => e.currentTarget.style.color = showTextSizeMenu ? "var(--color-navy)" : "var(--color-text-primary)"}
            title="Ukuran Teks"
          >
            Aa
          </button>

          {showTextSizeMenu && (
            <>
              <div onClick={() => setShowTextSizeMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
                borderRadius: 30, boxShadow: "var(--shadow-lg)", padding: "6px",
                display: "flex", flexDirection: "row", gap: 4, zIndex: 50,
                animation: "fade-in-down 0.2s ease-out forwards"
              }}>
                <button onClick={() => { setTextSize("small"); setShowTextSizeMenu(false); }} style={{ width: 36, height: 36, border: "none", background: textSize === "small" ? "var(--color-bg)" : "transparent", cursor: "pointer", borderRadius: "50%", color: textSize === "small" ? "var(--color-accent)" : "var(--color-text-primary)", fontWeight: 700, fontSize: "14px", fontFamily: "serif", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"} onMouseLeave={e => e.currentTarget.style.background = textSize === "small" ? "var(--color-bg)" : "transparent"}>A</button>
                <button onClick={() => { setTextSize("medium"); setShowTextSizeMenu(false); }} style={{ width: 36, height: 36, border: "none", background: textSize === "medium" ? "var(--color-bg)" : "transparent", cursor: "pointer", borderRadius: "50%", color: textSize === "medium" ? "var(--color-accent)" : "var(--color-text-primary)", fontWeight: 700, fontSize: "17px", fontFamily: "serif", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"} onMouseLeave={e => e.currentTarget.style.background = textSize === "medium" ? "var(--color-bg)" : "transparent"}>A</button>
                <button onClick={() => { setTextSize("large"); setShowTextSizeMenu(false); }} style={{ width: 36, height: 36, border: "none", background: textSize === "large" ? "var(--color-bg)" : "transparent", cursor: "pointer", borderRadius: "50%", color: textSize === "large" ? "var(--color-accent)" : "var(--color-text-primary)", fontWeight: 700, fontSize: "20px", fontFamily: "serif", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"} onMouseLeave={e => e.currentTarget.style.background = textSize === "large" ? "var(--color-bg)" : "transparent"}>A</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
