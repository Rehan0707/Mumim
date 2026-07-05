import type { Analytics, Business, Customer, Order, Product } from "./types";

// Vite dev proxy maps /api -> backend :8000 and /ws -> backend websocket.
const API = "/api";

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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

export const api = {
  businesses: () => get<Business[]>(`/businesses`),
  products: (bid: string) => get<Product[]>(`/products?business_id=${bid}`),
  orders: (bid: string) => get<Order[]>(`/orders?business_id=${bid}`),
  customers: (bid: string) => get<Customer[]>(`/customers?business_id=${bid}`),
  customer: (bid: string, wa: string) =>
    get<Customer & { history: Order[] }>(`/customers/${encodeURIComponent(wa)}?business_id=${bid}`),
  analytics: (bid: string) => get<Analytics>(`/analytics/summary?business_id=${bid}`),
  updateBusiness: (bid: string, body: Partial<Business>) => fetch(`${API}/businesses/${bid}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }).then((r) => r.json()),
  fulfill: (oid: string) => post<Order>(`/orders/${oid}/fulfill`, {}),
  markPaid: (oid: string) => post<Order>(`/payments/webhook`, { order_id: oid, payment_id: "dashboard" }),
  // Receipt/bill scan -> product candidates (PRD F11)
  scanReceipt: (bid: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API}/products/scan?business_id=${bid}`, { method: "POST", body: fd }).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json() as Promise<{ count: number; products: ScannedItem[] }>;
    });
  },
  bulkProducts: (bid: string, products: ScannedItem[]) =>
    post<{ created: number }>(`/products/bulk?business_id=${bid}`, { products }),
  // WhatsApp simulator -> webhook
  sendWhatsapp: (payload: { from_no: string; type: string; text?: string; media_url?: string; name?: string }) =>
    post<{ reply: string; intent: string; lang: string; matches?: MatchCard[] }>(`/webhook/whatsapp`, payload),
};

export function openDashboardSocket(bid: string, onEvent: (e: any) => void): WebSocket {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws/dashboard?business_id=${bid}`);
  ws.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data));
    } catch {
      /* ignore */
    }
  };
  return ws;
}
