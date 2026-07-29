import { useState, useEffect } from 'react';
import { X, Users, Plus, Trash2, Key, Copy, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Sub = { id: string; name: string; api_key: string; permissions: string[]; active: boolean; created_at: string };

type Props = { userId: string; onClose: () => void };

export default function SubaccountModal({ userId, onClose }: Props) {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [perms, setPerms] = useState<string[]>(['read']);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('subaccounts').select('*').eq('parent_user_id', userId).order('created_at', { ascending: false });
      if (data) setSubs(data as Sub[]);
    })();
  }, [userId]);

  const create = async () => {
    setError('');
    if (!name.trim()) { setError('Enter a name'); return; }
    setLoading(true);
    const { data, error: insErr } = await supabase.from('subaccounts').insert({
      parent_user_id: userId, name: name.trim(), permissions: perms,
    }).select().single();
    if (insErr) { setError('Failed to create subaccount'); setLoading(false); return; }
    setSubs(prev => [data as Sub, ...prev]);
    setName(''); setPerms(['read']); setShowAdd(false);
    setLoading(false);
  };

  const togglePerm = (p: string) => setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const remove = async (id: string) => {
    await supabase.from('subaccounts').delete().eq('id', id).eq('parent_user_id', userId);
    setSubs(prev => prev.filter(s => s.id !== id));
  };

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const ALL_PERMS = [
    { id: 'read', label: 'Read' },
    { id: 'trade', label: 'Trade' },
    { id: 'withdraw', label: 'Withdraw' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Subaccounts</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-3">
          <div className="bg-[#1e2026] rounded-xl p-4 flex gap-3">
            <Users className="w-5 h-5 text-[#f0b90b] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#848e9c]">Subaccounts allow you to manage multiple accounts with separate balances and API keys under one main account.</p>
          </div>

          {subs.map(s => (
            <div key={s.id} className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-[#eaecef]">{s.name}</p>
                  <div className="flex gap-1 mt-1">
                    {s.permissions.map(p => <span key={p} className="text-xs text-[#f0b90b] bg-[#f0b90b]/10 px-2 py-0.5 rounded">{p}</span>)}
                  </div>
                </div>
                <button onClick={() => remove(s.id)} className="text-rose-400 hover:text-rose-300 p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2 bg-[#1e2026] rounded-lg px-3 py-2">
                <Key className="w-3.5 h-3.5 text-[#848e9c]" />
                <p className="flex-1 text-xs text-[#848e9c] font-mono break-all">{s.api_key}</p>
                <button onClick={() => copyKey(s.id, s.api_key)} className="flex-shrink-0">
                  {copiedId === s.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#848e9c]" />}
                </button>
              </div>
            </div>
          ))}

          {subs.length === 0 && !showAdd && (
            <div className="text-center py-8 text-[#848e9c]">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No subaccounts yet</p>
            </div>
          )}

          {showAdd ? (
            <div className="space-y-3 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4">
              <div>
                <p className="text-xs text-[#848e9c] mb-1">Subaccount Name</p>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Trading Bot" className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-lg px-3 py-2 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
              </div>
              <div>
                <p className="text-xs text-[#848e9c] mb-2">API Permissions</p>
                <div className="flex gap-2">
                  {ALL_PERMS.map(p => (
                    <button key={p.id} onClick={() => togglePerm(p.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${perms.includes(p.id) ? 'bg-[#f0b90b] text-black' : 'bg-[#1e2026] text-[#848e9c]'}`}>{p.label}</button>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 bg-[#2b2f36] text-[#eaecef] py-2.5 rounded-lg text-sm font-semibold">Cancel</button>
                <button onClick={create} disabled={loading} className="flex-1 bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black py-2.5 rounded-lg text-sm font-bold">{loading ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-2 bg-[#f0b90b]/10 text-[#f0b90b] border border-[#f0b90b]/30 font-bold py-3 rounded-xl hover:bg-[#f0b90b]/20">
              <Plus className="w-5 h-5" /> Create Subaccount
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
