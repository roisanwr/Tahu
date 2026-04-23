import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export type MessageWidget = "none" | "location_request" | "location_result" | "upload_request" | "image_result";

export type Message = { 
  id: string; 
  sender: "bot" | "user"; 
  text: string; 
  time: string;
  widget?: MessageWidget;
  attachmentUrl?: string; 
  locationData?: { address: string, lat: number, lng: number };
};

const formatTime = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });

export function useChatLogic() {
  const router = useRouter();

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
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text: `Boleh minta lokasi usahamu sekarang biar aku bisa analisa seberapa strategis tempat mu usaha.`, time: formatTime(), widget: "location_request" }]);
        stepRef.current = 3;
      }, 1500);
    } else if (stepRef.current === 3) {
      // In case user bypasses location by typing
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text: `Menarik. Biar skor kreditnya makin akurat, upload satu foto bukti usahamu ya (misal: nota, barang, atau plang toko).`, time: formatTime(), widget: "upload_request" }]);
        stepRef.current = 4;
      }, 1500);
    } else if (stepRef.current === 4) {
      // In case user bypasses upload by typing
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text: `Sip! Berkas profil usahamu udah komplit. Nah, biar progres skor kredit ini tersimpan otomatis, klik tombol di bawah buat login cepat pakai Google ya.`, time: formatTime() }]);
        setShowLogin(true);
        stepRef.current = 5;
      }, 1500);
    }
  };

  const handleWidgetAction = (type: "location" | "upload", data?: any) => {
    setIsTyping(true);
    
    if (type === "location") {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), sender: "user", text: "", time: formatTime(), 
        widget: "location_result", locationData: data 
      }]);
      
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text: `Lokasi strategis tercatat di ${data.address}! Biar lebih lengkap, coba upload foto bukti usahamu dong buat dinilai.`, time: formatTime(), widget: "upload_request" }]);
        stepRef.current = 4;
      }, 1500);
    } 
    else if (type === "upload") {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), sender: "user", text: data?.text || "", time: formatTime(), 
        widget: "image_result", attachmentUrl: data?.url 
      }]);
      
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text: `Sip! Fotonya udah masuk. Nah, biar progres skor kredit ini tersimpan otomatis, klik tombol di bawah buat login cepat pakai Google ya.`, time: formatTime() }]);
        setShowLogin(true);
        stepRef.current = 5;
      }, 1500);
    }
  };

  const handleGoogleLogin = () => {
    // Simulasi integrasi backend delay
    setIsTyping(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
  };

  return {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    showLogin,
    handleSend,
    handleWidgetAction,
    handleGoogleLogin,
    currentStep: stepRef.current
  };
}
