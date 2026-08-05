import { useState } from 'react';
import { X, Shield, Lock, Check, KeyRound, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';

type ModalType = 'security' | 'antiphishing' | 'password' | 'passcode' | null;

type Props = {
  type: ModalType;
  onClose: () => void;
  userId: string;
  currentSecurityLevel: string;
  antiPhishingCode?: string;
  onUpdate: (updates: Record<string, unknown>) => void;
};

export default function SecurityModal({ type, onClose, userId, currentSecurityLevel, antiPhishingCode, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Security center
  const [twoFA, setTwoFA] = useState(currentSecurityLevel === 'High');

  // Anti-phishing
  const [phishingCode, setPhishingCode] = useState('');

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Passcode
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');

  const handleSecuritySave = async () => {
    setLoading(true);
    await supabase.from('profiles').update({
      security_level: twoFA ? 'High' : 'Medium',
      two_fa_enabled: twoFA,
    }).eq('user_id', userId);
    setLoading(false);
    setSuccess(true);
    onUpdate({ security_level: twoFA ? 'High' : 'Medium', two_fa_enabled: twoFA });
    await sendNotification({ userId, type: 'SECURITY', subject: 'CEO Exchange: 2FA Setting Changed', message: `Two-factor authentication has been ${twoFA ? 'enabled' : 'disabled'} on your account.`, antiPhishingCode });
    setTimeout(onClose, 1200);
  };

  const handlePhishingSave = async () => {
    if (phishingCode.length < 4 || phishingCode.length > 20) {
      setError('Code must be 4-20 characters.');
      return;
    }
    setLoading(true);
    await supabase.from('profiles').update({ anti_phishing_code: phishingCode }).eq('user_id', userId);
    setLoading(false);
    setSuccess(true);
    onUpdate({ anti_phishing_code: phishingCode });
    await sendNotification({ userId, type: 'SECURITY', subject: 'CEO Exchange: Anti-Phishing Code Updated', message: `Your anti-phishing code has been set. This code will appear in all official CEO Exchange emails to verify authenticity.`, antiPhishingCode: phishingCode });
    setTimeout(onClose, 1200);
  };

  const handlePasswordChange = async () => {
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    setSuccess(true);
    await sendNotification({ userId, type: 'SECURITY', subject: 'CEO Exchange: Password Changed', message: 'Your account password has been successfully updated. If you did not make this change, please contact support immediately.', antiPhishingCode });
    setTimeout(onClose, 1500);
  };

  const handlePasscodeSave = async () => {
    setError('');
    if (passcode.length !== 6 || !/^\d{6}$/.test(passcode)) { setError('Passcode must be exactly 6 digits.'); return; }
    if (passcode !== confirmPasscode) { setError('Passcodes do not match.'); return; }
    setLoading(true);
    await supabase.from('profiles').update({ passcode }).eq('user_id', userId);
    setLoading(false);
    setSuccess(true);
    onUpdate({ passcode });
    await sendNotification({ userId, type: 'SECURITY', subject: 'CEO Exchange: Passcode Set', message: 'A 6-digit passcode has been set for fast mobile app unlock on your account.', antiPhishingCode });
    setTimeout(onClose, 1200);
  };

  if (!type) return null;

  const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 placeholder:text-slate-600";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-slate-900 border border-slate-800 rounded-t-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-200 text-lg flex items-center gap-2">
            {type === 'security' && <><Shield className="w-5 h-5 text-emerald-400" /> Security Center</>}
            {type === 'antiphishing' && <><Lock className="w-5 h-5 text-amber-400" /> Anti-Phishing Code</>}
            {type === 'password' && <><KeyRound className="w-5 h-5 text-sky-400" /> Change Password</>}
            {type === 'passcode' && <><Lock className="w-5 h-5 text-amber-400" /> Set 6-Digit Passcode</>}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {success ? (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            <Check className="w-5 h-5" /> Saved Successfully!
          </div>
        ) : (
          <>
            {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 mb-3">{error}</p>}

            {type === 'security' && (
              <div className="space-y-4">
                <div className="bg-slate-950 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">2FA Authentication</p>
                    <p className="text-xs text-slate-400 mt-0.5">Add an extra layer of security</p>
                  </div>
                  <button onClick={() => setTwoFA(!twoFA)} className={`w-12 h-6 rounded-full transition-colors relative ${twoFA ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${twoFA ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="bg-slate-950 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-2">Security Level</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div className={`h-full rounded-full ${twoFA ? 'w-full bg-emerald-500' : 'w-1/2 bg-amber-500'}`} />
                    </div>
                    <span className={`text-xs font-bold ${twoFA ? 'text-emerald-400' : 'text-amber-400'}`}>{twoFA ? 'High' : 'Medium'}</span>
                  </div>
                </div>
                <button onClick={handleSecuritySave} disabled={loading} className="w-full bg-emerald-500 text-slate-950 py-3 rounded-xl font-bold text-sm disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            )}

            {type === 'antiphishing' && (
              <div className="space-y-4">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-xs text-amber-400/80">Set a unique code (4-20 characters). CEO Exchange will include this in all official emails and popups to prevent phishing.</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Anti-Phishing Code</label>
                  <input type="text" value={phishingCode} onChange={e => setPhishingCode(e.target.value)} placeholder="e.g. CEO-Safe-2024" maxLength={20} className={inputCls} />
                  <p className="text-xs text-slate-500 mt-1">{phishingCode.length}/20 characters</p>
                </div>
                <button onClick={handlePhishingSave} disabled={loading || phishingCode.length < 4} className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-sm disabled:opacity-50">
                  {loading ? 'Saving...' : 'Set Anti-Phishing Code'}
                </button>
              </div>
            )}

            {type === 'password' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">New Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" className={inputCls} />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Confirm Password</label>
                  <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className={inputCls} />
                </div>
                <button onClick={handlePasswordChange} disabled={loading} className="w-full bg-sky-500 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50">
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            )}

            {type === 'passcode' && (
              <div className="space-y-4">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-xs text-amber-400/80">Set a 6-digit PIN for fast mobile app unlock. You'll use this instead of your password on mobile.</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">6-Digit Passcode</label>
                  <input type="tel" value={passcode} onChange={e => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" maxLength={6} className={`${inputCls} text-center text-2xl tracking-[0.5em]`} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Confirm Passcode</label>
                  <input type="tel" value={confirmPasscode} onChange={e => setConfirmPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" maxLength={6} className={`${inputCls} text-center text-2xl tracking-[0.5em]`} />
                </div>
                <button onClick={handlePasscodeSave} disabled={loading} className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-sm disabled:opacity-50">
                  {loading ? 'Saving...' : 'Set Passcode'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
