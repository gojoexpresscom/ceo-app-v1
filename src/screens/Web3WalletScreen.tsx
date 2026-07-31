import { useState } from 'react';
import { ArrowLeft, Wallet, Send, ArrowDownLeft, RefreshCw, Copy, Check, ShieldCheck, History, ChevronRight, X } from 'lucide-react';
import { type Profile } from '@/lib/supabase';

type Props = {
  userId: string;
  profile: Profile;
  onBack: () => void;
};

export default function Web3WalletScreen({ profile, onBack }: Props) {
  const [modal, setModal] = useState<'send' | 'receive' | 'swap' | 'history' | null>(null);
  const [copied, setCopied] = useState(false);
  const address = profile.web3_wallet_address || '0x71C9421A83B62d854F498B49';

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#0b0e11] z-10 border-b border-[#1e2026]">
        <button onClick={onBack} className="p-1 hover:bg-[#1e2026] rounded-xl"><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-base font-bold flex items-center gap-2"><Wallet className="w-5 h-5 text-[#f0b90b]" /> Web3 Wallet</h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 px-4 py-6 flex flex-col gap-6 max-w-lg mx-auto w-full">
        <div className="bg-gradient-to-br from-[#1e2026] to-[#141619] border border-[#2b2f36] rounded-3xl p-6 shadow-xl">
          <p className="text-xs text-[#848e9c]">Total Portfolio Value</p>
          <h2 className="text-3xl font-black mt-1">$1,245.80 <span className="text-sm font-normal text-[#848e9c]">USD</span></h2>
          <div className="mt-4 pt-4 border-t border-[#2b2f36] flex items-center justify-between">
            <span className="text-xs font-mono text-[#848e9c] truncate max-w-[200px]">{address}</span>
            <button onClick={handleCopy} className="flex items-center gap-1 text-xs bg-[#2b2f36] px-3 py-1.5 rounded-xl">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <button onClick={() => setModal('send')} className="flex flex-col items-center gap-2 bg-[#1e2026] border border-[#2b2f36] py-4 rounded-2xl hover:bg-[#2b2f36]">
            <div className="w-10 h-10 rounded-xl bg-[#f0b90b]/10 flex items-center justify-center text-[#f0b90b]"><Send className="w-5 h-5" /></div>
            <span className="text-xs">Send</span>
          </button>
          <button onClick={() => setModal('receive')} className="flex flex-col items-center gap-2 bg-[#1e2026] border border-[#2b2f36] py-4 rounded-2xl hover:bg-[#2b2f36]">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400"><ArrowDownLeft className="w-5 h-5" /></div>
            <span className="text-xs">Receive</span>
          </button>
          <button onClick={() => setModal('swap')} className="flex flex-col items-center gap-2 bg-[#1e2026] border border-[#2b2f36] py-4 rounded-2xl hover:bg-[#2b2f36]">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400"><RefreshCw className="w-5 h-5" /></div>
            <span className="text-xs">Swap</span>
          </button>
          <button onClick={() => setModal('history')} className="flex flex-col items-center gap-2 bg-[#1e2026] border border-[#2b2f36] py-4 rounded-2xl hover:bg-[#2b2f36]">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400"><History className="w-5 h-5" /></div>
            <span className="text-xs">History</span>
          </button>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl w-full max-w-sm p-6 relative">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-[#848e9c] hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold capitalize mb-4">{modal} Wallet</h3>
            <p className="text-xs text-[#848e9c] mb-6">Manage your secure asset routing safely on-chain.</p>
            <button onClick={() => setModal(null)} className="w-full bg-[#f0b90b] text-black font-bold py-3 rounded-xl text-sm">Done</button>
          </div>
        </div>
      )}
    </div>
  );
              }
