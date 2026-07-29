import { X, TrendingUp, Users, Gift, Wallet, Crown, Code, Megaphone, ChevronRight, Grid3x3, Download, MessageCircle } from 'lucide-react';
import { SUPPORT_WHATSAPP, TELEGRAM_COMMUNITY } from '@/config/constants';

function isRunningAsApp(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Record<string, unknown>).standalone === true;
}

type Props = { onClose: () => void; onNavigate: (screen: string) => void };

const NAV_ITEMS = [
  { icon: TrendingUp, label: 'Spot Trading', color: '#f0b90b', screen: 'markets' },
  { icon: TrendingUp, label: 'Futures', color: '#f0b90b', screen: 'markets' },
  { icon: Users, label: 'P2P Trading', color: '#26a17b', screen: 'p2p' },
  { icon: Gift, label: 'Staking / Earn', color: '#34d399', screen: 'earn' },
  { icon: Wallet, label: 'Web3 Wallet', color: '#38bdf8', screen: 'web3' },
  { icon: Crown, label: 'VIP Center', color: '#a78bfa', screen: 'userCenter' },
  { icon: Code, label: 'API Management', color: '#94a3b8', screen: 'userCenter' },
  { icon: Megaphone, label: 'Announcements', color: '#f0b90b', screen: 'about' },
];

export default function MenuPanel({ onClose, onNavigate }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 max-w-md mx-auto flex flex-col justify-center px-6" onClick={onClose}>
      <div className="bg-[#181a20] rounded-2xl border border-[#2b2f36] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2b2f36]">
          <h3 className="text-base font-bold text-[#eaecef]">Features</h3>
          <button onClick={onClose} className="text-[#848e9c] hover:text-[#eaecef]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="py-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => { onNavigate(item.screen); onClose(); }}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[#1e2026] transition-colors"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}20` }}>
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <span className="flex-1 text-sm font-medium text-[#eaecef] text-left">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-[#474d57]" />
              </button>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-[#2b2f36] space-y-2">
          {!isRunningAsApp() && (
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/ceo-exchange.apk';
                link.download = 'ceo-exchange.apk';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#f0b90b]/10 border border-[#f0b90b]/30 text-[#f0b90b] font-bold text-sm py-3 rounded-xl hover:bg-[#f0b90b]/20"
            >
              <Download className="w-4 h-4" /> Download App
            </button>
          )}
          <button onClick={() => { onNavigate('allServices'); onClose(); }}
            className="w-full flex items-center justify-center gap-2 bg-[#1e2026] text-[#eaecef] font-bold text-sm py-3 rounded-xl hover:bg-[#2b2f36]">
            <Grid3x3 className="w-4 h-4" /> All Services
          </button>
          <a href={TELEGRAM_COMMUNITY} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#229ED9]/10 border border-[#229ED9]/30 text-[#229ED9] font-bold text-sm py-3 rounded-xl hover:bg-[#229ED9]/20 transition-colors">
            <MessageCircle className="w-4 h-4" /> Join Telegram Community
          </a>
          <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] font-bold text-sm py-3 rounded-xl hover:bg-[#25D366]/20 transition-colors">
            <MessageCircle className="w-4 h-4" /> Join WhatsApp Community
          </a>
        </div>
      </div>
    </div>
  );
}
