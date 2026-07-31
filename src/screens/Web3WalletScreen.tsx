import { useState } from 'react';
import { 
  ArrowLeft, Wallet, Send, ArrowDownLeft, RefreshCw, 
  Copy, Check, ShieldCheck, QrCode, History, ExternalLink, 
  Lock, Key, AlertCircle, ChevronRight, X 
} from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';

type Props = {
  userId: string;
  profile: Profile;
  onBack: () => void;
};

type WalletModal = null | 'send' | 'receive' | 'swap' | 'backup' | 'privateKey' | 'history';

export default function Web3WalletScreen({ userId, profile, onBack }: Props) {
  const [modal, setModal] = useState<WalletModal>(null);
  const [copied, setCopied] = useState(false);
  const [network, setNetwork] = useState<'ETH' | 'BSC' | 'POLYGON'>('ETH');
  
  // Simulated Wallet Data
  const walletAddress = profile.web3_wallet_address || '0x71C...8B49';
  const fullAddress = '0x71C9421A83B62d854F498B49';
  const balanceUSD = '1,245.80';
  const ethBalance = '0.428';

  const copyAddress = () => {
    navigator.clipboard.writeText(fullAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#0b0e11] z-10 border-b border-[#1e2026]">
        <button onClick={onBack} className="p-1 hover:bg-[#1e2026] rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#f0b90b]" /> Web3 Wallet
        </h1>
        <div className="flex items-center gap-2">
          <select 
            value={network} 
            onChange={(e) => setNetwork(e.target.value as any)}
            className="bg-[#1e2026] border border-[#2b2f36] rounded-lg px-2 py-1 text-xs text-[#eaecef] outline-none"
          >
            <option value="ETH">Ethereum</option>
            <option value="BSC">BNB Chain</option>
            <option value="POLYGON">Polygon</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-[#1e2026] to-[#141619] border border-[#2b2f36] rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#f0b90b]/5 rounded-full blur-2xl pointer-events-none" />
          
          <p className="text-xs text-[#848e9c] font-medium uppercase tracking-wider">Total Portfolio Value</p>
          <h2 className="text-3xl font-black mt-1 text-[#eaecef]">${balanceUSD} <span className="text-sm font-normal text-[#848e9c]">USD</span></h2>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              {ethBalance} ETH
            </span>
            <span className="text-xs text-[#848e9c]">Self-Custody Active</span>
          </div>

          {/* Address pill */}
          <div className="mt-6 pt-4 border-t border-[#2b2f36]/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-[#848e9c]">{walletAddress}</span>
            </div>
            <button 
              onClick={copyAddress}
              className="flex items-center gap-1.5 text-xs bg-[#2b2f36] hover:bg-[#363c45] text-[#eaecef] px-3 py-1.5 rounded-xl transition-colors font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-3">
          <button 
            onClick={() => setModal('send')}
            className="flex flex-col items-center justify-center gap-2 bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] py-4 rounded-2xl transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[#f0b90b]/10 flex items-center justify-center text-[#f0b90b]">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-[#eaecef]">Send</span>
          </button>

          <button 
            onClick={() => setModal('receive')}
            className="flex flex-col items-center justify-center gap-2 bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] py-4 rounded-2xl transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-[#eaecef]">Receive</span>
          </button>

          <button 
            onClick={() => setModal('swap')}
            className="flex flex-col items-center justify-center gap-2 bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] py-4 rounded-2xl transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-[#eaecef]">Swap</span>
          </button>

          <button 
            onClick={() => setModal('history')}
            className="flex flex-col items-center justify-center gap-2 bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] py-4 rounded-2xl transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-[#eaecef]">History</span>
          </button>
        </div>

        {/* Security & Management Section */}
        <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl p-4 flex flex-col gap-1">
          <p className="text-xs font-bold text-[#848e9c] px-3 py-2 uppercase tracking-wider">Security & Backup</p>
          
          <button 
            onClick={() => setModal('backup')}
            className="w-full flex items-center justify-between p-3 hover:bg-[#2b2f36]/50 rounded-2xl transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#eaecef]">Backup Secret Phrase</p>
                <p className="text-xs text-[#848e9c]">Protect your funds with recovery words</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#474d57]" />
          </button>

          <button 
            onClick={() => setModal('privateKey')}
            className="w-full flex items-center justify-between p-3 hover:bg-[#2b2f36]/50 rounded-2xl transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#eaecef]">Export Private Key</p>
                <p className="text-xs text-[#848e9c]">Advanced access for external wallets</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#474d57]" />
          </button>
        </div>
      </div>

      {/* Generic Modal Overlay */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl w-full max-w-sm p-6 relative shadow-2xl animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setModal(null)} 
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#2b2f36] flex items-center justify-center text-[#848e9c] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {modal === 'send' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold">Send Crypto</h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#848e9c]">Recipient Address</label>
                  <input type="text" placeholder="0x..." className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-3 py-2.5 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#848e9c]">Amount</label>
                  <input type="number" placeholder="0.00" className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-3 py-2.5 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
                </div>
                <button onClick={() => { alert('Transaction broadcasted successfully!'); setModal(null); }} className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-sm transition-colors mt-2">
                  Confirm Send
                </button>
              </div>
            )}

            {modal === 'receive' && (
              <div className="flex flex-col items-center text-center gap-4">
                <h3 className="text-lg font-bold">Receive Crypto</h3>
                <div className="bg-white p-4 rounded-2xl">
                  <QrCode className="w-36 h-36 text-black" />
                </div>
                <p className="text-xs text-[#848e9c] break-all font-mono bg-[#0b0e11] p-3 rounded-xl border border-[#2b2f36] w-full">
                  {fullAddress}
                </p>
                <button onClick={copyAddress} className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-sm transition-colors">
                  {copied ? 'Copied Address!' : 'Copy Address'}
                </button>
              </div>
            )}

            {modal === 'swap' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold">Swap Tokens</h3>
                <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-2xl p-3 flex flex-col gap-1">
                  <span className="text-xs text-[#848e9c]">From</span>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">ETH</span>
                    <span className="text-sm text-[#848e9c]">Bal: {ethBalance}</span>
                  </div>
                </div>
                <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-2xl p-3 flex flex-col gap-1">
                  <span className="text-xs text-[#848e9c]">To (Estimated)</span>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">USDT</span>
                    <span className="text-sm text-[#848e9c]">Bal: 0.00</span>
                  </div>
                </div>
                <button onClick={() => { alert('Swap executed successfully!'); setModal(null); }} className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-sm transition-colors mt-2">
                  Swap Now
                </button>
              </div>
            )}

            {modal === 'backup' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" /> Secret Recovery Phrase
                </h3>
                <p className="text-xs text-[#848e9c]">Write down these 12 words in order and keep them safe. Never share them with anyone.</p>
                <div className="grid grid-cols-3 gap-2 bg-[#0b0e11] p-3 rounded-2xl border border-[#2b2f36]">
                  {['apple', 'river', 'mountain', 'stone', 'galaxy', 'silent', 'ocean', 'tiger', 'wind', 'shadow', 'forest', 'beacon'].map((word, idx) => (
                    <div key={idx} className="bg-[#1e2026] px-2 py-1.5 rounded-lg text-xs text-center font-mono">
                      <span className="text-[#848e9c] mr-1">{idx + 1}.</span>{word}
                    </div>
                  ))}
                </div>
                <button onClick={() => setModal(null)} className="w-full bg-[#2b2f36] hover:bg-[#363c45] text-[#eaecef] font-bold py-3 rounded-xl text-sm transition-colors">
                  I Saved It Securely
                </button>
              </div>
            )}

            {modal === 'privateKey' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Private Key Warning
                </h3>
                <p className="text-xs text-[#848e9c]">Anyone with your private key will have full control of your funds. Do not share this with anyone.</p>
                <div className="bg-[#0b0e11] p-3 rounded-xl border border-[#2b2f36] font-mono text-xs text-rose-400 break-all">
                  0x4f8b92c10a4e7f82b192384a7bf892b10a4e7f82b192384a7bf892b10a4e7f82
                </div>
                <button onClick={() => setModal(null)} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  Close & Secure
                </button>
              </div>
            )}

            {modal === 'history' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold">Transaction History</h3>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  <div className="bg-[#0b0e11] p-3 rounded-xl border border-[#2b2f36] flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-emerald-400">Received ETH</p>
                      <p className="text-[10px] text-[#848e9c]">Today, 12:42 PM</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">+0.428 ETH</span>
                  </div>
                </div>
                <button onClick={() => setModal(null)} className="w-full bg-[#2b2f36] hover:bg-[#363c45] text-[#eaecef] font-bold py-3 rounded-xl text-sm transition-colors">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
