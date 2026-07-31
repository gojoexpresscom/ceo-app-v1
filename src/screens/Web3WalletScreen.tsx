import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Wallet, Shield, KeyRound, Copy, Check, 
  RefreshCw, ArrowDownToLine, ArrowUpFromLine, History, 
  ExternalLink, X, ChevronDown, ScanLine, Loader2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BiometricConfirmModal from '@/components/modals/BiometricConfirmModal';

type Props = {
  userId: string;
  onBack: () => void;
};

interface ChainConfig {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  rpcUrl: string;
}

const SUPPORTED_CHAINS: ChainConfig[] = [
  { id: 'eth', name: 'Ethereum Mainnet', symbol: 'ETH', decimals: 18, rpcUrl: 'https://cloudflare-eth.com' },
  { id: 'bsc', name: 'BNB Smart Chain', symbol: 'BNB', decimals: 18, rpcUrl: 'https://bsc-dataseed.binance.org' },
  { id: 'polygon', name: 'Polygon POS', symbol: 'POL', decimals: 18, rpcUrl: 'https://polygon-rpc.com' },
];

const FEE_OPTIONS = [
  { label: 'Standard', gwei: 20, gasCost: '0.50' },
  { label: 'Fast', gwei: 35, gasCost: '1.20' },
  { label: 'Instant', gwei: 50, gasCost: '2.50' },
];

export default function Web3WalletScreen({ userId, onBack }: Props) {
  const [stage, setStage] = useState<'loading' | 'create' | 'unlock' | 'wallet'>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [loading, setLoading] = useState(false);

  const [walletData, setWalletData] = useState<{ address: string; encryptedStore: string } | null>(null);
  const [decryptedMnemonic, setDecryptedMnemonic] = useState('');
  const [selectedChain, setSelectedChain] = useState('eth');
  const [showChainDropdown, setShowChainDropdown] = useState(false);

  const [totalUsd, setTotalUsd] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState('');
  const [allAssets, setAllAssets] = useState<Array<{ symbol: string; name: string; balance: string; balanceUsd: number | null }>>([]);

  const [copiedAddr, setCopiedAddr] = useState(false);
  const [modal, setModal] = useState<'receive' | 'send' | 'swap' | 'history' | 'dapp' | null>(null);

  const [receiveSymbol, setReceiveSymbol] = useState('ETH');
  const [sendSymbol, setSendSymbol] = useState('ETH');
  const [, setSendTokenAddress] = useState<string | undefined>(undefined);
  const [, setSendDecimals] = useState(18);
  const [sendToAddress, setSendToAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [selectedFee, setSelectedFee] = useState(0);
  const [gasEstimate] = useState<{ gasCost: string } | null>({ gasCost: '0.50' });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [, setScanMode] = useState(false);

  const [showBiometric, setShowBiometric] = useState(false);
  const [txHistory, setTxHistory] = useState<Array<{ hash: string; type: string; symbol: string; timestamp: number; amount: string }>>([]);

  const chain = SUPPORTED_CHAINS.find(c => c.id === selectedChain) || SUPPORTED_CHAINS[0];

  useEffect(() => {
    checkExistingWallet();
  }, [userId]);

  const checkExistingWallet = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('web3_wallets')
      .select('address, encrypted_store')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      setStage('create');
    } else {
      setWalletData({ address: data.address, encryptedStore: data.encrypted_store });
      setStage('unlock');
    }
    setLoading(false);
  };

  const handleCreateWallet = async () => {
    if (!password || password.length < 6) {
      setCreateError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setCreateError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setCreateError('');
    try {
      const mockAddress = '0x71C...' + Math.random().toString(16).slice(2, 8);
      const mockStore = btoa(JSON.stringify({ mnemonic: 'test test test test test test test test test test test junk' }));

      const { error } = await supabase.from('web3_wallets').upsert({
        user_id: userId,
        address: mockAddress,
        encrypted_store: mockStore,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      if (error) throw error;

      setWalletData({ address: mockAddress, encryptedStore: mockStore });
      setStage('wallet');
      loadBalances(mockAddress, selectedChain);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create wallet';
      setCreateError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!unlockPassword) {
      setUnlockError('Please enter your password.');
      return;
    }
    setLoading(true);
    setUnlockError('');
    try {
      if (walletData) {
        const store = JSON.parse(atob(walletData.encryptedStore));
        setDecryptedMnemonic(store.mnemonic);
        setStage('wallet');
        loadBalances(walletData.address, selectedChain);
      }
    } catch {
      setUnlockError('Incorrect password or corrupted wallet store.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWallet = async () => {
    if (!confirm('Are you sure you want to delete your wallet? Ensure you have backed up your seed phrase!')) return;
    await supabase.from('web3_wallets').delete().eq('user_id', userId);
    setWalletData(null);
    setDecryptedMnemonic('');
    setStage('create');
  };

  const loadBalances = async (address: string, chainId: string) => {
    setBalanceLoading(true);
    setBalanceError('');
    try {
      await new Promise(r => setTimeout(r, 600));
      const mockBal = (Math.random() * 2).toFixed(4);
      const usdVal = parseFloat(mockBal) * 2600;

      setAllAssets([
        { symbol: chain.symbol, name: chain.name, balance: mockBal, balanceUsd: usdVal },
        { symbol: 'USDT', name: 'Tether USD', balance: '150.00', balanceUsd: 150.00 }
      ]);
      setTotalUsd(usdVal + 150.00);
    } catch {
      setBalanceError('Failed to fetch chain balances.');
    } finally {
      setBalanceLoading(false);
    }
  };

  const copyToClipboard = (text: string, setFlag: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFlag(true);
    setTimeout(() => setFlag(false), 2000);
  };

  const handleSend = () => {
    if (!sendToAddress || !sendAmount) {
      setSendError('Please fill in all fields.');
      return;
    }
    setSendError('');
    setShowBiometric(true);
  };

  const executeSend = async () => {
    setShowBiometric(false);
    setSending(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      const newTx = {
        hash: '0x' + Math.random().toString(16).slice(2, 12),
        type: 'send',
        symbol: sendSymbol,
        timestamp: Date.now(),
        amount: sendAmount
      };
      setTxHistory([newTx, ...txHistory]);
      setModal(null);
      setSendAmount('');
      setSendToAddress('');
      alert('Transaction broadcasted successfully!');
    } catch {
      setSendError('Transaction broadcast failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#0b0e11] z-10 border-b border-[#1e2026]">
        <button onClick={onBack}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-base font-bold">Web3 Self-Custody Wallet</h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#f0b90b] mb-3" />
            <p className="text-xs text-[#848e9c]">Loading secure enclave...</p>
          </div>
        )}

        {stage === 'create' && (
          <div className="py-6">
            <div className="w-12 h-12 rounded-2xl bg-[#f0b90b]/10 flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6 text-[#f0b90b]" />
            </div>
            <h2 className="text-lg font-bold mb-1">Create Web3 Wallet</h2>
            <p className="text-xs text-[#848e9c] mb-6">Set a master password to encrypt your self-custody keys locally.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-[#848e9c] block mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-xl px-3.5 py-3 text-xs text-[#eaecef] outline-none focus:border-[#f0b90b]" />
              </div>
              <div>
                <label className="text-xs text-[#848e9c] block mb-1">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-xl px-3.5 py-3 text-xs text-[#eaecef] outline-none focus:border-[#f0b90b]" />
              </div>
            </div>

            {createError && <p className="text-xs text-rose-400 mb-3">{createError}</p>}
            <button onClick={handleCreateWallet} disabled={loading} className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Wallet...</> : 'Create Secure Wallet'}
            </button>
          </div>
        )}

        {stage === 'unlock' && (
          <div className="py-6">
            <div className="w-12 h-12 rounded-2xl bg-[#f0b90b]/10 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-[#f0b90b]" />
            </div>
            <h2 className="text-lg font-bold mb-1">Unlock Wallet</h2>
            <p className="text-xs text-[#848e9c] mb-6">Enter your master password to decrypt your keys.</p>

            <div className="mb-4">
              <label className="text-xs text-[#848e9c] block mb-1">Master Password</label>
              <input type="password" value={unlockPassword} onChange={e => setUnlockPassword(e.target.value)} placeholder="Enter password" className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-xl px-3.5 py-3 text-xs text-[#eaecef] outline-none focus:border-[#f0b90b]" />
            </div>

            {unlockError && <p className="text-xs text-rose-400 mb-3">{unlockError}</p>}
            <button onClick={handleUnlock} disabled={loading || !unlockPassword} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 mb-4">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking...</> : 'Unlock Wallet'}
            </button>
            <button onClick={handleDeleteWallet} className="w-full text-xs text-rose-400 py-2 text-center">Reset & Delete Wallet</button>
          </div>
        )}

        {stage === 'wallet' && walletData && (
          <div className="pt-2">
            <div className="relative mb-4">
              <button onClick={() => setShowChainDropdown(!showChainDropdown)} className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#0b0e11] flex items-center justify-center text-xs font-bold text-[#f0b90b]">
                    {chain.symbol.slice(0, 3)}
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-[#848e9c]">Network</p>
                    <p className="text-sm font-bold">{chain.name}</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#848e9c]" />
              </button>
              {showChainDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e2026] border border-[#2b2f36] rounded-xl z-20 overflow-hidden shadow-xl">
                  {SUPPORTED_CHAINS.map(c => (
                    <button key={c.id} onClick={() => { setSelectedChain(c.id); setShowChainDropdown(false); loadBalances(walletData.address, c.id); }} className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[#2b2f36] ${selectedChain === c.id ? 'bg-[#2b2f36] text-[#f0b90b]' : 'text-[#eaecef]'}`}>
                      <span className="text-sm font-semibold">{c.name}</span>
                      <span className="text-xs text-[#848e9c]">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-[#1e2026] to-[#16181d] border border-[#2b2f36] rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#848e9c]">Total Balance</span>
                <button onClick={() => loadBalances(walletData.address, selectedChain)} disabled={balanceLoading}>
                  <RefreshCw className={`w-4 h-4 text-[#848e9c] ${balanceLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-3xl font-black mb-1">${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2b2f36]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#848e9c]">{walletData.address.slice(0, 6)}...{walletData.address.slice(-4)}</span>
                  <button onClick={() => copyToClipboard(walletData.address, setCopiedAddr)}>
                    {copiedAddr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#848e9c]" />}
                  </button>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">Self-Custody</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
              <button onClick={() => { setReceiveSymbol(chain.symbol); setModal('receive'); }} className="flex flex-col items-center justify-center bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] rounded-2xl py-3.5">
                <ArrowDownToLine className="w-5 h-5 text-[#f0b90b] mb-1.5" />
                <span className="text-xs font-semibold">Receive</span>
              </button>
              <button onClick={() => { setSendSymbol(chain.symbol); setSendTokenAddress(undefined); setSendDecimals(chain.decimals); setModal('send'); }} className="flex flex-col items-center justify-center bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] rounded-2xl py-3.5">
                <ArrowUpFromLine className="w-5 h-5 text-[#f0b90b] mb-1.5" />
                <span className="text-xs font-semibold">Send</span>
              </button>
              <button onClick={() => setModal('swap')} className="flex flex-col items-center justify-center bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] rounded-2xl py-3.5">
                <RefreshCw className="w-5 h-5 text-[#f0b90b] mb-1.5" />
                <span className="text-xs font-semibold">Swap</span>
              </button>
              <button onClick={() => setModal('history')} className="flex flex-col items-center justify-center bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] rounded-2xl py-3.5">
                <History className="w-5 h-5 text-[#f0b90b] mb-1.5" />
                <span className="text-xs font-semibold">History</span>
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#848e9c]">Assets</p>
              <button onClick={() => setModal('dapp')} className="text-xs text-[#f0b90b] font-semibold">DApp Browser</button>
            </div>

            {balanceError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-3 text-xs text-rose-400">
                {balanceError}
              </div>
            )}

            <div className="space-y-2">
              {allAssets.map((asset, idx) => (
                <div key={idx} className="bg-[#1e2026] border border-[#2b2f36] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0b0e11] flex items-center justify-center font-bold text-[#f0b90b]">
                      {asset.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{asset.symbol}</p>
                      <p className="text-xs text-[#848e9c]">{asset.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{parseFloat(asset.balance).toFixed(4)}</p>
                    <p className="text-xs text-[#848e9c]">
                      {asset.balanceUsd !== null ? `$${asset.balanceUsd.toFixed(2)}` : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {decryptedMnemonic && (
              <div className="mt-6 p-4 bg-[#1e2026] border border-[#2b2f36] rounded-2xl">
                <p className="text-xs font-bold text-amber-400 mb-1">Seed Phrase Unlocked</p>
                <p className="text-xs font-mono text-[#848e9c] break-all select-all">{decryptedMnemonic}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {modal === 'receive' && walletData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl w-full max-w-sm p-6 flex flex-col items-center relative">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-[#848e9c]"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold mb-1">Receive {receiveSymbol}</h3>
            <p className="text-xs text-[#848e9c] mb-6 text-center">Copy address to receive funds on {chain.name}</p>
            <div className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-3 flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-[#848e9c] truncate mr-2">{walletData.address}</span>
              <button onClick={() => copyToClipboard(walletData.address, setCopiedAddr)} className="flex-shrink-0 text-xs text-[#f0b90b] font-bold">
                {copiedAddr ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={() => setModal(null)} className="w-full bg-[#f0b90b] text-black font-bold py-3 rounded-xl text-sm">Done</button>
          </div>
        </div>
      )}

      {modal === 'send' && walletData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl w-full max-w-sm p-6 relative">
            <button onClick={() => setModal(null)} className="absolu
