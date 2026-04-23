import { useState } from "react";
import { useRouter } from "next/navigation";

export type MessageWidget = "none" | "location_request" | "location_result" | "upload_request" | "image_result";

export type Message = {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  widget?: MessageWidget;
  attachmentUrl?: string;
  locationData?: { address: string; lat: number; lng: number };
};

const formatTime = () =>
  new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });

export function useChatLogic() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "Halo, selamat datang di Tahu! 👋 Ceritain ke aku, usaha apa yang lagi kamu jalanin sekarang?",
      time: formatTime(),
    },
  ]);
  const [inputValue, setInputValue]   = useState("");
  const [isTyping, setIsTyping]       = useState(false);
  const [showLogin, setShowLogin]     = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const addBot = (text: string, extra: Partial<Message> = {}) => {
    setIsTyping(false);
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text, time: formatTime(), ...extra }]);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const userText = inputValue;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: "user", text: userText, time: formatTime() }]);
    setInputValue("");
    setIsTyping(true);

    if (currentStep === 1) {
      setTimeout(() => {
        addBot(`Mantap! Usaha ${userText} itu butuh ketelitian. Udah berapa lama nih jalanin bisnis ini?`);
        setCurrentStep(2);
      }, 1500);
    } else if (currentStep === 2) {
      setTimeout(() => {
        addBot(
          "Oke! Sekarang aku butuh tau lokasi usahamu biar bisa analisa seberapa strategis posisinya.",
          { widget: "location_request" }
        );
        setCurrentStep(3);
      }, 1500);
    } else if (currentStep === 3) {
      // User typed instead of using location widget
      setTimeout(() => {
        addBot(
          "Sip. Biar aku bisa verifikasi cashflow kamu, upload satu foto bukti transaksi ya — nota, struk, atau buku kas.",
          { widget: "upload_request" }
        );
        setCurrentStep(4);
      }, 1500);
    } else if (currentStep === 4) {
      // User typed instead of uploading
      setTimeout(() => {
        addBot(
          "Aku sudah kumpulkan cukup data untuk mulai hitung skor kredit kamu. Biar hasilnya tersimpan otomatis, login dulu ya! 🔐",
        );
        setShowLogin(true);
        setCurrentStep(5);
      }, 1500);
    } else if (currentStep === 5) {
      setTimeout(() => {
        addBot("Proses wawancara sudah selesai. Silakan login untuk melihat hasil skor kreditmu.");
        setShowLogin(true);
      }, 1200);
    }
  };

  const handleWidgetAction = (type: "location" | "upload", data?: unknown) => {
    const d = data as { address?: string; lat?: number; lng?: number; text?: string; url?: string } | undefined;
    setIsTyping(true);

    if (type === "location") {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), sender: "user", text: "", time: formatTime(),
        widget: "location_result",
        locationData: { address: d?.address ?? "", lat: d?.lat ?? 0, lng: d?.lng ?? 0 },
      }]);
      setTimeout(() => {
        addBot(
          `Lokasi ${d?.address ?? "usaha"} berhasil dicatat! Skor lokasi awal kelihatan positif 📍. Sekarang upload satu foto bukti transaksi biar skor makin lengkap.`,
          { widget: "upload_request" }
        );
        setCurrentStep(4);
      }, 1500);
    } else if (type === "upload") {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), sender: "user", text: d?.text ?? "Ini fotonya.",
        time: formatTime(), widget: "image_result", attachmentUrl: d?.url,
      }]);
      setTimeout(() => {
        addBot(
          "Dokumennya sudah aku terima dan dianalisis. Data keuangan berhasil diekstrak otomatis 📊. Tinggal satu langkah — login buat simpan hasilnya ya!",
        );
        setShowLogin(true);
        setCurrentStep(5);
      }, 1800);
    }
  };

  const handleFileUpload = (file: File, previewUrl: string) => {
    // After OCRScanningOverlay finishes, this is called from ChatInput
    handleWidgetAction("upload", {
      text: `Foto "${file.name}" berhasil diunggah.`,
      url: previewUrl,
    });
  };

  const handleGoogleLogin = () => {
    setIsTyping(true);
    setTimeout(() => {
      router.push("/dashboard/session-demo-001");
    }, 1200);
  };

  return {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    showLogin,
    handleSend,
    handleWidgetAction,
    handleFileUpload,
    handleGoogleLogin,
    currentStep,
  };
}
