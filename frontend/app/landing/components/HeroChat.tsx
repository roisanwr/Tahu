"use client";

import { useEffect, useState, useRef } from "react";

type Message = {
  id: number;
  sender: "bot" | "user";
  text: string;
};

const SCENARIO: { sender: "bot" | "user"; text: string; delay: number }[] = [
  { sender: "bot", text: "Halo! Aku Asisten Tahu. Ceritakan sedikit tentang usaha yang kamu jalankan? 🙂", delay: 1000 },
  { sender: "user", text: "Saya punya warung sembako kecil di depan rumah, udah jalan sekitar 3 tahun.", delay: 2500 },
  { sender: "bot", text: "Wah, menarik banget. Boleh tahu rata-rata omzet per harinya berapa?", delay: 1500 },
  { sender: "user", text: "Kira-kira 500rb sampai 1 juta per hari.", delay: 2000 },
  { sender: "bot", text: "Baik. Apakah kamu punya catatan pembukuan atau nota belanja stok barang?", delay: 1500 },
  { sender: "user", text: "Ada nota belanja dari agen tiap minggu sih.", delay: 2000 },
  { sender: "bot", text: "Sip! Bisa difotokan notanya? Biar aku bantu analisa riwayat keuanganmu secara otomatis 📸", delay: 2000 },
];

export default function HeroChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let currentStep = 0;
    let mainTimeout: NodeJS.Timeout;
    let isMounted = true;

    const playScenario = () => {
      if (!isMounted) return;
      if (currentStep >= SCENARIO.length) {
        // Restart after 5 seconds
        mainTimeout = setTimeout(() => {
          if (!isMounted) return;
          setMessages([]);
          currentStep = 0;
          playScenario();
        }, 5000);
        return;
      }

      const step = SCENARIO[currentStep];
      
      if (step.sender === "bot") {
        setIsBotTyping(true);
      } else {
        setIsUserTyping(true);
      }

      mainTimeout = setTimeout(() => {
        if (!isMounted) return;
        setIsBotTyping(false);
        setIsUserTyping(false);
        setMessages((prev) => [...prev, { id: Date.now(), sender: step.sender, text: step.text }]);
        currentStep++;
        
        // Small pause before next action
        mainTimeout = setTimeout(playScenario, 600);
      }, step.delay);
    };

    // start scenario
    mainTimeout = setTimeout(playScenario, 500);

    return () => {
      isMounted = false;
      clearTimeout(mainTimeout);
    };
  }, []);

  // auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isBotTyping, isUserTyping]);

  return (
    <div style={{
      background: "var(--color-bg)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-xl)",
      display: "flex",
      flexDirection: "column",
      height: "500px",
      width: "100%",
      maxWidth: "460px",
      overflow: "hidden",
      marginLeft: "auto"
    }}>
      {/* Header */}
      <div style={{
        padding: "var(--space-4) var(--space-5)",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        zIndex: 10
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "var(--color-accent)", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#fff", fontSize: "0.875rem", fontWeight: 800, fontStyle: "italic"
        }}>
          T
        </div>
        <div>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-navy)" }}>Asisten Tahu</div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-accent)", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)", display: "inline-block" }} />
            Selalu Siap Membantu
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} style={{
        flex: 1,
        padding: "var(--space-5)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        scrollBehavior: "smooth"
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: "flex",
            justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
            animation: "fade-in 0.3s ease-out forwards"
          }}>
            {msg.sender === "bot" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "10px", fontWeight: 800, fontStyle: "italic", flexShrink: 0, marginRight: 8, alignSelf: "flex-end" }}>
                T
              </div>
            )}
            <div className={msg.sender === "user" ? "bubble-user" : "bubble-ai"} style={{ padding: "var(--space-3) var(--space-4)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {/* Typing Indicators */}
        {(isBotTyping || isUserTyping) && (
          <div style={{
            display: "flex",
            justifyContent: isUserTyping ? "flex-end" : "flex-start",
            animation: "fade-in 0.2s ease-out forwards"
          }}>
            {isBotTyping && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "10px", fontWeight: 800, fontStyle: "italic", flexShrink: 0, marginRight: 8, alignSelf: "flex-end" }}>
                T
              </div>
            )}
            <div className={isUserTyping ? "bubble-user" : "bubble-ai"} style={{ padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", gap: 3, height: 38 }}>
              <span className="typing-dot" style={{ width: 5, height: 5, background: isUserTyping ? "#fff" : "var(--color-text-secondary)", borderRadius: "50%", display: "inline-block" }} />
              <span className="typing-dot" style={{ width: 5, height: 5, background: isUserTyping ? "#fff" : "var(--color-text-secondary)", borderRadius: "50%", display: "inline-block" }} />
              <span className="typing-dot" style={{ width: 5, height: 5, background: isUserTyping ? "#fff" : "var(--color-text-secondary)", borderRadius: "50%", display: "inline-block" }} />
            </div>
          </div>
        )}
      </div>
      
      {/* Fake Input Area */}
      <div style={{
        padding: "var(--space-4)",
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        gap: "var(--space-3)"
      }}>
        <div style={{
          flex: 1,
          height: 40,
          borderRadius: 99,
          border: "1px solid var(--color-border)",
          background: "var(--color-bg)",
          color: "var(--color-text-muted)",
          display: "flex",
          alignItems: "center",
          padding: "0 var(--space-4)",
          fontSize: "0.875rem"
        }}>
          {isUserTyping ? "Mengetik balasan..." : "Ketik pesan di sini..."}
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", flexShrink: 0, opacity: 0.5
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </div>
      </div>
    </div>
  );
}
