export interface Business {
  id: string;
  name: string;
  whatsapp_no: string;
  category?: string;
  lang_default: string;
  upi_id?: string;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  attributes: Record<string, string>;
  price: number;
  stock_qty: number;
  image_url?: string;
  is_active: boolean;
}

export interface OrderItem {
  product_id: string;
  name: string;
  qty: number;
  unit_price: number;
}

export interface Order {
  id: string;
  status: "created" | "reserved" | "paid" | "fulfilled" | "cancelled";
  total: number;
  customer_name?: string;
  customer_no?: string;
  payment_link?: string;
  created_at?: string;
  paid_at?: string;
  items: OrderItem[];
}

export interface Customer {
  id: string;
  whatsapp_no: string;
  name?: string;
  segment: "new" | "regular" | "vip" | "churning";
  total_spend: number;
  order_count: number;
  last_order?: string;
}

export interface Analytics {
  kpis: {
    revenue_total: number;
    orders_today: number;
    orders_total: number;
    pending: number;
    customers: number;
    low_stock_count: number;
  };
  revenue_trend: { date: string; revenue: number }[];
  forecast: { date: string; revenue: number }[];
  top_items: { name: string; qty: number; revenue: number }[];
  low_stock: { name: string; stock_qty: number }[];
}

export interface WsEvent {
  type: "connected" | "new_message" | "new_order" | "order_update" | "stock_update" | "low_stock";
  data: any;
}
