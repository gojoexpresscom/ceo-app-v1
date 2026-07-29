import { useState, useEffect } from 'react';
import { X, Gift, Send, AlertCircle, Check } from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';

type Props = { userId: string; profile: Profile; onClose: () => void; onProfileUpdate: (u: Partial<Profile>) => void };

export default function GiveawayModal({ userId, profile, onClose, onProfileUpdate }: Props) {
  const [tab, setTab] = useState<'transfer' | 'campaign'>('transfer');
  const [recipientUID, setRecipientUID] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<Array<{ recipient_uid: string; amount: number; created_at: string }>>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('internal_transfers').select('*').eq('sender_id', userId).order('created_at', { ascending: false }).limit(10);
      if (data) setTransfers(data as Array<{ recipient_uid: string; amount: number; created_at: string }>);
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

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Giveaway Hub</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>

        <div className="flex bg-[#0b0e11] mx-5 mt-4 rounded-xl p-1">
          <button onClick={() => setTab('transfer')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${tab === 'transfer' ? 'bg-[#f0b90b] text-black' : 'text-[#848e9c]'}`}>P2P Transfer</button>
          <button onClick={() => setTab('campaign')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${tab === 'campaign' ? 'bg-[#f0b90b] text-black' : 'text-[#848e9c]'}`}>Campaign</button>
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
          ) : (
            <div className="text-center py-12">
              <Gift className="w-16 h-16 text-[#474d57] mx-auto mb-4" />
              <p className="text-sm font-bold text-[#eaecef]">No active giveaways at this time</p>
              <p className="text-xs text-[#848e9c] mt-1">Check back later for new campaigns and airdrops</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
