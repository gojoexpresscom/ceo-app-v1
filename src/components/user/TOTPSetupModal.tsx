import { useState } from 'react';
import { X, Shield, Copy, Check, AlertCircle, Mail, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generateTOTPSecret, getOtpAuthURI, verifyTOTP } from '@/lib/totp';
import { supabase } from '@/lib/supabase';

type Props = {
  userId: string;
  email: string;
  enabled: boolean;
  existingSecret?: string;
  onClose: () => void;
  onChanged: (enabled: boolean) => void;
};

// Step flow: intro → email_sent → scan → verify → done
// Disable flow: disable (enter TOTP code)
type Step = 'intro' | 'email_sent' | 'scan' | 'verify' | 'disable' | 'done';

function generateEmailCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function TOTPSetupModal({ userId, email, enabled, existingSecret, onClose, onChanged }: Props) {
  const [step, setStep] = useState<Step>(enabled ? 'disable' : 'intro');
  const [secret] = useState(() => generateTOTPSecret());
  const [emailCode] = useState(generateEmailCode);
  const [enteredEmailCode, setEnteredEmailCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setEmailSent] = useState(false);

  const otpUri = getOtpAuthURI(secret, email);

  // Step 1: Send verification email
  const sendEmailCode = async () => {
    setLoading(true);
    setError('');
    try {
      // Store the code server-side via profile extra data for validation
      await supabase.from('profiles').update({
        totp_email_code: emailCode,
        totp_email_code_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }).eq('user_id', userId);

      // Send email via Supabase edge function
      await supabase.functions.invoke('send-notification', {
        body: {
          user_id: userId,
          type: '2FA_EMAIL_CODE',
          title: 'CEO Exchange 2FA Verification Code',
          code: emailCode,
          email,
        },
      });
      setEmailSent(true);
      setStep('email_sent');
    } catch {
      setError('Failed to send verification email. Please try again.');
    }
    setLoading(false);
  };

  // Step 2: Verify email code
  const verifyEmailCode = async () => {
    setError('');
    if (enteredEmailCode.length !== 6) { setError('Enter the 6-digit code from your email.'); return; }
    setLoading(true);

    const { data } = await supabase
      .from('profiles')
      .select('totp_email_code, totp_email_code_expires')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data?.totp_email_code) {
      setError('Verification code expired. Please request a new one.');
      setLoading(false);
      return;
    }

    const expired = data.totp_email_code_expires && new Date(data.totp_email_code_expires) < new Date();
    if (expired) {
      setError('Code expired. Please go back and request a new one.');
      setLoading(false);
      return;
    }

    if (enteredEmailCode !== data.totp_email_code) {
      setError('Incorrect code. Please check your email and try again.');
      setLoading(false);
      return;
    }

    // Clear email code from DB, proceed to QR step
    await supabase.from('profiles').update({ totp_email_code: null, totp_email_code_expires: null }).eq('user_id', userId);
    setLoading(false);
    setStep('scan');
  };

  // Step 3→4: Enable 2FA after TOTP verify
  const handleEnable = async () => {
    if (totpCode.length !== 6) return;
    setLoading(true); setError('');
    const valid = await verifyTOTP(secret, totpCode);
    if (!valid) {
      setError('Invalid code. Check Google Authenticator and try again.');
      setLoading(false);
      return;
    }
    await supabase.from('profiles').update({
      two_fa_enabled: true,
      totp_secret: secret,
      security_level: 'High',
    }).eq('user_id', userId);

    // Send confirmation notification
    await supabase.functions.invoke('send-notification', {
      body: {
        user_id: userId,
        type: '2FA_ENABLED',
        title: 'CEO Exchange – 2FA Enabled',
        body: 'Two-factor authentication has been successfully enabled on your CEO Exchange account. If you did not do this, contact support immediately.',
      },
    });

    setLoading(false);
    onChanged(true);
    setStep('done');
    setTimeout(onClose, 2000);
  };

  const handleDisable = async () => {
    if (totpCode.length !== 6) return;
    setLoading(true); setError('');
    const secretToUse = existingSecret || secret;
    const valid = await verifyTOTP(secretToUse, totpCode);
    if (!valid) {
      setError('Invalid authenticator code. Please try again.');
      setLoading(false);
      return;
    }
    await supabase.from('profiles').update({
      two_fa_enabled: false,
      totp_secret: null,
      security_level: 'Medium',
    }).eq('user_id', userId);
    setLoading(false);
    onChanged(false);
    setStep('done');
    setTimeout(onClose, 1500);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret).catch(() => {});
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const inputCls = "w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-4 text-2xl font-bold text-center text-[#eaecef] tracking-[0.4em] outline-none focus:border-[#f0b90b] placeholder-[#474d57]";

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Google 2FA Authentication</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>

        <div className="px-5 py-5 space-y-4">

          {/* Step indicator (enable flow) */}
          {!enabled && step !== 'done' && step !== 'disable' && (
            <div className="flex items-center gap-2 mb-2">
              {[
                { s: 'intro', label: '1. Verify Email' },
                { s: 'email_sent', label: '2. Enter Code' },
                { s: 'scan', label: '3. Scan QR' },
                { s: 'verify', label: '4. Confirm' },
              ].map((item, i) => {
                const steps = ['intro', 'email_sent', 'scan', 'verify'];
                const current = steps.indexOf(step);
                const thisStep = steps.indexOf(item.s);
                const done = thisStep < current;
                const active = thisStep === current;
                return (
                  <div key={i} className={`flex-1 text-center ${i < 3 ? 'relative' : ''}`}>
                    <div className={`w-5 h-5 rounded-full mx-auto mb-0.5 flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-500 text-black' : active ? 'bg-[#f0b90b] text-black' : 'bg-[#2b2f36] text-[#474d57]'}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <p className={`text-[9px] leading-tight ${active ? 'text-[#f0b90b]' : done ? 'text-emerald-400' : 'text-[#474d57]'}`}>{item.label}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Done state */}
          {step === 'done' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="font-bold text-[#eaecef]">{enabled ? '2FA Disabled' : '2FA Enabled Successfully!'}</p>
              {!enabled && <p className="text-xs text-[#848e9c] text-center">A confirmation email has been sent to {email}</p>}
            </div>
          )}

          {/* Step 1: Intro — Send email code */}
          {step === 'intro' && (
            <>
              <div className="bg-[#1e2026] rounded-xl p-4 flex gap-3">
                <Shield className="w-5 h-5 text-[#f0b90b] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#eaecef] mb-1">Secure Your Account with 2FA</p>
                  <p className="text-sm text-[#848e9c] leading-relaxed">We'll send a verification code to your email first, then guide you to set up Google Authenticator.</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-[#848e9c]">
                {[
                  { icon: Mail, text: 'Step 1: Receive email verification code' },
                  { icon: Smartphone, text: 'Step 2: Scan QR in Google Authenticator' },
                  { icon: Shield, text: 'Step 3: Enter 6-digit TOTP code to confirm' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 bg-[#0b0e11] rounded-lg px-3 py-2.5">
                    <Icon className="w-4 h-4 text-[#f0b90b] flex-shrink-0" />
                    <p className="text-xs">{text}</p>
                  </div>
                ))}
              </div>
              {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
              <button
                onClick={sendEmailCode}
                disabled={loading}
                className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl"
              >
                {loading ? 'Sending...' : `Send Code to ${email}`}
              </button>
            </>
          )}

          {/* Step 2: Email code entry */}
          {step === 'email_sent' && (
            <>
              <div className="bg-[#1e2026] rounded-xl p-4 flex gap-3">
                <Mail className="w-5 h-5 text-[#f0b90b] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#eaecef] mb-1">Check Your Email</p>
                  <p className="text-sm text-[#848e9c]">A 6-digit verification code was sent to <span className="text-[#eaecef] font-medium">{email}</span>. Enter it below to proceed.</p>
                </div>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={enteredEmailCode}
                onChange={e => setEnteredEmailCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className={inputCls}
              />
              {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
              <button
                onClick={verifyEmailCode}
                disabled={loading || enteredEmailCode.length !== 6}
                className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button onClick={() => { setStep('intro'); setEnteredEmailCode(''); setError(''); }} className="w-full text-[#848e9c] text-sm py-2">
                Resend Code
              </button>
            </>
          )}

          {/* Step 3: QR Code scan */}
          {step === 'scan' && (
            <>
              <p className="text-sm text-[#848e9c]">Open <span className="text-[#eaecef] font-semibold">Google Authenticator</span> and scan this QR code:</p>
              <div className="flex justify-center py-4">
                <div className="bg-white p-4 rounded-2xl">
                  <QRCodeSVG value={otpUri} size={200} level="M" />
                </div>
              </div>
              <div>
                <p className="text-xs text-[#848e9c] mb-2">Or enter the secret key manually into Google Authenticator:</p>
                <div className="flex items-center gap-2 bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3">
                  <p className="flex-1 text-sm font-mono text-[#eaecef] break-all">{secret}</p>
                  <button onClick={copySecret} className="flex-shrink-0">
                    {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#848e9c]" />}
                  </button>
                </div>
                <p className="text-xs text-[#474d57] mt-1.5">Keep this key safe — you'll need it if you lose your phone.</p>
              </div>
              <button
                onClick={() => setStep('verify')}
                className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl"
              >
                I've Added It to Authenticator
              </button>
            </>
          )}

          {/* Step 4: TOTP verification */}
          {step === 'verify' && (
            <>
              <div className="bg-[#1e2026] rounded-xl p-4 flex gap-3">
                <Smartphone className="w-5 h-5 text-[#f0b90b] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#848e9c]">Enter the <span className="text-[#eaecef] font-semibold">6-digit code</span> currently shown in Google Authenticator to verify and enable 2FA.</p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className={inputCls}
              />
              {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
              <button
                onClick={handleEnable}
                disabled={loading || totpCode.length !== 6}
                className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl"
              >
                {loading ? 'Enabling...' : 'Enable 2FA'}
              </button>
              <button onClick={() => setStep('scan')} className="w-full text-[#848e9c] text-sm py-2">Back to QR Code</button>
            </>
          )}

          {/* Disable flow */}
          {step === 'disable' && (
            <>
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                <p className="text-sm text-rose-400 leading-relaxed">You are about to <span className="font-bold">disable Google 2FA</span>. Your account will be less secure. Enter your current authenticator code to confirm.</p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className={inputCls}
              />
              {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
              <button
                onClick={handleDisable}
                disabled={loading || totpCode.length !== 6}
                className="w-full bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl"
              >
                {loading ? 'Processing...' : 'Disable 2FA'}
              </button>
            </>
          )}
        </div>
        <div className="h-6" />
      </div>
    </div>
  );
}
