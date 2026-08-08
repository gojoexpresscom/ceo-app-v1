import { useState } from 'react';
import {
  ArrowLeft, User, Shield, Bell,
  Mail, CheckCircle2, LogOut, ChevronRight,
  Globe, Moon, DollarSign, MessageSquare,
  FileText, Star, Users, Share2, X, Check,
} from 'lucide-react';
import { type Profile } from '@/lib/supabase';
import type { UserProfile, UpdateProfileFn } from '@/types';
import { SecurityTab } from '@/components/user/SecurityTab';
import { PreferenceTab } from '@/components/user/PreferenceTab';
import { GeneralTab } from '@/components/user/GeneralTab';
import { TELEGRAM_COMMUNITY } from '@/config/constants';

type Props = {
  userId: string;
  profile: Profile;
  onBack: () => void;
  onLogout: () => void;
  onProfileUpdate: (updates: Partial<Profile>) => void;
};

type ActiveModal =
  | null
  | 'nickname'
  | 'identity'
  | 'vip'
  | 'subaccount'
  | 'linkAccount'
  | 'passkeys'
  | 'antiPhishing'
  | 'fundPassword'
  | 'transactionApproval'
  | 'withdrawalSecurity'
  | 'changePassword'
  | 'trustedDevices'
  | 'appLock'
  | 'withdrawalAddress'
  | 'limits'
  | 'language'
  | 'currency'
  | 'colorTheme'
  | 'help'
  | 'support'
  | 'feedback'
  | 'about'
  | 'storage';

export default function UserCenterScreen({ profile, onBack, onLogout, onProfileUpdate }: Props) {
  const [mainTab, setMainTab] = useState<'info' | 'security' | 'preference' | 'general'>('info');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [inputValue, setInputValue] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const update: UpdateProfileFn = async (patch) => {
    onProfileUpdate(patch);
    return { error: null };
  };

  const displayName = profile.nickname || profile.email?.split('@')[0] || 'goj***@****';
  const displayUid = profile.uid || (profile.id ? profile.id.slice(0, 9) : '231341794');

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col pb-12 select-none">
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#f0b90b] text-black font-bold px-4 py-2.5 rounded-2xl shadow-2xl z-50 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" /> {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#0b0e11] z-30 border-b border-[#1e2026]">
        <button onClick={onBack} className="p-1 hover:bg-[#1e2026] rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold text-[#eaecef]">User Center</h1>
        <div className="flex items-center gap-3">
          <Moon className="w-5 h-5 text-[#848e9c]" />
          <Globe className="w-5 h-5 text-[#848e9c]" />
        </div>
      </div>

      {/* User Banner */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-[#1e2026] bg-[#0b0e11]">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-lg">
            <div className="w-full h-full bg-[#1e2026] rounded-[14px] flex items-center justify-center">
              <span className="text-xl font-black text-[#f0b90b]">{displayName[0]?.toUpperCase()}</span>
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#eaecef]">{displayName.slice(0, 3)}***@****</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-emerald-400 font-bold">Security level High ---</span>
            </div>
            <div className="inline-block mt-1 bg-[#1e2026] border border-[#2b2f36] px-2 py-0.5 rounded-md">
              <span className="text-[10px] text-[#848e9c]">Site: Bybit Global</span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#474d57]" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1e2026] px-4 bg-[#0b0e11] sticky top-[57px] z-20">
        {(['info', 'security', 'preference', 'general'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`pb-3 pt-3 mr-6 text-sm font-bold relative transition-colors capitalize ${
              mainTab === tab ? 'text-[#eaecef]' : 'text-[#848e9c] hover:text-[#eaecef]'
            }`}
          >
            {tab === 'info' ? 'My info' : tab}
            {mainTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f0b90b] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 px-4 py-2 flex flex-col gap-1 max-w-lg mx-auto w-full">
        {mainTab === 'info' && (
          <div className="flex flex-col">
            <MenuItem icon={<User className="w-5 h-5 text-[#848e9c]" />} label="Profile Picture" onClick={() => setActiveModal('nickname')} />
            <MenuItem icon={<FileText className="w-5 h-5 text-[#848e9c]" />} label="Nickname" value={`${displayName.slice(0, 3)}***@****`} onClick={() => setActiveModal('nickname')} />
            <MenuItem icon={<Shield className="w-5 h-5 text-[#848e9c]" />} label="UID" value={displayUid} copyable onCopy={() => showToast('UID copied')} />
            <MenuItem icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} label="Identity Verification" value="Lv.1 Verified" valueColor="text-emerald-400" onClick={() => setActiveModal('identity')} />
            <MenuItem icon={<Star className="w-5 h-5 text-amber-400" />} label="VIP level" value="Non-VIP" onClick={() => setActiveModal('vip')} />
            <MenuItem icon={<DollarSign className="w-5 h-5 text-[#848e9c]" />} label="My Fee Rates" onClick={() => showToast('Standard tier active')} />
            <MenuItem icon={<Users className="w-5 h-5 text-[#848e9c]" />} label="Subaccount" onClick={() => setActiveModal('subaccount')} />
            <MenuItem icon={<Share2 className="w-5 h-5 text-[#848e9c]" />} label="Link Account" onClick={() => setActiveModal('linkAccount')} />
            <MenuItem icon={<MessageSquare className="w-5 h-5 text-[#848e9c]" />} label="Join Our Community" onClick={() => window.open(TELEGRAM_COMMUNITY, '_blank')} />
          </div>
        )}

        {mainTab === 'security' && (
          <div className="pt-2">
            <SecurityTab profile={profile as UserProfile} update={update} />
          </div>
        )}

        {mainTab === 'preference' && (
          <div className="pt-2">
            <PreferenceTab profile={profile as UserProfile} update={update} />
          </div>
        )}

        {mainTab === 'general' && (
          <div className="pt-2">
            <GeneralTab profile={profile as UserProfile} update={update} />
          </div>
        )}

        <div className="mt-8 px-2">
          <button
            onClick={onLogout}
            className="w-full bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] text-[#eaecef] font-bold py-4 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 shadow-xl"
          >
            <LogOut className="w-4 h-4 text-rose-400" /> Log Out
          </button>
        </div>
      </div>

      {/* Placeholder modals for My Info tab items not yet wired to real components */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl w-full max-w-sm p-6 relative shadow-2xl">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#2b2f36] flex items-center justify-center text-[#848e9c]">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold capitalize text-[#eaecef] mb-2">
              {activeModal.replace(/([A-Z])/g, ' $1')}
            </h3>
            <p className="text-xs text-[#848e9c] mb-4">Configure your security and account preferences instantly.</p>
            <input
              type="text"
              placeholder="Enter details..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-3 py-3 text-sm text-[#eaecef] outline-none mb-4"
            />
            <button
              onClick={() => { showToast('Updated successfully!'); setActiveModal(null); setInputValue(''); }}
              className="w-full bg-[#f0b90b] text-black font-bold py-3 rounded-xl text-sm"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon, label, value, valueColor = 'text-[#848e9c]', copyable, onCopy, onClick,
}: {
  icon: React.ReactNode; label: string; value?: string; valueColor?: string; copyable?: boolean; onCopy?: () => void; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className="flex items-center justify-between py-3.5 px-2 hover:bg-[#1e2026]/40 rounded-2xl transition-colors cursor-pointer group">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium text-[#eaecef] group-hover:text-white">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className={`text-xs ${valueColor}`}>{value}</span>}
        {copyable && <button onClick={(e) => { e.stopPropagation(); onCopy?.(); }} className="text-xs text-[#848e9c]">📋</button>}
        <ChevronRight className="w-4 h-4 text-[#474d57]" />
      </div>
    </div>
  );
}
