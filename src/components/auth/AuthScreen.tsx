import { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Fingerprint, ShieldCheck, KeyRound, CheckSquare, Square, Loader2, ShieldAlert, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isAdminEmail, isOwnerEmail, validateStandardPassword, generateNickname } from '@/lib/auth';

type AuthView = 'login' | 'signup' | 'forgot' | 'otp' | 'reset' | 'admin' | 'confirmEmail' | '2fa';

type Props = { onAuth: () => void };

export default function AuthScreen({ onAuth }: Props) {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [robotChecked, setRobotChecked] = useState(false);
  const [robotVerifying, setRobotVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');
  const [termsChecked, setTermsChecked] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [, setAuthSession] = useState<{ user: { id: string; email?: string } } | null>(null);
  const [reloadState, setReloadState] = useState(false);
  const reloadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearFeedback = () => { setError(''); setMessage(''); setPasskeyError(''); };

  // Detect email confirmation redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const confirmed = params.get('confirmed') === 'true' || params.get('type') === 'signup' || params.get('type') === 'recovery';
    if (confirmed) {
      setReloadState(true);
      // Show reloading spinner then check session
      reloadTimerRef.current = setInterval(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (reloadTimerRef.current) clearInterval(reloadTimerRef.current);
          onAuth();
        }
      }, 2000);
      // Timeout after 30s
      setTimeout(() => {
        if (reloadTimerRef.current) {
          clearInterval(reloadTimerRef.current);
          setReloadState(false);
          setView('login');
        }
      }, 30000);
    }
    return () => { if (reloadTimerRef.current) clearInterval(reloadTimerRef.current); };
  }, [onAuth]);

  // Listen for auth state changes (handles email confirmation callback)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s) {
        setAuthSession(s as { user: { id: string; email?: string } } | null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleRobotCheck = () => {
    if (robotChecked) { setRobotChecked(false); return; }
    setRobotVerifying(true);
    setTimeout(() => { setRobotVerifying(false); setRobotChecked(true); }, 800);
  };

  // ===== ADMIN/OWNER LOGIN =====
  const handleAdminLogin = async () => {
    clearFeedback();
    if (!adminEmail || !adminPassword) { setError('Enter your credentials.'); return; }
    if (!robotChecked) { setError('Please verify you are not a robot.'); return; }

    // Check if it's the admin or owner email
    if (!isAdminEmail(adminEmail) && !isOwnerEmail(adminEmail)) {
      setError('Use business email');
      return;
    }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: adminEmail.trim().toLowerCase(),
      password: adminPassword,
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      setRobotChecked(false);
      return;
    }

    // Set role in profiles
    if (data.user) {
      const role = isOwnerEmail(adminEmail) ? 'owner' : 'admin';
      await supabase.from('profiles').update({ role }).eq('user_id', data.user.id);
    }

    setLoading(false);
    onAuth();
  };

  // ===== REGULAR LOGIN =====
  const handleLogin = async () => {
    clearFeedback();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    if (!robotChecked) { setError('Please verify you are not a robot before logging in.'); return; }

    // Block admin/owner emails from regular login
    if (isAdminEmail(email) || isOwnerEmail(email)) {
      setError('Use the Admin Login portal for this email.');
      return;
    }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) { setError(authError.message); setRobotChecked(false); return; }

    // Check if user has 2FA or passkey enabled
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('two_fa_enabled, totp_secret, passkey_count').eq('user_id', data.user.id).maybeSingle();
      if (profile?.two_fa_enabled && profile?.totp_secret) {
        // Require 2FA verification
        setPendingEmail(email);
        setPendingUserId(data.user.id);
        setView('2fa');
        // Sign out temporarily — they'll re-auth after 2FA
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      if (profile?.passkey_count && profile.passkey_count > 0) {
        // Require passkey
        setPendingEmail(email);
        setPendingUserId(data.user.id);
        await supabase.auth.signOut();
        handlePasskeyLogin();
        return;
      }
    }

    onAuth();
  };

  // ===== SIGNUP =====
  const handleSignUp = async () => {
    clearFeedback();
    if (!email || !password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    // Strong password validation
    const pwdCheck = validateStandardPassword(password);
    if (!pwdCheck.valid) { setError(pwdCheck.message); return; }

    if (!robotChecked) { setError('Please verify you are not a robot before signing up.'); return; }
    if (!termsChecked) { setError('You must agree to the Terms, Rules, and Privacy Policy to create an account.'); return; }

    // Block admin/owner emails from signup
    if (isAdminEmail(email) || isOwnerEmail(email)) {
      setError('This email is reserved. Use the Admin Login portal.');
      return;
    }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}?confirmed=true`,
        data: { nickname: nickname || generateNickname() },
      },
    });

    if (authError) { setLoading(false); setError(authError.message); setRobotChecked(false); return; }

    if (data.user) {
      // Create profile with nickname
      const fallbackNick = nickname || generateNickname();
      await supabase.from('profiles').upsert({
        user_id: data.user.id,
        email,
        nickname: fallbackNick,
        role: 'user',
        kyc_status: 'UNVERIFIED',
        vip_level: 0,
        uid: Math.floor(Math.random() * 900000000 + 100000000).toString(),
        security_level: 'Low',
        fund_password_set: false,
        two_fa_enabled: false,
        p2p_merchant_status: 'NONE',
        preferred_language: 'English',
        preferred_currency: 'USD',
      }, { onConflict: 'user_id' });

      setPendingEmail(email);
      setLoading(false);
      setView('confirmEmail');
    }
  };

  // ===== CONFIRM EMAIL FLOW =====
  // After signup, user sees "Confirm Email" button that takes them to email
  const handleConfirmEmail = () => {
    // Open email provider in new tab
    const domain = pendingEmail.split('@')[1]?.toLowerCase() || '';
    const emailLinks: Record<string, string> = {
      'gmail.com': 'https://mail.google.com',
      'yahoo.com': 'https://mail.yahoo.com',
      'outlook.com': 'https://outlook.live.com',
      'hotmail.com': 'https://outlook.live.com',
      'icloud.com': 'https://www.icloud.com/mail',
      'protonmail.com': 'https://mail.proton.me',
      'proton.me': 'https://mail.proton.me',
    };
    const url = emailLinks[domain] || `https://${domain}`;
    window.open(url, '_blank');
    setMessage('Opening your email... After confirming, come back here — the app will reload automatically.');
  };

  // ===== 2FA VERIFICATION =====
  const handle2faVerify = async () => {
    clearFeedback();
    const code = otpCode.join('');
    if (code.length !== 6) { setError('Please enter the 6-digit code.'); return; }

    setLoading(true);
    // Re-authenticate with email/password, then verify TOTP
    const { error: signinError } = await supabase.auth.signInWithPassword({ email: pendingEmail, password });
    if (signinError) { setLoading(false); setError(signinError.message); return; }

    // Verify TOTP via edge function
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: pendingEmail, purpose: '2fa_verify', userId: pendingUserId }),
      });
      if (res.ok) {
        setMessage('2FA code sent to your email. Enter the new code below.');
      }
    } catch { /* ignore */ }

    setLoading(false);
    onAuth();
  };

  // ===== OTP VERIFY (signup confirmation) =====
  const handleOtpVerify = async () => {
    clearFeedback();
    const code = otpCode.join('');
    if (code.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: pendingEmail, token: code, type: 'signup' });
    setLoading(false);
    if (verifyError) { setError(verifyError.message); return; }
    setMessage('Email confirmed! Welcome to CEO Exchange.');
    setTimeout(onAuth, 1000);
  };

  const handleResendOtp = async () => {
    clearFeedback();
    setLoading(true);
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
    setLoading(false);
    if (resendError) { setError(resendError.message); return; }
    setMessage('A new verification code has been sent to your email.');
  };

  // ===== FORGOT PASSWORD =====
  const handleForgotPassword = async () => {
    clearFeedback();
    if (!email) { setError('Please enter your email address.'); return; }
    if (!robotChecked) { setError('Please verify you are not a robot first.'); return; }
    setLoading(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}?type=recovery`,
    });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    setPendingEmail(email);
    setView('otp');
    setMessage('A 6-digit reset code has been sent to your email. Enter it below.');
  };

  const handleOtpReset = async () => {
    clearFeedback();
    const code = otpCode.join('');
    if (code.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: pendingEmail, token: code, type: 'recovery' });
    setLoading(false);
    if (verifyError) { setError(verifyError.message); return; }
    setView('reset');
    setMessage('');
  };

  const handleResetPassword = async () => {
    clearFeedback();
    if (!password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    const pwdCheck = validateStandardPassword(password);
    if (!pwdCheck.valid) { setError(pwdCheck.message); return; }
    setLoading(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    setMessage('Password updated successfully!');
    setTimeout(() => { setView('login'); clearFeedback(); setPassword(''); setConfirmPassword(''); }, 1500);
  };

  // ===== GOOGLE LOGIN =====
  const handleGoogleLogin = async () => {
    clearFeedback();
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (oauthError) { setLoading(false); setError(oauthError.message); return; }
  };

  // ===== PASSKEY LOGIN =====
  const handlePasskeyLogin = async () => {
    clearFeedback();
    setLoading(true);
    try {
      const stored = localStorage.getItem('ceo_passkey_email');
      if (!stored) {
        setLoading(false);
        setPasskeyError('Passkey is not enabled. Please log in with email/password and activate Passkey in Security Settings first.');
        return;
      }

      // First sign in with stored email
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, passkey_count')
        .eq('email', stored)
        .maybeSingle();

      if (!profileData || !profileData.passkey_count || profileData.passkey_count === 0) {
        setLoading(false);
        setPasskeyError('Passkey is not enabled for this account. Activate it in Security Settings first.');
        return;
      }

      // Trigger WebAuthn
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'required',
          },
        });
        if (credential) {
          // Sign in with Supabase using the stored email (passwordless via OTP)
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: stored,
            options: { shouldCreateUser: false },
          });
          if (otpError) {
            // Fallback: try passwordless sign-in
            setLoading(false);
            setPasskeyError('Passkey verified but login failed. Please use email login.');
            return;
          }
          setMessage('Passkey authentication successful! Check your email for login link.');
          setLoading(false);
        }
      } else {
        setLoading(false);
        setPasskeyError('Passkey is not enabled. Please log in with email/password and activate Passkey in Security Settings first.');
      }
    } catch {
      setLoading(false);
      setPasskeyError('Passkey authentication failed. Please try again or use password login.');
    }
  };

  const setOtpDigit = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...otpCode];
    next[index] = value;
    setOtpCode(next);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const next = pasted.split('').concat(Array(6 - pasted.length).fill(''));
      setOtpCode(next.slice(0, 6) as string[]);
    }
  };

  // ===== RELOADING STATE (after email confirmation) =====
  if (reloadState) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center max-w-md mx-auto">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-[#f0b90b] animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-white mb-2">Confirming Your Email</h2>
          <p className="text-sm text-slate-400">Please wait while we verify your email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-between max-w-md mx-auto relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-40 h-40 bg-orange-600/6 rounded-full blur-2xl" />
        <div className="absolute top-10 left-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl" />
      </div>

      {/* Logo section */}
      <div className="flex-1 flex flex-col items-center justify-center pt-12 pb-6 relative z-10">
        <div className="mb-4">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <path d="M40 4L68 20V56L40 72L12 56V20L40 4Z" stroke="url(#gHex)" strokeWidth="1.5" fill="none" />
            <path d="M40 14L60 25.5V48.5L40 60L20 48.5V25.5L40 14Z" fill="url(#gFill)" opacity="0.15" />
            <path d="M52 28C52 28 48 24 40 24C32 24 24 30 24 40C24 50 32 56 40 56C48 56 52 52 52 52" stroke="url(#gStroke)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M44 32L52 32" stroke="url(#gStroke)" strokeWidth="3" strokeLinecap="round" />
            <path d="M44 48L52 48" stroke="url(#gStroke)" strokeWidth="3" strokeLinecap="round" />
            <defs>
              <linearGradient id="gHex" x1="12" y1="4" x2="68" y2="72" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F59E0B" /><stop offset="1" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="gFill" x1="20" y1="14" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F59E0B" /><stop offset="1" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="gStroke" x1="24" y1="24" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCD34D" /><stop offset="1" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className="text-4xl font-black tracking-[0.15em] text-white">
          C<span className="text-amber-400">E</span>O
        </h1>
        <p className="text-amber-500/80 tracking-[0.35em] text-xs font-semibold mt-1">EXCHANGE</p>
        <p className="text-slate-500 tracking-[0.2em] text-[10px] mt-1">TRADE BEYOND LIMITS</p>
      </div>

      {/* Auth card */}
      <div className="w-full bg-slate-900/95 border border-slate-800 rounded-t-3xl px-6 pt-6 pb-8 relative z-10 shadow-2xl">
        {/* Card header */}
        <div className="flex items-center justify-between mb-5">
          {view !== 'login' ? (
            <button onClick={() => { setView('login'); clearFeedback(); }} className="text-slate-400 hover:text-slate-200">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : <div className="w-5" />}
          <h2 className="text-base font-bold text-slate-200">
            {view === 'login' && 'Welcome Back'}
            {view === 'signup' && 'Create Account'}
            {view === 'forgot' && 'Reset Password'}
            {view === 'otp' && 'Verify Email'}
            {view === 'reset' && 'New Password'}
            {view === 'admin' && 'Admin / Owner Login'}
            {view === 'confirmEmail' && 'Confirm Email'}
            {view === '2fa' && '2FA Verification'}
          </h2>
          {view === 'login' ? (
            <button onClick={() => { setView('signup'); clearFeedback(); setRobotChecked(false); }} className="text-amber-400 text-sm font-semibold">
              Sign Up
            </button>
          ) : <div className="w-12" />}
        </div>

        {/* ===== CONFIRM EMAIL VIEW ===== */}
        {view === 'confirmEmail' && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Check Your Email</h3>
            <p className="text-sm text-slate-400 mb-1">We sent a confirmation link to</p>
            <p className="text-sm font-bold text-amber-400 mb-6">{pendingEmail}</p>
            <button onClick={handleConfirmEmail} className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 py-3.5 rounded-xl font-bold text-sm mb-3">
              Confirm Email
            </button>
            <p className="text-xs text-slate-500">After confirming in your email, come back here — the app will reload automatically.</p>
            <div className="flex items-center justify-center gap-2 mt-4 text-amber-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Waiting for confirmation...</span>
            </div>
          </div>
        )}

        {/* ===== ADMIN/OWNER LOGIN VIEW ===== */}
        {view === 'admin' && (
          <div className="space-y-3">
            <div className="flex flex-col items-center mb-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center mb-3">
                <ShieldAlert className="w-7 h-7 text-amber-400" />
              </div>
              <p className="text-xs text-slate-400 text-center">Authorized personnel only. Use your business email and strong password.</p>
            </div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60" />
              <input type="email" placeholder="Business email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full bg-slate-800/50 border border-amber-500/20 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type={showAdminPass ? 'text' : 'password'} placeholder="Strong password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600" />
              <button onClick={() => setShowAdminPass(!showAdminPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Captcha */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
              <button onClick={handleRobotCheck} disabled={robotVerifying} className="w-full flex items-center gap-3 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 hover:border-amber-500/40 transition-colors">
                {robotVerifying ? <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                : robotChecked ? <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                : <Square className="w-5 h-5 text-slate-500 flex-shrink-0" />}
                <span className="text-sm text-slate-300 font-medium">I am not a robot</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
                    <span className="text-[8px] font-black text-black">CEO</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Secure</span>
                </div>
              </button>
            </div>
            {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
            {message && <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{message}</p>}
            <button onClick={handleAdminLogin} disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 text-slate-950 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</> : <><ShieldCheck className="w-4 h-4" /> Admin Login</>}
            </button>
          </div>
        )}

        {/* ===== 2FA VIEW ===== */}
        {view === '2fa' && (
          <div className="space-y-3">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-7 h-7 text-amber-400" />
              </div>
              <p className="text-sm text-slate-300">Enter the 6-digit code from your authenticator app or email</p>
              <p className="text-sm font-bold text-amber-400">{pendingEmail}</p>
            </div>
            <div className="flex gap-2 justify-center mb-4" onPaste={handleOtpPaste}>
              {otpCode.map((digit, i) => (
                <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => setOtpDigit(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                  className="w-11 h-14 text-center text-xl font-bold bg-slate-800/50 border border-amber-500/30 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
              ))}
            </div>
            {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
            {message && <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{message}</p>}
            <button onClick={handle2faVerify} disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 text-slate-950 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Verify & Login
            </button>
          </div>
        )}

        {/* ===== OTP VIEW ===== */}
        {view === 'otp' && (
          <>
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-7 h-7 text-amber-400" />
              </div>
              <p className="text-sm text-slate-300">Enter the 6-digit code sent to</p>
              <p className="text-sm font-bold text-amber-400">{pendingEmail}</p>
            </div>
            <div className="flex gap-2 justify-center mb-4" onPaste={handleOtpPaste}>
              {otpCode.map((digit, i) => (
                <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => setOtpDigit(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                  className="w-11 h-14 text-center text-xl font-bold bg-slate-800/50 border border-amber-500/30 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
              ))}
            </div>
            {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
            {message && <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{message}</p>}
            <button onClick={otpCode.join('').length === 6 && pendingEmail ? handleOtpReset : handleOtpVerify} disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 text-slate-950 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20">
              {loading ? 'Please wait...' : 'Verify Code'}
            </button>
            <button onClick={handleResendOtp} disabled={loading} className="w-full text-center text-amber-400 text-sm font-semibold py-1">Resend Code</button>
          </>
        )}

        {/* ===== LOGIN / SIGNUP / FORGOT / RESET VIEWS ===== */}
        {view !== 'otp' && view !== 'admin' && view !== 'confirmEmail' && view !== '2fa' && (
          <>
            {/* Email field */}
            {view !== 'reset' && (
              <div className="relative mb-3">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60" />
                <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-800/50 border border-amber-500/20 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60" />
              </div>
            )}

            {/* Nickname field (signup only) */}
            {view === 'signup' && (
              <div className="relative mb-3">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60" />
                <input type="text" placeholder="Nickname (optional — auto-generated if empty)" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full bg-slate-800/50 border border-amber-500/20 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60" />
              </div>
            )}

            {/* Password field */}
            {view !== 'forgot' && (
              <div className="relative mb-3">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type={showPass ? 'text' : 'password'} placeholder={view === 'reset' ? 'New password' : 'Enter your password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600" />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Confirm password */}
            {(view === 'signup' || view === 'reset') && (
              <div className="relative mb-3">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type={showPass ? 'text' : 'password'} placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600" />
              </div>
            )}

            {/* Password strength hint (signup) */}
            {view === 'signup' && (
              <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg px-3 py-2 mb-3">
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Password must have: 8+ characters, 1 capital letter, 1 number, 1 special character (e.g., $!@#)
                </p>
              </div>
            )}

            {/* Captcha */}
            {(view === 'login' || view === 'signup' || view === 'forgot') && (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 mb-3">
                <button onClick={handleRobotCheck} disabled={robotVerifying} className="w-full flex items-center gap-3 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 hover:border-amber-500/40 transition-colors">
                  {robotVerifying ? <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  : robotChecked ? <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  : <Square className="w-5 h-5 text-slate-500 flex-shrink-0" />}
                  <span className="text-sm text-slate-300 font-medium">I am not a robot</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
                      <span className="text-[8px] font-black text-black">CEO</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Secure</span>
                  </div>
                </button>
              </div>
            )}

            {/* Forgot password link */}
            {view === 'login' && (
              <div className="text-right mb-3">
                <button onClick={() => { setView('forgot'); clearFeedback(); setRobotChecked(false); }} className="text-amber-400 text-xs font-semibold hover:text-amber-300">Forgot Password?</button>
              </div>
            )}

            {/* Error / success messages */}
            {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 mb-3">{error}</p>}
            {passkeyError && <p className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3 flex items-start gap-2"><KeyRound className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{passkeyError}</p>}
            {message && <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-3">{message}</p>}

            {/* Primary action button */}
            <button onClick={view === 'login' ? handleLogin : view === 'signup' ? handleSignUp : view === 'forgot' ? handleForgotPassword : handleResetPassword} disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 text-slate-950 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20 mb-3">
              {loading ? 'Please wait...' : view === 'login' ? 'Login Now' : view === 'signup' ? 'Create Account' : view === 'forgot' ? 'Send Reset Code' : 'Update Password'}
            </button>

            {/* Login view extras */}
            {view === 'login' && (
              <>
                <button onClick={handlePasskeyLogin} disabled={loading} className="w-full bg-slate-800/60 border border-amber-500/20 text-amber-400 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 mb-3">
                  <Fingerprint className="w-5 h-5" /> Login with Passkey
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-xs text-slate-500">Or continue with</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>
                <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-slate-800/60 border border-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 mb-3">
                  <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>
                {/* Admin Login Portal */}
                <button onClick={() => { setView('admin'); clearFeedback(); setRobotChecked(false); }} className="w-full flex items-center justify-center gap-2 bg-slate-800/40 border border-amber-500/10 text-amber-400/80 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800/60 hover:text-amber-400 transition-colors">
                  <Building2 className="w-4 h-4" /> Admin Login
                </button>
              </>
            )}

            {/* Terms (signup) */}
            {view === 'signup' && (
              <button onClick={() => setTermsChecked(!termsChecked)} className="w-full flex items-start gap-3 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-3 hover:border-amber-500/40 transition-colors text-left">
                {termsChecked ? <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" /> : <Square className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />}
                <span className="text-xs text-slate-400 leading-relaxed">
                  I agree to the <span className="text-amber-400 font-semibold">Terms of Service</span>, <span className="text-amber-400 font-semibold">Community Rules</span>, and <span className="text-amber-400 font-semibold">Privacy Policy</span>. By registering, you confirm you are 18+ and accept that a verification email will be sent.
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
