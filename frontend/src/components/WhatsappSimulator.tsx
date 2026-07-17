import { useEffect, useRef, useState } from "react";
import { api, type MatchCard } from "../api";
import { Button, Input } from "./ui";

interface ChatMsg {
  dir: "in" | "out";
  text: string;
  kind?: "text" | "voice" | "image";
  cards?: MatchCard[];
}

const QUICK = [
  { label: "Nike size 9?", payload: { type: "text", text: "Nike shoes size 9 available?" } },
  { label: "Yes, reserve", payload: { type: "text", text: "yes" } },
  { label: "Voice order", payload: { type: "voice", text: "do kilo tandul ani ek Maggi" } },
  { label: "Dikhao", payload: { type: "image", media_url: "screenshot?q=blue checked shirt" } },
  { label: "Last order?", payload: { type: "text", text: "my last order?" } },
];

export function WhatsappSimulator({ businessId }: { businessId?: string }) {
  const [customer, setCustomer] = useState({ from_no: "+919900555001", name: "Demo customer" });
  const [messages, setMessages] = useState<ChatMsg[]>([
    { dir: "out", text: "Hi! Munim is ready for the shop chat." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [waMode, setWaMode] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Stop timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startRecording() {
    if (busy || isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        
        setBusy(true);
        const userMsg: ChatMsg = { dir: "in", text: "🎤 Voice note (transcribing...)", kind: "voice" };
        setMessages((m) => [...m, userMsg]);

        try {
          const sttRes = await api.transcribeAudio(audioBlob);
          const transcript = sttRes.text;

          setMessages((m) => {
            const updated = [...m];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                dir: "in",
                text: `🎤 Voice: "${transcript}"`,
                kind: "voice"
              };
            }
            return updated;
          });

          const res = await api.sendWhatsapp({
            from_no: customer.from_no,
            type: "voice",
            text: transcript,
            business_id: businessId
          });

          const replyMsg: ChatMsg = {
            dir: "out",
            text: res.reply || "Done!",
            cards: res.matches
          };

          setTimeout(() => {
            setMessages((m) => [...m, replyMsg]);
            setBusy(false);
          }, 600 + Math.random() * 500);

        } catch (err) {
          console.error("STT/WhatsApp error:", err);
          setMessages((m) => {
            const updated = [...m];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                dir: "in",
                text: `🎤 Voice note (transcription failed)`,
                kind: "voice"
              };
            }
            return updated;
          });
          const errMsg = "⚠️ Failed to process voice note.";
          setMessages((m) => [...m, { dir: "out", text: errMsg }]);
          setBusy(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure microphone permissions are granted.");
    }
  }

  function stopRecording() {
    if (!isRecording || !recorderRef.current) return;
    recorderRef.current.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // reflect the backend's actual WhatsApp mode (mock vs live Twilio)
  useEffect(() => {
    api.health().then((h) => setWaMode(h.whatsapp_mode)).catch(() => {});
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;

    const userMsg: ChatMsg = { dir: "in", text: input.trim(), kind: "text" };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const res = await api.sendWhatsapp({ from_no: customer.from_no, type: "text", text: userMsg.text, business_id: businessId });
      const replyMsg: ChatMsg = { dir: "out", text: res.reply || "Sorry, I didn't understand.", cards: res.matches };

      // Simulate typing delay
      setTimeout(() => {
        setMessages((m) => [...m, replyMsg]);
        setBusy(false);
      }, 600 + Math.random() * 500);
    } catch {
      const errMsg = import.meta.env.VITE_API_URL 
        ? "⚠️ Backend connection failed. The server might be waking up or offline."
        : "⚠️ Backend not running. Start the server on :8000.";
      setMessages((m) => [...m, { dir: "out", text: errMsg }]);
      setBusy(false);
    }
  }

  async function handleQuick(p: any) {
    if (busy) return;
    const label = p.type === "voice" ? "🎤 Voice note" : p.type === "image" ? "📷 Dikhao" : p.text;
    const userMsg: ChatMsg = { dir: "in", text: label, kind: p.type };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);

    try {
      const res = await api.sendWhatsapp({ from_no: customer.from_no, ...p, business_id: businessId });
      const replyMsg: ChatMsg = { dir: "out", text: res.reply || "Done!", cards: res.matches };
      setTimeout(() => {
        setMessages((m) => [...m, replyMsg]);
        setBusy(false);
      }, 600 + Math.random() * 500);
    } catch {
      const errMsg = import.meta.env.VITE_API_URL 
        ? "⚠️ Backend connection failed."
        : "⚠️ Backend not running.";
      setMessages((m) => [...m, { dir: "out", text: errMsg }]);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl glass-card backdrop-blur-xl border border-white/35 h-[600px] shadow-glass">
      <div className="bg-[#075E54]/85 text-white backdrop-blur-md flex items-center gap-3 px-4 py-3 shrink-0 border-b border-white/10">
        <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden shrink-0">
          <span className="material-symbols-outlined text-sm text-white">smart_toy</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Munim AI</p>
          <p className="text-[11px] text-white/70">
            {busy ? "typing..." : waMode === "twilio" ? "🟢 Live · Twilio Connected" : "WhatsApp preview · mock mode"}
          </p>
        </div>
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-[#4ae176] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4ae176]" />
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 ledger-rule scroll-hidden">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.dir === "out" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[85%] rounded-lg p-3 text-sm shadow-sm backdrop-blur-md ${
                msg.dir === "out"
                  ? "bg-white/80 text-[#0f2b1d] border border-white/40 rounded-tl-none"
                  : "bg-[#DCF8C6]/85 text-[#0f2b1d] border border-white/30 rounded-tr-none"
              }`}
            >
              <p>{msg.text}</p>
              {msg.cards && msg.cards.length > 0 && (
                <div className="mt-2 space-y-2 border-t border-outline-variant/30 pt-2">
                  {msg.cards.slice(0, 2).map((c, j) => (
                    <div key={j} className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium truncate">{c.name}</span>
                      <span className="font-mono shrink-0">₹{c.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg rounded-tl-none p-3 max-w-[85%] shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 bg-white/40 backdrop-blur-md border-t border-white/20 px-3 py-2 flex gap-1 overflow-x-auto scroll-hidden">
        {QUICK.map((q) => (
          <button
            key={q.label}
            onClick={() => handleQuick(q.payload)}
            disabled={busy}
            className="shrink-0 rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            {q.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSend} className="shrink-0 flex items-center gap-2 bg-white/45 backdrop-blur-md px-3 py-2 border-t border-white/20">
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 animate-pulse">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={stopRecording}
              className="text-xs font-semibold uppercase bg-red-600 text-white rounded-lg px-3 py-1 hover:bg-red-700 transition-colors"
            >
              Stop & Send
            </button>
          </div>
        ) : (
          <>
            <Input
              value={input}
              onChange={(e: any) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-sm outline-none focus:border-primary-container"
              disabled={busy}
            />
            
            <button
              type="button"
              onClick={startRecording}
              disabled={busy}
              className="min-h-[40px] min-w-[40px] rounded-xl bg-surface-container-low text-on-surface-variant flex items-center justify-center hover:bg-surface-container-high transition-colors disabled:opacity-50"
              title="Record voice note"
            >
              <span className="material-symbols-outlined text-sm">mic</span>
            </button>

            <Button
              type="submit"
              disabled={busy || !input.trim()}
              className="min-h-[40px] min-w-[40px] rounded-xl bg-primary-container text-white flex items-center justify-center disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">send</span>
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
