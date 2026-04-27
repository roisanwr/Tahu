"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { API_BASE_URL } from "../lib/supabase";

export type MessageWidget =
  | "none"
  | "location_request"
  | "location_result"
  | "upload_request"
  | "image_result"
  | "summary_card"
  | "scoring_complete";

export type Message = {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  widget?: MessageWidget;
  attachmentUrl?: string;
  locationData?: { address: string; lat: number; lng: number };
  geoscoreData?: {
    locationScore: number;
    marketDistanceKm: number | null;
    marketNearestName: string | null;
  };
  scoringData?: {
    assessmentId: string;
    finalScore: number;
    riskLevel: string;
  };
};

const formatTime = () =>
  new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });

// ── Helpers ─────────────────────────────────────────────────

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ── Hook ─────────────────────────────────────────────────────

export function useChatLogic() {
  const router = useRouter();
  const { isLoggedIn, login, token } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isGettingGeo, setIsGettingGeo] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // ── Initial state based on Auth ──────────────────────────

  useEffect(() => {
    if (!isLoggedIn) {
      setMessages([
        {
          id: "intro-1",
          sender: "bot",
          text: "Halo! Selamat datang di TAHU 👋 Silakan login dengan Google untuk mulai melengkapi profil usahamu.",
          time: formatTime(),
        },
      ]);
      setShowLogin(true);
    } else if (isLoggedIn && token && !sessionId) {
      setShowLogin(false);
      initSession();
    }
  }, [isLoggedIn, token]);

  // ── Progress step mapping ─────────────────────────────────

  const updateStepFromStage = (stage: string | null | undefined) => {
    const stageMap: Record<string, number> = {
      intro: 1,
      profil: 2,
      keuangan: 3,
      geolokasi: 4,
      dokumen: 5,
      summary: 6,
    };
    if (stage && stageMap[stage]) setCurrentStep(stageMap[stage]);
  };

  // ── Session Initialization ────────────────────────────────

  const initSession = async () => {
    if (!token) return;
    setIsTyping(true);
    try {
      // 1. Cek apakah sudah ada bisnis existing
      let bizId: string | null = null;
      let existingSessionId: string | null = null;

      const storedSession = localStorage.getItem("skorinaja_last_session");
      const storedBiz = localStorage.getItem("skorinaja_last_business");

      const resBizList = await fetch(`${API_BASE_URL}/businesses`, {
        headers: authHeaders(token),
      });

      if (resBizList.ok) {
        const bizList = await resBizList.json();
        if (bizList.length > 0) {
          // Pakai bisnis yang sudah ada
          bizId = bizList[0].id;
          setBusinessId(bizId);
        }
      }

      if (!bizId) {
        // Buat bisnis baru — user baru
        const resBiz = await fetch(`${API_BASE_URL}/businesses`, {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({ business_name: "Usaha Saya" }),
        });
        if (!resBiz.ok) throw new Error("Gagal membuat profil bisnis");
        const biz = await resBiz.json();
        bizId = biz.id;
        setBusinessId(bizId);
        localStorage.setItem("skorinaja_last_business", bizId!);
      }

      // 2. Coba resume session yang tersimpan
      if (storedSession && bizId) {
        const resSess = await fetch(`${API_BASE_URL}/sessions/${storedSession}`, {
          headers: authHeaders(token),
        });
        if (resSess.ok) {
          const sess = await resSess.json();
          // Resume hanya jika session masih active (belum complete)
          if (sess.status === "active" || sess.status === "pending_score") {
            existingSessionId = sess.session_id;
            setSessionId(existingSessionId);
            updateStepFromStage(sess.interview_stage);

            // Load last few messages
            const resMsgs = await fetch(`${API_BASE_URL}/sessions/${existingSessionId}/messages`, {
              headers: authHeaders(token),
            });
            if (resMsgs.ok) {
              const msgs = await resMsgs.json();
              if (msgs.length > 0) {
                const lastMessages = msgs.slice(-10).map((m: any, i: number) => ({
                  id: `history-${i}`,
                  sender: m.role === "user" ? "user" : ("bot" as const),
                  text: m.content,
                  time: formatTime(),
                  widget: m.ui_trigger
                    ? _uiTriggerToWidget(m.ui_trigger)
                    : undefined,
                }));
                setMessages(lastMessages);
                setIsTyping(false);
                return;
              }
            }
          }
        }
      }

      // 3. Buat sesi baru
      const resSess = await fetch(`${API_BASE_URL}/sessions`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ business_id: bizId, mode: "basic" }),
      });
      if (!resSess.ok) throw new Error("Gagal membuat sesi");
      const sess = await resSess.json();
      const newSessionId = sess.session_id;
      setSessionId(newSessionId);
      localStorage.setItem("skorinaja_last_session", newSessionId);

      // 4. Kirim pesan pembuka ke RINA
      await sendMessageToBackend(newSessionId, "Halo");
    } catch (e: any) {
      console.error("initSession error:", e);
      addBot("Maaf, ada masalah saat mempersiapkan sesi ya Kak 😅 Coba refresh halaman ini.");
      setIsTyping(false);
    }
  };

  // ── Send message to RINA ──────────────────────────────────

  const sendMessageToBackend = async (sid: string, text: string) => {
    if (!token) return;
    setIsTyping(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${sid}/messages`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ content: text, message_type: "text" }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 429) {
          addBot("Sebentar Kak, pesan terlalu cepat 😄 Tunggu 1 detik ya lalu kirim lagi!");
        } else {
          addBot(errData?.detail?.message || "Ups, koneksi terputus. Boleh diulang Kak?");
        }
        return;
      }

      const data = await res.json();

      // Update step from stage
      updateStepFromStage(data.current_stage);

      // Map ui_trigger ke widget
      const extra: Partial<Message> = {};
      if (data.ui_trigger) {
        const widget = _uiTriggerToWidget(data.ui_trigger);
        if (widget !== "none") extra.widget = widget;
        if (data.ui_trigger === "login_gate") setShowLogin(true);
        if (data.ui_trigger === "summary_card") extra.widget = "summary_card";
      }

      addBot(data.content ?? data.message ?? "", extra);
    } catch (e) {
      console.error("sendMessageToBackend error:", e);
      addBot("Maaf, API Backend tidak merespon. Cek koneksi internet ya Kak.");
    }
  };

  // ── Upload dokumen ke backend ─────────────────────────────

  const uploadDocumentToBackend = async (
    sid: string,
    file: File,
    docType: string = "foto_usaha"
  ): Promise<{ success: boolean; docId?: string; ocrAmount?: number | null; fileUrl?: string }> => {
    if (!token) return { success: false };
    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);

      const res = await fetch(`${API_BASE_URL}/sessions/${sid}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // Jangan set Content-Type — biar browser set boundary
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData?.detail?.message || "Upload gagal";
        throw new Error(msg);
      }

      const data = await res.json();
      return {
        success: true,
        docId: data.document_id,
        ocrAmount: data.ocr_extracted_amount,
        fileUrl: data.file_url,
      };
    } catch (e: any) {
      console.error("uploadDocumentToBackend error:", e);
      throw e;
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // ── Submit geoscore ke backend ────────────────────────────

  const submitGeoscoreToBackend = async (
    sid: string,
    lat: number,
    lon: number,
    address: string
  ) => {
    if (!token) return null;
    setIsGettingGeo(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${sid}/geoscore`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ latitude: lat, longitude: lon, address }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error("submitGeoscoreToBackend error:", e);
      return null;
    } finally {
      setIsGettingGeo(false);
    }
  };

  // ── Complete session → trigger scoring pipeline ───────────

  const completeSession = async () => {
    if (!token || !sessionId) return;
    setIsCompleting(true);
    setIsTyping(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/complete`, {
        method: "POST",
        headers: authHeaders(token),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        addBot(
          errData?.detail?.message ||
            "Maaf Kak, ada masalah saat menghitung skor. Tim kami sedang dicek ya 🙏"
        );
        return;
      }

      const data = await res.json();

      // Simpan assessment id
      if (data.assessment_id) {
        localStorage.setItem("skorinaja_last_assessment", data.assessment_id);
        localStorage.setItem("skorinaja_last_session", sessionId);
      }

      // Tampilkan pesan selesai dengan scoring_complete widget
      addBot(
        `Yeay, profil usaha Kakak sudah selesai dianalisis! 🎉 Skor kreditmu sudah siap dilihat di Dashboard.`,
        {
          widget: "scoring_complete",
          scoringData: {
            assessmentId: data.assessment_id,
            finalScore: data.final_score,
            riskLevel: data.risk_level,
          },
        }
      );
    } catch (e) {
      console.error("completeSession error:", e);
      addBot("Maaf Kak, ada masalah teknis. Coba lagi nanti ya 🙏");
    } finally {
      setIsCompleting(false);
      setIsTyping(false);
    }
  };

  // ── addBot helper ─────────────────────────────────────────

  const addBot = (text: string, extra: Partial<Message> = {}) => {
    setIsTyping(false);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "bot",
        text,
        time: formatTime(),
        ...extra,
      },
    ]);
  };

  // ── handleSend ────────────────────────────────────────────

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const userText = inputValue;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "user", text: userText, time: formatTime() },
    ]);
    setInputValue("");

    if (sessionId) {
      sendMessageToBackend(sessionId, userText);
    }
  };

  // ── handleWidgetAction ────────────────────────────────────

  const handleWidgetAction = async (
    type: "location" | "upload" | "cancel_location" | "cancel_upload" | "complete_session",
    data?: unknown
  ) => {
    const d = data as any;

    if (type === "location" && sessionId) {
      const { address, lat, lng } = d ?? {};

      // Add location result message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "user",
          text: "",
          time: formatTime(),
          widget: "location_result",
          locationData: { address: address ?? "", lat: lat ?? 0, lng: lng ?? 0 },
        },
      ]);

      // 1. Submit ke geoscore endpoint
      const geoResult = await submitGeoscoreToBackend(sessionId, lat, lng, address);

      // 2. Kirim ke RINA dengan ringkasan hasil geo
      let geoMsg = `Lokasi pin: ${lat}, ${lng}. Alamat: ${address}`;
      if (geoResult) {
        geoMsg += ` (skor lokasi: ${geoResult.location_score}/100, jarak pasar: ${geoResult.market_distance_km?.toFixed(1) ?? "-"} km)`;
      }
      sendMessageToBackend(sessionId, geoMsg);

    } else if (type === "cancel_location" && sessionId) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "user",
          text: "Saya ketik manual saja lokasinya.",
          time: formatTime(),
        },
      ]);
      sendMessageToBackend(sessionId, "Saya ketik manual saja lokasinya");

    } else if (type === "upload" && sessionId) {
      const { file, text: fileText, url: previewUrl } = d ?? {};

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "user",
          text: fileText ?? "Ini fotonya.",
          time: formatTime(),
          widget: "image_result",
          attachmentUrl: previewUrl,
        },
      ]);

      if (file) {
        try {
          // Upload ke backend
          const uploadResult = await uploadDocumentToBackend(sessionId, file, d?.docType ?? "foto_usaha");
          if (uploadResult.success) {
            const ocrMsg = uploadResult.ocrAmount
              ? `File berhasil diupload dan dianalisis. Nominal terdeteksi: Rp ${uploadResult.ocrAmount.toLocaleString("id-ID")}`
              : "File berhasil diupload dan sedang dianalisis.";
            sendMessageToBackend(sessionId, ocrMsg);
          } else {
            sendMessageToBackend(sessionId, "File sudah diterima.");
          }
        } catch (uploadErr: any) {
          addBot(`Maaf Kak, upload gagal: ${uploadErr.message}. Coba foto lain ya.`);
        }
      } else {
        sendMessageToBackend(sessionId, fileText ?? "Dokumen sudah dikirim");
      }

    } else if (type === "cancel_upload" && sessionId) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "user",
          text: "Saya ingin ketik manual saja angkanya.",
          time: formatTime(),
        },
      ]);
      sendMessageToBackend(sessionId, "Saya ingin ketik manual saja angkanya");

    } else if (type === "complete_session") {
      await completeSession();
    }
  };

  // ── handleUndo ────────────────────────────────────────────

  const handleUndo = () => {
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.sender === "user");
    if (lastUserIndex === -1) return;
    const trueIndex = messages.length - 1 - lastUserIndex;
    const msgToEdit = messages[trueIndex];
    setMessages((prev) => prev.slice(0, trueIndex));
    if (msgToEdit.text) setInputValue(msgToEdit.text);
  };

  // ── File upload handler (dari ChatInput) ──────────────────

  const handleFileUpload = (file: File, previewUrl: string, docType?: string) => {
    handleWidgetAction("upload", {
      file,
      text: `Foto "${file.name}" berhasil dikirim.`,
      url: previewUrl,
      docType: docType ?? "foto_usaha",
    });
  };

  const handleFileCancel = () => {
    handleWidgetAction("cancel_upload");
  };

  // ── Google login ──────────────────────────────────────────

  const handleGoogleLogin = async () => {
    setIsTyping(true);
    await login();
  };

  // ── Navigate ke dashboard setelah scoring selesai ─────────

  const handleGoToDashboard = () => {
    router.push("/dashboard");
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
    handleGoToDashboard,
    currentStep,
    isUploadingDoc,
    isGettingGeo,
    isCompleting,
    sessionId,
    businessId,
  };
}

// ── Helpers ───────────────────────────────────────────────────

function _uiTriggerToWidget(trigger: string | null | undefined): MessageWidget {
  const map: Record<string, MessageWidget> = {
    map_picker: "location_request",
    file_upload: "upload_request",
    summary_card: "summary_card",
  };
  return (trigger && map[trigger]) ? map[trigger] : "none";
}
