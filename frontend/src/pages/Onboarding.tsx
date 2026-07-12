import { useEffect, useState } from "react";

interface OnboardingProps {
  onComplete: () => void;
  onBack: () => void;
}

export default function Onboarding({ onComplete, onBack }: OnboardingProps) {
  const [selected, setSelected] = useState<"qr" | "code" | "link">("qr");
  const [qrStatus, setQrStatus] = useState<"idle" | "scanning" | "success">("idle");

  // Simulate QR Code scan connection when selecting the QR tab
  useEffect(() => {
    if (selected === "qr") {
      setQrStatus("scanning");
      const t = setTimeout(() => {
        setQrStatus("success");
      }, 3000);
      return () => clearTimeout(t);
    } else {
      setQrStatus("idle");
    }
  }, [selected]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop py-12">
      <div className="w-full max-w-[520px] flex flex-col items-center gap-section-gap">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-primary-container rounded-2xl flex items-center justify-center shadow-float-depth animate-pulse">
            <span className="material-symbols-outlined text-4xl text-on-primary-container">whatsapp</span>
          </div>
          <h1 className="font-display text-display-lg-mobile md:text-display-lg text-primary mb-4">
            Prepare WhatsApp setup
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-sm mx-auto">
            Choose the setup path for your shop. Live customer messages require a configured WhatsApp provider.
          </p>
        </div>

        <div className="w-full bg-surface rounded-2xl p-card-padding shadow-soft-depth space-y-4 border border-outline-variant/20">
          <button
            onClick={() => setSelected("qr")}
            className={`w-full flex items-center gap-4 p-4 rounded-xl text-left border transition-all duration-200 ${
              selected === "qr"
                ? "border-primary bg-primary-container/5 ring-1 ring-primary"
                : "border-transparent hover:bg-surface-container-low"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary-container">qr_code_scanner</span>
            </div>
            <div className="flex-1">
              <p className="font-body-lg text-body-lg text-on-surface font-semibold">Scan QR Code</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Use a provider QR flow when enabled for your account</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-200 ${
              selected === "qr" ? "border-primary bg-primary" : "border-outline"
            }`}>
              {selected === "qr" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>

          <button
            onClick={() => setSelected("code")}
            className={`w-full flex items-center gap-4 p-4 rounded-xl text-left border transition-all duration-200 ${
              selected === "code"
                ? "border-primary bg-primary-container/5 ring-1 ring-primary"
                : "border-transparent hover:bg-surface-container-low"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary-container">phone_iphone</span>
            </div>
            <div className="flex-1">
              <p className="font-body-lg text-body-lg text-on-surface font-semibold">Send a Code</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Verify the shop number before accepting live messages</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-200 ${
              selected === "code" ? "border-primary bg-primary" : "border-outline"
            }`}>
              {selected === "code" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>

          <button
            onClick={() => setSelected("link")}
            className={`w-full flex items-center gap-4 p-4 rounded-xl text-left border transition-all duration-200 ${
              selected === "link"
                ? "border-primary bg-primary-container/5 ring-1 ring-primary"
                : "border-transparent hover:bg-surface-container-low"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary-container">link</span>
            </div>
            <div className="flex-1">
              <p className="font-body-lg text-body-lg text-on-surface font-semibold">Link Device</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Connect through Twilio or Meta before launch</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-200 ${
              selected === "link" ? "border-primary bg-primary" : "border-outline"
            }`}>
              {selected === "link" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        </div>

        {/* Dynamic Interactive Flow Details */}
        {selected === "qr" && (
          <div className="w-full bg-surface rounded-2xl p-6 shadow-soft-depth border border-outline-variant/20 flex flex-col items-center gap-4 text-center">
            {qrStatus === "scanning" && (
              <>
                <p className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                  Scan this QR code with WhatsApp (Linked Devices) to link your catalog:
                </p>
                <div className="relative w-36 h-36 bg-white border border-outline-variant rounded-lg p-2 flex items-center justify-center overflow-hidden">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https%3A%2F%2Fmunim.ai%2Fdevice-pairing"
                    alt="Scan to pair device"
                    className="w-full h-full object-contain opacity-70"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant italic animate-pulse">Waiting for scan...</p>
              </>
            )}
            {qrStatus === "success" && (
              <>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-outlined text-2xl font-bold">check_circle</span>
                </div>
                <div>
                  <p className="font-body-lg text-body-lg text-on-surface font-semibold">Device Linked Successfully!</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Your WhatsApp Business instance is connected.</p>
                </div>
              </>
            )}
          </div>
        )}

        {selected === "code" && (
          <div className="w-full bg-surface rounded-2xl p-6 shadow-soft-depth border border-outline-variant/20 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <p className="font-body-lg text-body-lg text-on-surface font-semibold">Authentication Verified</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Your login credential phone number has been linked to this business instance.
              </p>
            </div>
          </div>
        )}

        {selected === "link" && (
          <div className="w-full bg-surface rounded-2xl p-6 shadow-soft-depth border border-outline-variant/20 flex flex-col items-center gap-3">
            <p className="font-body-sm text-body-sm text-on-surface-variant font-medium text-center">
              Using Twilio Sandbox? Scan this QR code to join the sandbox and receive messages on WhatsApp:
            </p>
            <div className="w-36 h-36 bg-white border border-outline-variant rounded-lg p-2 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent("https://wa.me/14155238886?text=join%20double-john")}`}
                alt="Twilio Sandbox QR Code"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="font-mono text-xs text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-1 font-semibold text-center">
              join double-john
            </p>
          </div>
        )}

        <div className="w-full flex flex-col gap-4">
          <button
            onClick={onComplete}
            className="w-full min-h-touch-target-min rounded-xl bg-primary-container text-on-primary-container font-body-lg text-body-lg font-semibold shadow-float-depth hover:scale-95 transition-all duration-150"
          >
            Open Dashboard
          </button>
          <button
            onClick={onBack}
            className="w-full min-h-touch-target-min rounded-xl border border-outline-variant text-on-surface-variant font-body-lg text-body-lg hover:bg-surface-container-low transition-colors"
          >
            Back
          </button>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
          By continuing, you agree to our <a href="/terms.html" className="text-primary underline">Terms of Service</a> and <a href="/privacy.html" className="text-primary underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
