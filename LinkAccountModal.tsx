import { useState } from 'react';
import { X, Link2, Check, ChevronRight, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  userId: string;
  profile: { telegram_handle?: string; twitter_handle?: string; whatsapp_number?: string };
  onClose: () => void;
  onUpdate: (updates: Record<string, string>) => void;
};

type Channel = 'telegram' | 'twitter' | 'whatsapp' | null;

const CHANNELS = [
  { id: 'telegram' as Channel, name: 'Telegram', color: '#0088cc', placeholder: '@username', field: 'telegram_handle' },
  { id: 'twitter' as Channel, name: 'X (Twitter)', color: '#000000', placeholder: '@username', field: 'twitter_handle' },
  { id: 'whatsapp' as Channel, name: 'WhatsApp', color: '#25d366', placeholder: '+1234567890', field: 'whatsapp_number' },
];

export default function LinkAccountModal({ userId, profile, onClose, onUpdate }: Props) {
  const [channel, setChannel] = useState<Channel>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const activeChannel = CHANNELS.find(c => c.id === channel);
  const currentValue = channel ? (profile[channel === 'telegram' ? 'telegram_handle' : channel === 'twitter' ? 'twitter_handle' : 'whatsapp_number'] || '') : '';

  const handleSave = async () => {
    if (!channel || !value.trim()) return;
    setSaving(true);
    const field = activeChannel!.field;
    await supabase.from('profiles').update({ [field]: value.trim() }).eq('user_id', userId);
    onUpdate({ [field]: value.trim() });
    setSaving(false);
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setChannel(null); setValue(''); }, 1500);
  };

  const handleDisconnect = async (field: string) => {
    await supabase.from('profiles').update({ [field]: null }).eq('user_id', userId);
    onUpdate({ [field]: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl p-5 pb-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[#eaecef]">Link Account</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-3 mb-4">
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-bold">Account linked successfully!</span>
          </div>
        )}

        {!channel ? (
          <div className="space-y-3">
            {CHANNELS.map(c => {
              const connected = !!(c.id === 'telegram' ? profile.telegram_handle : c.id === 'twitter' ? profile.twitter_handle : profile.whatsapp_number);
              return (
                <button
                  key={c.id}
                  onClick={() => { setChannel(c.id); setValue(currentValue); }}
                  className="w-full flex items-center gap-4 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 hover:border-[#f0b90b] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.color }}>
                    {c.id === 'telegram' && <Send className="w-5 h-5 text-white" />}
                    {c.id === 'twitter' && <span className="text-white font-bold">X</span>}
                    {c.id === 'whatsapp' && <span className="text-white font-bold text-lg">W</span>}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-[#eaecef]">{c.name}</p>
                    <p className="text-xs text-[#848e9c]">{connected ? `Connected: ${currentValue}` : 'Not connected'}</p>
                  </div>
                  {connected ? (
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">Linked</span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#474d57]" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: activeChannel!.color }}>
                {channel === 'telegram' && <Send className="w-5 h-5 text-white" />}
                {channel === 'twitter' && <span className="text-white font-bold">X</span>}
                {channel === 'whatsapp' && <span className="text-white font-bold text-lg">W</span>}
              </div>
              <h4 className="text-sm font-bold text-[#eaecef]">Connect {activeChannel!.name}</h4>
            </div>
            <div>
              <p className="text-xs text-[#848e9c] mb-1">{activeChannel!.name} {activeChannel!.placeholder}</p>
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={activeChannel!.placeholder}
                className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !value.trim()}
              className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              {saving ? 'Saving...' : <><Link2 className="w-4 h-4" /> Link Account</>}
            </button>
            {currentValue && (
              <button
                onClick={() => handleDisconnect(activeChannel!.field)}
                className="w-full text-rose-400 text-sm font-bold py-2"
              >
                Disconnect {activeChannel!.name}
              </button>
            )}
            <button onClick={() => setChannel(null)} className="w-full text-[#848e9c] text-sm py-2">Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
