import { useState, useEffect } from 'react';
import { X, Gift, Ticket, Check, AlertCircle } from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';

type Props = { userId: string; profile: Profile; onClose: () => void; onProfileUpdate: (u: Partial<Profile>) => void };

export default function RewardsHubModal({ userId, profile, onClose, onProfileUpdate }: Props) {
  const [code, setCode] = useState('');
  const [redemptions, setRedemptions] = useState<Array<{ code: string; reward_amount: number; redeemed_at: string }>>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('voucher_redemptions').select('*').eq('user_id', userId).order('redeemed_at', { ascending: false });
      if (data) setRedemptions(data as any[]);
    })();
  }, [userId]);

  const redeem = async () => {
    setError('');
    if (!code.trim()) return;
    setLoading(true);
    const { data: voucher } = await supabase.from('vouchers').select('*').eq('code', code.trim().toUpperCase()).eq('active', true).maybeSingle();
    if (!voucher) { setError('Invalid or expired voucher code'); setLoading(false); return; }
    if (voucher.uses >= voucher.max_uses) { setError('Voucher has reached maximum uses'); setLoading(false); return; }

    const { data: existing } = await supabase.from('voucher_redemptions').select('id').eq('user_id', userId).eq('voucher_id', voucher.id).maybeSingle();
    if (existing) { setError('You have already redeemed this voucher'); setLoading(false); return; }

    await supabase.from('voucher_redemptions').insert({ user_id: userId, voucher_id: voucher.id, code: voucher.code, reward_amount: voucher.reward_amount });
    await supabase.from('vouchers').update({ uses: voucher.uses + 1 }).eq('id', voucher.id);

    const newBalance = parseFloat(profile.usdt_balance.toString()) + voucher.reward_amount;
    await supabase.from('profiles').update({ usdt_balance: newBalance }).eq('user_id', userId);
    onProfileUpdate({ usdt_balance: newBalance });

    setRedemptions(prev => [{ code: voucher.code, reward_amount: voucher.reward_amount, redeemed_at: new Date().toISOString() }, ...prev]);
    setSuccess(true); setCode(''); setLoading(false);
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Rewards Hub</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-5">
          <div className="bg-gradient-to-br from-[#f0b90b]/20 to-orange-600/10 border border-[#f0b90b]/30 rounded-2xl p-5 text-center">
            <Gift className="w-12 h-12 text-[#f0b90b] mx-auto mb-3" />
            <p className="text-sm font-bold text-[#eaecef]">{redemptions.length} active rewards available</p>
          </div>

          {success && <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl p-3 flex items-center gap-2 text-sm"><Check className="w-4 h-4" /> Voucher redeemed successfully!</div>}
          {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-3 flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}

          <div>
            <p className="text-xs text-[#848e9c] mb-1.5">Redeem Voucher Code</p>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3">
                <Ticket className="w-4 h-4 text-[#848e9c]" />
                <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter code"
                  className="flex-1 bg-transparent text-sm text-[#eaecef] outline-none placeholder-[#474d57]" />
              </div>
              <button onClick={redeem} disabled={loading || !code.trim()}
                className="bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold px-5 rounded-xl text-sm">
                Redeem
              </button>
            </div>
          </div>

          {redemptions.length > 0 && (
            <div>
              <p className="text-xs text-[#848e9c] font-bold uppercase tracking-wider mb-2">History</p>
              {redemptions.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-3 mb-2">
                  <div>
                    <p className="text-sm font-bold text-[#eaecef]">{r.code}</p>
                    <p className="text-xs text-[#848e9c]">{new Date(r.redeemed_at).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-400">+{r.reward_amount} USDT</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
