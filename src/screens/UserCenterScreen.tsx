import { useState } from 'react';
import { 
  ArrowLeft, User, Shield, Key, Bell, Smartphone, 
  Mail, Lock, CheckCircle2, AlertTriangle, LogOut, ChevronRight 
} from 'lucide-react';
import { type Profile } from '@/lib/supabase';

type Props = {
  profile: Profile;
  onBack: () => void;
};

export default function UserCenterScreen({ profile, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [twoFactor, setTwoFactor] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#0b0e11] z-10 border-b border-[#1e2026]">
        <button onClick={onBack} className="p-1 hover:bg-[#1e2026] rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold flex items-center gap-2">
          <User className="w-5 h-5 text-[#f0b90b]" /> User Center
        </h1>
        <div className="w-6" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 max-w-lg mx-auto w-full">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-[#1e2026] to-[#141619] border border-[#2b2f36] rounded-3xl p-6 flex items-center gap-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#f0b90b]/10 border border-[#f0b90b]/20 flex items-center justify-center text-[#f0b90b] text-2xl font-black">
            {profile.full_name?.[0] || profile.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate text-[#eaecef]">{profile.full_name || 'CEO Trader'}</h2>
            <p className="text-xs text-[#848e9c] truncate">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified Account
              </span>
              <span className="text-[10px] bg-[#2b2f36] text-[#848e9c] px-2 py-0.5 rounded-full font-medium">
                UID: {profile.id?.slice(0, 8) || '849201'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 bg-[#1e2026] p-1.5 rounded-2xl border border-[#2b2f36]">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`py-2 text-xs font-bold rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-[#f0b90b] text-black shadow-lg' : 'text-[#848e9c] hover:text-white'}`}
          >
            Profile
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`py-2 text-xs font-bold rounded-xl transition-colors ${activeTab === 'security' ? 'bg-[#f0b90b] text-black shadow-lg' : 'text-[#848e9c] hover:text-white'}`}
          >
            Security
          </button>
          <button 
            onClick={() => setActiveTab('preferences')}
            className={`py-2 text-xs font-bold rounded-xl transition-colors ${activeTab === 'preferences' ? 'bg-[#f0b90b] text-black shadow-lg' : 'text-[#848e9c] hover:text-white'}`}
          >
            Preferences
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl p-4 flex flex-col gap-3">
              <p className="text-xs font-bold text-[#848e9c] uppercase tracking-wider px-2">Personal Information</p>
              
              <div className="flex flex-col gap-1 px-2 py-1">
                <span className="text-xs text-[#848e9c]">Full Name</span>
                <span className="text-sm font-medium text-[#eaecef]">{profile.full_name || 'Not set'}</span>
              </div>
              <div className="flex flex-col gap-1 px-2 py-1 border-t border-[#2b2f36]">
                <span className="text-xs text-[#848e9c]">Email Address</span>
                <span className="text-sm font-medium text-[#eaecef]">{profile.email}</span>
              </div>
              <div className="flex flex-col gap-1 px-2 py-1 border-t border-[#2b2f36]">
                <span className="text-xs text-[#848e9c]">Account Status</span>
                <span className="text-sm font-medium text-emerald-400">Active & Trading Enabled</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl p-4 flex flex-col gap-2">
              <p className="text-xs font-bold text-[#848e9c] uppercase tracking-wider px-2">Security Settings</p>
              
              <div className="flex items-center justify-between p-3 hover:bg-[#2b2f36]/50 rounded-2xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Two-Factor Authentication (2FA)</p>
                    <p className="text-xs text-[#848e9c]">Secure your logins and withdrawals</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={twoFactor} 
                  onChange={() => setTwoFactor(!twoFactor)}
                  className="w-5 h-5 accent-[#f0b90b] cursor-pointer" 
                />
              </div>

              <button className="w-full flex items-center justify-between p-3 hover:bg-[#2b2f36]/50 rounded-2xl transition-colors text-left border-t border-[#2b2f36]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Change Password</p>
                    <p className="text-xs text-[#848e9c]">Update your account password</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#474d57]" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl p-4 flex flex-col gap-2">
              <p className="text-xs font-bold text-[#848e9c] uppercase tracking-wider px-2">Notifications & App</p>
              
              <div className="flex items-center justify-between p-3 hover:bg-[#2b2f36]/50 rounded-2xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Email Notifications</p>
                    <p className="text-xs text-[#848e9c]">Receive market updates and alerts</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailNotifs} 
                  onChange={() => setEmailNotifs(!emailNotifs)}
                  className="w-5 h-5 accent-[#f0b90b] cursor-pointer" 
                />
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button 
          onClick={() => { localStorage.clear(); window.location.reload(); }}
          className="w-full bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 font-bold py-3.5 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 mt-2"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>
    </div>
  );
}
