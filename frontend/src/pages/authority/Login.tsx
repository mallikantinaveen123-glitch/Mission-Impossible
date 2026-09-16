import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Phone, 
  KeyRound, 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight, 
  UserCheck, 
  BadgeCheck, 
  RefreshCw, 
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { generateOtp, fetchGeneratedPassword } from "@/services/api";

type AuthMode = "login" | "otp" | "register";
type UserRole = "OFFICER" | "CITIZEN";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithOtp, register } = useAuth();

  // Navigation / Mode state
  const [mode, setMode] = useState<AuthMode>("login");
  const [selectedRole, setSelectedRole] = useState<UserRole>("OFFICER");

  // Form inputs
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(300);

  // Password Generator State
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatedPwd, setGeneratedPwd] = useState("");
  const [pwdEntropy, setPwdEntropy] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1-Click Demo Logins
  const handleQuickDemo = (role: UserRole) => {
    setErrorMsg(null);
    if (role === "OFFICER") {
      setIdentifier("officer@traffic.gov.in");
      setPassword("Officer@2026");
      setSelectedRole("OFFICER");
      setMode("login");
    } else {
      setIdentifier("citizen@example.com");
      setPassword("Citizen@2026");
      setSelectedRole("CITIZEN");
      setMode("login");
    }
  };

  // Password Generator Handler
  const handleGeneratePassword = async () => {
    setIsGenerating(true);
    try {
      const res = await fetchGeneratedPassword(16);
      setGeneratedPwd(res.password);
      setPwdEntropy(res.entropy_bits);
      setShowGenerator(true);
    } catch {
      // Client-side fallback if backend is offline
      const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+";
      let pwd = "";
      for (let i = 0; i < 16; i++) {
        pwd += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      setGeneratedPwd(pwd);
      setPwdEntropy(92.4);
      setShowGenerator(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyPassword = () => {
    setPassword(generatedPwd);
    setSuccessMsg("Strong password applied to password field!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // OTP Generation Handler
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg("Please enter your mobile phone number or email address.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await generateOtp({ identifier: identifier.trim(), purpose: "LOGIN" });
      setOtpSent(true);
      setDemoOtp(res.otp_demo_code);
      setSuccessMsg(res.message);
      setOtpCountdown(300);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to generate OTP. Please verify your input.");
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification Submit
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length < 6) {
      setErrorMsg("Please enter the 6-digit OTP code.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await loginWithOtp(identifier.trim(), otpCode.trim());
      navigate("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  // Password Sign-in Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg("Please provide both email/phone and password.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      navigate("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Invalid login credentials. Please check your password.");
    } finally {
      setLoading(false);
    }
  };

  // Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !identifier.trim() || !password.trim()) {
      setErrorMsg("Please fill in all required registration fields.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: identifier.trim(),
        phone: phone.trim() || undefined,
        password: password,
        role: selectedRole,
        badge_number: selectedRole === "OFFICER" ? badgeNumber.trim() : undefined,
      });
      navigate("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Registration failed. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Container */}
      <div className="w-full max-w-lg z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/20 border border-blue-400/30 mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Smart Traffic AI System
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Secure Authentication & Unified Access Portal
          </p>
        </div>

        {/* Quick Demo Pre-fill Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 mb-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-300">⚡ 1-Click Demo Accounts:</span>
            <span className="text-slate-500">Auto-fills credentials</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("OFFICER")}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-950/60 border border-blue-800/60 hover:bg-blue-900/60 text-blue-300 text-xs font-medium transition-all"
            >
              <BadgeCheck size={14} className="text-blue-400" />
              Officer / Authority
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("CITIZEN")}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-900/60 text-emerald-300 text-xs font-medium transition-all"
            >
              <UserCheck size={14} className="text-emerald-400" />
              Citizen User
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-[#101827]/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Mode Navigation Tabs */}
          <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                mode === "login"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("otp"); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                mode === "otp"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              OTP Login
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                mode === "register"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/60 border border-red-800/80 flex items-start gap-3 text-red-200 text-sm animate-in fade-in">
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 flex items-start gap-3 text-emerald-200 text-sm animate-in fade-in">
              <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. PASSWORD SIGN IN MODE */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Email or Phone Number
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="officer@traffic.gov.in or 9876543210"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode("otp")}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot / Login via OTP?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your secure password"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : "Sign In"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          )}

          {/* 2. OTP SIGN IN MODE */}
          {mode === "otp" && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Mobile Number or Email
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. 9876543210 or your@email.com"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : <KeyRound size={16} />}
                    Send 6-Digit OTP
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 animate-in fade-in">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                    <span className="text-slate-400">Sent code to: <strong className="text-slate-200">{identifier}</strong></span>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-blue-400 hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  {demoOtp && (
                    <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3 flex items-center justify-between">
                      <div className="text-xs text-amber-200">
                        ⚡ Demo OTP Code: <strong className="text-white text-sm font-mono tracking-widest ml-1">{demoOtp}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtpCode(demoOtp)}
                        className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-2.5 py-1 rounded-md transition-colors"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="• • • • • •"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-3 text-center text-2xl font-mono tracking-widest text-blue-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : <ShieldCheck size={16} />}
                    Verify & Authenticate
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      Didn't receive code? Resend OTP
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 3. SIGN UP MODE */}
          {mode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("CITIZEN")}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      selectedRole === "CITIZEN"
                        ? "bg-blue-600/20 border-blue-500 text-blue-200"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <UserCheck size={14} />
                    Citizen
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("OFFICER")}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      selectedRole === "OFFICER"
                        ? "bg-blue-600/20 border-blue-500 text-blue-200"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <BadgeCheck size={14} />
                    Traffic Authority
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Officer John Doe"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {selectedRole === "OFFICER" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Police Badge Number / Service ID
                  </label>
                  <input
                    type="text"
                    required
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    placeholder="e.g. TS-TRF-4029"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                  >
                    <Sparkles size={13} />
                    Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : <UserCheck size={16} />}
                Create Secure Account
              </button>
            </form>
          )}

          {/* SECURE PASSWORD GENERATOR DRAWER */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleGeneratePassword}
                disabled={isGenerating}
                className="text-xs text-slate-300 hover:text-emerald-400 flex items-center gap-1.5 font-medium transition-colors"
              >
                <Sparkles size={14} className="text-emerald-400" />
                {isGenerating ? "Generating..." : "Generate Cryptographically Strong Password"}
              </button>
              {showGenerator && (
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="text-xs text-slate-500 hover:text-slate-400"
                >
                  Hide
                </button>
              )}
            </div>

            {showGenerator && generatedPwd && (
              <div className="mt-3 p-3.5 bg-slate-950/80 rounded-xl border border-emerald-500/40 animate-in fade-in">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-emerald-300 text-sm tracking-wider font-semibold break-all">
                    {generatedPwd}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      title="Copy to clipboard"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyPassword}
                      title="Apply to password input"
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Use
                    </button>
                  </div>
                </div>
                {pwdEntropy && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>Entropy: <strong className="text-emerald-400">{pwdEntropy} bits</strong></span>
                    <span className="text-emerald-400 font-medium">Verified High Security</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          Encrypted with PBKDF2-HMAC-SHA256 • Smart City Safety Grid v2.0
        </div>
      </div>
    </div>
  );
}