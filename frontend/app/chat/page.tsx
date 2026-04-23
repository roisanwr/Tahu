"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Message = { id: string; sender: "bot" | "user"; text: string; time: string };

const formatTime = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "bot", text: "Halo, selamat datang di Tahu! 👋 Wahai pahlawan ekonomi, usaha apa nih yang lagi kamu jalanin hari ini?", time: formatTime() }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [textSize, setTextSize] = useState<"small" | "medium" | "large">("medium");
  const [showTextSizeMenu, setShowTextSizeMenu] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(1);

  const getFontSize = () => {
    if (textSize === "small") return "14px";
    if (textSize === "medium") return "17px";
    return "20px";
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, showLogin]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: "user", text: userText, time: formatTime() }]);
    setInputValue("");
    setIsTyping(true);

    if (stepRef.current === 1) {
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text: `Wah, mantap punya ${userText}! Udah berapa lama nih jalanin usahanya?`, time: formatTime() }]);
        stepRef.current = 2;
      }, 1500);
    } else if (stepRef.current === 2) {
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text: `Keren banget udah bertahan ${userText}! Nah, biar progres skor kredit ini tersimpan otomatis, klik tombol di bawah buat login cepat pakai Google ya.`, time: formatTime() }]);
        setShowLogin(true);
        stepRef.current = 3;
      }, 1500);
    }
  };

  const handleGoogleLogin = () => {
    alert("Simulasi Login Google! Di tahap integrasi backend nanti, ini akan mengarah ke halaman OAuth Google.");
  };

  // --- UI Helpers ---
  const renderProgressBar = () => {
    const totalSteps = 6;
    const currentStep = 1;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {[...Array(totalSteps)].map((_, i) => {
            const step = i + 1;
            let bgColor = "var(--color-border)";
            let width = 22;
            let isLocked = false;

            if (step < currentStep || step === currentStep) {
              bgColor = "var(--color-accent-light)"; // Using a lighter green for progress
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
    <>
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", backgroundColor: "var(--color-bg)" }}>

        {/* Header - Paling Atas Ujung ke Ujung */}
        <header style={{ padding: "0 24px", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)", zIndex: 10, flexShrink: 0 }}>
          {/* Left Area */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{ width: 36, height: 36, border: "none", background: "transparent", cursor: "pointer", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-primary)", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ background: "var(--color-accent)", color: "#fff", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, fontStyle: "italic", userSelect: "none" }}>
                T
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, userSelect: "none" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 800, fontSize: 15, letterSpacing: "-0.5px" }}>TAHU</span>
                <span style={{ color: "var(--color-navy)", fontSize: 9, fontWeight: 700 }}>SMART CREDIT INTERVIEW</span>
              </div>
            </div>
          </div>

          {/* Center Area */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-navy)", letterSpacing: "0.2px" }}>SMART I-Join</span>
            {renderProgressBar()}
          </div>

          {/* Right Area */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flex: 1 }}>
            <button
              style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-primary)", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              title="Bantuan Pusat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </button>

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

        <div style={{ display: "flex", flexDirection: "column", flex: 1, backgroundColor: "var(--color-bg)", maxWidth: 950, width: "100%", margin: "0 auto", position: "relative", overflow: "hidden", boxShadow: "var(--shadow-md)", borderLeft: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border)" }}>

          {/* Chat messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16, scrollBehavior: "smooth" }}>

            {/* Timestamp */}
            <div style={{ textAlign: "center", margin: "24px 0 16px", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", letterSpacing: "0.5px", userSelect: "none" }}>
              Hari Ini, {formatTime()}
            </div>

            {messages.map(msg => (
              <div key={msg.id} style={{ display: "flex", alignItems: "flex-end", gap: 8, justifyContent: msg.sender === "user" ? "flex-end" : "flex-start", animation: "fade-in 0.3s ease-out forwards" }}>

                {msg.sender === "bot" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: 700, flexShrink: 0, fontStyle: "italic" }}>
                    T
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: "80%", alignItems: msg.sender === "user" ? "flex-end" : "flex-start", transition: "font-size 0.3s" }}>
                  <div style={{
                    padding: "12px 14px",
                    fontSize: getFontSize(),
                    lineHeight: 1.5,
                    transition: "font-size 0.3s",
                    background: msg.sender === "user" ? "linear-gradient(180deg, #F1FFF7, #E8F5EF)" : "var(--color-surface)",
                    color: msg.sender === "user" ? "var(--color-navy)" : "var(--color-text-primary)",
                    border: msg.sender === "user" ? "none" : "1px solid var(--color-border)",
                    boxShadow: msg.sender === "user" ? "none" : "0 1px 4px rgba(0,0,0,0.04)",
                    borderRadius: msg.sender === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px"
                  }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--color-text-muted)", margin: "0 4px" }}>
                    {msg.time}
                  </span>
                </div>

                {msg.sender === "user" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-surface)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-primary)", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, justifyContent: "flex-start", animation: "fade-in 0.3s ease-out forwards" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: 700, flexShrink: 0, fontStyle: "italic" }}>
                  T
                </div>
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
            )}

            {showLogin && (
              <div style={{ display: "flex", justifyContent: "center", margin: "24px 0", animation: "fade-in 0.5s ease-out forwards" }}>
                <button
                  onClick={handleGoogleLogin}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "#ffffff", border: "1px solid var(--color-border)",
                    padding: "16px 32px", borderRadius: "12px",
                    fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)",
                    cursor: "pointer", boxShadow: "var(--shadow-md)", transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Lanjutkan dengan Google
                </button>
              </div>
            )}
          </div>

          {/* Input area */}
          <div style={{ padding: "16px", background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", zIndex: 10 }}>
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} style={{ display: "flex", gap: "8px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "24px", padding: "6px" }}>
              <input
                type="text"
                placeholder={showLogin ? "Silakan login untuk menyimpan obrolan..." : "Enter your message here..."}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                disabled={showLogin || isTyping}
                style={{ flex: 1, padding: "0 16px", background: "transparent", border: "none", outline: "none", fontSize: "14px", color: "var(--color-text-primary)" }}
              />
              <button
                type="submit"
                disabled={showLogin || isTyping || !inputValue.trim()}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: (showLogin || isTyping || !inputValue.trim()) ? "var(--color-border)" : "var(--color-navy)",
                  color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: (showLogin || isTyping || !inputValue.trim()) ? "not-allowed" : "pointer",
                  transition: "background 0.2s"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>

          <div style={{ textAlign: "center", padding: "8px 0 16px", fontSize: "11px", color: "var(--color-text-muted)" }}>
            Powered by <strong style={{ color: "#F58220", fontStyle: "italic", fontWeight: 700 }}>TAHU</strong>
          </div>
        </div>
      </div>

      {/* DRAWER OVERLAY */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 99, opacity: 1, transition: "opacity 0.3s" }}
        />
      )}

      {/* SIDE DRAWER */}
      <div
        style={{
          position: "fixed", top: 0, bottom: 0, left: 0, width: 300, background: "var(--color-surface)",
          zIndex: 100, transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex", flexDirection: "column", boxShadow: drawerOpen ? "var(--shadow-xl)" : "none"
        }}
      >
        <div style={{ padding: "24px 20px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-bg)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-primary)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Guest User</div>
            <div style={{ fontSize: 11, color: "var(--color-accent-alt)", marginTop: 2 }}>Belum Login</div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            style={{ width: 28, height: 28, border: "none", background: "var(--color-bg)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text-primary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav style={{ padding: "20px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ marginBottom: 16 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, color: "var(--color-text-primary)", textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Kembali ke Beranda
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
