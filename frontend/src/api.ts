import type { Analytics, Business, Customer, DailySummary, Order, Product, Recommendation } from "./types";
import { getAccessToken } from "./lib/session";

// Vite dev proxy maps /api -> backend :8000 and /ws -> backend websocket.
const API = import.meta.env.VITE_API_URL || "/api";

export interface ScannedItem {
  name: string;
  price: number;
  qty: number;
  stock_qty: number;
}

export interface MatchCard {
  product_id: string;
  name: string;
  brand?: string | null;
  size?: string | null;
  price: number;
  stock_qty: number;
  image_url?: string | null;
  score: number;
}

function headers(json = false): HeadersInit {
  const out: Record<string, string> = {};
  if (json) out["Content-Type"] = "application/json";
  const token = getAccessToken();
  if (token) out.Authorization = `Bearer ${token}`;
  return out;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers() });
  if (!res.ok) {
    let msg = `${res.status} ${path}`;
    try {
      const errData = await res.json();
      msg = errData.error?.detail || errData.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `${res.status} ${path}`;
    try {
      const errData = await res.json();
      msg = errData.error?.detail || errData.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  health: () => get<{ status: string; env: string; payment_mode: string; whatsapp_mode: string; twilio_whatsapp_from?: string }>(`/health`),
  businesses: () => get<Business[]>(`/businesses`),
  getBusiness: (bid: string) => get<Business>(`/businesses/${bid}`),
  createBusiness: (body: any) => post<Business>(`/businesses`, body),
  products: (bid: string) => get<Product[]>(`/products?business_id=${bid}`),
  orders: (bid: string) => get<Order[]>(`/orders?business_id=${bid}`),
  customers: (bid: string) => get<Customer[]>(`/customers?business_id=${bid}`),
  customer: (bid: string, wa: string) =>
    get<Customer & { history: Order[] }>(`/customers/${encodeURIComponent(wa)}?business_id=${bid}`),
  analytics: (bid: string) => get<Analytics>(`/analytics/summary?business_id=${bid}`),
  dailySummary: (bid: string) => get<DailySummary>(`/analytics/daily-summary?business_id=${bid}`),
  recommendations: (bid: string, productId?: string) =>
    get<{ recommendations: Recommendation[] }>(
      `/recommendations?business_id=${bid}${productId ? `&product_id=${productId}` : ""}`
    ),
  updateBusiness: (bid: string, body: Partial<Business>) => fetch(`${API}/businesses/${bid}`, {
    method: "PATCH", headers: headers(true), body: JSON.stringify(body),
  }).then((r) => r.json()),
  fulfill: (oid: string) => post<Order>(`/orders/${oid}/fulfill`, {}),
  markPaid: (oid: string) => post<Order>(`/payments/webhook`, { order_id: oid, payment_id: "dashboard" }),
  // Receipt/bill scan -> product candidates (PRD F11)
  scanReceipt: (bid: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API}/products/scan?business_id=${bid}`, { method: "POST", headers: headers(), body: fd }).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json() as Promise<{ count: number; products: ScannedItem[] }>;
    });
  },
  bulkProducts: (bid: string, products: ScannedItem[]) =>
    post<{ created: number }>(`/products/bulk?business_id=${bid}`, { products }),
  // Voice note upload -> transcription
  transcribeAudio: (file: Blob | File) => {
    const fd = new FormData();
    fd.append("file", file, "audio.webm");
    return fetch(`${API}/media/transcribe-upload`, { method: "POST", headers: headers(), body: fd }).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json() as Promise<{ text: string; lang: string; engine: string }>;
    });
  },
  // WhatsApp simulator -> webhook
  sendWhatsapp: (payload: { from_no: string; type: string; text?: string; media_url?: string; name?: string; business_id?: string }) =>
    post<{ reply: string; intent: string; lang: string; matches?: MatchCard[] }>(`/webhook/whatsapp`, payload),
  // Real OTP authentication
  sendOtp: (phone: string) => post<{ status: string; mode?: string; debug_code?: string }>(`/auth/send-otp`, { phone }),
  verifyOtp: (phone: string, code: string) =>
    post<{ status: string; authenticated: boolean; access_token: string; token_type: string }>(`/auth/verify-otp`, { phone, code }),
  // Product actions
  createProduct: (bid: string, body: any) => post<Product>(`/products?business_id=${bid}`, body),
  updateProduct: (pid: string, body: any) => fetch(`${API}/products/${pid}`, {
    method: "PATCH", headers: headers(true), body: JSON.stringify(body),
  }).then((r) => r.json()),
  deleteProduct: (pid: string) => fetch(`${API}/products/${pid}`, {
    method: "DELETE", headers: headers(),
  }).then((r) => r.json()),
  // Order actions
  cancelOrder: (oid: string) => post<Order>(`/orders/${oid}/cancel`, {}),
};

export function openDashboardSocket(bid: string, onEvent: (e: any) => void, token = getAccessToken()): WebSocket | null {
  if (import.meta.env.VITE_WS_URL === "disabled") {
    return null;
  }
  let wsUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/dashboard?business_id=${bid}`;
  if (import.meta.env.VITE_WS_URL) {
    wsUrl = `${import.meta.env.VITE_WS_URL}?business_id=${bid}`;
  }
  if (token) {
    wsUrl = `${wsUrl}&token=${encodeURIComponent(token)}`;
  }
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data));
    } catch {
      /* ignore */
    }
  };
  return ws;
}
