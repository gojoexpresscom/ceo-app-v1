import { useState, useEffect } from 'react';
import {
  ArrowLeft, Gift, Lock, Clock, Check, X,
  Sparkles, AlertCircle,
} from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';

type Props = {
  userId: string;
  profile: Profile;
  onBack: () => void;
  onProfileUpdate: (updates: Partial<Profile>) => void;
};

type Subscription = {
  id: string;
  coin: string;
  amount: number;
  apy: number;
  term_days: number;
  start_date: string;
  end_date: string;
  status: string;
};

export default function EarnScreen({ userId, profile, onBack, onProfileUpdate }: Props) {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeCoin, setStakeCoin] = useState('USDT');
  const [stakeTerm, setStakeTerm] = useState(125);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const TERM_OPTIONS = [
    { days: 30, apy: 8.5, label: '30 Days' },
    { days: 60, apy: 11.2, label: '60 Days' },
    { days: 90, apy: 14.8, label: '90 Days' },
    { days: 125, apy: 18.8, label: '125 Days' },
  ];

  const COINS = ['USDT', 'BTC', 'ETH', 'SOL'];

  const usdtBalance = parseFloat(profile.usdt_balance.toString());

  const loadSubs = async () => {
    setLoading(true);
    const { data } = await supabase.from('earn_subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setSubs(data as Subscription[]);
    setLoading(false);
  };

  useEffect(() => { loadSubs(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = async () => {
    setError('');
    const amount = parseFloat(stakeAmount);
    if (!amount || amount < 10) { setError('Minimum stake is 10 USDT'); return; }
    if (amount > usdtBalance) { setError('Insufficient balance'); return; }

    const term = TERM_OPTIONS.find(t => t.days === stakeTerm)!;
    const endDate = new Date(Date.now() + stakeTerm * 24 * 3600 * 1000).toISOString();

    const { data, error: insErr } = await supabase.from('earn_subscriptions').insert({
      user_id: userId, coin: stakeCoin, amount, apy: term.apy, term_days: stakeTerm,
      start_date: new Date().toISOString(), end_date: endDate, status: 'ACTIVE',
    }).select().single();

    if (insErr) { setError('Failed to subscribe'); return; }

    // Deduct from balance
    const newBalance = usdtBalance - amount;
    await supabase.from('profiles').update({ usdt_balance: newBalance }).eq('user_id', userId);
    onProfileUpdate({ usdt_balance: newBalance });

    setSubs(prev => [data as Subscription, ...prev]);
    setSuccess(true);
    setShowSubscribe(false);
    setStakeAmount('');
    setTimeout(() => setSuccess(false), 2500);
  };

  const withdraw = async (sub: Subscription) => {
    if (sub.status !== 'MATURED' && new Date(sub.end_date) > new Date()) return;
    const yieldAmount = sub.amount * (sub.apy / 100) * (sub.term_days / 365);
    const totalReturn = sub.amount + yieldAmount;
    const newBalance = usdtBalance + totalReturn;
    await supabase.from('earn_subscriptions').update({ status: 'WITHDRAWN' }).eq('id', sub.id);
    await supabase.from('profiles').update({ usdt_balance: newBalance }).eq('user_id', userId);
    onProfileUpdate({ usdt_balance: newBalance });
    loadSubs();
  };

  const daysRemaining = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (24 * 3600 * 1000)));
  };

  const projectedYield = (amount: number, apy: number, days: number) => {
    return amount * (apy / 100) * (days / 365);
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#0b0e11] z-10">
        <button onClick={onBack}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-base font-bold">Earn</h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 mb-4">
          <p className="text-xs text-white/70">Available Balance</p>
          <p className="text-3xl font-black text-white mb-1">{usdtBalance.toFixed(2)} USDT</p>
          <p className="text-xs text-white/60">Earn up to 18.8% APY with 125-day vault</p>
        </div>

        {success && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl p-4 text-center font-bold text-sm mb-4 flex items-center justify-center gap-2">
            <Check className="w-5 h-5" /> Staked Successfully!
          </div>
        )}

        {/* 125-day featured vault */}
        <div className="bg-gradient-to-br from-[#f0b90b]/20 to-orange-600/10 border border-[#f0b90b]/30 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[#f0b90b]" />
            <p className="text-sm font-bold text-[#f0b90b]">125-Day Yield Vault</p>
          </div>
          <p className="text-3xl font-black text-[#eaecef] mb-2">18.8% APY</p>
          <p className="text-xs text-[#848e9c] mb-4">Lock your assets for 125 days and earn daily compound yield. Minimum 10 USDT.</p>
          <button onClick={() => { setStakeTerm(125); setShowSubscribe(true); }}
            className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3 rounded-xl">
            Stake Now
          </button>
        </div>

        {/* Active subscriptions */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#eaecef] mb-3">Active Stakes</h3>
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[#f0b90b] border-t-transparent rounded-full animate-spin" /></div>
          ) : subs.length === 0 ? (
            <div className="text-center py-8 text-[#848e9c]">
              <Lock className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No active stakes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subs.map(s => {
                const remaining = daysRemaining(s.end_date);
                const isMatured = remaining === 0 && s.status === 'ACTIVE';
                const yieldAmt = projectedYield(s.amount, s.apy, s.term_days);
                return (
                  <div key={s.id} className="bg-[#1e2026] border border-[#2b2f36] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#f0b90b]/20 flex items-center justify-center">
                          <Gift className="w-4 h-4 text-[#f0b90b]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#eaecef]">{s.amount} {s.coin}</p>
                          <p className="text-xs text-[#848e9c]">{s.apy}% APY · {s.term_days} days</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${s.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#2b2f36] text-[#848e9c]'}`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div><span className="text-[#848e9c]">Yield: </span><span className="text-emerald-400 font-bold">+{yieldAmt.toFixed(2)}</span></div>
                      <div><span className="text-[#848e9c]">Start: </span><span className="text-[#eaecef]">{new Date(s.start_date).toLocaleDateString()}</span></div>
                      <div><span className="text-[#848e9c]">End: </span><span className="text-[#eaecef]">{new Date(s.end_date).toLocaleDateString()}</span></div>
                    </div>
                    {remaining > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-3.5 h-3.5 text-[#848e9c]" />
                        <p className="text-xs text-[#848e9c]">{remaining} days remaining</p>
                      </div>
                    )}
                    {isMatured && (
                      <button onClick={() => withdraw(s)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-2 rounded-lg text-sm">
                        Withdraw ({(s.amount + yieldAmt).toFixed(2)} {s.coin})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Other terms */}
        <h3 className="text-sm font-bold text-[#eaecef] mb-3">All Staking Terms</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {TERM_OPTIONS.map(t => (
            <button key={t.days} onClick={() => { setStakeTerm(t.days); setShowSubscribe(true); }}
              className="bg-[#1e2026] border border-[#2b2f36] rounded-xl p-4 text-left hover:border-[#f0b90b]">
              <p className="text-lg font-black text-emerald-400">{t.apy}%</p>
              <p className="text-xs text-[#848e9c]">{t.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Subscribe modal */}
      {showSubscribe && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => setShowSubscribe(false)}>
          <div className="w-full bg-[#181a20] rounded-t-2xl pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
              <h3 className="font-bold text-lg text-[#eaecef]">Stake {stakeTerm} Days</h3>
              <button onClick={() => setShowSubscribe(false)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Coin</p>
                <select value={stakeCoin} onChange={e => setStakeCoin(e.target.value)}
                  className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]">
                  {COINS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Amount (Min: 10 USDT)</p>
                <input type="number" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)} placeholder="0.00"
                  className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
                <p className="text-xs text-[#848e9c] mt-1">Available: {usdtBalance.toFixed(2)} USDT</p>
              </div>
              <div>
                <p className="text-xs text-[#848e9c] mb-2">Term</p>
                <div className="grid grid-cols-2 gap-2">
                  {TERM_OPTIONS.map(t => (
                    <button key={t.days} onClick={() => setStakeTerm(t.days)}
                      className={`py-2.5 rounded-lg text-sm font-bold ${stakeTerm === t.days ? 'bg-[#f0b90b] text-black' : 'bg-[#0b0e11] text-[#848e9c] border border-[#2b2f36]'}`}>
                      {t.label}<br /><span className="text-xs">{t.apy}% APY</span>
                    </button>
                  ))}
                </div>
              </div>
              {stakeAmount && (
                <div className="bg-[#1e2026] rounded-xl p-4 space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-[#848e9c]">Stake Amount</span><span className="text-[#eaecef] font-bold">{parseFloat(stakeAmount).toFixed(2)} {stakeCoin}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#848e9c]">APY</span><span className="text-emerald-400 font-bold">{TERM_OPTIONS.find(t => t.days === stakeTerm)?.apy}%</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#848e9c]">Projected Yield</span><span className="text-emerald-400 font-bold">+{projectedYield(parseFloat(stakeAmount), TERM_OPTIONS.find(t => t.days === stakeTerm)!.apy, stakeTerm).toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs pt-1 border-t border-[#2b2f36]"><span className="text-[#848e9c]">Total Return</span><span className="text-[#f0b90b] font-bold">{(parseFloat(stakeAmount) + projectedYield(parseFloat(stakeAmount), TERM_OPTIONS.find(t => t.days === stakeTerm)!.apy, stakeTerm)).toFixed(2)} {stakeCoin}</span></div>
                </div>
              )}
              {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
              <button onClick={subscribe} disabled={!stakeAmount}
                className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl">
                Confirm Stake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
