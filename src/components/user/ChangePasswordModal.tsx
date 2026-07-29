import { useState } from 'react';
import { X, KeyRound, Mail, AlertCircle, Check, Eye, EyeOff, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = { userId: string; email: string; onClose: () => void };

export default function ChangePasswordModal({ userId, email, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [otp, setOtp] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sentOtp, setSentOtp] = useState('');

  const sendOtp = async () => {
    setError('');
    if (!currentPwd) { setError('Enter your current password'); return; }
    if (newPwd.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (newPwd !== confirmPwd) { setError('Passwords do not match'); return; }
    setLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtp(code);
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ userId, type: 'SECURITY', subject: 'CEO Exchange: Password Change Verification', message: `Your verification code is: ${code}. Expires in 10 minutes.` }),
      });
    } catch { /* stored locally */ }
    setLoading(false);
    setStep(2);
  };

  const verifyAndChange = async () => {
    setError('');
    if (otp !== sentOtp) { setError('Invalid verification code'); return; }
    setLoading(true);
    const { error: authErr } = await supabase.auth.updateUser({ password: newPwd });
    if (authErr) { setError(authErr.message); setLoading(false); return; }
    // Set withdrawal lock for 24h
    await supabase.from('profiles').update({ withdrawal_lock_until: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }).eq('user_id', userId);
    setSuccess(true); setLoading(false);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Change Password</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check className="w-8 h-8 text-emerald-400" /></div>
              <p className="font-bold text-[#eaecef]">Password Changed!</p>
              <p className="text-sm text-[#848e9c] text-center">For your security, withdrawals are locked for 24 hours.</p>
            </div>
          ) : step === 1 ? (
            <>
              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Current Password</p>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="Enter current password"
                    className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
                  <button onClick={() => setShow(!show)} className="absolute right-3 top-3 text-[#848e9c]">{show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                </div>
              </div>
              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">New Password (min 8 characters)</p>
                <input type={show ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Enter new password"
                  className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
              </div>
              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Confirm New Password</p>
                <input type={show ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Re-enter new password"
                  className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
              </div>
              {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
              <button onClick={sendOtp} disabled={loading} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
                {loading ? 'Sending...' : <><Send className="w-4 h-4" /> Send Verification Code</>}
              </button>
            </>
          ) : (
            <>
              <div className="bg-[#1e2026] rounded-xl p-4 flex gap-3">
                <Mail className="w-5 h-5 text-[#f0b90b] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#848e9c]">A verification code has been sent to <strong className="text-[#eaecef]">{email}</strong></p>
              </div>
              <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000"
                className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-4 text-2xl font-bold text-center text-[#eaecef] tracking-[0.5em] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
              {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
              <button onClick={verifyAndChange} disabled={loading || otp.length !== 6} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl">
                {loading ? 'Changing...' : 'Verify & Change Password'}
              </button>
              <button onClick={() => setStep(1)} className="w-full text-[#848e9c] text-sm py-2">Back</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
