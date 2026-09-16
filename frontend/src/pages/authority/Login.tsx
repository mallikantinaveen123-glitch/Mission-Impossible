import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { generateOtp } from "@/services/api";

type Step = "signin" | "otp";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithOtp } = useAuth();
  const [step, setStep] = useState<Step>("signin");
  const [identifier, setIdentifier] = useState("officer@traffic.gov.in");
  const [password, setPassword] = useState("Officer@2026");
  const [otp, setOtp] = useState("");
  const [temporaryCode, setTemporaryCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const clearFeedback = () => {
    setMessage("");
    setError("");
  };

  async function submitSignIn(event: FormEvent) {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Sign in failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  async function sendOtp(event: FormEvent) {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const result = await generateOtp({ identifier: identifier.trim(), purpose: "LOGIN" });
      setTemporaryCode((result as any).otp_demo_code || (result as any).temporary_code || "");
      setStep("otp");
      setMessage("A verification code is ready. Enter it below to continue.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not create an OTP. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      await loginWithOtp(identifier.trim(), otp.trim());
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || "That OTP is invalid or expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#08111f] text-slate-100 flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-900/40">
            <ShieldCheck size={25} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Traffic Control Sign In</h1>
          <p className="mt-1 text-sm text-slate-400">Temporary local access portal</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#101c2e] p-5 shadow-2xl">
          <div className="mb-5 flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className={`h-2 w-2 rounded-full ${step === "signin" ? "bg-blue-400" : "bg-emerald-400"}`} />
            {step === "signin" ? "Step 1 of 2: Sign in" : "Step 2 of 2: Verify OTP"}
          </div>

          {error && <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</div>}
          {message && <div className="mb-4 flex gap-2 rounded-lg border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-200"><CheckCircle2 size={17} className="shrink-0" />{message}</div>}

          {step === "signin" ? (
            <form onSubmit={submitSignIn} className="space-y-4">
              <label className="block text-sm text-slate-300">
                Email or phone
                <span className="relative mt-1 block">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required className="w-full rounded-lg border border-slate-700 bg-[#08111f] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
                </span>
              </label>
              <label className="block text-sm text-slate-300">
                Password
                <span className="relative mt-1 block">
                  <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full rounded-lg border border-slate-700 bg-[#08111f] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
                </span>
              </label>
              <button disabled={loading} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{loading ? "Signing in..." : "Sign in"}</button>
              <button type="button" onClick={sendOtp} disabled={loading} className="w-full rounded-lg border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"><KeyRound size={15} className="mr-2 inline" />Use OTP instead</button>
              <p className="text-center text-xs text-slate-500">Temporary account: officer@traffic.gov.in / Officer@2026</p>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="rounded-lg bg-[#08111f] px-3 py-2 text-sm text-slate-300">Code requested for <strong>{identifier}</strong></div>
              {temporaryCode && <div className="rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-center text-sm text-amber-200">Temporary OTP: <strong className="font-mono tracking-widest">{temporaryCode}</strong></div>}
              <label className="block text-sm text-slate-300">6-digit OTP<input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} required className="mt-1 w-full rounded-lg border border-slate-700 bg-[#08111f] px-3 py-3 text-center text-xl tracking-[0.45em] outline-none focus:border-emerald-500" /></label>
              <button disabled={loading || otp.length !== 6} className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">{loading ? "Checking..." : "Verify and continue"}</button>
              <button type="button" onClick={() => { setStep("signin"); clearFeedback(); }} className="w-full py-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15} className="mr-1 inline" />Back to sign in</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
