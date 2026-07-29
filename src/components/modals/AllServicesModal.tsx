import { X, TrendingUp, Wallet, Shield, Gift, Settings, HelpCircle, Users, Key, Globe } from 'lucide-react';

type Props = { onClose: () => void; onNavigate: (screen: string) => void };

const SECTIONS = [
  {
    title: 'Trade',
    items: [
      { icon: TrendingUp, label: 'Spot', color: '#f0b90b', screen: 'markets' },
      { icon: TrendingUp, label: 'Futures', color: '#f0b90b', screen: 'markets' },
      { icon: Users, label: 'P2P Trading', color: '#26a17b', screen: 'p2p' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { icon: Gift, label: 'Earn (Staking)', color: '#34d399', screen: 'earn' },
      { icon: Wallet, label: 'Web3 Wallet', color: '#38bdf8', screen: 'web3' },
      { icon: Gift, label: 'Rewards Hub', color: '#a78bfa', screen: 'rewards' },
      { icon: Users, label: 'Invite Friends', color: '#a78bfa', screen: 'invite' },
      { icon: Gift, label: 'Giveaway Hub', color: '#a78bfa', screen: 'giveaway' },
    ],
  },
  {
    title: 'Security',
    items: [
      { icon: Shield, label: 'Security Center', color: '#34d399', screen: 'userCenter' },
      { icon: Key, label: 'KYC Verification', color: '#38bdf8', screen: 'userCenter' },
      { icon: Settings, label: 'Preferences', color: '#94a3b8', screen: 'userCenter' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help Center', color: '#f0b90b', screen: 'about' },
      { icon: Globe, label: 'About Us', color: '#94a3b8', screen: 'about' },
    ],
  },
];

export default function AllServicesModal({ onClose, onNavigate }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36] sticky top-0 bg-[#181a20]">
          <h3 className="font-bold text-lg text-[#eaecef]">All Services</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-4 space-y-6">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <p className="text-xs text-[#848e9c] font-bold uppercase tracking-wider mb-3">{section.title}</p>
              <div className="grid grid-cols-3 gap-3">
                {section.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.label} onClick={() => { onNavigate(item.screen); onClose(); }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#1e2026] transition-colors">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${item.color}20` }}>
                        <Icon className="w-6 h-6" style={{ color: item.color }} />
                      </div>
                      <span className="text-xs text-[#eaecef] text-center font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
