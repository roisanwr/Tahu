"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, AuthUser } from "../lib/auth-context";

export type MessageWidget =
  | "none"
  | "location_request"
  | "location_result"
  | "upload_request"
  | "image_result";

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

// Mock user yang akan di-set saat login Google
const MOCK_GOOGLE_USER: AuthUser = {
  id: "user-demo-001",
  name: "Budi Santoso",
  email: "budi.santoso@gmail.com",
  avatarUrl: "https://ui-avatars.com/api/?name=Budi+Santoso&background=0D6B4F&color=fff&size=128&bold=true",
};

export function useChatLogic() {
  const router = useRouter();
  const { login } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "Halo! Selamat datang di skorinaja 👋 Ceritain ke aku — usaha apa yang lagi kamu jalanin sekarang?",
      time: formatTime(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const addBot = (text: string, extra: Partial<Message> = {}) => {
    setIsTyping(false);
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), sender: "bot", text, time: formatTime(), ...extra },
    ]);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const userText = inputValue;
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), sender: "user", text: userText, time: formatTime() },
    ]);
    setInputValue("");
    setIsTyping(true);

    if (currentStep === 1) {
      setTimeout(() => {
        addBot(
          `Mantap! Usaha ${userText} itu menarik. Sudah berapa lama nih kamu jalanin bisnis ini?`
        );
        setCurrentStep(2);
      }, 1500);

    } else if (currentStep === 2) {
      setTimeout(() => {
        addBot(
          "Oke! Sekarang aku perlu skorinaja lokasi usahamu — biar bisa analisa seberapa strategis posisinya di peta.",
          { widget: "location_request" }
        );
        setCurrentStep(3);
      }, 1500);

    } else if (currentStep === 3) {
      // User ketik alih-alih pakai widget lokasi
      setTimeout(() => {
        addBot(
          "Siap! Sekarang bantu aku verifikasi cashflow kamu — upload satu foto bukti transaksi ya. Bisa nota, struk, atau screenshot rekening.",
          { widget: "upload_request" }
        );
        setCurrentStep(4);
      }, 1500);

    } else if (currentStep === 4) {
      // User ketik alih-alih upload
      setTimeout(() => {
        addBot(
          "Data sudah aku kumpulkan. Satu langkah terakhir — simpan hasilmu dengan login Google ya! Prosesnya cuma 2 detik. 🔐"
        );
        setShowLogin(true);
        setCurrentStep(5);
      }, 1500);

    } else if (currentStep === 5) {
      setTimeout(() => {
        addBot("Yuk login dulu untuk lihat hasilnya dan simpan riwayat penilaianmu.");
        setShowLogin(true);
      }, 1200);
    }
  };

  const handleWidgetAction = (type: "location" | "upload" | "cancel_location" | "cancel_upload", data?: unknown) => {
    const d = data as {
      address?: string;
      lat?: number;
      lng?: number;
      text?: string;
      url?: string;
    } | undefined;

    setIsTyping(true);

    if (type === "location") {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "user",
          text: "",
          time: formatTime(),
          widget: "location_result",
          locationData: {
            address: d?.address ?? "",
            lat: d?.lat ?? 0,
            lng: d?.lng ?? 0,
          },
        },
      ]);
      setTimeout(() => {
        addBot(
          `Lokasi ${d?.address ?? "usaha"} berhasil dicatat! Sinyal lokasi awal kelihatan menjanjikan 📍. Sekarang upload satu foto bukti transaksi biar skor makin kuat.`,
          { widget: "upload_request" }
        );
        setCurrentStep(4);
      }, 1500);

    } else if (type === "cancel_location") {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "user",
          text: "Mending saya ketik manual saja lokasinya.",
          time: formatTime(),
        },
      ]);
      setTimeout(() => {
        setIsTyping(false);
        addBot("Tidak masalah! Tolong ketikkan alamat lengkap usaha kamu di bawah ini ya. ✍️");
        // Tetap di step 3 agar dia mengisi text text-based location
      }, 1200);

    } else if (type === "upload") {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "user",
          text: d?.text ?? "Ini fotonya.",
          time: formatTime(),
          widget: "image_result",
          attachmentUrl: d?.url,
        },
      ]);
      setTimeout(() => {
        addBot(
          "Dokumennya sudah aku baca dan angkanya berhasil diekstrak 📊. Tinggal satu langkah — simpan hasilmu dengan login Google!"
        );
        setShowLogin(true);
        setCurrentStep(5);
      }, 1800);
    } else if (type === "cancel_upload") {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "user",
          text: "Maaf, gambar tidak jelas atau saya ingin ketik manual angkanya saja.",
          time: formatTime(),
        },
      ]);
      setTimeout(() => {
        setIsTyping(false);
        addBot("Tidak masalah. Tolong ketik perkiraan omzet bulanan kamu di bawah ini, ya. ✍️");
        // Tetap di step 4 agar dia mengetik angkanya secara manual.
      }, 1200);
    }
  };

  const handleUndo = () => {
    // Find last user message
    const lastUserIndex = [...messages].reverse().findIndex(m => m.sender === "user");
    if (lastUserIndex === -1) return;

    const trueIndex = messages.length - 1 - lastUserIndex;
    const msgToEdit = messages[trueIndex];

    // Remove it and all subsequent bot messages
    setMessages(prev => prev.slice(0, trueIndex));
    if (msgToEdit.text && msgToEdit.text !== "Mending saya ketik manual saja lokasinya.") {
      setInputValue(msgToEdit.text);
    }
  };

  const handleFileUpload = (file: File, previewUrl: string) => {
    handleWidgetAction("upload", {
      text: `Foto "${file.name}" berhasil diunggah.`,
      url: previewUrl,
    });
  };

  const handleFileCancel = () => {
    handleWidgetAction("cancel_upload");
  };

  const handleGoogleLogin = () => {
    setIsTyping(true);

    // 1. Set user di AuthContext (persisted via sessionStorage)
    login(MOCK_GOOGLE_USER);

    // 2. Simpan sesi terakhir ke localStorage (untuk ResumeBanner)
    localStorage.setItem(
      "skorinaja_last_session",
      JSON.stringify({
        id: "session-demo-001",
        name: "Warung Sembako Bu Sari",
        progress: 100,
        lastActive: new Date().toLocaleString("id-ID", {
          day: "numeric", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        }),
      })
    );

    // 3. Redirect ke dashboard sesi
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
    handleUndo,
    handleWidgetAction,
    handleFileUpload,
    handleFileCancel,
    handleGoogleLogin,
    currentStep,
  };
}
