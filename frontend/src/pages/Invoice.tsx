import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ScannedItem } from "../api";
import type { Product, Order, Business } from "../types";
import { Card, formatINR } from "../components/ui";
import { InvoiceModal } from "../components/InvoiceModal";

/* ─── Types ─── */

interface ScannedInvoice {
  id: string;
  vendor: string;
  date: string;
  items: string[];
  total: number;
  status: "processed" | "pending";
  type: "created" | "scanned";
}

interface LineItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

type TabKey = "create" | "scan";

/* ─── Main Component ─── */

export function Invoice({ bid, business }: { bid: string; business?: Business | null }) {
  const [tab, setTab] = useState<TabKey>("create");

  /* ─── Shared ledger state ─── */
  const [invoices, setInvoices] = useState<ScannedInvoice[]>([
    {
      id: "INV-2026-001",
      vendor: "Sharma Distributors",
      date: "2026-07-14",
      items: ["5 peti Maggi", "2 bags Basmati Rice"],
      total: 12450,
      status: "processed",
      type: "scanned",
    },
    {
      id: "INV-2026-002",
      vendor: "Vikas Soap Co.",
      date: "2026-07-13",
      items: ["10 boxes Lifebuoy Soap", "5 boxes Surf Excel"],
      total: 8200,
      status: "processed",
      type: "scanned",
    },
  ]);

  const totalValue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const createdCount = invoices.filter((i) => i.type === "created").length;
  const scannedCount = invoices.filter((i) => i.type === "scanned").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-6">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Total Invoice Value
          </span>
          <div className="mt-2">
            <span className="font-mono text-3xl font-bold text-slate-800">
              ₹{totalValue.toLocaleString("en-IN")}
            </span>
          </div>
        </Card>
        <Card className="p-6">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Sales Invoices Created
          </span>
          <div className="mt-2">
            <span className="font-mono text-3xl font-bold text-emerald-700">
              {createdCount}
            </span>
          </div>
        </Card>
        <Card className="p-6">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Supplier Bills Scanned
          </span>
          <div className="mt-2">
            <span className="font-mono text-3xl font-bold text-slate-800">
              {scannedCount}
            </span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {([
          { key: "create" as const, label: "📄 Create Invoice", icon: "receipt_long" },
          { key: "scan" as const, label: "📥 Scan Supplier Bill", icon: "document_scanner" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              tab === t.key
                ? "text-brand-700 border-brand-700"
                : "text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "create" && (
        <CreateInvoiceTab
          bid={bid}
          business={business}
          invoices={invoices}
          onSave={(inv) => setInvoices([inv, ...invoices])}
        />
      )}
      {tab === "scan" && (
        <ScanSupplierTab
          bid={bid}
          invoices={invoices}
          onSave={(inv) => setInvoices([inv, ...invoices])}
        />
      )}

      {/* Combined Ledger */}
      <Card className="p-6">
        <h3 className="font-bold text-slate-800 mb-4">All Invoices Ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3">Invoice ID</th>
                <th className="py-3">Type</th>
                <th className="py-3">Party</th>
                <th className="py-3">Date</th>
                <th className="py-3">Items</th>
                <th className="py-3">Amount</th>
                <th className="py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 text-sm hover:bg-slate-50/50">
                  <td className="py-4 font-mono font-medium text-slate-600">{inv.id}</td>
                  <td className="py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      inv.type === "created"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {inv.type === "created" ? "Sale" : "Purchase"}
                    </span>
                  </td>
                  <td className="py-4 font-semibold text-slate-800">{inv.vendor}</td>
                  <td className="py-4 text-slate-500">{inv.date}</td>
                  <td className="py-4 text-slate-600">
                    <div className="flex flex-wrap gap-1">
                      {inv.items.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                          {item}
                        </span>
                      ))}
                      {inv.items.length > 3 && (
                        <span className="text-slate-400 text-xs">+{inv.items.length - 3} more</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 font-mono font-semibold text-slate-800">
                    ₹{inv.total.toLocaleString("en-IN")}
                  </td>
                  <td className="py-4 text-right">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No invoices yet. Create one or scan a supplier bill to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════════════
   CREATE INVOICE TAB
   ══════════════════════════════════════════════════════════════════════════════ */

function CreateInvoiceTab({
  bid,
  business,
  invoices,
  onSave,
}: {
  bid: string;
  business?: Business | null;
  invoices: ScannedInvoice[];
  onSave: (inv: ScannedInvoice) => void;
}) {
  /* ─── Form state ─── */
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("Thank you for shopping with us!");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  /* ─── Product search ─── */
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load products on mount
  useEffect(() => {
    api.products(bid).then(setProducts).catch(() => {});
  }, [bid]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 8);

  /* ─── Calculations ─── */
  const subtotal = lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const taxableSubtotal = subtotal / 1.18;
  const cgst = taxableSubtotal * 0.09;
  const sgst = taxableSubtotal * 0.09;
  const grandTotal = subtotal;

  /* ─── Handlers ─── */
  function addProduct(product: Product) {
    // If already in list, increment qty
    const existing = lineItems.findIndex((i) => i.productId === product.id);
    if (existing >= 0) {
      const next = [...lineItems];
      next[existing].qty += 1;
      setLineItems(next);
    } else {
      setLineItems([...lineItems, {
        productId: product.id,
        name: product.name,
        qty: 1,
        unitPrice: product.price,
      }]);
    }
    setSearchQuery("");
    setShowDropdown(false);
  }

  function updateQty(idx: number, qty: number) {
    if (qty < 1) return;
    const next = [...lineItems];
    next[idx].qty = qty;
    setLineItems(next);
  }

  function updatePrice(idx: number, price: number) {
    if (price < 0) return;
    const next = [...lineItems];
    next[idx].unitPrice = price;
    setLineItems(next);
  }

  function removeItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearForm() {
    setCustomerName("");
    setCustomerPhone("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setNotes("Thank you for shopping with us!");
    setLineItems([]);
  }

  function saveToLedger() {
    if (lineItems.length === 0) return;
    const inv: ScannedInvoice = {
      id: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`,
      vendor: customerName || "Walk-in Customer",
      date: invoiceDate,
      items: lineItems.map((i) => `${i.qty}× ${i.name}`),
      total: grandTotal,
      status: "processed",
      type: "created",
    };
    onSave(inv);
    clearForm();
  }

  // Build a synthetic Order object for InvoiceModal preview
  const previewOrder: Order = {
    id: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`,
    status: "created",
    total: grandTotal,
    customer_name: customerName || "Walk-in Customer",
    customer_no: customerPhone || undefined,
    created_at: new Date(invoiceDate).toISOString(),
    items: lineItems.map((i) => ({
      product_id: i.productId,
      name: i.name,
      qty: i.qty,
      unit_price: i.unitPrice,
    })),
  };

  return (
    <Card className="p-6">
      <h3 className="font-bold text-slate-800 mb-1">Create Sales Invoice</h3>
      <p className="text-xs text-slate-400 mb-6">
        Generate a bill for walk-in or WhatsApp customers. Pick items from your inventory.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Form */}
        <div className="space-y-5">
          {/* Customer details */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in customer"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 98000 00000"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Product search */}
          <div ref={searchRef} className="relative">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Add Items from Inventory
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search products by name or brand..."
                className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>

            {/* Dropdown */}
            {showDropdown && searchQuery.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400">
                    No products found for "{searchQuery}"
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-400">
                          {p.brand && <>{p.brand} · </>}
                          Stock: {p.stock_qty}
                        </div>
                      </div>
                      <div className="text-sm font-mono font-semibold text-slate-700">
                        {formatINR(p.price)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Line items table */}
          {lineItems.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Item</th>
                    <th className="py-2.5 px-4 text-center w-24">Qty</th>
                    <th className="py-2.5 px-4 text-right w-32">Unit Price</th>
                    <th className="py-2.5 px-4 text-right w-28">Total</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateQty(idx, item.qty - 1)}
                            className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-lg transition-colors"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => updateQty(idx, parseInt(e.target.value) || 1)}
                            className="w-12 text-center border border-slate-200 rounded-md py-1 text-sm font-mono focus:border-brand-500 outline-none"
                          />
                          <button
                            onClick={() => updateQty(idx, item.qty + 1)}
                            className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-lg transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitPrice}
                          onChange={(e) => updatePrice(idx, parseFloat(e.target.value) || 0)}
                          className="w-28 text-right border border-slate-200 rounded-md px-2 py-1 text-sm font-mono focus:border-brand-500 outline-none"
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {formatINR(item.qty * item.unitPrice)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
              <span className="material-symbols-outlined text-slate-300 text-5xl mb-2">
                add_shopping_cart
              </span>
              <p className="text-sm text-slate-400 font-medium">
                Search and add products above to start building the invoice
              </p>
            </div>
          )}

          {/* Notes */}
          {lineItems.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Notes / Terms
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Payment terms, thank you message..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all resize-none"
              />
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div className="lg:sticky lg:top-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-brand-700 text-lg">calculate</span>
              Invoice Summary
            </h4>

            {lineItems.length > 0 ? (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Items ({lineItems.length})</span>
                    <span className="font-mono">{formatINR(subtotal)}</span>
                  </div>
                  <hr className="border-slate-200" />
                  <div className="flex justify-between text-slate-500">
                    <span>Taxable Subtotal</span>
                    <span className="font-mono">{formatINR(taxableSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-xs">
                    <span>CGST (9%)</span>
                    <span className="font-mono">{formatINR(cgst)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-xs">
                    <span>SGST (9%)</span>
                    <span className="font-mono">{formatINR(sgst)}</span>
                  </div>
                  <hr className="border-slate-200" />
                  <div className="flex justify-between font-bold text-slate-800 text-lg">
                    <span>Grand Total</span>
                    <span className="font-mono">{formatINR(grandTotal)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => setShowPreview(true)}
                    className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    Preview Invoice
                  </button>
                  <button
                    onClick={saveToLedger}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    Save to Ledger
                  </button>
                  <button
                    onClick={clearForm}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-semibold text-sm transition-all active:scale-[0.98]"
                  >
                    Clear
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">
                Add items to see the invoice summary
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {showPreview && lineItems.length > 0 && (
        <InvoiceModal
          order={previewOrder}
          business={business ?? null}
          onClose={() => setShowPreview(false)}
        />
      )}
    </Card>
  );
}


/* ══════════════════════════════════════════════════════════════════════════════
   SCAN SUPPLIER BILL TAB (existing OCR flow)
   ══════════════════════════════════════════════════════════════════════════════ */

function ScanSupplierTab({
  bid,
  invoices,
  onSave,
}: {
  bid: string;
  invoices: ScannedInvoice[];
  onSave: (inv: ScannedInvoice) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(async (file: File) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("Unsupported file type. Please upload PNG, JPG, WebP, or PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB.");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setScannedItems(null);

    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    setUploading(true);
    try {
      const result = await api.scanReceipt(bid, file);
      if (result.products.length === 0) {
        setError("No items could be extracted from this image. Try a clearer photo.");
        setScannedItems(null);
      } else {
        setScannedItems(result.products);
      }
    } catch (err: any) {
      const msg = err?.message || "Scan failed";
      if (msg.includes("503")) {
        setError("OCR engine is not available on the server.");
      } else if (msg.includes("401") || msg.includes("403")) {
        setError("Authentication error. Please log in again.");
      } else {
        setError(`Scan failed: ${msg}`);
      }
      setScannedItems(null);
    } finally {
      setUploading(false);
    }
  }, [bid]);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleConfirmItems = useCallback(async () => {
    if (!scannedItems || scannedItems.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await api.bulkProducts(bid, scannedItems);
      const inv: ScannedInvoice = {
        id: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`,
        vendor: selectedFile?.name.replace(/\.[^.]+$/, "") || "Scanned Invoice",
        date: new Date().toISOString().split("T")[0],
        items: scannedItems.map((i) => `${i.qty}x ${i.name}`),
        total: scannedItems.reduce((s, i) => s + i.price * i.qty, 0),
        status: "processed",
        type: "scanned",
      };
      onSave(inv);
      setScannedItems(null);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (err: any) {
      setError(`Failed to save products: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }, [scannedItems, bid, invoices, selectedFile, previewUrl, onSave]);

  const handleCancelScan = useCallback(() => {
    setScannedItems(null);
    setSelectedFile(null);
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const handleRemoveItem = useCallback((index: number) => {
    setScannedItems((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next.length > 0 ? next : null;
    });
  }, []);

  return (
    <Card className="p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        onChange={handleFileChange}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
      />

      <h3 className="font-bold text-slate-800 mb-1">Onboard Stock via Invoice / Bill photo</h3>
      <p className="text-xs text-slate-400 mb-4">
        Upload a supplier bill to auto-extract product items via OCR
      </p>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex items-start gap-2">
          <span className="material-symbols-outlined text-red-500 text-lg mt-0.5">error</span>
          <div>
            <p className="font-medium">Scan Error</p>
            <p className="mt-0.5 text-red-600">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* Upload zone */}
      {!scannedItems && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center ${
            dragOver
              ? "border-brand-500 bg-brand-50/50 scale-[1.01]"
              : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
          } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          {previewUrl && (
            <img src={previewUrl} alt="Invoice preview" className="max-h-40 rounded-lg mb-4 shadow-sm border border-slate-200" />
          )}
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-200 border-t-brand-600 mb-3" />
              <p className="text-sm text-brand-700 font-semibold">Scanning invoice with OCR...</p>
              <p className="text-xs text-slate-400 mt-1">Extracting items from {selectedFile?.name || "image"}</p>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-slate-400 text-5xl mb-3">cloud_upload</span>
              <p className="text-sm text-slate-600 font-medium mb-1">Drag and drop your supplier invoice photo or PDF here</p>
              <p className="text-xs text-slate-400 mb-4">Supports PNG, JPG, PDF up to 5MB (Receipt OCR extracts items automatically)</p>
              <button
                onClick={handleFileSelect}
                className="bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-brand-800 transition-all active:scale-95"
              >
                Select Invoice File
              </button>
            </>
          )}
        </div>
      )}

      {/* Scanned results */}
      {scannedItems && scannedItems.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                Extracted {scannedItems.length} Items
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">Review, then confirm to add to inventory</p>
            </div>
            {selectedFile && (
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">{selectedFile.name}</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-2 pr-4">Item Name</th>
                  <th className="py-2 pr-4 text-right">Qty</th>
                  <th className="py-2 pr-4 text-right">Unit Price</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {scannedItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-50 text-sm hover:bg-slate-50/50">
                    <td className="py-3 pr-4 font-medium text-slate-700">{item.name}</td>
                    <td className="py-3 pr-4 text-right font-mono text-slate-600">{item.qty}</td>
                    <td className="py-3 pr-4 text-right font-mono text-slate-600">₹{item.price.toLocaleString("en-IN")}</td>
                    <td className="py-3 text-right font-mono font-semibold text-slate-800">₹{(item.price * item.qty).toLocaleString("en-IN")}</td>
                    <td className="py-3 text-right">
                      <button onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-500 transition-colors" title="Remove item">
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={3} className="py-3 text-right font-semibold text-slate-600 text-sm">Grand Total:</td>
                  <td className="py-3 text-right font-mono font-bold text-lg text-slate-800">
                    ₹{scannedItems.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString("en-IN")}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleConfirmItems}
              disabled={saving}
              className={`bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 ${
                saving ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <span className="material-symbols-outlined text-lg">inventory_2</span>
              {saving ? "Adding to Inventory..." : "Confirm & Add to Inventory"}
            </button>
            <button onClick={handleCancelScan} disabled={saving} className="bg-slate-100 text-slate-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-slate-200 transition-all active:scale-95">
              Cancel
            </button>
            <button onClick={handleFileSelect} disabled={saving} className="bg-slate-100 text-slate-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">upload_file</span>
              Scan Another
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
