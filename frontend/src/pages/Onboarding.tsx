import { useState } from "react";

interface OnboardingProps {
  onComplete: () => void;
  onBack: () => void;
}

export default function Onboarding({ onComplete, onBack }: OnboardingProps) {
  const [selected, setSelected] = useState<"qr" | "code" | "link">("qr");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop py-12">
      <div className="w-full max-w-[520px] flex flex-col items-center gap-section-gap">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-primary-container rounded-2xl flex items-center justify-center shadow-float-depth">
            <span className="material-symbols-outlined text-4xl text-on-primary-container">whatsapp</span>
          </div>
          <h1 className="font-display text-display-lg-mobile md:text-display-lg text-primary mb-4">
            Connect your WhatsApp
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-sm mx-auto">
            Link your shop's WhatsApp number to start receiving orders, answering queries, and tracking inventory — all through chat.
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
              <p className="font-body-sm text-body-sm text-on-surface-variant">Open WhatsApp on your phone and scan the code</p>
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
              <p className="font-body-sm text-body-sm text-on-surface-variant">We'll send a verification code to your WhatsApp</p>
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
              <p className="font-body-sm text-body-sm text-on-surface-variant">Use WhatsApp's multi-device feature to link</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-200 ${
              selected === "link" ? "border-primary bg-primary" : "border-outline"
            }`}>
              {selected === "link" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        </div>

        <div className="w-full flex flex-col gap-4">
          <button
            onClick={onComplete}
            className="w-full min-h-touch-target-min rounded-xl bg-primary-container text-on-primary-container font-body-lg text-body-lg font-semibold shadow-float-depth hover:scale-95 transition-all duration-150"
          >
            Continue Setup
          </button>
          <button
            onClick={onBack}
            className="w-full min-h-touch-target-min rounded-xl border border-outline-variant text-on-surface-variant font-body-lg text-body-lg hover:bg-surface-container-low transition-colors"
          >
            Back
          </button>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
