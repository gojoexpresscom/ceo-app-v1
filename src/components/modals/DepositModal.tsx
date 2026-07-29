import { useState } from 'react';
import { X, ArrowLeft, Bitcoin, Coins, User, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Profile } from '@/lib/supabase';

type Props = {
  onClose: () => void;
  onDepositCrypto: () => void;
  onP2P: () => void;
  onBuyFiat: () => void;
  onReceiveInternal: () => void;
  profile: Profile;
};

export default function DepositModal({ onClose, onDepositCrypto, onP2P, onBuyFiat, profile }: Props) {
  const [view, setView] = useState<'menu' | 'receive'>('menu');
  const [copied, setCopied] = useState(false);

  const copyUID = () => {
    navigator.clipboard.writeText(profile.uid).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const options = [
    { icon: Bitcoin, label: 'Deposit Crypto', desc: 'Transfer crypto from external wallet', color: 'text-amber-400', action: onDepositCrypto },
    { icon: ArrowLeft, label: 'P2P Trading', desc: 'Buy USDT from verified merchants', color: 'text-emerald-400', action: onP2P },
    { icon: Coins, label: 'Buy with Fiat (ETB/NGN)', desc: 'Purchase crypto with local currency', color: 'text-sky-400', action: onBuyFiat },
    { icon: User, label: 'Receive from CEO User', desc: 'Transfer from another CEO account', color: 'text-violet-400', action: () => setView('receive') },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] border-t border-[#2b2f36] rounded-t-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {view === 'menu' && (
          <>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-[#eaecef] text-lg">Deposit</h3>
              <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="space-y-2">
              {options.map(opt => (
                <button key={opt.label} onClick={opt.action}
                  className="w-full flex items-center gap-3 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 hover:border-[#474d57] transition-colors text-left">
                  <div className="w-10 h-10 rounded-xl bg-[#1e2026] flex items-center justify-center">
                    <opt.icon className={`w-5 h-5 ${opt.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#eaecef]">{opt.label}</p>
                    <p className="text-xs text-[#848e9c] mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-[#848e9c] text-center pt-3">Deposits usually arrive within 5-30 minutes depending on the network.</p>
          </>
        )}

        {view === 'receive' && (
          <>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <button onClick={() => setView('menu')}><ArrowLeft className="w-5 h-5 text-[#848e9c]" /></button>
                <h3 className="font-bold text-[#eaecef] text-lg">Receive from CEO User</h3>
              </div>
              <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="flex flex-col items-center py-4">
              <div className="bg-white p-4 rounded-2xl mb-4">
                <QRCodeSVG value={`ceo-exchange://transfer?uid=${profile.uid}`} size={180} level="M" />
              </div>
              <p className="text-sm text-[#848e9c] mb-1">Your CEO Exchange UID</p>
              <p className="text-2xl font-black text-[#eaecef] font-mono mb-4">{profile.uid}</p>
              <button onClick={copyUID}
                className="flex items-center gap-2 bg-[#f0b90b] hover:bg-amber-400 text-black font-bold text-sm px-6 py-3 rounded-xl">
                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy UID</>}
              </button>
              <p className="text-xs text-[#848e9c] text-center mt-4 max-w-xs">
                Share your UID with another CEO Exchange user. They can send you crypto instantly using the Giveaway Hub P2P transfer.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
