import { useState, useEffect } from 'react';
import { X, Gift, Send, AlertCircle, Check } from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  reward_currency: string;
  redeem_code: string | null;
  codes_used: number;
  total_codes: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

type Props = { userId: string; profile: Profile; onClose: () => void; onProfileUpdate: (u: Partial<Profile>) => void };

export default function GiveawayModal({ userId, profile, onClose, onProfileUpdate }: Props) {
  const [tab, setTab] = useState<'transfer' | 'campaign' | 'redeem'>('transfer');
  const [recipientUID, setRecipientUID] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<Array<{ recipient_uid: string; amount: number; created_at: string }>>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('internal_transfers').select('*').eq('sender_id', userId).order('created_at', { ascending: false }).limit(10);
      if (data) setTransfers(data as Array<{ recipient_uid: string; amount: number; created_at: string }>);
      const { data: campData } = await supabase.from('giveaway_campaigns').select('*').eq('is_active', true).order('created_at', { ascending: false });
      setCampaigns((campData as Campaign[]) || []);
    })();
  }, [userId]);

  const sendTransfer = async () => {
    setError('');
    const amt = parseFloat(amount);
    if (!recipientUID.trim()) { setError('Enter recipient UID'); return; }
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (amt > parseFloat(profile.usdt_balance.toString())) { setError('Insufficient balance'); return; }

    setLoading(true);
    // Find recipient
    const { data: recipient } = await supabase.from('profiles').select('user_id, uid').eq('uid', recipientUID.trim()).maybeSingle();
    if (!recipient) { setError('Recipient not found. Check the UID and try again.'); setLoading(false); return; }

    // Insert transfer record
    await supabase.from('internal_transfers').insert({ sender_id: userId, recipient_uid: recipientUID.trim(), amount: amt, coin: 'USDT', status: 'COMPLETED' });

    // Deduct from sender
    const newBalance = parseFloat(profile.usdt_balance.toString()) - amt;
    await supabase.from('profiles').update({ usdt_balance: newBalance }).eq('user_id', userId);
    onProfileUpdate({ usdt_balance: newBalance });

    // Credit recipient
    const { data: recProfile } = await supabase.from('profiles').select('usdt_balance').eq('user_id', recipient.user_id).maybeSingle();
    if (recProfile) {
      await supabase.from('profiles').update({ usdt_balance: parseFloat(recProfile.usdt_balance.toString()) + amt }).eq('user_id', recipient.user_id);
    }

    setTransfers(prev => [{ recipient_uid: recipientUID.trim(), amount: amt, created_at: new Date().toISOString() }, ...prev]);
    setSuccess(true); setRecipientUID(''); setAmount(''); setLoading(false);
    setTimeout(() => setSuccess(false), 2500);
  };

  const handleRedeem = async () => {
    setError('');
    setRedeemSuccess(false);
    if (!redeemCode.trim()) { setError('Enter a redeem code.'); return; }
    setLoading(true);
    try {
      const { data: campaign, error: campErr } = await supabase
        .from('giveaway_campaigns')
        .select('*')
        .eq('redeem_code', redeemCode.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      if (campErr || !campaign) { setError('Invalid or expired redeem code.'); setLoading(false); return; }
      if (campaign.codes_used >= campaign.total_codes) { setError('This code has already been redeemed.'); setLoading(false); return; }

      // Mark code as used
      await supabase.from('giveaway_campaigns').update({ codes_used: campaign.codes_used + 1, is_active: campaign.codes_used + 1 < campaign.total_codes }).eq('id', campaign.id);

      // Record redemption
      await supabase.from('giveaway_redemptions').insert({
        campaign_id: campaign.id, user_id: userId, user_email: profile.email,
        reward_amount: campaign.reward_amount, reward_currency: campaign.reward_currency, redeem_code: campaign.redeem_code,
      });

      // Credit the user's balance
      const balanceKey = campaign.reward_currency === 'USDT' ? 'usdt_balance' : campaign.reward_currency === 'BTC' ? 'btc_balance' : 'eth_balance';
      const currentBal = parseFloat(profile[balanceKey]?.toString() || '0');
      const newBal = currentBal + parseFloat(campaign.reward_amount.toString());
      await supabase.from('profiles').update({ [balanceKey]: newBal }).eq('user_id', userId);
      onProfileUpdate({ [balanceKey]: newBal } as Partial<Profile>);

      setRedeemSuccess(true);
      setRedeemCode('');
    } catch {
      setError('Failed to redeem code.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Giveaway Hub</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>

        <div className="flex bg-[#0b0e11] mx-5 mt-4 rounded-xl p-1">
          <button onClick={() => setTab('transfer')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${tab === 'transfer' ? 'bg-[#f0b90b] text-black' : 'text-[#848e9c]'}`}>Gift UID</button>
          <button onClick={() => setTab('campaign')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${tab === 'campaign' ? 'bg-[#f0b90b] text-black' : 'text-[#848e9c]'}`}>Campaigns</button>
          <button onClick={() => setTab('redeem')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${tab === 'redeem' ? 'bg-[#f0b90b] text-black' : 'text-[#848e9c]'}`}>Redeem</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {tab === 'transfer' ? (
            <>
              {success && <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl p-3 flex items-center gap-2 text-sm"><Check className="w-4 h-4" /> Transfer sent successfully!</div>}
              {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-3 flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
              <div className="bg-gradient-to-br from-[#f0b90b]/20 to-orange-600/10 border border-[#f0b90b]/30 rounded-xl p-4 flex items-center gap-3">
                <Send className="w-6 h-6 text-[#f0b90b]" />
                <div>
                  <p className="text-sm font-bold text-[#eaecef]">Send crypto to another user</p>
                  <p className="text-xs text-[#848e9c]">Instant transfer between CEO Exchange users</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Recipient UID</p>
                <input value={recipientUID} onChange={e => setRecipientUID(e.target.value)} placeholder="Enter recipient UID"
                  className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
              </div>
              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Amount (USDT)</p>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                  className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
                <p className="text-xs text-[#848e9c] mt-1">Available: {parseFloat(profile.usdt_balance.toString()).toFixed(2)} USDT</p>
              </div>
              <button onClick={sendTransfer} disabled={loading}
                className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl">
                {loading ? 'Sending...' : 'Send Transfer'}
              </button>
              {transfers.length > 0 && (
                <div>
                  <p className="text-xs text-[#848e9c] font-bold uppercase tracking-wider mb-2">Recent Transfers</p>
                  {transfers.map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-3 mb-2">
                      <div>
                        <p className="text-sm font-bold text-[#eaecef]">UID: {t.recipient_uid}</p>
                        <p className="text-xs text-[#848e9c]">{new Date(t.created_at).toLocaleString()}</p>
                      </div>
                      <p className="text-sm font-bold text-rose-400">-{t.amount} USDT</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : tab === 'campaign' ? (
            <div className="space-y-3">
              <p className="text-sm font-bold text-[#eaecef]">Active Giveaway Campaigns</p>
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="w-10 h-10 text-[#474d57] mx-auto mb-2" />
                  <p className="text-sm text-[#848e9c]">No active campaigns right now.</p>
                  <p className="text-xs text-[#474d57] mt-1">Check back soon for new giveaways!</p>
                </div>
              ) : campaigns.map(c => (
                <div key={c.id} className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-amber-400" />
                    <p className="text-sm font-bold text-[#eaecef]">{c.title}</p>
                  </div>
                  {c.description && <p className="text-xs text-[#848e9c] mb-2">{c.description}</p>}
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-black text-amber-400">{c.reward_amount} {c.reward_currency}</p>
                    {c.redeem_code && (
                      <button onClick={() => { setTab('redeem'); setRedeemCode(c.redeem_code || ''); }} className="bg-amber-400 text-black font-bold text-sm px-4 py-2 rounded-xl hover:bg-amber-300">
                        Redeem Code
                      </button>
                    )}
                  </div>
                  {c.expires_at && <p className="text-xs text-[#474d57] mt-1">Expires: {new Date(c.expires_at).toLocaleString()}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-500/10 to-sky-600/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                <Gift className="w-7 h-7 text-emerald-400" />
                <div>
                  <p className="text-sm font-bold text-[#eaecef]">Redeem a Gift Code</p>
                  <p className="text-xs text-[#848e9c]">Enter a code from admin or a campaign to claim your reward</p>
                </div>
              </div>
              {redeemSuccess && <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl p-3 flex items-center gap-2 text-sm"><Check className="w-4 h-4" /> Code redeemed! Balance updated.</div>}
              {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-3 flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Redeem Code</p>
                <input value={redeemCode} onChange={e => setRedeemCode(e.target.value)} placeholder="e.g. CEO-XY4Z8ABC"
                  className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57] font-mono tracking-wider uppercase" />
              </div>
              <button onClick={handleRedeem} disabled={loading || !redeemCode.trim()} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                {loading ? 'Redeeming...' : 'Claim Reward'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
