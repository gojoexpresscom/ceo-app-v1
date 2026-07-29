import { useState } from 'react';
import { X, Shield, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = { userId: string; isSet: boolean; onClose: () => void; onSet: () => void };

export default function FundPasswordModal({ userId, isSet, onClose, onSet }: Props) {
  const [step, setStep] = useState<'form' | 'confirm' | 'change_old'>(isSet ? 'change_old' : 'form');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSet = async () => {
    setError('');
    if (pin.length !== 6) { setError('Fund password must be exactly 6 digits'); return; }
    if (pin !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    const hash = btoa(pin + userId); // Simple obfuscation — production would use bcrypt server-side
    await supabase.from('profiles').update({ passcode: hash, fund_password_set: true, security_level: 'High' }).eq('user_id', userId);
    setSuccess(true); setLoading(false);
    onSet();
    setTimeout(onClose, 1500);
  };

  const handleChange = async () => {
    setError('');
    if (!oldPin) { setError('Enter your current fund password'); return; }
    const { data } = await supabase.from('profiles').select('passcode').eq('user_id', userId).single();
    const expected = btoa(oldPin + userId);
    if (data?.passcode !== expected) { setError('Current fund password is incorrect'); return; }
    setStep('form');
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">{isSet ? 'Change Fund Password' : 'Set Fund Password'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check className="w-8 h-8 text-emerald-400" /></div>
              <p className="font-bold text-[#eaecef]">Fund password {isSet ? 'changed' : 'set'} successfully!</p>
            </div>
          ) : (
            <>
              <div className="bg-[#1e2026] rounded-xl p-4 flex gap-3">
                <Shield className="w-5 h-5 text-[#f0b90b] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#848e9c]">This 6-digit PIN will be required before any crypto withdrawal. Keep it safe and do not share it with anyone.</p>
              </div>

              {step === 'change_old' && (
                <>
                  <div>
                    <p className="text-xs text-[#848e9c] mb-1.5">Current Fund Password</p>
                    <div className="relative">
                      <input type={show ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••" className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-xl tracking-[0.5em] text-center text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
                      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-[#848e9c]">{show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                    </div>
                  </div>
                  {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
                  <button onClick={handleChange} className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl">Verify & Continue</button>
                </>
              )}

              {(step === 'form' || step === 'confirm') && (
                <>
                  <div>
                    <p className="text-xs text-[#848e9c] mb-1.5">New Fund Password (6 digits)</p>
                    <input type={show ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••" className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-xl tracking-[0.5em] text-center text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#848e9c] mb-1.5">Confirm Fund Password</p>
                    <div className="relative">
                      <input type={show ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••" className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-xl tracking-[0.5em] text-center text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
                      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-[#848e9c]">{show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                    </div>
                  </div>
                  {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
                  <button onClick={handleSet} disabled={loading || pin.length !== 6 || confirm.length !== 6} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl">
                    {loading ? 'Saving...' : isSet ? 'Update Fund Password' : 'Set Fund Password'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
