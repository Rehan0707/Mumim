import { useState, useEffect } from "react";
import { Button, Card, Input } from "../components/ui";
import { api } from "../api";

function maskPhone(p: string) {
  if (p.length < 4) return p;
  return p.slice(0, 2) + "X".repeat(Math.max(0, p.length - 4)) + p.slice(-2);
}

export function Auth({ onDone }: { onDone: (result: { phone: string; accessToken: string }) => void }) {
  const [step, setStep] = useState<"login" | "verify" | "success">("login");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sandboxKeyword, setSandboxKeyword] = useState("hall-voice");
  const [twilioFrom, setTwilioFrom] = useState("14155238886");

  useEffect(() => {
    api.health().then((h) => {
      if (h.twilio_whatsapp_from) {
        const cleaned = h.twilio_whatsapp_from.replace(/[^\d+]/g, "");
        const digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
        setTwilioFrom(digits);
      }
    }).catch(() => {});
  }, []);

  const stepIndex = step === "login" ? 0 : step === "verify" ? 1 : 2;

  async function handleSendOtp() {
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      await api.sendOtp(formattedPhone);
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to send verification code. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (otp.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      const result = await api.verifyOtp(formattedPhone, otp);
      setAccessToken(result.access_token);
      setStep("success");
    } catch (err: any) {
      setError("Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop py-12">
      <div className="w-full max-w-[480px] flex flex-col items-center gap-section-gap">

        <div className="flex items-center justify-center gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                i <= stepIndex ? "bg-primary" : "bg-outline-variant"
              }`}
            />
          ))}
        </div>

        <Card className="w-full border border-outline-variant/30">
          {step === "login" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="#004331">
                <path d="M12.032 21.965c-1.107 0-2.17-.19-3.162-.534l-3.462 1.05 1.142-3.364a9.928 9.928 0 0 1-1.636-5.454c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm0-18.518c-4.697 0-8.518 3.821-8.518 8.518 0 1.628.466 3.192 1.328 4.532l-.867 2.556 2.67-.81a8.48 8.48 0 0 0 5.387 1.928c4.697 0 8.518-3.821 8.518-8.518s-3.821-8.518-8.518-8.518zm4.793 10.982c-.064-.107-.235-.171-.49-.299-.256-.128-1.514-.747-1.749-.832s-.405-.128-.576.128c-.171.256-.662.832-.811 1.003s-.299.192-.555.064c-.256-.128-1.079-.398-2.054-1.267-.759-.677-1.272-1.515-1.421-1.771s-.016-.374.117-.496c.12-.107.267-.278.395-.417s.171-.256.256-.427c.085-.171.043-.32-.021-.448s-.576-1.386-.789-1.899c-.208-.501-.416-.427-.576-.435-.149-.008-.32-.008-.491-.008s-.448.064-.683.32c-.235.256-.896.876-.896 2.138s.917 2.48 1.045 2.651c.128.171 1.792 2.741 4.341 3.843.607.26 1.077.416 1.445.532.608.192 1.163.165 1.6.107.491-.064 1.514-.619 1.727-1.216.213-.597.213-1.109.149-1.216z"/>
              </svg>

              <div>
                <h1 className="font-display text-display-lg-mobile text-primary">Verify WhatsApp</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">Enter your WhatsApp number to get started</p>
              </div>

              <div className="w-full flex flex-col gap-2 text-left">
                <label className="font-label-caps text-label-caps text-on-surface uppercase">WhatsApp Number</label>
                <div className="flex items-center border border-outline-variant rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 bg-surface">
                  <div className="flex items-center gap-1 pl-4 pr-3 py-[13px] border-r border-outline-variant shrink-0">
                    <span className="font-body-lg text-body-lg text-on-surface">+91</span>
                  </div>
                  <Input
                    value={phone}
                    onChange={(e: any) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    className="border-none rounded-none flex-1"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Twilio Sandbox QR Code Helper */}
              <div className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 flex flex-col items-center gap-3">
                <p className="font-body-sm text-body-sm text-on-surface-variant font-medium text-center">
                  Using Twilio Sandbox? Scan this QR code to join the sandbox and receive real OTPs on WhatsApp:
                </p>
                <div className="w-36 h-36 bg-white border border-outline-variant rounded-lg p-2 flex items-center justify-center">
                  <img
                    src={`https://quickchart.io/qr?size=140&text=${encodeURIComponent(`https://wa.me/${twilioFrom}?text=join%20${sandboxKeyword}`)}`}
                    alt="Twilio Sandbox QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="w-full">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase text-left block mb-1">
                    Sandbox Keyword (e.g. double-john)
                  </label>
                  <Input
                    value={sandboxKeyword}
                    onChange={(e: any) => setSandboxKeyword(e.target.value.replace(/\s+/g, ""))}
                    placeholder="double-john"
                    className="h-8 text-xs"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 w-full text-center font-medium">
                  {error}
                </div>
              )}

              <Button onClick={handleSendOtp} className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </Button>

              <p className="font-body-sm text-body-sm text-on-surface-variant">
                We will send a one-time verification code to this phone number.
              </p>
            </div>
          )}

          {step === "verify" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-14 h-14 rounded-full bg-primary-fixed/20 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#004331" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>

              <div>
                <h2 className="font-display text-display-lg-mobile text-primary">Enter OTP</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
                  We've sent a 6-digit code to +91 {maskPhone(phone)}
                </p>
              </div>

              <div className="w-full flex flex-col gap-2">
                <label className="font-label-caps text-label-caps text-on-surface uppercase text-left">OTP Code</label>
                <Input
                  value={otp}
                  onChange={(e: any) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center font-numeral-lg text-numeral-lg tracking-[0.5em]"
                  disabled={loading}
                />

              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 w-full text-center font-medium">
                  {error}
                </div>
              )}

              <Button onClick={handleVerify} className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>

              <button 
                onClick={() => { setStep("login"); setOtp(""); setError(null); }} 
                className="font-body-sm text-body-sm text-primary underline"
                disabled={loading}
              >
                Back
              </button>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary-fixed/20 flex items-center justify-center">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#006e2f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div>
                <h2 className="font-display text-display-lg-mobile text-primary">You're all set!</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
                  Your owner access has been verified
                </p>
              </div>

              <Button
                onClick={() => onDone({ phone: phone.startsWith("+") ? phone : `+91${phone}`, accessToken })}
                className="w-full"
                disabled={!accessToken}
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default Auth;
