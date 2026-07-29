import { useState, useEffect } from 'react';
import { X, Wallet, Plus, Trash2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Address = { id: string; label: string; coin: string; network: string; address: string };

type Props = { userId: string; onClose: () => void };

const COINS = ['USDT', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOGE', 'TRX'];
const NETWORKS = ['TRC20', 'ERC20', 'BEP20', 'BTC', 'SOL', 'XRP'];

export default function WithdrawalAddressModal({ userId, onClose }: Props) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState('');
  const [coin, setCoin] = useState('USDT');
  const [network, setNetwork] = useState('TRC20');
  const [addr, setAddr] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('withdrawal_addresses').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (data) setAddresses(data as Address[]);
    })();
  }, [userId]);

  const addAddress = async () => {
    setError('');
    if (!label.trim() || !addr.trim()) { setError('Label and address are required'); return; }
    setLoading(true);
    const { data, error: insErr } = await supabase.from('withdrawal_addresses').insert({
      user_id: userId, label: label.trim(), coin, network, address: addr.trim(),
    }).select().single();
    if (insErr) { setError('Failed to save address'); setLoading(false); return; }
    setAddresses(prev => [data as Address, ...prev]);
    setLabel(''); setAddr(''); setShowAdd(false);
    setSuccess('Address added!'); setTimeout(() => setSuccess(''), 2000);
    setLoading(false);
  };

  const removeAddress = async (id: string) => {
    await supabase.from('withdrawal_addresses').delete().eq('id', id).eq('user_id', userId);
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Withdrawal Address Book</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-3">
          {success && <p className="text-sm text-emerald-400 flex items-center gap-2"><Check className="w-4 h-4" />{success}</p>}

          {addresses.map(a => (
            <div key={a.id} className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-[#eaecef]">{a.label}</p>
                  <p className="text-xs text-[#848e9c] mt-0.5">{a.coin} · {a.network}</p>
                  <p className="text-xs text-[#848e9c] font-mono mt-1 break-all">{a.address}</p>
                </div>
                <button onClick={() => removeAddress(a.id)} className="text-rose-400 hover:text-rose-300 p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}

          {addresses.length === 0 && !showAdd && (
            <div className="text-center py-8 text-[#848e9c]">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No saved addresses</p>
            </div>
          )}

          {showAdd ? (
            <div className="space-y-3 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4">
              <div>
                <p className="text-xs text-[#848e9c] mb-1">Label</p>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. My Wallet" className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-lg px-3 py-2 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-[#848e9c] mb-1">Coin</p>
                  <select value={coin} onChange={e => setCoin(e.target.value)} className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-lg px-3 py-2 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]">
                    {COINS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-[#848e9c] mb-1">Network</p>
                  <select value={network} onChange={e => setNetwork(e.target.value)} className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-lg px-3 py-2 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]">
                    {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs text-[#848e9c] mb-1">Address</p>
                <input value={addr} onChange={e => setAddr(e.target.value)} placeholder="Enter wallet address" className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-lg px-3 py-2 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] font-mono" />
              </div>
              {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 bg-[#2b2f36] text-[#eaecef] py-2.5 rounded-lg text-sm font-semibold">Cancel</button>
                <button onClick={addAddress} disabled={loading} className="flex-1 bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black py-2.5 rounded-lg text-sm font-bold">{loading ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-2 bg-[#f0b90b]/10 text-[#f0b90b] border border-[#f0b90b]/30 font-bold py-3 rounded-xl hover:bg-[#f0b90b]/20">
              <Plus className="w-5 h-5" /> Add Address
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
