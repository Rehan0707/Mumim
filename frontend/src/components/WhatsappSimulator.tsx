import { useEffect, useRef, useState } from "react";
import { api, type MatchCard } from "../api";

interface ChatMsg {
  dir: "in" | "out";
  text: string;
  kind?: "text" | "voice" | "image";
  cards?: MatchCard[];
}

const QUICK = [
  { label: "🛍️ Nike size 9?", payload: { type: "text", text: "Nike shoes size 9 available?" } },
  { label: "✅ Yes, reserve", payload: { type: "text", text: "yes" } },
  { label: "🎤 Voice: 2kg rice + Maggi", payload: { type: "voice", text: "do kilo tandul ani ek Maggi" } },
  { label: "📷 Dikhao: blue shirt", payload: { type: "image", media_url: "screenshot?q=blue checked shirt" } },
  { label: "🕑 My last order?", payload: { type: "text", text: "my last order?" } },
];

export function WhatsappSimulator() {
  const [customer, setCustomer] = useState({ from_no: "+919900555001", name: "Judge (Demo)" });
  const [messages, setMessages] = useState<ChatMsg[]>([
    { dir: "out", text: "👋 Namaste! Munim.ai bot yahan hai. Kuch bhi poochho." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(payload: { type: string; text?: string; media_url?: string }) {
    if (busy) return;
    setBusy(true);
    const shown =
      payload.type === "voice"
        ? `🎤 “${payload.text}”`
        : payload.type === "image"
        ? "📷 [screenshot]"
        : payload.text || "";
    setMessages((m) => [...m, { dir: "in", text: shown, kind: payload.type as any }]);
    try {
      const res = await api.sendWhatsapp({ ...customer, ...payload });
      setMessages((m) => [
        ...m,
        { dir: "out", text: res.reply, cards: res.matches && res.matches.length ? res.matches : undefined },
      ]);
    } catch {
      setMessages((m) => [...m, { dir: "out", text: "⚠️ (bot offline — is the backend running?)" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-[340px] shrink-0 p-4">
      <div className="sticky top-4">
        {/* phone frame */}
        <div className="rounded-[2.2rem] bg-black p-2.5 shadow-2xl">
          <div className="rounded-[1.8rem] overflow-hidden bg-wa-bg h-[620px] flex flex-col">
            {/* header */}
            <div className="bg-wa-panel px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-600 grid place-items-center text-white font-bold">R</div>
              <div className="flex-1">
                <div className="text-white text-sm font-semibold">Ramesh Vastralaya</div>
                <div className="text-[11px] text-emerald-400">● online · Munim.ai</div>
              </div>
              <div className="text-slate-400 text-xs">📞 🎥</div>
            </div>

            {/* customer selector */}
            <div className="bg-wa-panel/60 px-3 py-1.5 flex items-center gap-2 border-t border-white/5">
              <input
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="bg-transparent text-[11px] text-slate-300 w-24 outline-none"
                title="Customer name"
              />
              <input
                value={customer.from_no}
                onChange={(e) => setCustomer({ ...customer, from_no: e.target.value })}
                className="bg-transparent text-[11px] text-slate-400 flex-1 outline-none text-right"
                title="Customer WhatsApp number"
              />
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2"
              style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.2),rgba(0,0,0,0.2))" }}>
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.dir === "in" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg text-[13px] whitespace-pre-wrap leading-snug ${
                      m.dir === "in" ? "bg-wa-bubble text-white rounded-br-none" : "bg-wa-inbound text-slate-100 rounded-bl-none"
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.cards && (
                    <div className="mt-1.5 flex flex-col gap-1.5 max-w-[85%]">
                      {m.cards.map((c) => (
                        <div key={c.product_id} className="flex items-center gap-2.5 bg-wa-inbound rounded-lg p-1.5 pr-3 shadow-sm">
                          {c.image_url && (
                            <img
                              src={c.image_url}
                              alt={c.name}
                              className="w-12 h-12 rounded-md object-cover shrink-0 bg-black/20"
                              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-[12px] text-slate-100 font-medium truncate">{c.name}</div>
                            <div className="text-[12px] text-emerald-400 font-semibold">
                              ₹{c.price.toLocaleString("en-IN")}
                              {c.size ? <span className="text-slate-400 font-normal"> · size {c.size}</span> : null}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {c.stock_qty > 0 ? `${c.stock_qty} in stock` : "out of stock"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {busy && <div className="text-[11px] text-slate-400 pl-1">Munim is typing…</div>}
            </div>

            {/* quick actions */}
            <div className="bg-wa-panel px-2 pt-2 pb-1 flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button
                  key={q.label}
                  onClick={() => send(q.payload)}
                  disabled={busy}
                  className="text-[10.5px] bg-white/10 hover:bg-white/20 text-slate-100 px-2 py-1 rounded-full disabled:opacity-40"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* input */}
            <form
              className="bg-wa-panel p-2 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) {
                  send({ type: "text", text: input.trim() });
                  setInput("");
                }
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message"
                className="flex-1 bg-wa-inbound text-slate-100 text-sm rounded-full px-4 py-2 outline-none placeholder:text-slate-500"
              />
              <button className="w-9 h-9 rounded-full bg-brand-600 text-white grid place-items-center">➤</button>
            </form>
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-3">
          WhatsApp simulator · mock mode (swap in Twilio later)
        </p>
      </div>
    </div>
  );
}
