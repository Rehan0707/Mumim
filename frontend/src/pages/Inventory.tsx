import { useEffect, useRef, useState } from "react";
import { api, type ScannedItem } from "../api";
import type { Product } from "../types";
import { Card, formatINR } from "../components/ui";

export function Inventory({ bid, refreshKey, highlight }: { bid: string; refreshKey: number; highlight?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string>();
  const [draft, setDraft] = useState<ScannedItem[] | null>(null); // review list
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.products(bid).then(setProducts).catch(() => {});
  useEffect(() => {
    if (bid) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bid, refreshKey]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!file) return;
    setScanning(true);
    setScanError(undefined);
    try {
      const res = await api.scanReceipt(bid, file);
      if (!res.products.length) setScanError("No products detected — try a clearer, straight photo.");
      setDraft(res.products);
    } catch (err: any) {
      setScanError(err?.message === "503" ? "OCR engine not installed on the server." : "Scan failed — try again.");
    } finally {
      setScanning(false);
    }
  }

  function editDraft(i: number, patch: Partial<ScannedItem>) {
    setDraft((d) => d && d.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }
  function removeDraft(i: number) {
    setDraft((d) => d && d.filter((_, j) => j !== i));
  }

  async function saveDraft() {
    if (!draft?.length) return;
    setSaving(true);
    try {
      await api.bulkProducts(bid, draft);
      setDraft(null);
      await load();
    } catch {
      setScanError("Could not save products.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter((p) =>
    `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="font-bold text-slate-800">Inventory · {products.length} products</h3>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-brand-500"
          />
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-3 py-1.5 disabled:opacity-50 flex items-center gap-1.5"
          >
            {scanning ? "Scanning…" : "📷 Scan bill / receipt"}
          </button>
        </div>
      </div>

      {scanError && !draft && <div className="mb-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{scanError}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => {
          const low = p.stock_qty <= 3;
          const hl = highlight === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-3 transition ${hl ? "flash border-brand-400" : "border-slate-100"} ${
                low ? "bg-amber-50/50" : "bg-white"
              }`}
            >
              <div className="h-28 rounded-lg bg-slate-100 mb-2 overflow-hidden grid place-items-center">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-slate-300 text-3xl">📦</span>
                )}
              </div>
              <div className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">{p.name}</div>
              <div className="text-xs text-slate-400 mb-1">
                {p.brand}
                {p.attributes.size ? ` · size ${p.attributes.size}` : ""}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{formatINR(p.price)}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${low ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {p.stock_qty} in stock
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {draft && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onClick={() => !saving && setDraft(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h4 className="font-bold text-slate-800">🧾 Scanned {draft.length} item{draft.length === 1 ? "" : "s"}</h4>
              <p className="text-xs text-slate-400">Review & edit, then add to inventory. Auto-extracted by OCR.</p>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {draft.length === 0 && <div className="text-sm text-slate-400">Nothing to add.</div>}
              {draft.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={row.name}
                    onChange={(e) => editDraft(i, { name: e.target.value })}
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-brand-500"
                  />
                  <div className="flex items-center text-sm border border-slate-200 rounded-lg px-2 py-1.5 w-24">
                    <span className="text-slate-400">₹</span>
                    <input
                      type="number"
                      value={row.price}
                      onChange={(e) => editDraft(i, { price: parseFloat(e.target.value) || 0 })}
                      className="w-full outline-none"
                    />
                  </div>
                  <input
                    type="number"
                    title="stock qty"
                    value={row.stock_qty}
                    onChange={(e) => editDraft(i, { stock_qty: parseInt(e.target.value) || 0, qty: parseInt(e.target.value) || 0 })}
                    className="w-14 text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-brand-500"
                  />
                  <button onClick={() => removeDraft(i)} className="text-slate-300 hover:text-red-500 px-1" title="remove">✕</button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button onClick={() => setDraft(null)} disabled={saving} className="text-sm text-slate-500 px-3 py-1.5">Cancel</button>
              <button
                onClick={saveDraft}
                disabled={saving || draft.length === 0}
                className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-1.5 disabled:opacity-50"
              >
                {saving ? "Adding…" : `Add ${draft.length} to inventory`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
