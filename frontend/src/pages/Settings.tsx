import { useState } from "react";
import { api } from "../api";
import type { Business } from "../types";
import { Card } from "../components/ui";

export function Settings({ business, onSaved }: { business?: Business; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: business?.name || "",
    upi_id: business?.upi_id || "",
    lang_default: business?.lang_default || "hi",
  });
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!business) return;
    await api.updateBusiness(business.id, form);
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card className="p-6 max-w-xl">
      <h3 className="font-bold text-slate-800 mb-4">Shop settings</h3>
      <div className="space-y-4">
        <Field label="Shop name">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        </Field>
        <Field label="WhatsApp number (read-only)">
          <input value={business?.whatsapp_no || ""} disabled className="input bg-slate-50 text-slate-400" />
        </Field>
        <Field label="UPI ID (for payment links)">
          <input value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} className="input" placeholder="shop@okhdfcbank" />
        </Field>
        <Field label="Default reply language">
          <select value={form.lang_default} onChange={(e) => setForm({ ...form, lang_default: e.target.value })} className="input">
            <option value="hi">Hindi / Hinglish</option>
            <option value="en">English</option>
          </select>
        </Field>
        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} className="bg-brand-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-brand-800">
            Save changes
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
        </div>
      </div>
      <style>{`.input{width:100%;border:1px solid #e2e8f0;border-radius:0.6rem;padding:0.55rem 0.8rem;outline:none;font-size:0.9rem}.input:focus{border-color:#0d9488}`}</style>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
