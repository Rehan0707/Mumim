import React, { useState } from "react";
import type { Order, Business } from "../types";
import { formatINR } from "./ui";

interface InvoiceModalProps {
  order: Order;
  business: Business | null;
  onClose: () => void;
}

type TemplateType = "modern" | "classic" | "minimalist";

export function InvoiceModal({ order, business, onClose }: InvoiceModalProps) {
  const [template, setTemplate] = useState<TemplateType>("modern");
  
  const isDefaultDemo = business?.whatsapp_no === "+919800000000";
  const [shopName, setShopName] = useState(business?.name || "Ramesh Vastralaya & General Store");
  const [address, setAddress] = useState(isDefaultDemo ? "12, Main Bazaar, Near Town Hall, Mumbai, Maharashtra - 400001" : "");
  const [gstin, setGstin] = useState(isDefaultDemo ? "27AAAAA1111A1Z1" : "");
  const [notes, setNotes] = useState("Thank you for shopping with us! Please scan the QR code to pay via UPI.");
  const [isEditing, setIsEditing] = useState(false);

  // Inclusive GST calculations (18% total: 9% CGST, 9% SGST)
  const totalAmount = order.total;
  const subtotal = totalAmount / 1.18;
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;

  // Format date
  const dateStr = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN");

  // QR Code URL based on payment link or business UPI ID
  const upiUrl = order.payment_link || (business?.upi_id 
    ? `upi://pay?pa=${business.upi_id}&pn=${encodeURIComponent(shopName)}&am=${totalAmount}&cu=INR` 
    : "");

  const qrCodeUrl = upiUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(upiUrl)}`
    : "";

  // WhatsApp text template for invoice sharing
  const shareText = `🧾 *INVOICE* from *${shopName}*\n\nOrder ID: #${order.id.slice(0, 6).toUpperCase()}\nDate: ${dateStr}\n\n*Items:*\n${order.items.map(i => `- ${i.qty} x ${i.name} (${formatINR(i.unit_price)})`).join("\n")}\n\n*Total Amount:* *${formatINR(totalAmount)}*\nStatus: ${order.status.toUpperCase()}\n\n${order.payment_link ? `Pay here: ${order.payment_link}\n` : ""}\nThank you! 🙏`;

  const handleShare = () => {
    navigator.clipboard.writeText(shareText);
    alert("Invoice summary copied to clipboard! You can paste and send it in the WhatsApp simulator.");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-50 p-4 overflow-y-auto no-print">
      <div className="bg-[#f0f2f5] md:bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row h-[90vh] md:h-[80vh] overflow-hidden animate-scale-up">
        {/* Left Control Panel */}
        <div className="w-full md:w-80 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-5 flex flex-col justify-between overflow-y-auto shrink-0">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">Invoice Designer</h3>
              <button 
                onClick={onClose}
                className="md:hidden text-slate-400 hover:text-slate-600 bg-slate-200/50 p-1.5 rounded-full"
              >
                ✕
              </button>
            </div>

            {/* Template Selection Tabs */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Template Style</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-xl">
                {(["modern", "classic", "minimalist"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTemplate(t)}
                    className={`text-xs font-semibold py-2 px-2 rounded-lg capitalize transition-all ${
                      template === t 
                        ? "bg-white text-slate-800 shadow-sm" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Edit Panel Toggle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Shop Details</label>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
                >
                  {isEditing ? "✔️ Done" : "✏️ Edit"}
                </button>
              </div>

              {isEditing ? (
                <div className="space-y-3 animate-fade-in bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Shop Name</label>
                    <input
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 mt-1 focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">GSTIN</label>
                    <input
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 mt-1 focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Address</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 mt-1 focus:border-brand-500 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Notes / Terms</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 mt-1 focus:border-brand-500 outline-none resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-600 bg-slate-100 p-3 rounded-xl space-y-1.5">
                  <div className="font-semibold text-slate-800">{shopName}</div>
                  {gstin && <div><span className="font-semibold">GSTIN:</span> {gstin}</div>}
                  <div className="line-clamp-2 text-slate-500">{address}</div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 mt-6">
            <button
              onClick={handlePrint}
              className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Print Invoice
            </button>
            <button
              onClick={handleShare}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-sm">share</span>
              WhatsApp Share
            </button>
            <button
              onClick={onClose}
              className="hidden md:block w-full py-2.5 bg-transparent hover:bg-slate-200 text-slate-500 rounded-xl font-semibold text-xs"
            >
              Cancel & Close
            </button>
          </div>
        </div>

        {/* Right Invoice Preview Area */}
        <div className="flex-1 bg-[#f8fafc] p-6 overflow-y-auto flex items-start justify-center">
          {/* Invoice Document Wrapper for Print styling */}
          <div className="print-invoice-container w-full max-w-2xl bg-white p-8 shadow-md rounded-xl border border-slate-200 min-h-[600px] flex flex-col justify-between">
            <div>
              {/* Template Styles */}
              
              {/* 1. MODERN TEMPLATE (Teal) */}
              {template === "modern" && (
                <div className="space-y-6">
                  {/* Top Color Accent */}
                  <div className="h-2 bg-brand-750 rounded-t-xl -mx-8 -mt-8" style={{ backgroundColor: "#128c7e" }} />
                  
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="font-display font-bold text-2xl text-brand-700" style={{ color: "#128c7e" }}>{shopName}</h1>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{address}</p>
                      {gstin && <p className="text-xs text-slate-500 mt-0.5"><span className="font-semibold text-slate-600">GSTIN:</span> {gstin}</p>}
                    </div>
                    <div className="text-right">
                      <div className="inline-block px-3 py-1 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-2" style={{ backgroundColor: "#128c7e" }}>
                        TAX INVOICE
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Invoice No: <span className="font-mono text-slate-700">#{order.id.slice(0, 8).toUpperCase()}</span></p>
                      <p className="text-xs text-slate-400 mt-0.5">Date: <span className="text-slate-700">{dateStr}</span></p>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Customer Info & Status */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bill To:</h4>
                      <p className="text-sm font-bold text-slate-700 mt-1">{order.customer_name || "Demo Customer"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{order.customer_no}</p>
                    </div>
                    <div className="text-right flex flex-col justify-between items-end">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Method:</h4>
                        <p className="text-xs font-semibold text-slate-600 mt-1">UPI / Online</p>
                      </div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        order.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                        order.status === "fulfilled" ? "bg-brand-100 text-brand-700" :
                        order.status === "cancelled" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mt-4">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b-2 border-slate-200">
                          <th className="py-2.5 px-3">Item Description</th>
                          <th className="py-2.5 text-center w-16">Qty</th>
                          <th className="py-2.5 text-right w-24">Rate</th>
                          <th className="py-2.5 text-right w-28 pr-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.items.map((item, idx) => (
                          <tr key={idx} className="text-slate-600">
                            <td className="py-3 px-3 font-medium text-slate-800">{item.name}</td>
                            <td className="py-3 text-center font-semibold">{item.qty}</td>
                            <td className="py-3 text-right">{formatINR(item.unit_price)}</td>
                            <td className="py-3 text-right font-bold text-slate-800 pr-3">{formatINR(item.qty * item.unit_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. CLASSIC TEMPLATE (Corporate) */}
              {template === "classic" && (
                <div className="space-y-6">
                  {/* Title & Brand */}
                  <div className="border-b-2 border-double border-slate-300 pb-4 text-center">
                    <h1 className="font-serif font-bold text-3xl text-slate-800 tracking-wide uppercase">{shopName}</h1>
                    <p className="text-xs text-slate-600 mt-1 italic">{address}</p>
                    {gstin && <p className="text-xs text-slate-600 mt-0.5"><span className="font-semibold">GSTIN:</span> {gstin}</p>}
                  </div>

                  {/* Invoice Header details */}
                  <div className="flex justify-between items-start text-xs">
                    <div className="space-y-1">
                      <p><span className="font-bold text-slate-500">INVOICE NO:</span> <span className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</span></p>
                      <p><span className="font-bold text-slate-500">DATE:</span> {dateStr}</p>
                      <p><span className="font-bold text-slate-500">PAYMENT STATUS:</span> <span className="uppercase font-semibold">{order.status}</span></p>
                    </div>
                    <div className="border border-slate-200 p-3 rounded bg-slate-50 w-64">
                      <h4 className="font-bold text-slate-500 uppercase text-[9px] tracking-wider mb-1">Billed To:</h4>
                      <p className="font-bold text-slate-700">{order.customer_name || "Demo Customer"}</p>
                      <p className="text-slate-500">{order.customer_no}</p>
                    </div>
                  </div>

                  {/* Classic Table */}
                  <div className="mt-6">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-t-2 border-b-2 border-slate-300 text-slate-750 font-bold uppercase">
                          <th className="py-2">No.</th>
                          <th className="py-2">Item Description</th>
                          <th className="py-2 text-center w-16">Qty</th>
                          <th className="py-2 text-right w-24">Rate</th>
                          <th className="py-2 text-right w-28 pr-1">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.items.map((item, idx) => (
                          <tr key={idx} className="text-slate-600">
                            <td className="py-2">{idx + 1}</td>
                            <td className="py-2 font-medium text-slate-800">{item.name}</td>
                            <td className="py-2 text-center">{item.qty}</td>
                            <td className="py-2 text-right">{formatINR(item.unit_price)}</td>
                            <td className="py-2 text-right font-semibold text-slate-800 pr-1">{formatINR(item.qty * item.unit_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. MINIMALIST TEMPLATE (Thermal B&W) */}
              {template === "minimalist" && (
                <div className="space-y-4 font-mono text-xs text-black">
                  {/* Brand Header */}
                  <div className="text-center space-y-1">
                    <h2 className="font-bold text-lg uppercase tracking-wider">{shopName}</h2>
                    <p className="text-[10px] leading-tight">{address}</p>
                    {gstin && <p className="text-[10px]">GSTIN: {gstin}</p>}
                    <p className="text-[10px]">-----------------------------------------------</p>
                  </div>

                  {/* Meta Details */}
                  <div className="space-y-0.5">
                    <p>INV: #{order.id.slice(0, 10).toUpperCase()}</p>
                    <p>DATE: {dateStr}</p>
                    <p>CUST: {order.customer_name || "Demo Customer"} ({order.customer_no})</p>
                    <p>STATUS: {order.status.toUpperCase()}</p>
                    <p>-----------------------------------------------</p>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 font-bold border-b border-dashed border-black pb-1">
                      <span className="col-span-2">Item</span>
                      <span className="text-center">Qty</span>
                      <span className="text-right">Price</span>
                    </div>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-4 text-slate-800">
                        <span className="col-span-2 leading-tight">{item.name}</span>
                        <span className="text-center">{item.qty}</span>
                        <span className="text-right">{formatINR(item.qty * item.unit_price)}</span>
                      </div>
                    ))}
                    <p>-----------------------------------------------</p>
                  </div>
                </div>
              )}

              {/* Tax Calculations Block */}
              <div className="mt-6 flex justify-between items-start gap-4">
                {/* QR Code & Notes (Left side of calculations) */}
                <div className="flex-1 max-w-sm font-sans">
                  {qrCodeUrl && order.status !== "paid" && order.status !== "fulfilled" && (
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2.5 rounded-xl inline-flex mt-1">
                      <img src={qrCodeUrl} alt="UPI Payment QR Code" className="w-[84px] h-[84px] rounded border bg-white" />
                      <div>
                        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">UPI Payment</h5>
                        <p className="text-[11px] text-slate-400 mt-1 leading-tight">Scan QR code to pay instantly.</p>
                      </div>
                    </div>
                  )}
                  {notes && (
                    <p className={`text-[11px] text-slate-400 mt-3 italic leading-relaxed ${
                      template === "minimalist" ? "font-mono text-black uppercase" : ""
                    }`}>
                      {notes}
                    </p>
                  )}
                </div>

                {/* Calculation breakdown */}
                <div className={`w-64 space-y-1.5 text-right font-sans ${
                  template === "minimalist" ? "font-mono text-black" : ""
                }`}>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Taxable Subtotal:</span>
                    <span className="font-semibold text-slate-700">{formatINR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>CGST (9%):</span>
                    <span className="font-semibold text-slate-700">{formatINR(cgst)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>SGST (9%):</span>
                    <span className="font-semibold text-slate-700">{formatINR(sgst)}</span>
                  </div>
                  <div className="border-t border-slate-200 my-1" />
                  <div className="flex justify-between text-sm font-bold text-slate-800">
                    <span>Total Amount:</span>
                    <span className="text-lg text-slate-900">{formatINR(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Footer (Only visible on print) */}
            <div className="hidden print-block mt-12 text-center text-[10px] text-slate-400 border-t pt-4">
              Thank you for shopping with us! This is a system-generated tax invoice powered by Munim.ai.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
