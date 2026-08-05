import { useState, useEffect } from 'react';
import { X, Smartphone, Globe, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Device = { id: string; device_name: string; device_type: string; ip_address: string; last_login: string; is_current: boolean };

type Props = { userId: string; onClose: () => void };

export default function TrustedDevicesModal({ userId, onClose }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ua = navigator.userAgent;
    let type = 'web', name = 'Web Browser';
    if (/android/i.test(ua)) { type = 'android'; name = 'Android Device'; }
    else if (/iphone|ipad/i.test(ua)) { type = 'ios'; name = 'iOS Device'; }
    else if (/mac/i.test(ua)) name = 'Mac Browser';
    else if (/windows/i.test(ua)) name = 'Windows Browser';

    (async () => {
      // Insert current session if not exists
      await supabase.from('trusted_devices').upsert({
        user_id: userId, device_name: name, device_type: type, ip_address: '—', is_current: true,
      }, { onConflict: 'user_id,device_name' });

      const { data } = await supabase.from('trusted_devices').select('*').eq('user_id', userId).order('last_login', { ascending: false });
      if (data) setDevices(data as Device[]);
      setLoading(false);
    })();
  }, [userId]);

  const revoke = async (id: string) => {
    await supabase.from('trusted_devices').delete().eq('id', id).eq('user_id', userId);
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Trusted Devices</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[#f0b90b] border-t-transparent rounded-full animate-spin" /></div>
          ) : devices.length === 0 ? (
            <p className="text-center text-sm text-[#848e9c] py-8">No active sessions found</p>
          ) : (
            devices.map(d => (
              <div key={d.id} className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {d.device_type === 'web' ? <Globe className="w-5 h-5 text-[#848e9c]" /> : <Smartphone className="w-5 h-5 text-[#848e9c]" />}
                    <div>
                      <p className="text-sm font-bold text-[#eaecef]">{d.device_name}</p>
                      <p className="text-xs text-[#848e9c]">IP: {d.ip_address} · {new Date(d.last_login).toLocaleString()}</p>
                    </div>
                  </div>
                  {d.is_current && <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">Current</span>}
                </div>
                {!d.is_current && (
                  <button onClick={() => revoke(d.id)} className="mt-3 w-full flex items-center justify-center gap-2 text-rose-400 text-sm font-semibold bg-rose-500/10 hover:bg-rose-500/20 rounded-lg py-2">
                    <Trash2 className="w-4 h-4" /> Sign Out Device
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
