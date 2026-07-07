import { API_BASE_URL } from '../utils/config';
import React, { useState, useEffect, useRef } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Phone, User, ArrowRight, CheckCircle2, ShieldCheck, RefreshCw, ShieldAlert, Cpu, Sparkles, KeyRound, Eye, EyeOff, Loader2, Star } from 'lucide-react';
import PasswordInput from '../components/ui/PasswordInput';
import '../App.css';
import { InventoryAntLogoMark, InventoryAntLogoText } from '../components/ui/InventoryAntLogo';


// ─── OTP Input Component ───────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputs = useRef([]);

  const handleChange = (e, idx) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val && e.nativeEvent.inputType !== 'deleteContentBackward') return;
    const newOtp = [...value];
    newOtp[idx] = val.slice(-1);
    onChange(newOtp);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      const newOtp = [...value];
      if (newOtp[idx]) {
        newOtp[idx] = '';
        onChange(newOtp);
      } else if (idx > 0) {
        inputs.current[idx - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...value];
    pasted.split('').forEach((ch, i) => { newOtp[i] = ch; });
    onChange(newOtp);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 mb-2">
      {value.map((digit, idx) => (
        <input
          key={idx}
          ref={el => inputs.current[idx] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(e, idx)}
          onKeyDown={e => handleKeyDown(e, idx)}
          onFocus={e => e.target.select()}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-2xl font-bold text-slate-800 bg-white border-2 border-slate-200 focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 rounded-xl outline-none transition-all"
        />
      ))}
    </div>
  );
}

// ─── Countdown Timer Hook ──────────────────────────────────────────────────
function useCountdown(seconds) {
  const [remaining, setRemaining] = useState(seconds);
  const timerRef = useRef(null);

  const start = (s = seconds) => {
    setRemaining(s);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);
  return { remaining, start, canResend: remaining === 0 };
}

// ─── Main Component ────────────────────────────────────────────────────────
function AuthScreen({ onLogin, defaultView }) {
  const navigate = useNavigate();
  // 'landing' | 'login' | 'otp' | 'signup' | 'admin'
  // | 'verify-otp' | 'forgot-password' | 'verify-reset-otp' | 'set-new-password'
  const [view, setView] = useState(defaultView || 'login');

  useEffect(() => {
    if (defaultView) {
      setView(defaultView);
    }
  }, [defaultView]);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // OTP state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  // Countdown for resend
  const { remaining, start: startCountdown, canResend } = useCountdown(60);

  const savedId = localStorage.getItem('ant_user');
  const savedToken = localStorage.getItem('ant_token');
  const savedRole = localStorage.getItem('ant_role') || 'user';

  // ─── Navigate helpers ──────────────────────────────────────────────────
  const goTo = (v) => {
    if (v === 'landing') {
      navigate('/');
    } else {
      setView(v);
      setOtpDigits(['', '', '', '', '', '']);
      setLoading(false);
    }
  };


  // ─── Signup: Step 1 — Send OTP ──────────────────────────────────────
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match. Please try again.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to send OTP.');
        return;
      }
      toast.success('OTP sent! Please check your email inbox.');
      startCountdown(60);
      goTo('verify-otp');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Signup: Step 2 — Verify OTP ────────────────────────────────────
  const handleSignupOtpSubmit = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length < 6) { toast.error('Please enter the complete 6-digit OTP.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, name, password, phone: mobile || undefined }),
      });
      const data = await res.json();
      if (data.access_token) {
        toast.success('Account created successfully! Welcome to Inventory Ant 🐜');
        onLogin(data.user.email, data.user.role, data.access_token, data.refresh_token);
      } else {
        toast.error(data.message || 'OTP verification failed.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Signup: Resend OTP ──────────────────────────────────────────────
  const handleResendSignupOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to resend OTP.'); return; }
      toast.success('New OTP sent to your email!');
      setOtpDigits(['', '', '', '', '', '']);
      startCountdown(60);
    } catch {
      toast.error('Network error.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Login ───────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        onLogin(data.user.email, data.user.role, data.access_token, data.refresh_token);
      } else {
        toast.error(data.message || 'Invalid credentials');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot Password: Step 1 — Send Reset OTP ───────────────────────
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to send OTP.'); return; }
      toast.success('If your email is registered, an OTP has been sent!');
      startCountdown(60);
      goTo('verify-reset-otp');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot Password: Resend OTP ─────────────────────────────────────
  const handleResendResetOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to resend OTP.'); return; }
      toast.success('New OTP sent to your email!');
      setOtpDigits(['', '', '', '', '', '']);
      startCountdown(60);
    } catch {
      toast.error('Network error.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot Password: Step 2 — Verify Reset OTP ──────────────────────
  const handleResetOtpSubmit = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length < 6) { toast.error('Please enter the complete 6-digit OTP.'); return; }
    // Just move to set-new-password screen, OTP is verified on final step
    setView('set-new-password');
  };

  // ─── Forgot Password: Step 3 — Set New Password ──────────────────────
  const handleSetNewPasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match. Please try again.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const otp = otpDigits.join('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to reset password.');
        // Go back to OTP entry if OTP was wrong/expired
        goTo('verify-reset-otp');
        return;
      }
      toast.success('Password reset successfully! Please log in.');
      setPassword('');
      goTo('login');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Admin Login ─────────────────────────────────────────────────────
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminUsername, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        onLogin(data.user.email, data.user.role, data.access_token, data.refresh_token);
      } else {
        toast.error(data.message || 'Invalid admin credentials');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Google Auth ──────────────────────────────────────────────────────
  const handleGoogleAuth = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code }),
        });
        const data = await res.json();
        if (data && data.access_token) {
          onLogin(data.user.email, data.user.role, data.access_token, data.refresh_token);
        } else {
          toast.error('Failed to authenticate with Google');
        }
      } catch {
        toast.error('Google Login failed');
      }
    },
  });

  // ─── Shared UI ────────────────────────────────────────────────────────
  const GoogleIcon = () => (
    <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );

  const LogoIcon = () => (
    <div className="w-16 h-16 bg-[#7c3aed] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_4px_20px_rgba(124,58,237,0.4)]">
      <span className="text-3xl grayscale brightness-150 relative top-[-2px]">🐜</span>
    </div>
  );

  const CardBack = ({ to, label = '← Back' }) => (
    <button
      onClick={() => goTo(to)}
      className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer text-xs font-bold"
    >
      {label}
    </button>
  );

  const SubmitBtn = ({ label, icon }) => (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3.5 mt-2 text-base font-bold bg-primary hover:opacity-95 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md shadow-primary/10 border-none cursor-pointer flex items-center justify-center gap-2"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : (icon || <ArrowRight size={18} />)}
      {loading ? 'Please wait...' : label}
    </button>
  );

  const ResendSection = ({ onResend }) => (
    <div className="flex items-center justify-between mt-4">
      <span className="text-sm font-bold text-slate-500">
        {canResend ? 'Didn\'t receive it?' : `Resend OTP in ${remaining}s`}
      </span>
      <button
        type="button"
        onClick={onResend}
        disabled={!canResend || loading}
        className={`text-sm font-bold flex items-center gap-1 bg-transparent border-none transition-colors ${canResend ? 'text-[#7c3aed] cursor-pointer hover:text-[#6d28d9]' : 'text-slate-300 cursor-not-allowed'}`}
      >
        <RefreshCw size={14} /> Resend OTP
      </button>
    </div>
  );

  const isDark = view === 'admin';

  return (
    <div className="marketing-site w-screen h-screen flex flex-row overflow-hidden bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans">
      
      {/* ── Left Panel: Marketing Pitch (Visible only on desktop) ────────────────── */}
      <div className="hidden lg:flex w-1/2 h-full bg-[#e2f2e9] dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-800/50 flex-col justify-between p-12 relative overflow-hidden shrink-0">
        {/* Background Decorative Grid */}
        <div 
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Isometric Glassmorphism UI Preview */}
        <div className="absolute top-1/4 right-[-10%] w-[380px] h-[340px] bg-white/40 dark:bg-slate-800/20 rounded-[2rem] border border-white/60 dark:border-slate-700/20 backdrop-blur-md shadow-2xl rotate-[-6deg] flex flex-col p-6 space-y-4 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-red-400" />
            <span className="size-3 rounded-full bg-amber-400" />
            <span className="size-3 rounded-full bg-emerald-400" />
          </div>
          <div className="h-6 w-1/3 bg-slate-400/20 rounded-full" />
          <div className="h-3 w-full bg-slate-400/10 rounded-full" />
          <div className="h-3 w-5/6 bg-slate-400/10 rounded-full" />
          <div className="grid grid-cols-3 gap-3 pt-4 flex-1">
            <div className="rounded-xl border border-primary/20 bg-primary/5 flex flex-col justify-center p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Stock</span>
              <span className="text-sm font-bold text-primary">12,450</span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/40 flex flex-col justify-center p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Alerts</span>
              <span className="text-sm font-bold text-red-500">3 Low</span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/40 flex flex-col justify-center p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Sales</span>
              <span className="text-sm font-bold text-slate-850 dark:text-slate-200">₹8,320</span>
            </div>
          </div>
        </div>
        
        {/* Top Header Logo */}
        <div className="relative flex items-center z-10">
          <InventoryAntLogoMark className="h-9 w-auto" />
        </div>

        {/* Middle Copy Block */}
        <div className="relative my-auto space-y-6 z-10 text-left max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
            India&apos;s simplest inventory & billing software
          </span>
          <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 dark:text-white">
            Manage stock, billing & orders from one dashboard.
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Trusted by 12,000+ Indian shops, wholesalers and distributors to run their entire operation without the guesswork.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="size-3" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm m-0">Real-time stock tracking</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">Never run out of stock again across every warehouse.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="size-3.5" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm m-0">GST-ready billing</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">Create compliant invoices and reports in seconds.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="size-3.5" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm m-0">Bank-grade security</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">Your business data stays encrypted and private.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Ratings Block */}
        <div className="relative z-10 flex flex-col gap-3 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {['A', 'R', 'S', 'K'].map((ch, idx) => (
                <span 
                  key={idx}
                  className="flex size-8 items-center justify-center rounded-full border-2 border-[#e2f2e9] dark:border-slate-900 bg-primary font-display text-[10px] font-bold text-white shadow-sm"
                >
                  {ch}
                </span>
              ))}
            </div>
            <div>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Rated 4.8/5 by growing businesses
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Forms Container ─────────────────────────────────────────── */}
      <div 
        className="w-full lg:w-1/2 h-full flex flex-col overflow-auto bg-[#F8FAFC] dark:bg-slate-950 p-6 md:p-12 relative"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* Back Button */}
        <button
          onClick={() => goTo('landing')}
          className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-transparent border-none cursor-pointer text-xs font-semibold flex items-center gap-1.5"
        >
          <span>←</span> Back
        </button>

        {/* Form Wrap */}
        <div className="my-auto w-full max-w-md mx-auto py-8 text-left">

          {/* ── Login Form ────────────────────────────────────────────────────────── */}
          {view === 'login' && (
            <div>
              <p className="text-primary text-xs font-bold tracking-[0.1em] uppercase mb-2">B2B WAREHOUSE INTELLIGENCE</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white m-0 tracking-tight">Welcome back</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-8">Sign in to manage your stock, billing and orders in one place.</p>

              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      placeholder="amit@warehouse.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => { setEmail(email); goTo('forgot-password'); }}
                      className="text-xs font-bold text-primary hover:opacity-85 bg-transparent border-none cursor-pointer p-0 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <PasswordInput
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    iconLeft={<Lock className="text-slate-400" size={18} />}
                  />
                </div>

                <div className="flex items-center mt-1">
                  <input
                    type="checkbox"
                    id="keepSignedIn"
                    className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="keepSignedIn" className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-medium">Keep me signed in</label>
                </div>

                <SubmitBtn label="Sign in" />

                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Or Continue With</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGoogleAuth()}
                  className="w-full py-3.5 text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer"
                >
                  <GoogleIcon /> Continue with Google
                </button>
              </form>

              <p className="mt-8 mb-0 text-sm text-slate-500 dark:text-slate-400 font-medium text-center">
                New to Inventory Ant?{' '}
                <button type="button" onClick={() => goTo('signup')} className="text-primary font-bold bg-transparent border-none cursor-pointer p-0 hover:underline">
                  Create an account
                </button>
              </p>
            </div>
          )}

          {/* ── Signup Form ────────────────────────────────────────────────────────── */}
          {view === 'signup' && (
            <div>
              <p className="text-primary text-xs font-bold tracking-[0.1em] uppercase mb-2">SAAS WAREHOUSE SIGNUP</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white m-0 tracking-tight">Create your account</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-8">Start free — no card needed. Set up your warehouse in minutes.</p>

              <form onSubmit={handleSignupSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Amit Sharma"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      placeholder="amit@warehouse.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Mobile Number <span className="text-slate-450 dark:text-slate-400 font-normal">(optional)</span></label>
                  <div className="relative flex items-center border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary bg-white dark:bg-slate-900 transition-all overflow-hidden">
                    <span className="pl-4 pr-2 py-3.5 text-slate-450 dark:text-slate-400 font-bold border-r border-slate-100 dark:border-slate-800">+91</span>
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={mobile}
                      onChange={e => setMobile(e.target.value)}
                      className="flex-1 px-4 py-3.5 text-slate-800 dark:text-slate-100 text-sm outline-none bg-transparent"
                    />
                    <Phone className="absolute right-4 text-slate-450" size={18} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Choose Password</label>
                  <PasswordInput
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    iconLeft={<Lock className="text-slate-400" size={18} />}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    iconLeft={<Lock className="text-slate-400" size={18} />}
                  />
                </div>

                <div className="flex items-start mt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-4 w-4 mt-0.5"
                    required
                  />
                  <label htmlFor="terms" className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    I agree to the <span className="text-primary cursor-pointer hover:underline">Terms</span> and <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
                  </label>
                </div>

                <SubmitBtn label="Create free account" />

                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Or Continue With</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGoogleAuth()}
                  className="w-full py-3.5 text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer"
                >
                  <GoogleIcon /> Sign up with Google
                </button>
              </form>

              <p className="mt-8 mb-0 text-sm text-slate-500 dark:text-slate-400 font-medium text-center">
                Already registered?{' '}
                <button type="button" onClick={() => goTo('login')} className="text-primary font-bold bg-transparent border-none cursor-pointer p-0 hover:underline">
                  Sign In here
                </button>
              </p>
            </div>
          )}

          {/* ── Signup OTP Verification ────────────────────────────────────────────────── */}
          {view === 'verify-otp' && (
            <div>
              <p className="text-primary text-xs font-bold tracking-[0.1em] uppercase mb-2">EMAIL VERIFICATION</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white m-0 tracking-tight">Verify Your Email</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-1">We&apos;ve sent a 6-digit OTP to</p>
              <p className="text-slate-850 dark:text-slate-200 font-bold text-sm mb-8">{email}</p>

              <form onSubmit={handleSignupOtpSubmit} className="flex flex-col gap-6">
                <OtpInput value={otpDigits} onChange={setOtpDigits} />

                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length < 6}
                  className="w-full py-4 mt-1 text-base font-bold bg-primary hover:opacity-95 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md shadow-primary/10 border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>

                <ResendSection onResend={handleResendSignupOtp} />
              </form>
            </div>
          )}

          {/* ── Forgot Password: Step 1 ─────────────────────────────────────────────────── */}
          {view === 'forgot-password' && (
            <div>
              <p className="text-primary text-xs font-bold tracking-[0.1em] uppercase mb-2">PASSWORD RESET</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white m-0 tracking-tight">Forgot Password?</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-8">Enter your registered email address. We&apos;ll send a 6-digit OTP to reset your password.</p>

              <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Registered Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      placeholder="amit@warehouse.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <SubmitBtn label="Send Reset OTP" icon={<Mail size={18} />} />
              </form>
            </div>
          )}

          {/* ── Forgot Password: Step 2 — OTP ───────────────────────────────────────────── */}
          {view === 'verify-reset-otp' && (
            <div>
              <p className="text-primary text-xs font-bold tracking-[0.1em] uppercase mb-2">PASSWORD RESET</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white m-0 tracking-tight">Enter OTP</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-1">We&apos;ve sent a 6-digit OTP to</p>
              <p className="text-slate-850 dark:text-slate-200 font-bold text-sm mb-8">{email}</p>

              <form onSubmit={handleResetOtpSubmit} className="flex flex-col gap-6">
                <OtpInput value={otpDigits} onChange={setOtpDigits} />

                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length < 6}
                  className="w-full py-4 mt-1 text-base font-bold bg-primary hover:opacity-95 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md shadow-primary/10 border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  {loading ? 'Please wait...' : 'Continue'}
                </button>

                <ResendSection onResend={handleResendResetOtp} />
              </form>
            </div>
          )}

          {/* ── Forgot Password: Step 3 — New Password ────────────────────────────────────── */}
          {view === 'set-new-password' && (
            <div>
              <p className="text-primary text-xs font-bold tracking-[0.1em] uppercase mb-2">PASSWORD RESET</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white m-0 tracking-tight">Set New Password</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-8">Choose a strong new password for your account.</p>

              <form onSubmit={handleSetNewPasswordSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                  <PasswordInput
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    iconLeft={<Lock className="text-slate-400" size={18} />}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                  <PasswordInput
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    iconLeft={<Lock className="text-slate-400" size={18} />}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 mt-2 text-base font-bold bg-primary hover:opacity-95 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md shadow-primary/10 border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </div>
          )}

          {/* ── Admin Login ─────────────────────────────────────────────────────────── */}
          {view === 'admin' && (
            <div>
              <p className="text-primary text-xs font-bold tracking-[0.1em] uppercase mb-2">SUPER USER ACCESS</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white m-0 tracking-tight">Inventory Ant Admin</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-10">Console access for super users. All actions are logged.</p>

              <form onSubmit={handleAdminSubmit} className="flex flex-col gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Admin Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter admin username"
                      value={adminUsername}
                      onChange={e => setAdminUsername(e.target.value)}
                      className="w-full pl-4 pr-11 py-3.5 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none transition-all placeholder-slate-400"
                      required
                    />
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Console Password</label>
                  <PasswordInput
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-2 text-sm font-bold bg-primary hover:opacity-95 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md shadow-primary/10 border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loading ? 'Authenticating...' : 'Console Access verify karein'}
                </button>
              </form>

              <p className="mt-8 mb-0 text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed text-center">
                Dhyan dein: Yaha se plans aur clients database adjust kiye ja sakte hain. Any modification will be logged in the audit-trail.
              </p>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

export default AuthScreen;
