import { useState } from 'react';
import {
  ArrowLeft, Copy, Check, ChevronRight, Headphones, Gift, Users,
  ChevronDown, Wallet, TrendingUp, Puzzle, Award, Grid3x3, Info,
} from 'lucide-react';
import type { Profile } from '@/lib/supabase';
import { SUPPORT_WHATSAPP, TELEGRAM_COMMUNITY } from '@/config/constants';
import InviteFriendsModal from '@/components/modals/InviteFriendsModal';
import RewardsHubModal from '@/components/modals/RewardsHubModal';
import GiveawayModal from '@/components/modals/GiveawayModal';
import AllServicesModal from '@/components/modals/AllServicesModal';
import AboutUsModal from '@/components/modals/AboutUsModal';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.slice(0, 3) + '***';
  const domainParts = domain.split('.');
  return `${masked}@${'****'}.${domainParts[domainParts.length - 1]}`;
}

type Props = {
  profile: Profile;
  userId: string;
  onBack: () => void;
  onOpenUserCenter: () => void;
  onOpenDeposit: () => void;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  onProfileUpdate: (updates: Partial<Profile>) => void;
};

export default function ProfileOverviewScreen({ profile, userId, onBack, onOpenUserCenter, onOpenDeposit, onNavigate, onLogout, onProfileUpdate }: Props) {
  const [copied, setCopied] = useState(false);
  const [modal, setModal] = useState<'invite' | 'rewards' | 'giveaway' | 'allServices' | 'about' | null>(null);

  const maskedEmail = maskEmail(profile.email);
  const deposited = parseFloat(profile.usdt_balance.toString());

  const copyUID = () => {
    navigator.clipboard.writeText(profile.uid).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={onBack} className="text-[#eaecef]">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-5">
          <button onClick={() => window.open(TELEGRAM_COMMUNITY, '_blank')} className="text-[#848e9c] hover:text-emerald-400">
            <Headphones className="w-5 h-5" />
          </button>
          <button onClick={() => setModal('about')} className="text-[#848e9c] hover:text-[#eaecef]">
            <Info className="w-5 h-5" />
          </button>
          <button onClick={() => setModal('invite')} className="text-[#848e9c] hover:text-[#eaecef]">
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* User info header */}
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <button onClick={onOpenUserCenter} className="flex-shrink-0">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-xl font-black text-black">
              {profile.profile_picture_url ? (
                <img src={profile.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile.email.charAt(0).toUpperCase()
              )}
            </div>
          </button>
          <div className="flex-1" onClick={onOpenUserCenter}>
            <p className="text-xl font-bold text-[#eaecef]">{maskedEmail}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-[#848e9c]">UID: {profile.uid}</span>
              <button
                onClick={e => { e.stopPropagation(); copyUID(); }}
                className="text-[#848e9c] hover:text-[#eaecef]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <span className="text-sm text-[#848e9c]">|</span>
              <span className="text-sm text-[#848e9c] truncate">Site: CEO Exchange</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${profile.kyc_status === 'VERIFIED' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-[#1e2026] border border-[#2b2f36] text-[#848e9c]'}`}>
                <Check className={`w-3 h-3 ${profile.kyc_status === 'VERIFIED' ? 'text-emerald-400' : 'text-[#848e9c]'}`} />
                {profile.kyc_status === 'VERIFIED' ? 'Verified' : 'Unverified'}
              </span>
              <button onClick={onOpenUserCenter} className="flex items-center gap-1 bg-[#1e2026] border border-[#2b2f36] text-xs text-[#eaecef] px-2.5 py-1 rounded-full">
                {profile.vip_level === 0 ? 'Non-VIP' : `VIP ${profile.vip_level}`} <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
          <button onClick={onOpenUserCenter} className="text-[#848e9c]">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* VIP Journey card */}
      <div className="mx-4 bg-[#1e2026] rounded-2xl p-4 mb-4 border border-[#2b2f36]">
        <h3 className="text-base font-bold text-[#eaecef] mb-1">Embark on Your VIP Journey</h3>
        <p className="text-sm text-[#848e9c] leading-relaxed">
          Deposit <span className="text-[#eaecef] font-semibold">50,000</span> USDT to unlock a VIP 1 trial and enjoy exclusive perks!
        </p>
        <div className="mt-3 mb-1 h-1 bg-[#2b2f36] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
            style={{ width: `${Math.min((deposited / 50000) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-[#848e9c] mb-4">Deposited: ${deposited.toFixed(2)}</p>
        <div className="flex items-center justify-between">
          <button onClick={onOpenUserCenter} className="text-sm text-[#848e9c] flex items-center gap-1">
            VIP Benefits <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenDeposit}
            className="bg-[#f0b90b] hover:bg-amber-400 text-black font-bold text-sm px-6 py-2.5 rounded-full transition-colors"
          >
            Deposit Now
          </button>
        </div>
      </div>

      {/* Quick action cards */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-3">
        <button onClick={() => setModal('rewards')} className="bg-[#1e2026] border border-[#2b2f36] rounded-2xl p-4 flex items-center gap-3 hover:border-[#474d57] text-left">
          <div className="w-9 h-9 bg-[#2b2f36] rounded-xl flex items-center justify-center">
            <Gift className="w-5 h-5 text-[#f0b90b]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#eaecef]">Rewards Hub</p>
            <p className="text-xs text-[#848e9c]">Check Now</p>
          </div>
        </button>
        <button onClick={() => setModal('invite')} className="bg-[#1e2026] border border-[#2b2f36] rounded-2xl p-4 flex items-center gap-3 hover:border-[#474d57] text-left">
          <div className="w-9 h-9 bg-[#2b2f36] rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#eaecef]">Invite Friends</p>
            <p className="text-xs text-[#848e9c]">Invite Now</p>
          </div>
        </button>
      </div>

      {/* Recently used shortcuts */}
      <div className="px-4 mb-6">
        <p className="text-sm text-[#848e9c] mb-3">Recently used</p>
        <div className="flex items-center justify-around">
          {[
            { icon: Wallet, label: 'Wallet', screen: 'assets' },
            { icon: TrendingUp, label: 'Markets', screen: 'markets' },
            { icon: Gift, label: 'Giveaway', screen: 'giveaway' },
            { icon: Puzzle, label: 'Earn', screen: 'earn' },
          ].map(({ icon: Icon, label, screen }) => (
            <button key={label} onClick={() => {
              if (screen === 'giveaway') setModal('giveaway');
              else onNavigate(screen);
            }} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-[#1e2026] border border-[#2b2f36] rounded-xl flex items-center justify-center hover:border-[#474d57]">
                <Icon className="w-6 h-6 text-[#eaecef]" />
              </div>
              <span className="text-xs text-[#848e9c]">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* All services */}
      <div className="px-4 mb-8">
        <button onClick={() => setModal('allServices')} className="w-full flex items-center justify-center gap-2 bg-[#1e2026] border border-[#2b2f36] text-[#eaecef] text-sm font-semibold py-3 rounded-full hover:bg-[#2b2f36]">
          <Grid3x3 className="w-4 h-4" /> All Services
        </button>
      </div>

      <div className="flex-1" />

      {/* Footer */}
      <div className="flex items-center justify-around px-4 py-5 border-t border-[#2b2f36]">
        <button onClick={onBack} className="text-sm text-[#eaecef] flex items-center gap-1 font-medium">
          CEO Lite <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-[#2b2f36]" />
        <button onClick={() => setModal('about')} className="text-sm text-[#eaecef] flex items-center gap-1 font-medium">
          About Us <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modals */}
      {modal === 'invite' && <InviteFriendsModal userId={userId} profile={profile} onClose={() => setModal(null)} />}
      {modal === 'rewards' && <RewardsHubModal userId={userId} profile={profile} onClose={() => setModal(null)} onProfileUpdate={onProfileUpdate} />}
      {modal === 'giveaway' && <GiveawayModal userId={userId} profile={profile} onClose={() => setModal(null)} onProfileUpdate={onProfileUpdate} />}
      {modal === 'allServices' && <AllServicesModal onClose={() => setModal(null)} onNavigate={onNavigate} />}
      {modal === 'about' && <AboutUsModal onClose={() => setModal(null)} />}
    </div>
  );
}
