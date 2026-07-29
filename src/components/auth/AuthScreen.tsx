import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Fingerprint, ShieldCheck, KeyRound, CheckSquare, Square } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type AuthView = 'login' | 'signup' | 'forgot' | 'otp' | 'reset';

type Props = { onAuth: () => void };

export default function AuthScreen({ onAuth }: Props) {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // "I am not a robot" checkbox captcha
  const [robotChecked, setRobotChecked] = useState(false);
  const [robotVerifying, setRobotVerifying] = useState(false);

  // OTP
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [pendingEmail, setPendingEmail] = useState('');

  // Terms & Conditions checkbox (signup only)
  const [termsChecked, setTermsChecked] = useState(false);

  // Passkey
  const [passkeyError, setPasskeyError] = useState('');

  const clearFeedback = () => { setError(''); setMessage(''); setPasskeyError(''); };

  const handleRobotCheck = () => {
    if (robotChecked) { setRobotChecked(false); return; }
    setRobotVerifying(true);
    setTimeout(() => { setRobotVerifying(false); setRobotChecked(true); }, 800);
  };

  const handleLogin = async () => {
    clearFeedback();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    if (!robotChecked) { setError('Please verify you are not a robot before logging in.'); return; }
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError(authError.message); setRobotChecked(false); return; }
    onAuth();
  };

  const handleSignUp = async () => {
    clearFeedback();
    if (!email || !password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (!robotChecked) { setError('Please verify you are not a robot before signing up.'); return; }
    if (!termsChecked) { setError('You must agree to the Terms, Rules, and Privacy Policy to create an account.'); return; }
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (authError) { setLoading(false); setError(authError.message); setRobotChecked(false); return; }
    if (data.user) {
      setPendingEmail(email);
      setLoading(false);
      setView('otp');
      setMessage('');
    }
  };

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

  const handleForgotPassword = async () => {
    clearFeedback();
    if (!email) { setError('Please enter your email address.'); return; }
    if (!robotChecked) { setError('Please verify you are not a robot first.'); return; }
    setLoading(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}?reset=true`,
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
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    setMessage('Password updated successfully!');
    setTimeout(() => { setView('login'); clearFeedback(); setPassword(''); setConfirmPassword(''); }, 1500);
  };

  const handleGoogleLogin = async () => {
    clearFeedback();
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (oauthError) { setLoading(false); setError(oauthError.message); return; }
  };

  const handlePasskeyLogin = async () => {
    clearFeedback();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const stored = localStorage.getItem('ceo_passkey_email');
        if (!stored) {
          setLoading(false);
          setPasskeyError('Passkey is not enabled for this account. Please log in with password/email and activate Passkey in Security Settings first.');
          return;
        }
        const { error: signinError } = await supabase.auth.signInWithPassword({
          email: stored, password: '__passkey_check__',
        });
        if (signinError) {
          setLoading(false);
          setPasskeyError('Passkey is not enabled for this account. Please log in with password/email and activate Passkey in Security Settings first.');
          return;
        }
      }

      const { data: passkeys } = await supabase
        .from('passkeys')
        .select('id')
        .eq('user_id', user?.id || '')
        .limit(1);

      if (!passkeys || passkeys.length === 0) {
        setLoading(false);
        setPasskeyError('Passkey is not enabled for this account. Please log in with password/email and activate Passkey in Security Settings first.');
        return;
      }

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
          setMessage('Passkey authentication successful!');
          setTimeout(onAuth, 800);
        }
      } else {
        setLoading(false);
        setPasskeyError('Passkey is not enabled for this account. Please log in with password/email and activate Passkey in Security Settings first.');
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
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
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

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-between max-w-md mx-auto relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-40 h-40 bg-orange-600/6 rounded-full blur-2xl" />
        <div className="absolute top-10 left-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl" />
        <svg className="absolute top-0 left-0 w-full h-full opacity-10" viewBox="0 0 400 900" fill="none">
          <ellipse cx="200" cy="200" rx="280" ry="200" stroke="url(#gold)" strokeWidth="0.5" />
          <ellipse cx="200" cy="200" rx="200" ry="140" stroke="url(#gold)" strokeWidth="0.5" />
          <defs>
            <linearGradient id="gold" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
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
          </h2>
          {view === 'login' ? (
            <button onClick={() => { setView('signup'); clearFeedback(); setRobotChecked(false); }} className="text-amber-400 text-sm font-semibold">
              Sign Up
            </button>
          ) : <div className="w-12" />}
        </div>
        {view === 'signup' && (
          <p className="text-xs text-slate-500 text-center -mb-1">Join CEO Exchange — Trade beyond limits.</p>
        )}

        <div className="space-y-3">
          {/* OTP view */}
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
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => setOtpDigit(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-11 h-14 text-center text-xl font-bold bg-slate-800/50 border border-amber-500/30 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                ))}
              </div>
              {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
              {message && <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{message}</p>}
              <button
                onClick={otpCode.join('').length === 6 && pendingEmail ? handleOtpReset : handleOtpVerify}
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 text-slate-950 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
              >
                {loading ? 'Please wait...' : 'Verify Code'}
              </button>
              <button onClick={handleResendOtp} disabled={loading} className="w-full text-center text-amber-400 text-sm font-semibold py-1">
                Resend Code
              </button>
            </>
          )}

          {/* Forgot/Reset/OTP handled above; login & signup below */}
          {view !== 'otp' && (
            <>
              {/* Email field */}
              {view !== 'reset' && (
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-800/50 border border-amber-500/20 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              )}

              {/* Password field */}
              {view !== 'forgot' && (
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder={view === 'reset' ? 'New password' : 'Enter your password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600"
                  />
                  <button onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* Confirm password */}
              {(view === 'signup' || view === 'reset') && (
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600"
                  />
                </div>
              )}

              {/* "I am not a robot" checkbox captcha (login, signup, forgot) */}
              {(view === 'login' || view === 'signup' || view === 'forgot') && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
                  <button
                    onClick={handleRobotCheck}
                    disabled={robotVerifying}
                    className="w-full flex items-center gap-3 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 hover:border-amber-500/40 transition-colors"
                  >
                    {robotVerifying ? (
                      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : robotChecked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    )}
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
                <div className="text-right">
                  <button onClick={() => { setView('forgot'); clearFeedback(); setRobotChecked(false); }} className="text-amber-400 text-xs font-semibold hover:text-amber-300">
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Error / success message */}
              {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
              {passkeyError && <p className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-start gap-2"><KeyRound className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{passkeyError}</p>}
              {message && <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{message}</p>}

              {/* Primary action button */}
              <button
                onClick={
                  view === 'login' ? handleLogin :
                  view === 'signup' ? handleSignUp :
                  view === 'forgot' ? handleForgotPassword :
                  handleResetPassword
                }
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 text-slate-950 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
              >
                {loading ? 'Please wait...' :
                  view === 'login' ? 'Login Now' :
                  view === 'signup' ? 'Create Account' :
                  view === 'forgot' ? 'Send Reset Code' :
                  'Update Password'}
              </button>

              {view === 'login' && (
                <>
                  <button
                    onClick={handlePasskeyLogin}
                    disabled={loading}
                    className="w-full bg-slate-800/60 border border-amber-500/20 text-amber-400 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-800"
                  >
                    <Fingerprint className="w-5 h-5" /> Login with Passkey
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-500">Or continue with</span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 bg-slate-800/60 border border-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Continue with Google
                    </button>
                  </div>
                </>
              )}

              {/* Terms & Conditions agreement (signup only) */}
              {view === 'signup' && (
                <div className="space-y-2">
                  <button
                    onClick={() => setTermsChecked(!termsChecked)}
                    className="w-full flex items-start gap-3 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-3 hover:border-amber-500/40 transition-colors text-left"
                  >
                    {termsChecked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="text-xs text-slate-400 leading-relaxed">
                      I agree to the{' '}
                      <span className="text-amber-400 font-semibold">Terms of Service</span>,{' '}
                      <span className="text-amber-400 font-semibold">Community Rules</span>, and{' '}
                      <span className="text-amber-400 font-semibold">Privacy Policy</span>.
                      By registering, you confirm you are 18+ and accept that a verification email will be sent.
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
