import { useState } from 'react';
import {
  ArrowLeft, UserCircle, Shield, KeyRound, Lock, Smartphone,
  Clock, Wallet, TrendingUp, Mail, Globe, Moon, Sun,
  LogOut, ChevronRight, Check, Copy, BadgeCheck, Star, Percent, Users, Send, Link, Trash2, Info
} from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';
import KYCModal from '@/components/modals/KYCModal';
import EmailChangeModal from '@/components/modals/EmailChangeModal';
import LinkAccountModal from '@/components/modals/LinkAccountModal';
import ProfilePictureModal from '@/components/modals/ProfilePictureModal';
import TOTPSetupModal from '@/components/modals/TOTPSetupModal';
import PasskeysModal from '@/components/modals/PasskeysModal';

type UCTab = 'myinfo' | 'security' | 'preference' | 'general';
type UCMarkupModal = 
  | null 
  | 'kyc' 
  | 'emailChange' 
  | 'linkAccount' 
  | 'profilePic' 
  | 'totp' 
  | 'passkeys' 
  | 'antiPhishing' 
  | 'fundPassword' 
  | 'changePassword' 
  | 'trustedDevices' 
  | 'withdrawalAddress' 
  | 'withdrawalLimits' 
  | 'notifications' 
  | 'feedback' 
  | 'about' 
  | 'vip' 
  | 'feeRates' 
  | 'securityGeneric' 
  | 'subaccount';

type Props = {
  userId: string;
  profile: Profile;
  onBack: () => void;
  onLogout: () => void;
  onProfileUpdate: (updates: Partial<Profile>) => void;
};

const TELEGRAM_COMMUNITY = 'https://t.me/+-cQQMpJQAcxhNjlk';
const WHATSAPP_COMMUNITY = 'https://chat.whatsapp.com/GXOUVSkLqXGC9vq76e9jDD';

const maskEmail = (email: string) => {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
};

export default function UserCenterScreen({ userId, profile, onBack, onLogout, onProfileUpdate }: Props) {
  const [tab, setTab] = useState<UCTab>('myinfo');
  const [modal, setModal] = useState<UCMarkupModal>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [colorUp, setColorUp] = useState(profile.color_up || 'green');
  const [appLock, setAppLock] = useState(profile.app_lock_enabled || false);
  const [secureTx, setSecureTx] = useState(profile.secure_tx_approval || false);
  const [withdrawalLock] = useState(false);
  const [alwaysOn, setAlwaysOn] = useState(false);

  const [routing, setRouting] = useState(profile.routing_mode || 'auto');
  const [depositTo, setDepositTo] = useState(profile.deposit_to || 'funding');
  const [currency, setCurrency] = useState(profile.preferred_currency || 'USD');

  const [copied, setCopied] = useState(false);
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [showNicknameEdit, setShowNicknameEdit] = useState(false);
  const [, setSavingPref] = useState(false);

  const copyUID = () => {
    navigator.clipboard.writeText(profile.uid || userId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveNickname = async () => {
    if (!nickname.trim()) return;
    await supabase.from('profiles').update({ nickname: nickname.trim() }).eq('user_id', userId);
    onProfileUpdate({ nickname: nickname.trim() });
    setShowNicknameEdit(false);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('light-mode', next === 'light');
  };

  const toggleColorPref = async () => {
    const next = colorUp === 'green' ? 'red' : 'green';
    setColorUp(next);
    await supabase.from('profiles').update({ color_up: next }).eq('user_id', userId);
    onProfileUpdate({ color_up: next });
  };

  const toggleAppLock = async () => {
    const next = !appLock;
    setAppLock(next);
    await supabase.from('profiles').update({ app_lock_enabled: next }).eq('user_id', userId);
    onProfileUpdate({ app_lock_enabled: next });
  };

  const toggleSecureTx = async () => {
    const next = !secureTx;
    setSecureTx(next);
    await supabase.from('profiles').update({ secure_tx_approval: next }).eq('user_id', userId);
    onProfileUpdate({ secure_tx_approval: next });
  };

  const savePref = async (field: string, value: string) => {
    setSavingPref(true);
    await supabase.from('profiles').update({ [field]: value }).eq('user_id', userId);
    onProfileUpdate({ [field]: value } as Partial<Profile>);
    setSavingPref(false);
  };

  const clearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    }
    setModal(null);
    alert('Cache and local storage cleared successfully.');
  };

  const handleOpenEmailApp = () => {
    const mailtoUrl = 'mailto:';
    const a = document.createElement('a');
    a.href = mailtoUrl;
    a.click();
  };

  const tabs: Array<{ id: UCTab; label: string }> = [
    { id: 'myinfo', label: 'My info' },
    { id: 'security', label: 'Security' },
    { id: 'preference', label: 'Preference' },
    { id: 'general', label: 'General' },
  ];

  const secLevel = profile.security_level || 'Low';
  const secDots = secLevel === 'High' ? 4 : secLevel === 'Medium' ? 2 : 1;

  const SettingRow = ({
    icon: Icon, label, value, onPress, rightNode,
  }: {
    icon: typeof Mail; label: string; value?: string; onPress?: () => void; rightNode?: React.ReactNode;
  }) => (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-4 py-4 border-b border-[#1e2026] last:border-0 hover:bg-[#1a1d21] px-4 text-left"
    >
      <Icon className="w-5 h-5 text-[#848e9c] flex-shrink-0" />
      <span className="flex-1 text-sm text-[#eaecef]">{label}</span>
      {rightNode ?? (
        <div className="flex items-center gap-1.5">
          {value && <span className="text-sm text-[#848e9c]">{value}</span>}
          <ChevronRight className="w-4 h-4 text-[#474d57]" />
        </div>
      )}
    </button>
  );

  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="px-4 pt-5 pb-2">
      <p className="text-sm font-bold text-[#eaecef]">{title}</p>
      {subtitle && <p className="text-xs text-[#848e9c] mt-0.5">{subtitle}</p>}
    </div>
  );

  const Toggle = ({ value, onChange, loading }: { value: boolean; onChange: () => void; loading?: boolean }) => (
    <button
      onClick={e => { e.stopPropagation(); if (!loading) onChange(); }}
      className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-[#f0b90b]' : 'bg-[#2b2f36]'} ${loading ? 'opacity-60' : ''}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );

  const linkedChannels = [
    profile.telegram_handle && { name: 'Telegram', color: '#0088cc' },
    profile.twitter_handle && { name: 'X', color: '#000000' },
    profile.whatsapp_number && { name: 'WhatsApp', color: '#25d366' },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#0b0e11] z-10">
        <button onClick={onBack}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-base font-bold">User Center</h1>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme}>{theme === 'dark' ? <Moon className="w-5 h-5 text-[#848e9c]" /> : <Sun className="w-5 h-5 text-[#848e9c]" />}</button>
          <button><Globe className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
      </div>

      {/* User summary */}
      <div className="px-4 py-4 flex items-center gap-3">
        <button onClick={() => setModal('profilePic')} className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-xl font-black text-black">
            {profile.profile_picture_url ? (
              <img src={profile.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              profile.email.charAt(0).toUpperCase()
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#f0b90b] flex items-center justify-center border-2 border-[#0b0e11]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        </button>
        <div>
          <p className="text-xl font-bold">{maskEmail(profile.email)}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-[#848e9c]">Security level</span>
            <span className={`text-xs font-bold ${secLevel === 'High' ? 'text-emerald-400' : secLevel === 'Medium' ? 'text-amber-400' : 'text-rose-400'}`}>{secLevel}</span>
            <div className="flex gap-0.5">
              {[1,2,3,4].map(i => (
                <div key={i} className={`w-5 h-1 rounded-full ${i <= secDots ? 'bg-emerald-400' : 'bg-[#2b2f36]'}`} />
              ))}
            </div>
          </div>
          <p className="text-xs text-[#848e9c] mt-0.5">Site: CEO Exchange</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2b2f36] px-4">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`mr-6 pb-3 text-sm transition-colors border-b-2 ${tab === t.id ? 'text-[#eaecef] font-bold border-[#eaecef]' : 'text-[#848e9c] border-transparent'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-8">

        {/* ============ MY INFO ============ */}
        {tab === 'myinfo' && (
          <div>
            <SettingRow icon={UserCircle} label="Profile Picture" onPress={() => setModal('profilePic')}
              rightNode={<div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-xs font-bold text-black">
                  {profile.profile_picture_url ? <img src={profile.profile_picture_url} alt="" className="w-full h-full object-cover" /> : profile.email.charAt(0).toUpperCase()}
                </div>
                <ChevronRight className="w-4 h-4 text-[#474d57]" />
              </div>} />

            {showNicknameEdit ? (
              <div className="px-4 py-4 border-b border-[#1e2026] flex items-center gap-3">
                <UserCircle className="w-5 h-5 text-[#848e9c] flex-shrink-0" />
                <input autoFocus value={nickname} onChange={e => setNickname(e.target.value)} maxLength={20}
                  placeholder="Enter nickname" onKeyDown={e => e.key === 'Enter' && saveNickname()}
                  className="flex-1 bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
                <button onClick={saveNickname} className="text-xs text-[#f0b90b] font-bold px-3 py-2">Save</button>
              </div>
            ) : (
              <SettingRow icon={UserCircle} label="Nickname" value={profile.nickname || 'Not Set'} onPress={() => { setNickname(profile.nickname || ''); setShowNicknameEdit(true); }} />
            )}

            <SettingRow icon={BadgeCheck} label="UID" onPress={copyUID}
              rightNode={<div className="flex items-center gap-2">
                <span className="text-sm text-[#848e9c]">{profile.uid}</span>
                <button onClick={(e) => { e.stopPropagation(); copyUID(); }}>
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#848e9c]" />}
                </button>
              </div>} />

            {/* Branded Email Confirmation Card */}
            <div className="mx-4 my-3 p-4 bg-[#1e2026] border border-[#2b2f36] rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f0b90b]/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-[#f0b90b]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#eaecef]">Email Verification</p>
                    <p className="text-xs text-[#848e9c]">{maskEmail(profile.email)}</p>
                  </div>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-medium">
                  Active
                </span>
              </div>
              <button
                onClick={handleOpenEmailApp}
                className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
              >
                Confirm Email in Mail App
              </button>
            </div>

            <SettingRow icon={Shield} label="Identity Verification"
              value={profile.kyc_status === 'VERIFIED' ? 'Verified' : profile.kyc_status === 'PENDING_VERIFICATION' ? 'Pending' : 'Unverified'}
              onPress={() => setModal('kyc')} />

            <SettingRow icon={Star} label="VIP Level" value={`Lv.${profile.vip_level}`} onPress={() => setModal('vip')} />
            <SettingRow icon={Percent} label="My Fee Rates" onPress={() => setModal('feeRates')} />
            <SettingRow icon={BadgeCheck} label="Additional Verification" value="0 cases" onPress={() => setModal('securityGeneric')} />
            <SettingRow icon={Users} label="Subaccount" onPress={() => setModal('subaccount')} />

            <SettingRow icon={Link} label="Link Account" onPress={() => setModal('linkAccount')}
              rightNode={<div className="flex items-center gap-1.5">
                {linkedChannels.length > 0 ? (
                  (linkedChannels as Array<{ name: string; color: string }>).map(ch => (
                    <div key={ch.name} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: ch.color }}>
                      {ch.name === 'Telegram' && <Send className="w-3 h-3 text-white" />}
                      {ch.name === 'X' && <span className="text-white text-[8px] font-bold">X</span>}
                      {ch.name === 'WhatsApp' && <span className="text-white text-[8px] font-bold">W</span>}
                    </div>
                  ))
                ) : <span className="text-xs text-[#848e9c]">Not linked</span>}
                <ChevronRight className="w-4 h-4 text-[#474d57]" />
              </div>} />

            <SettingRow icon={Users} label="Affiliate's Community" value="Joined" onPress={() => window.open(TELEGRAM_COMMUNITY, '_blank')} />
            <SettingRow icon={Users} label="Join Our Community" onPress={() => window.open(WHATSAPP_COMMUNITY, '_blank')} />

            <div className="px-4 py-6">
              <button onClick={onLogout} className="w-full bg-[#1e2026] border border-[#2b2f36] text-[#eaecef] py-4 rounded-2xl font-bold text-sm hover:bg-[#2b2f36] transition-colors flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          </div>
        )}

        {/* ============ SECURITY ============ */}
        {tab === 'security' && (
          <div>
            <SectionHeader title="Basic Protect" subtitle="Essential protection for everyday account activity." />
            <SettingRow icon={Mail} label="Email" value={maskEmail(profile.email)} onPress={() => setModal('emailChange')} />
            <SettingRow icon={Shield} label="Google 2FA Authentication"
              rightNode={<Toggle value={profile.two_fa_enabled} onChange={() => setModal('totp')} />} />
            <SettingRow icon={KeyRound} label="Passkeys" value={`${profile.passkey_count || 0} registered`} onPress={() => setModal('passkeys')} />
            <SettingRow icon={Lock} label="Anti-phishing Code" value={profile.anti_phishing_code || 'Not Set'} onPress={() => setModal('antiPhishing')} />

            <SectionHeader title="Advanced Protect" subtitle="Additional protection for key fund actions." />
            <SettingRow icon={Lock} label="Fund Password" value={profile.fund_password_set ? 'Set' : 'Not Setup'} onPress={() => setModal('fundPassword')} />
            <SettingRow icon={Shield} label="Secure Transaction Approval"
              rightNode={<Toggle value={secureTx} onChange={toggleSecureTx} />} />

            <SectionHeader title="Scenario-based Protection" subtitle="Extra protection for specific scenarios." />
            <SettingRow icon={Lock} label="Withdrawal Security"
              value={withdrawalLock ? 'Locked (24h)' : 'Active'}
              onPress={() => setModal('securityGeneric')} />

            <SectionHeader title="Account Access & Management" />
            <SettingRow icon={KeyRound} label="Change Password" onPress={() => setModal('changePassword')} />
            <SettingRow icon={Smartphone} label="Trusted Devices" onPress={() => setModal('trustedDevices')} />
            <SettingRow icon={Lock} label="App Lock"
              rightNode={<Toggle value={appLock} onChange={toggleAppLock} />} />
          </div>
        )}

        {/* ============ PREFERENCE ============ */}
        {tab === 'preference' && (
          <div>
            <SectionHeader title="Time & Routing" />
            <SettingRow icon={Clock} label="Benchmark Time Zone" value={profile.time_zone || 'UTC'}
              onPress={() => {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                savePref('time_zone', tz);
              }} />

            <SettingRow icon={Wallet} label="Withdrawal Address Book" onPress={() => setModal('withdrawalAddress')} />
            <SettingRow icon={TrendingUp} label="Manage Crypto Withdrawal Limits" onPress={() => setModal('withdrawalLimits')} />

            <div className="px-4 py-4 border-b border-[#1e2026] flex items-center gap-4">
              <TrendingUp className="w-5 h-5 text-[#848e9c] flex-shrink-0" />
              <span className="flex-1 text-sm text-[#eaecef]">Switch Routing</span>
              <select value={routing} onChange={e => { setRouting(e.target.value); savePref('routing_mode', e.target.value); }}
                className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]">
                <option value="auto">Auto Routing</option>
                <option value="spot">Spot Account</option>
                <option value="funding">Funding Account</option>
              </select>
            </div>

            <div className="px-4 py-4 border-b border-[#1e2026] flex items-center gap-4">
              <Wallet className="w-5 h-5 text-[#848e9c] flex-shrink-0" />
              <span className="flex-1 text-sm text-[#eaecef]">Route Deposits To</span>
              <select value={depositTo} onChange={e => { setDepositTo(e.target.value); savePref('deposit_to', e.target.value); }}
                className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]">
                <option value="funding">Funding Account</option>
                <option value="spot">Spot Account</option>
              </select>
            </div>
          </div>
        )}

        {/* ============ GENERAL ============ */}
        
