import { useState } from "react";

export default function Settings() {
  const [shopName, setShopName] = useState("Ramesh General Store");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [upiId, setUpiId] = useState("ramesh@paytm");
  const [language, setLanguage] = useState("English");

  const languages = [
    { label: "English", value: "English" },
    { label: "Hindi (हिंदी)", value: "Hindi" },
    { label: "Marathi (मराठी)", value: "Marathi" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-section-gap">
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface">Settings</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Manage your shop preferences and account.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <div className="space-y-gutter">
          <div className="bg-surface rounded-xl p-card-padding shadow-soft-depth space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[24px]">store</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Shop Details</h3>
            </div>

            <div className="space-y-2">
              <label className="font-body-sm text-body-sm text-on-surface-variant">Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 min-h-touch-target-min"
              />
            </div>

            <div className="space-y-2">
              <label className="font-body-sm text-body-sm text-on-surface-variant">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 min-h-touch-target-min"
              />
            </div>
          </div>

          <div className="bg-surface rounded-xl p-card-padding shadow-soft-depth space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[24px]">account_balance_wallet</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Payments & Collections</h3>
            </div>

            <div className="space-y-2">
              <label className="font-body-sm text-body-sm text-on-surface-variant">Primary UPI ID</label>
              <div className="relative">
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 min-h-touch-target-min"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary-container text-[20px]">check_circle</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-1">
                This UPI ID will be used to generate payment QR codes for customers.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-gutter">
          <div className="bg-surface rounded-xl p-card-padding shadow-soft-depth space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary text-[24px]">translate</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Language Preference</h3>
            </div>

            <div className="space-y-2">
              {languages.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all min-h-touch-target-min ${
                    language === lang.value
                      ? "bg-primary-container/10 border border-primary-container text-on-surface"
                      : "bg-surface-container-low border border-transparent text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${language === lang.value ? "text-primary" : "text-transparent"}`}>
                    {language === lang.value ? "check" : ""}
                  </span>
                  <span className="font-body-lg text-body-lg">{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="w-full min-h-touch-target-min rounded-xl border-2 border-error/30 text-error font-body-lg text-body-lg flex items-center justify-center gap-2 hover:bg-error-container/10 transition-all">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Logout of Device
          </button>
        </div>
      </div>
    </div>
  );
}
