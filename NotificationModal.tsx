import { useState } from 'react';
import { X, Bell, Mail, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';

type Props = { userId: string; profile: Profile; onClose: () => void; onUpdate: (updates: Partial<Profile>) => void };

export default function NotificationModal({ userId, profile, onClose, onUpdate }: Props) {
  const [settings, setSettings] = useState({
    push: profile.notification_push ?? true,
    trade: profile.notification_trade ?? true,
    security: profile.notification_security ?? true,
    marketing: profile.notification_marketing ?? false,
    email_trade: profile.email_trade ?? true,
    email_security: profile.email_security ?? true,
    email_marketing: profile.email_marketing ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    setSaving(true);
    await supabase.from('profiles').update({
      notification_push: settings.push,
      notification_trade: settings.trade,
      notification_security: settings.security,
      notification_marketing: settings.marketing,
      email_trade: settings.email_trade,
      email_security: settings.email_security,
      email_marketing: settings.email_marketing,
    }).eq('user_id', userId);
    onUpdate({
      notification_push: settings.push, notification_trade: settings.trade,
      notification_security: settings.security, notification_marketing: settings.marketing,
      email_trade: settings.email_trade, email_security: settings.email_security, email_marketing: settings.email_marketing,
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-[#f0b90b]' : 'bg-[#2b2f36]'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );

  const Row = ({ icon: Icon, title, desc, value, onChange }: { icon: typeof Bell; title: string; desc: string; value: boolean; onChange: () => void }) => (
    <div className="flex items-center gap-3 py-3 border-b border-[#1e2026] last:border-0">
      <Icon className="w-5 h-5 text-[#848e9c] flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#eaecef]">{title}</p>
        <p className="text-xs text-[#848e9c]">{desc}</p>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Notification Settings</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-4">
          {saved && <p className="text-sm text-emerald-400 flex items-center gap-2 mb-3"><Check className="w-4 h-4" /> Settings saved!</p>}

          <p className="text-xs text-[#848e9c] font-bold uppercase tracking-wider mb-1 mt-2">Push Notifications</p>
          <Row icon={Bell} title="Push Notifications" desc="Receive alerts on your device" value={settings.push} onChange={() => toggle('push')} />
          <Row icon={Bell} title="Trade Alerts" desc="Order fills, liquidations, price alerts" value={settings.trade} onChange={() => toggle('trade')} />
          <Row icon={AlertCircle} title="Security Alerts" desc="Logins, withdrawals, password changes" value={settings.security} onChange={() => toggle('security')} />
          <Row icon={Bell} title="Marketing" desc="Promotions, new listings, campaigns" value={settings.marketing} onChange={() => toggle('marketing')} />

          <p className="text-xs text-[#848e9c] font-bold uppercase tracking-wider mb-1 mt-4">Email Subscriptions</p>
          <Row icon={Mail} title="Trade Emails" desc="Order confirmations and trade receipts" value={settings.email_trade} onChange={() => toggle('email_trade')} />
          <Row icon={Mail} title="Security Emails" desc="Security alerts and verification codes" value={settings.email_security} onChange={() => toggle('email_security')} />
          <Row icon={Mail} title="Marketing Emails" desc="Newsletters and promotional offers" value={settings.email_marketing} onChange={() => toggle('email_marketing')} />

          <button onClick={save} disabled={saving} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl mt-5">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
