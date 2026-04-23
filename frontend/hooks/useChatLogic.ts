import { useState, useRef } from "react";

export type Message = { id: string; sender: "bot" | "user"; text: string; time: string };

const formatTime = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });

export function useChatLogic() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "bot", text: "Halo, selamat datang di Tahu! 👋 Wahai pahlawan ekonomi, usaha apa nih yang lagi kamu jalanin hari ini?", time: formatTime() }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  const stepRef = useRef(1);

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
    alert("Simulasi Login Google! Di tahap integrasi backend nanti, ini akn mengarah ke halaman OAuth Google.");
  };

  return {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    showLogin,
    handleSend,
    handleGoogleLogin,
    currentStep: stepRef.current
  };
}
