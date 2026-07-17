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

  // Modal state for Add/Edit product
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; product: Product } | null>(null);
  const [form, setForm] = useState({
    name: "",
    brand: "",
    category: "",
    price: 0,
    stock_qty: 0,
    image_url: "",
  });

  const load = () => api.products(bid).then(setProducts).catch(() => {});
  useEffect(() => {
    if (bid) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bid, refreshKey]);

  useEffect(() => {
    if (modal?.mode === "edit" && "product" in modal) {
      setForm({
        name: modal.product.name,
        brand: modal.product.brand || "",
        category: modal.product.category || "",
        price: modal.product.price,
        stock_qty: modal.product.stock_qty,
        image_url: modal.product.image_url || "",
      });
    } else {
      setForm({
        name: "",
        brand: "",
        category: "",
        price: 0,
        stock_qty: 0,
        image_url: "",
      });
    }
  }, [modal]);

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

  async function handleDelete(pid: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.deleteProduct(pid);
      await load();
    } catch {
      alert("Failed to delete product.");
    }
  }

  async function handleSaveProduct() {
    if (!form.name || form.price < 0) return;
    setSaving(true);
    try {
      const body = {
        name: form.name,
        brand: form.brand || null,
        category: form.category || null,
        price: form.price,
        stock_qty: form.stock_qty,
        image_url: form.image_url || null,
        attributes: {},
      };

      if (modal?.mode === "add") {
        await api.createProduct(bid, body);
      } else if (modal?.mode === "edit" && "product" in modal) {
        await api.updateProduct(modal.product.id, body);
      }
      setModal(null);
      await load();
    } catch {
      alert("Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter((p) =>
    `${p.name} ${p.brand || ""} ${p.category || ""}`.toLowerCase().includes(q.toLowerCase())
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
            onClick={() => setModal({ mode: "add" })}
            className="text-sm font-semibold bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg px-3 py-1.5 flex items-center gap-1"
          >
            ➕ Add Product
          </button>

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
              className={`group relative rounded-xl border p-3 transition ${hl ? "flash border-brand-400" : "border-slate-100"} ${
                low ? "bg-amber-50/50" : "bg-white"
              }`}
            >
              {/* Quick Actions (Hover overlay) */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex gap-1 z-10">
                <button
                  onClick={() => setModal({ mode: "edit", product: p })}
                  className="bg-white/90 shadow-md p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-600 hover:text-slate-900 animate-fade-in"
                  title="Edit product"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="bg-white/90 shadow-md p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-red-500 hover:text-red-700 animate-fade-in"
                  title="Delete product"
                >
                  🗑️
                </button>
              </div>

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

      {/* Product Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4 animate-fade-in" onClick={() => !saving && setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h4 className="font-bold text-slate-800">
                {modal.mode === "add" ? "➕ Add Product" : "✏️ Edit Product"}
              </h4>
            </div>
            <div className="p-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase">Product Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-brand-500"
                placeholder="Product name"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Brand</label>
                  <input
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-brand-500"
                    placeholder="Brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-brand-500"
                    placeholder="Category"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Price (₹)</label>
                  <input
                    type="number"
                    value={form.price || ""}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Stock Quantity</label>
                  <input
                    type="number"
                    value={form.stock_qty || ""}
                    onChange={(e) => setForm({ ...form, stock_qty: parseInt(e.target.value) || 0 })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <label className="block text-xs font-semibold text-slate-500 uppercase">Image URL</label>
              <input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-brand-500"
                placeholder="https://..."
              />
            </div>
            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button onClick={() => setModal(null)} disabled={saving} className="text-sm text-slate-500 px-3 py-1.5">
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={saving || !form.name}
                className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-1.5 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Scan Dialog */}
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
