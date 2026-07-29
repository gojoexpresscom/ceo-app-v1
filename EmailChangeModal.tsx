import { useState } from 'react';
import { X, Mail, Send, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  userId: string;
  currentEmail: string;
  onClose: () => void;
  onEmailChanged: (newEmail: string) => void;
};

export default function EmailChangeModal({ userId, currentEmail, onClose, onEmailChanged }: Props) {
  const [step, setStep] = useState(1);
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const sendCode = async () => {
    setError('');
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (newEmail === currentEmail) {
      setError('New email must be different from current email');
      return;
    }

    setSending(true);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from('email_change_codes').insert({
      user_id: userId, code: otp, new_email: newEmail, expires_at: expires,
    });

    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          userId, type: 'SECURITY',
          subject: 'CEO Exchange: Email Change Verification Code',
          message: `Your verification code to change your email is: ${otp}. This code expires in 10 minutes. If you did not request this change, please contact support immediately.`,
        }),
      });
    } catch {
      // Edge function may not be deployed yet — code still stored in DB
    }

    setSending(false);
    setStep(2);
  };

  const verifyCode = async () => {
    setError('');
    setVerifying(true);

    const { data } = await supabase
      .from('email_change_codes')
      .select('code, new_email, expires_at, used')
      .eq('user_id', userId)
      .eq('new_email', newEmail)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      setError('No verification code found. Please request a new code.');
      setVerifying(false);
      return;
    }
    if (new Date(data.expires_at) < new Date()) {
      setError('Code has expired. Please request a new code.');
      setVerifying(false);
      return;
    }
    if (data.code !== code.trim()) {
      setError('Invalid verification code. Please check and try again.');
      setVerifying(false);
      return;
    }

    // Mark code as used
    await supabase.from('email_change_codes').update({ used: true }).eq('user_id', userId).eq('code', data.code);

    // Update email in profiles
    await supabase.from('profiles').update({ email: newEmail }).eq('user_id', userId);

    setSuccess(true);
    setVerifying(false);
    onEmailChanged(newEmail);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl p-5 pb-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[#eaecef]">Change Email</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-[#eaecef]">Email Changed!</p>
            <p className="text-sm text-[#848e9c] text-center">Your email has been updated to {newEmail}</p>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#848e9c] mb-1">Current Email</p>
              <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#848e9c]" />
                <span className="text-sm text-[#848e9c]">{currentEmail}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#848e9c] mb-1">New Email Address</p>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="Enter new email"
                className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]"
              />
            </div>
            {error && (
              <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>
            )}
            <p className="text-xs text-[#848e9c]">A verification code will be sent to your current email address. You must enter the code to confirm the change.</p>
            <button
              onClick={sendCode}
              disabled={sending}
              className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              {sending ? 'Sending...' : <><Send className="w-4 h-4" /> Send Verification Code</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#848e9c]">A 6-digit verification code has been sent to <strong className="text-[#eaecef]">{currentEmail}</strong></p>
            <div>
              <p className="text-xs text-[#848e9c] mb-1">Enter Verification Code</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-2xl font-bold text-center text-[#eaecef] tracking-[0.5em] outline-none focus:border-[#f0b90b] placeholder-[#474d57]"
              />
            </div>
            {error && (
              <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>
            )}
            <button
              onClick={verifyCode}
              disabled={verifying || code.length !== 6}
              className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl"
            >
              {verifying ? 'Verifying...' : 'Verify & Change Email'}
            </button>
            <button onClick={() => setStep(1)} className="w-full text-[#848e9c] text-sm py-2">
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
