"use client";

import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useChatLogic } from "../../hooks/useChatLogic";

import { ChatHeader }          from "../../components/chat/ChatHeader";
import { ChatDrawer }          from "../../components/chat/ChatDrawer";
import { ChatBubble }          from "../../components/chat/ChatBubble";
import { ChatInput }           from "../../components/chat/ChatInput";
import { ChatLogin }           from "../../components/chat/ChatLogin";
import { ChatTypingIndicator } from "../../components/chat/ChatTypingIndicator";
import { MapBottomSheet }      from "../../components/chat/MapBottomSheet";
import { ResumeBanner }        from "../../components/chat/ResumeBanner";

gsap.registerPlugin(useGSAP);

const formatTime = () =>
  new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });

export default function ChatPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mapOpen, setMapOpen]       = useState(false);
  const [textSize, setTextSize]     = useState<"small" | "medium" | "large">("medium");

  const scrollRef    = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    messages, inputValue, setInputValue, isTyping, showLogin,
    handleSend, handleUndo, handleWidgetAction, handleFileUpload, handleFileCancel, handleGoogleLogin, currentStep,
  } = useChatLogic();

  // Listen for custom event from ChatBubble upload_request widget
  useEffect(() => {
    const handler = () => {
      // Dispatch to ChatInput's hidden file input
      const fileInput = document.querySelector<HTMLInputElement>("input[type='file'][accept]");
      fileInput?.click();
    };
    window.addEventListener("tahu:trigger-file-upload", handler);
    return () => window.removeEventListener("tahu:trigger-file-upload", handler);
  }, []);

  useGSAP(() => {
    // Bubble entering
    gsap.utils.toArray<HTMLElement>(".gsap-bubble:not(.is-animated)").forEach((bubble, index) => {
      const isUser = bubble.dataset.sender === "user";
      gsap.fromTo(bubble,
        { opacity: 0, x: isUser ? 40 : -40, scale: 0.85 },
        {
          opacity: 1, x: 0, scale: 1, duration: 0.45, ease: "back.out(1.2)",
          delay: index * 0.04,
          onComplete: () => bubble.classList.add("is-animated"),
        }
      );
    });

    // Typing indicator
    gsap.utils.toArray<HTMLElement>(".gsap-typing:not(.is-animated)").forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 12, scale: 0.85 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.4)", onComplete: () => el.classList.add("is-animated") }
      );
    });

    gsap.to(".typing-dot", { y: -4, duration: 0.3, stagger: 0.1, yoyo: true, repeat: -1, ease: "power1.inOut" });

    // Login box
    gsap.utils.toArray<HTMLElement>(".gsap-login:not(.is-animated)").forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, scale: 0.92, y: 24 },
        { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: "back.out(1.2)", delay: 0.15, onComplete: () => el.classList.add("is-animated") }
      );
    });
  }, { scope: containerRef, dependencies: [messages, isTyping, showLogin] });

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, showLogin]);

  const getFontSize = () => {
    if (textSize === "small")  return "14px";
    if (textSize === "medium") return "17px";
    return "20px";
  };

  const handleMapConfirm = (location: { address: string; lat: number; lng: number }) => {
    handleWidgetAction("location", location);
    setMapOpen(false);
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", backgroundColor: "var(--color-bg)", fontFamily: "sans-serif", overflow: "hidden" }}>

      {/* Drawer */}
      <ChatDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Map Bottom Sheet */}
      <MapBottomSheet
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        onConfirm={handleMapConfirm}
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", position: "relative" }}>

        <ChatHeader
          onOpenDrawer={() => setDrawerOpen(true)}
          textSize={textSize}
          setTextSize={setTextSize}
          currentStep={currentStep}
        />

        <div
          ref={containerRef}
          style={{ display: "flex", flexDirection: "column", flex: 1, backgroundColor: "var(--color-bg)", maxWidth: 950, width: "100%", margin: "0 auto", position: "relative", overflow: "hidden", boxShadow: "var(--shadow-md)", borderLeft: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border)" }}
        >

          {/* Chat messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16, scrollBehavior: "smooth" }}>
            <ResumeBanner />

            <div style={{ textAlign: "center", margin: "8px 0 16px", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", letterSpacing: "0.5px", userSelect: "none" }}>
              Hari Ini, {formatTime()}
            </div>

            {messages.map((msg, index) => {
              const isLatestUser =
                msg.sender === "user" &&
                index === messages.map(m => m.sender).lastIndexOf("user");

              return (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  fontSize={getFontSize()}
                  isEditable={isLatestUser}
                  onEdit={handleUndo}
                  onWidgetAction={handleWidgetAction}
                  onOpenMapSheet={() => setMapOpen(true)}
                />
              );
            })}

            {isTyping && <ChatTypingIndicator />}
            {showLogin && <ChatLogin onLogin={handleGoogleLogin} />}

            <div style={{ paddingBottom: 16 }} />
          </div>

          <ChatInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSend={handleSend}
            onFileUpload={handleFileUpload}
            onFileCancel={handleFileCancel}
            disabled={isTyping || showLogin}
          />
        </div>
      </main>
    </div>
  );
}
