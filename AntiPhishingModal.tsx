import { useState } from 'react';
import { X, Shield, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = { userId: string; currentCode?: string; onClose: () => void; onUpdate: (code: string) => void };

export default function AntiPhishingModal({ userId, currentCode, onClose, onUpdate }: Props) {
  const [code, setCode] = useState(currentCode || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (code.length < 4 || code.length > 20) { setError('Code must be 4-20 characters'); return; }
    setLoading(true);
    await supabase.from('profiles').update({ anti_phishing_code: code }).eq('user_id', userId);
    onUpdate(code);
    setSuccess(true); setLoading(false);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Anti-phishing Code</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check className="w-8 h-8 text-emerald-400" /></div>
              <p className="font-bold text-[#eaecef]">Anti-phishing code set!</p>
            </div>
          ) : (
            <>
              <div className="bg-[#1e2026] rounded-xl p-4 flex gap-3">
                <Shield className="w-5 h-5 text-[#f0b90b] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#848e9c]">This code will appear in every official email from CEO Exchange. If an email doesn't contain this code, it's not from us — do not click any links.</p>
              </div>
              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Anti-phishing Code (4-20 characters)</p>
                <input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. 469339" maxLength={20}
                  className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
              </div>
              {currentCode && <p className="text-xs text-[#848e9c]">Current code: <strong className="text-[#eaecef]">{currentCode}</strong></p>}
              {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
              <button onClick={save} disabled={loading} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl">
                {loading ? 'Saving...' : currentCode ? 'Update Code' : 'Set Code'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
