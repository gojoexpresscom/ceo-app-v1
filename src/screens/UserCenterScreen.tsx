import { useState } from 'react';
import { ArrowLeft, User, Shield, Bell, LogOut, ChevronRight } from 'lucide-react';
import { type Profile } from '@/lib/supabase';

type Props = {
  userId: string;
  profile: Profile;
  onBack: () => void;
  onLogout: () => void;
};

export default function UserCenterScreen({ profile, onBack, onLogout }: Props) {
  const [tab, setTab] = useState<'profile' | 'security'>('profile');

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#0b0e11] z-10 border-b border-[#1e2026]">
        <button onClick={onBack} className="p-1 hover:bg-[#1e2026] rounded-xl"><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-base font-bold flex items-center gap-2"><User className="w-5 h-5 text-[#f0b90b]" /> User Center</h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 px-4 py-6 flex flex-col gap-6 max-w-lg mx-auto w-full">
        <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#f0b90b]/10 border border-[#f0b90b]/20 flex items-center justify-center text-[#f0b90b] text-2xl font-black">
            {profile.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{profile.email}</h2>
            <p className="text-xs text-emerald-400 mt-1">Verified Trader</p>
          </div>
        </div>

        <div className="grid grid-cols-2 bg-[#1e2026] p-1.5 rounded-2xl border border-[#2b2f36]">
          <button onClick={() => setTab('profile')} className={`py-2 text-xs font-bold rounded-xl ${tab === 'profile' ? 'bg-[#f0b90b] text-black' : 'text-[#848e9c]'}`}>Profile</button>
          <button onClick={() => setTab('security')} className={`py-2 text-xs font-bold rounded-xl ${tab === 'security' ? 'bg-[#f0b90b] text-black' : 'text-[#848e9c]'}`}>Security</button>
        </div>

        {tab === 'profile' ? (
          <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl p-4 flex flex-col gap-3">
            <div className="flex justify-between py-2 px-2 border-b border-[#2b2f36]">
              <span className="text-xs text-[#848e9c]">Email</span>
              <span className="text-xs font-medium">{profile.email}</span>
            </div>
            <div className="flex justify-between py-2 px-2">
              <span className="text-xs text-[#848e9c]">UID</span>
              <span className="text-xs font-medium">{profile.uid || '849201'}</span>
            </div>
          </div>
        ) : (
          <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between p-3">
              <span className="text-sm font-medium">Two-Factor Authentication</span>
              <span className="text-xs text-emerald-400 font-bold">Enabled</span>
            </div>
          </div>
        )}

        <button onClick={onLogout} className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 mt-4">
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>
    </div>
  );
}
