import { useState } from "react";
import { Card } from "../components/ui";

interface ScannedInvoice {
  id: string;
  vendor: string;
  date: string;
  items: string[];
  total: number;
  status: "processed" | "pending";
}

export function Invoice({ bid }: { bid: string }) {
  const [invoices, setInvoices] = useState<ScannedInvoice[]>([
    {
      id: "INV-2026-001",
      vendor: "Sharma Distributors",
      date: "2026-07-14",
      items: ["5 peti Maggi", "2 bags Basmati Rice"],
      total: 12450,
      status: "processed",
    },
    {
      id: "INV-2026-002",
      vendor: "Vikas Soap Co.",
      date: "2026-07-13",
      items: ["10 boxes Lifebuoy Soap", "5 boxes Surf Excel"],
      total: 8200,
      status: "processed",
    },
  ]);
  const [uploading, setUploading] = useState(false);

  const simulateUpload = () => {
    setUploading(true);
    setTimeout(() => {
      const newInvoice: ScannedInvoice = {
        id: `INV-2026-00${invoices.length + 1}`,
        vendor: "New Supplier Corp",
        date: new Date().toISOString().split("T")[0],
        items: ["3 boxes Parle-G", "1 bag Sugar 50kg"],
        total: 4800,
        status: "processed",
      };
      setInvoices([newInvoice, ...invoices]);
      setUploading(false);
    }, 2000);
  };

  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-6">
      {/* stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Total Scanned Invoice Value
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-800">
              ₹{totalOutstanding.toLocaleString("en-IN")}
            </span>
          </div>
        </Card>
        <Card className="p-6">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Active Scans Today
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-800">
              {invoices.length} Invoices
            </span>
          </div>
        </Card>
      </div>

      {/* upload card */}
      <Card className="p-6">
        <h3 className="font-bold text-slate-800 mb-4">Onboard Stock via Invoice / Bill photo</h3>
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-slate-400 text-5xl mb-3">
            cloud_upload
          </span>
          <p className="text-sm text-slate-600 font-medium mb-1">
            Drag and drop your supplier invoice photo or PDF here
          </p>
          <p className="text-xs text-slate-400 mb-4">
            Supports PNG, JPG, PDF up to 5MB (Receipt OCR extracts items automatically)
          </p>
          <button
            onClick={simulateUpload}
            disabled={uploading}
            className={`bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-brand-800 transition-all ${
              uploading ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {uploading ? "Processing OCR Scan..." : "Select Invoice File"}
          </button>
        </div>
      </Card>

      {/* scan ledger */}
      <Card className="p-6">
        <h3 className="font-bold text-slate-800 mb-4">Scanned Invoices Ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3">Invoice ID</th>
                <th className="py-3">Supplier</th>
                <th className="py-3">Scanned Date</th>
                <th className="py-3">Extracted Items</th>
                <th className="py-3">Amount</th>
                <th className="py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 text-sm hover:bg-slate-50/50">
                  <td className="py-4 font-mono font-medium text-slate-600">{inv.id}</td>
                  <td className="py-4 font-semibold text-slate-800">{inv.vendor}</td>
                  <td className="py-4 text-slate-500">{inv.date}</td>
                  <td className="py-4 text-slate-600">
                    <div className="flex flex-wrap gap-1">
                      {inv.items.map((item, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                          {item}
                        </span>
                      ))}
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
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
