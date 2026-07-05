import { useState } from "react";

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  icon: string;
}

const products: Product[] = [
  { id: "1", name: "Nike Air Max", category: "Footwear", stock: 2, price: 2499, icon: "footwear" },
  { id: "2", name: "Classic Linen Shirt", category: "Apparel", stock: 15, price: 1800, icon: "apparel" },
  { id: "3", name: "Leather Wallet", category: "Accessories", stock: 42, price: 850, icon: "accessories" },
];

const categories = ["All", "Footwear", "Apparel", "Accessories"];

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default function Inventory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [showLowStock, setShowLowStock] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = products.filter((p) => {
    const matchQuery = p.name.toLowerCase().includes(query.toLowerCase());
    const matchCategory = category === "All" || p.category === category;
    const matchLow = showLowStock ? p.stock <= 5 : true;
    return matchQuery && matchCategory && matchLow;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-section-gap">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Inventory</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">The shelf, digitized.</p>
        </div>
        <button className="bg-primary-container text-white px-6 py-3 rounded-full font-body-lg text-body-lg flex items-center gap-2 min-h-touch-target-min shadow-float-depth hover:scale-95 transition-transform">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add product
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full font-body-sm text-body-sm transition-all duration-200 min-h-touch-target-min ${
                category === cat
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={`px-4 py-2 rounded-full font-body-sm text-body-sm flex items-center gap-2 min-h-touch-target-min transition-all ${
              showLowStock ? "bg-[#FFF8E1] text-[#F57C00]" : "bg-surface-container-low text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">warning</span>
            Show low stock ({products.filter((p) => p.stock <= 5).length})
          </button>
          <div className="flex bg-surface-container-low rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant"}`}
            >
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant"}`}
            >
              <span className="material-symbols-outlined text-[20px]">view_list</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {filtered.map((product) => (
          <div key={product.id} className="bg-surface rounded-xl shadow-soft-depth overflow-hidden group hover:shadow-float-depth transition-all duration-300">
            <div className="h-40 bg-gradient-to-br from-surface-container-low to-surface-container-high flex items-center justify-center relative">
              <span className="material-symbols-outlined text-6xl text-primary/30">{product.icon === "footwear" ? "steps" : product.icon === "apparel" ? "checkroom" : "card_travel"}</span>
              <div className="absolute top-3 right-3">
                <button className="w-8 h-8 rounded-full bg-surface/80 flex items-center justify-center text-on-surface-variant hover:bg-surface transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                </button>
              </div>
              {product.stock <= 5 && (
                <div className="absolute top-3 left-3 bg-error-container text-error px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">warning</span>
                  Low stock
                </div>
              )}
            </div>
            <div className="p-card-padding">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{product.category}</p>
                  <h3 className="font-headline-md text-headline-md text-on-surface mt-0.5">{product.name}</h3>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Stock</p>
                  <p className={`font-numeral-lg text-numeral-lg ${product.stock <= 5 ? "text-error" : "text-primary"}`}>
                    {product.stock}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Price</p>
                  <p className="font-numeral-md text-numeral-md text-on-surface">{formatINR(product.price)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
