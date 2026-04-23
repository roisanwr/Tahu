"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Message = { id: string; sender: "bot" | "user"; text: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "bot", text: "Halo, selamat datang di Tahu! 👋 Wahai pahlawan ekonomi, usaha apa nih yang lagi kamu jalanin hari ini?" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const stepRef = useRef(1);

  // Auto-scroll ke pesan bawah
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, showLogin]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const userText = inputValue;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: "user", text: userText }]);
    setInputValue("");
    setIsTyping(true);

    if (stepRef.current === 1) {
      // Respond to step 1 (Tanya Omzet / Lama Usaha)
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text: `Wah, mantap punya ${userText}! Udah berapa lama nih jalanin usahanya?` }]);
        stepRef.current = 2;
      }, 1500);
    } else if (stepRef.current === 2) {
      // Respond to step 2 (Pancing Login)
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text: `Keren banget udah bertahan ${userText}! Nah, biar proses obrolan kita ini bisa disimpen dan skor kredit usaha kamu valid, yuk login dulu pakai Google sebentar (cuma 1 detik kok!).` }]);
        setShowLogin(true);
        stepRef.current = 3;
      }, 1500);
    }
  };

  const handleGoogleLogin = () => {
    alert("Simulasi Login Google! Di tahap integrasi backend nanti, ini akan mengarah ke halaman OAuth Google.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "var(--color-bg)" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, backgroundColor: "var(--color-surface)", maxWidth: 768, width: "100%", margin: "0 auto", borderLeft: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border)", boxShadow: "var(--shadow-xl)" }}>
        
        {/* Header */}
        <header style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)", zIndex: 10 }}>
          <Link href="/" style={{ color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "var(--space-2)", textDecoration: "none", width: 80 }}>
            ← <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, color: "var(--color-navy)" }}>Tahu</span>
          </Link>
          <div style={{ flex: 1, textAlign: "center", fontSize: "var(--text-md)", fontWeight: 700, color: "var(--color-navy)" }}>Asisten Tahu</div>
          <div style={{ width: 80 }} /> {/* Spacer */}
        </header>

        {/* Chat messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "var(--space-6) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.sender === "user" ? "flex-end" : "flex-start", animation: "fade-in 0.3s ease-out forwards" }}>
               {msg.sender === "bot" && (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: 800, fontStyle: "italic", flexShrink: 0, marginRight: 12, alignSelf: "flex-end" }}>
                  T
                </div>
              )}
              <div className={msg.sender === "user" ? "bubble-user" : "bubble-ai"} style={{ padding: "var(--space-3) var(--space-4)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                {msg.text}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
               <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: 800, fontStyle: "italic", flexShrink: 0, marginRight: 12, alignSelf: "flex-end" }}>
                  T
                </div>
              <div className="bubble-ai" style={{ padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", gap: 5, height: 46 }}>
                <span className="typing-dot" style={{ width: 6, height: 6, background: "var(--color-text-muted)", borderRadius: "50%" }}></span>
                <span className="typing-dot" style={{ width: 6, height: 6, background: "var(--color-text-muted)", borderRadius: "50%" }}></span>
                <span className="typing-dot" style={{ width: 6, height: 6, background: "var(--color-text-muted)", borderRadius: "50%" }}></span>
              </div>
            </div>
          )}
          
          {showLogin && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-6)", animation: "fade-in 0.5s ease-out forwards" }}>
              <button 
                onClick={handleGoogleLogin} 
                style={{ 
                  display: "flex", alignItems: "center", gap: "var(--space-3)", 
                  background: "#ffffff", border: "1px solid var(--color-border)", 
                  padding: "var(--space-4) var(--space-8)", borderRadius: "var(--radius-lg)", 
                  fontSize: "var(--text-base)", fontWeight: 600, color: "var(--color-text-primary)", 
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
        <div style={{ padding: "var(--space-4)", background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} style={{ display: "flex", gap: "var(--space-3)" }}>
            <input 
              type="text" 
              placeholder={showLogin ? "Silakan login untuk menyimpan obrolan..." : "Ketik balasan usahamu..."}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={showLogin || isTyping}
              style={{ flex: 1, padding: "var(--space-3) var(--space-4)", borderRadius: 99, border: "1px solid var(--color-border)", outline: "none", fontSize: "0.95rem", background: "var(--color-bg)", color: "var(--color-text-primary)" }}
            />
            <button 
              type="submit" 
              disabled={showLogin || isTyping || !inputValue.trim()} 
              style={{ width: 44, height: 44, borderRadius: "50%", background: (showLogin || isTyping || !inputValue.trim()) ? "var(--color-border)" : "var(--color-accent)", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: (showLogin || isTyping || !inputValue.trim()) ? "not-allowed" : "pointer", transition: "background 0.2s" }}
            >
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
          <div style={{ textAlign: "center", marginTop: "var(--space-4)", fontSize: "11px", color: "var(--color-text-muted)" }}>
            Powered by <b style={{ color: "var(--color-accent-dark)" }}>Tahu</b>
          </div>
        </div>
      </div>
    </div>
  );
}
