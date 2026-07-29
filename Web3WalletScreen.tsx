import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Wallet, Shield, Copy, Check, Eye, EyeOff, AlertTriangle,
  KeyRound, ArrowDownToLine, ArrowUpFromLine, X, Loader2,
  ChevronDown, RefreshCw, ExternalLink, Fingerprint, History,
  AlertCircle, ScanLine, CheckCircle2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, type Profile } from '@/lib/supabase';
import {
  generateNewMnemonic, validateMnemonicPhrase, encryptMnemonic, decryptMnemonic,
  saveWalletToStorage, getWalletFromStorage, clearWalletFromStorage,
  fetchBalances, sendWithFee, estimateGas,
  SUPPORTED_CHAINS, FEE_OPTIONS, validateAddress, shortenAddress,
  type WalletData, type WalletBalance, type SendResult,
} from '@/lib/wallet';
import BiometricConfirmModal from '@/components/modals/BiometricConfirmModal';

type Props = {
  userId: string;
  profile: Profile;
  onBack: () => void;
  onProfileUpdate: (updates: Partial<Profile>) => void;
};

type Stage = 'intro' | 'create' | 'verify' | 'import' | 'unlock' | 'wallet';
type Modal = null | 'receive' | 'send' | 'history' | 'swap' | 'dapp';

type TxHistory = {
  hash: string;
  to: string;
  amount: string;
  symbol: string;
  chainId: string;
  timestamp: string;
  type: 'send' | 'receive';
};

export default function Web3WalletScreen({ userId, onBack, onProfileUpdate }: Props) {
  const [stage, setStage] = useState<Stage>('intro');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [mnemonic, setMnemonic] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [verifyAnswers, setVerifyAnswers] = useState<string[]>(['', '', '']);
  const [verifyError, setVerifyError] = useState('');
  const [password, setPassword] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importError, setImportError] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [decryptedMnemonic, setDecryptedMnemonic] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedChain, setSelectedChain] = useState('1');
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState('');

  const [modal, setModal] = useState<Modal>(null);
  const [sendToAddress, setSendToAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendSymbol, setSendSymbol] = useState('');
  const [sendTokenAddress, setSendTokenAddress] = useState<string | undefined>(undefined);
  const [sendDecimals, setSendDecimals] = useState(18);
  const [selectedFee, setSelectedFee] = useState(0);
  const [gasEstimate, setGasEstimate] = useState<{ gasPrice: string; gasCost: string } | null>(null);
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [showBiometric, setShowBiometric] = useState(false);

  const [receiveSymbol, setReceiveSymbol] = useState('');
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [txHistory, setTxHistory] = useState<TxHistory[]>([]);
  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [scanMode, setScanMode] = useState(false);

  const loadTxHistory = useCallback(() => {
    const raw = localStorage.getItem(`ceo_tx_history_${userId}`);
    if (raw) {
      try { setTxHistory(JSON.parse(raw) as TxHistory[]); } catch { setTxHistory([]); }
    }
  }, [userId]);

  const saveTxHistory = (txs: TxHistory[]) => {
    localStorage.setItem(`ceo_tx_history_${userId}`, JSON.stringify(txs.slice(0, 50)));
    setTxHistory(txs);
  };

  useEffect(() => {
    const stored = getWalletFromStorage();
    if (stored) {
      setWalletData(stored);
      setStage('unlock');
    } else {
      setStage('intro');
    }
    loadTxHistory();
  }, [loadTxHistory]);

  const loadBalances = useCallback(async (address: string, chainId: string) => {
    setBalanceLoading(true);
    setBalanceError('');
    try {
      const bal = await fetchBalances(address, chainId);
      setBalance(bal);
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : 'Failed to load balances');
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (stage === 'wallet' && walletData) {
      loadBalances(walletData.address, selectedChain);
      onProfileUpdate({ web3_wallet_address: walletData.address });
    }
  }, [stage, walletData, selectedChain, loadBalances, onProfileUpdate]);

  useEffect(() => {
    if (modal === 'send' && sendToAddress) {
      estimateGas(sendToAddress, sendAmount || '0', selectedChain)
        .then(setGasEstimate).catch(() => setGasEstimate(null));
    }
  }, [modal, sendToAddress, sendAmount, selectedChain]);

  const startCreation = () => {
    const phrase = generateNewMnemonic(128);
    setMnemonic(phrase);
    setStage('create');
  };

  const proceedToVerify = () => {
    const words = mnemonic.split(' ');
    const indices = Array.from({ length: words.length }, (_, i) => i)
      .sort(() => Math.random() - 0.5).slice(0, 3).sort((a, b) => a - b);
    setVerifyIndices(indices);
    setVerifyAnswers(['', '', '']);
    setVerifyError('');
    setStage('verify');
  };

  const completeVerification = async () => {
    const words = mnemonic.split(' ');
    for (let i = 0; i < 3; i++) {
      const expected = words[verifyIndices[i]].toLowerCase();
      if (verifyAnswers[i].toLowerCase().trim() !== expected) {
        setVerifyError(`Word ${verifyIndices[i] + 1} is incorrect. Please check your seed phrase.`);
        return;
      }
    }
    if (!password || password.length < 8) {
      setVerifyError('Password must be at least 8 characters to encrypt your wallet.');
      return;
    }
    setLoading(true);
    try {
      const data = await encryptMnemonic(mnemonic, password);
      saveWalletToStorage(data);
      setWalletData(data);
      await supabase.from('profiles').update({ web3_wallet_address: data.address }).eq('user_id', userId);
      setMnemonic('');
      setPassword('');
      setStage('wallet');
    } catch {
      setVerifyError('Failed to encrypt wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImportError('');
    const trimmed = importMnemonic.trim();
    if (!validateMnemonicPhrase(trimmed)) {
      setImportError('Invalid recovery phrase. Check that all words are spelled correctly (12 or 24 words).');
      return;
    }
    if (!importPassword || importPassword.length < 8) {
      setImportError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await encryptMnemonic(trimmed, importPassword);
      saveWalletToStorage(data);
      setWalletData(data);
      await supabase.from('profiles').update({ web3_wallet_address: data.address }).eq('user_id', userId);
      setImportMnemonic('');
      setImportPassword('');
      setStage('wallet');
    } catch {
      setImportError('Failed to import wallet.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    setUnlockError('');
    if (!walletData) return;
    setLoading(true);
    try {
      const decrypted = await decryptMnemonic(walletData.encryptedMnemonic, unlockPassword);
      setDecryptedMnemonic(decrypted);
      setUnlockPassword('');
      setStage('wallet');
    } catch {
      setUnlockError('Incorrect password. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWallet = () => {
    clearWalletFromStorage();
    setWalletData(null);
    setDecryptedMnemonic('');
    setBalance(null);
    setStage('intro');
  };

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleSend = async () => {
    setSendError('');
    if (!validateAddress(sendToAddress, selectedChain)) {
      setSendError('Invalid recipient address for this network.');
      return;
    }
    if (!sendAmount || parseFloat(sendAmount) <= 0) {
      setSendError('Enter a valid amount.');
      return;
    }
    setShowBiometric(true);
  };

  const executeSend = async () => {
    if (!decryptedMnemonic) return;
    setSending(true);
    setSendError('');
    try {
      const result = await sendWithFee(
        decryptedMnemonic, sendToAddress, sendAmount, selectedChain,
        FEE_OPTIONS[selectedFee].multiplier, sendTokenAddress, sendTokenAddress ? sendDecimals : undefined,
      );
      setSendResult(result);
      const tx: TxHistory = {
        hash: result.txHash, to: sendToAddress, amount: sendAmount,
        symbol: sendSymbol, chainId: selectedChain,
        timestamp: new Date().toISOString(), type: 'send',
      };
      saveTxHistory([tx, ...txHistory]);
      setTimeout(() => {
        loadBalances(walletData!.address, selectedChain);
      }, 3000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setSending(false);
      setShowBiometric(false);
    }
  };

  const totalUsd = balance
    ? (balance.nativeBalanceUsd || 0) + balance.tokens.reduce((sum, t) => sum + (t.balanceUsd || 0), 0)
    : 0;

  const chain = SUPPORTED_CHAINS.find(c => c.id === selectedChain)!;
  const allAssets: Array<{ symbol: string; name: string; balance: string; balanceUsd: number | null; address: string | null; decimals: number }> = [
    { symbol: balance?.nativeSymbol || chain.symbol, name: chain.name, balance: balance?.nativeBalance || '0', balanceUsd: balance?.nativeBalanceUsd || null, address: null, decimals: chain.decimals },
    ...(balance?.tokens || []),
  ];

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#0b0e11] z-10">
        <button onClick={onBack}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-base font-bold">Web3 Wallet</h1>
        <button onClick={handleDeleteWallet} className="text-xs text-[#848e9c] hover:text-rose-400">Reset</button>
      </div>

      <div className="flex-1 px-4 pb-8">
        {/* INTRO */}
        {stage === 'intro' && (
          <div className="flex flex-col items-center pt-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#f0b90b] to-orange-600 flex items-center justify-center mb-6">
              <Wallet className="w-10 h-10 text-black" />
            </div>
            <h2 className="text-xl font-bold mb-2">Non-Custodial Web3 Wallet</h2>
            <p className="text-sm text-[#848e9c] text-center mb-8 max-w-xs">
              Create a self-custody wallet with a real 12-word BIP39 recovery phrase. You hold the keys — CEO Exchange never stores your seed phrase.
            </p>
            <div className="bg-[#1e2026] rounded-xl p-4 mb-6 max-w-xs">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#848e9c] leading-relaxed">
                  Your seed phrase is encrypted with AES-256-GCM on your device before storage. Your private key never leaves your browser.
                </p>
              </div>
            </div>
            <button onClick={startCreation} className="w-full max-w-xs bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl mb-3">
              Create New Wallet
            </button>
            <button onClick={() => setStage('import')} className="w-full max-w-xs bg-[#1e2026] border border-[#2b2f36] text-[#eaecef] font-bold py-3.5 rounded-xl">
              Import Wallet
            </button>
          </div>
        )}

        {/* CREATE */}
        {stage === 'create' && (
          <div className="pt-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-400 mb-1">Backup Your Seed Phrase</p>
                <p className="text-xs text-[#848e9c]">
                  Write down these 12 words in order. You'll be asked to verify them next. Never share this phrase with anyone.
                </p>
              </div>
            </div>
            <div className="bg-[#1e2026] rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold">Your 12-Word Seed Phrase</p>
                <button onClick={() => setShowSeed(!showSeed)} className="text-[#848e9c]">
                  {showSeed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {mnemonic.split(' ').map((word, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#0b0e11] rounded-lg px-3 py-2.5">
                    <span className="text-xs text-[#474d57] font-mono">{i + 1}.</span>
                    <span className={`text-sm font-mono ${showSeed ? 'text-[#eaecef]' : 'text-transparent bg-[#2b2f36] rounded'} select-all`}>
                      {showSeed ? word : '••••••'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => copyToClipboard(mnemonic, setCopied)} className="w-full flex items-center justify-center gap-2 bg-[#1e2026] border border-[#2b2f36] text-[#eaecef] py-3 rounded-xl text-sm font-semibold mb-4">
              {copied ? <><Check className="w-4 h-4 text-emerald-400" /> Copied</> : <><Copy className="w-4 h-4" /> Copy Phrase</>}
            </button>
            <div className="mb-4">
              <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Encryption Password (min 8 chars)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Encrypt your wallet locally" className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
            </div>
            <button onClick={proceedToVerify} disabled={!password || password.length < 8} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl">
              I've Saved It — Verify
            </button>
          </div>
        )}

        {/* VERIFY */}
        {stage === 'verify' && (
          <div className="pt-4">
            <div className="bg-[#1e2026] rounded-xl p-4 mb-4 flex gap-3">
              <KeyRound className="w-5 h-5 text-[#f0b90b] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#848e9c]">
                Enter word #{verifyIndices[0] + 1}, #{verifyIndices[1] + 1}, and #{verifyIndices[2] + 1} from your seed phrase to confirm your backup.
              </p>
            </div>
            <div className="space-y-4 mb-6">
              {verifyIndices.map((idx, i) => (
                <div key={idx}>
                  <p className="text-xs text-[#848e9c] mb-1.5">Word #{idx + 1}</p>
                  <input type="text" value={verifyAnswers[i]} onChange={e => {
                    const next = [...verifyAnswers]; next[i] = e.target.value; setVerifyAnswers(next);
                  }} placeholder={`Enter word ${idx + 1}`} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
                </div>
              ))}
            </div>
            {verifyError && <p className="text-xs text-rose-400 flex items-center gap-1 mb-4"><AlertTriangle className="w-3 h-3" /> {verifyError}</p>}
            <button onClick={completeVerification} disabled={loading || verifyAnswers.some(a => !a.trim())} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Encrypting...</> : 'Confirm & Enable Wallet'}
            </button>
            <button onClick={() => setStage('create')} className="w-full text-[#848e9c] text-sm py-2 mt-2">Back to Seed Phrase</button>
          </div>
        )}

        {/* IMPORT */}
        {stage === 'import' && (
          <div className="pt-4">
            <div className="bg-[#1e2026] rounded-xl p-4 mb-4">
              <KeyRound className="w-5 h-5 text-[#f0b90b] mb-2" />
              <p className="text-sm text-[#848e9c]">Enter your 12 or 24-word recovery phrase to import an existing wallet.</p>
            </div>
            <div className="mb-4">
              <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Recovery Phrase</label>
              <textarea value={importMnemonic} onChange={e => setImportMnemonic(e.target.value)} placeholder="Enter your 12 or 24 word recovery phrase" rows={4} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57] resize-none font-mono" />
            </div>
            <div className="mb-4">
              <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">New Encryption Password (min 8 chars)</label>
              <input type="password" value={importPassword} onChange={e => setImportPassword(e.target.value)} placeholder="Encrypt your wallet locally" className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
            </div>
            {importError && <p className="text-xs text-rose-400 flex items-center gap-1 mb-4"><AlertCircle className="w-3 h-3" /> {importError}</p>}
            <button onClick={handleImport} disabled={loading || !importMnemonic || !importPassword} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : 'Import Wallet'}
            </button>
            <button onClick={() => setStage('intro')} className="w-full text-[#848e9c] text-sm py-2 mt-2">Back</button>
          </div>
        )}

        {/* UNLOCK */}
        {stage === 'unlock' && walletData && (
          <div className="pt-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-[#f0b90b]/10 flex items-center justify-center mb-4">
              <Fingerprint className="w-8 h-8 text-[#f0b90b]" />
            </div>
            <h2 className="text-lg font-bold mb-1">Unlock Wallet</h2>
            <p className="text-sm text-[#848e9c] mb-6 text-center max-w-xs">{shortenAddress(walletData.address, 10)}</p>
            <div className="w-full max-w-xs">
              <input type="password" value={unlockPassword} onChange={e => setUnlockPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUnlock()} placeholder="Enter encryption password" className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57] mb-3" />
              {unlockError && <p className="text-xs text-rose-400 mb-3">{unlockError}</p>}
              <button onClick={handleUnlock} disabled={loading || !unlockPassword} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking...</> : 'Unlock'}
              </button>
              <button onClick={handleDeleteWallet} className="w-full text-[#848e9c] text-sm py-2 mt-2 hover:text-rose-400">Forgot password? Reset wallet</button>
            </div>
          </div>
        )}

        {/* WALLET MAIN */}
        {stage === 'wallet' && walletData && (
          <div className="pt-4">
            {/* Chain Selector */}
            <div className="relative mb-4">
              <button onClick={() => setShowChainDropdown(!showChainDropdown)} className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#f0b90b]/20 flex items-center justify-center text-xs font-bold text-[#f0b90b]">
                    {chain.symbol.slice(0, 2)}
                  </div>
                  <span className="text-sm font-bold">{chain.name}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#848e9c] transition-transform ${showChainDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showChainDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e2026] border border-[#2b2f36] rounded-xl overflow-hidden z-20">
                  {SUPPORTED_CHAINS.map(c => (
                    <button key={c.id} onClick={() => { setSelectedChain(c.id); setShowChainDropdown(false); }} className={`w-full px-4 py-3 flex items-center gap-2 hover:bg-[#0b0e11] ${c.id === selectedChain ? 'bg-[#f0b90b]/5' : ''}`}>
                      <div className="w-6 h-6 rounded-full bg-[#f0b90b]/20 flex items-center justify-center text-xs font-bold text-[#f0b90b]">{c.symbol.slice(0, 2)}</div>
                      <span className="text-sm">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-[#f0b90b] to-orange-600 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-black/70">Total Balance</p>
                <button onClick={() => loadBalances(walletData.address, selectedChain)} disabled={balanceLoading} className="text-black/70">
                  <RefreshCw className={`w-4 h-4 ${balanceLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-3xl font-black text-black mb-1">${totalUsd.toFixed(2)}</p>
              <p className="text-xs text-black/60 mb-4">{balance?.nativeBalance || '0.0'} {balance?.nativeSymbol || chain.symbol}</p>
              <div className="flex gap-2">
                <button onClick={() => { setReceiveSymbol(balance?.nativeSymbol || chain.symbol); setModal('receive'); }} className="flex-1 bg-black/20 text-black font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                  <ArrowDownToLine className="w-4 h-4" /> Receive
                </button>
                <button onClick={() => { setSendSymbol(balance?.nativeSymbol || chain.symbol); setSendTokenAddress(undefined); setSendDecimals(chain.decimals); setModal('send'); }} className="flex-1 bg-black text-[#f0b90b] font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                  <ArrowUpFromLine className="w-4 h-4" /> Send
                </button>
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-[#1e2026] rounded-xl p-4 mb-4">
              <p className="text-xs text-[#848e9c] mb-2">Wallet Address</p>
              <div className="flex items-center gap-2 bg-[#0b0e11] rounded-lg px-3 py-2.5 mb-3">
                <p className="flex-1 text-xs text-[#eaecef] font-mono break-all">{walletData.address}</p>
                <button onClick={() => copyToClipboard(walletData.address, setCopiedAddr)} className="flex-shrink-0">
                  {copiedAddr ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#848e9c]" />}
                </button>
              </div>
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG value={walletData.address} size={140} level="M" />
                </div>
              </div>
            </div>

            {/* Assets List */}
            <div className="bg-[#1e2026] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold">Assets on {chain.name}</p>
                <History className="w-4 h-4 text-[#848e9c]" />
              </div>
              {balanceError && <p className="text-xs text-rose-400 mb-2">{balanceError}</p>}
              {balanceLoading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 text-[#f0b90b] animate-spin" /></div>
              ) : allAssets.length === 0 ? (
                <p className="text-xs text-[#848e9c] text-center py-4">No assets found on this network.</p>
              ) : (
                <div className="space-y-2">
                  {allAssets.map((asset, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="w-9 h-9 rounded-full bg-[#f0b90b]/10 flex items-center justify-center text-xs font-bold text-[#f0b90b]">
                        {asset.symbol.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">{asset.symbol}</p>
                        <p className="text-xs text-[#848e9c]">{asset.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{parseFloat(asset.balance).toFixed(4)}</p>
                        {asset.balanceUsd !== null && <p className="text-xs text-[#848e9c]">${asset.balanceUsd.toFixed(2)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { icon: ArrowUpFromLine, label: 'Send', action: () => { setSendSymbol(balance?.nativeSymbol || chain.symbol); setSendTokenAddress(undefined); setSendDecimals(chain.decimals); setModal('send'); } },
                { icon: ArrowDownToLine, label: 'Receive', action: () => { setReceiveSymbol(balance?.nativeSymbol || chain.symbol); setModal('receive'); } },
                { icon: History, label: 'History', action: () => setModal('history') },
                { icon: ScanLine, label: 'Scan', action: () => setScanMode(true) },
              ].map((item, i) => (
                <button key={i} onClick={item.action} className="flex flex-col items-center gap-1.5 bg-[#1e2026] rounded-xl py-3 hover:bg-[#2b2f36] transition-colors">
                  <item.icon className="w-5 h-5 text-[#f0b90b]" />
                  <span className="text-xs text-[#848e9c]">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Security Badge */}
            <div className="bg-[#1e2026] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-bold text-emerald-400">Wallet Secured</p>
              </div>
              <p className="text-xs text-[#848e9c]">
                Your wallet is encrypted with AES-256-GCM on this device. Private keys never leave your browser. Biometric confirmation is required for all transactions.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* RECEIVE MODAL */}
      {modal === 'receive' && walletData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => setModal(null)}>
          <div className="w-full bg-[#181a20] rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Receive {receiveSymbol}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-2xl">
                  <QRCodeSVG value={walletData.address} size={180} level="M" />
                </div>
              </div>
              <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-3">
                <p className="text-xs text-[#848e9c] mb-1">Your {chain.name} Address</p>
                <p className="text-sm font-mono text-[#eaecef] break-all">{walletData.address}</p>
              </div>
              <button onClick={() => copyToClipboard(walletData.address, setCopiedAddr)} className="w-full bg-[#f0b90b] text-black font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                {copiedAddr ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Address</>}
              </button>
              <p className="text-xs text-[#474d57] text-center">Only send {chain.symbol} and {chain.name} tokens to this address. Sending other coins may result in permanent loss.</p>
            </div>
          </div>
        </div>
      )}

      {/* SEND MODAL */}
      {modal === 'send' && walletData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => { setModal(null); setSendResult(null); setSendError(''); }}>
          <div className="w-full bg-[#181a20] rounded-t-2xl p-5 pb-8 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Send {sendSymbol}</h3>
              <button onClick={() => { setModal(null); setSendResult(null); setSendError(''); }}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="space-y-4">
              {sendResult ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="font-bold text-lg">Transaction Sent</p>
                  <p className="text-xs text-[#848e9c] text-center break-all font-mono">{sendResult.txHash}</p>
                  <a href={sendResult.explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#f0b90b] hover:underline">
                    View on Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Recipient Address</label>
                    <div className="flex gap-2">
                      <input type="text" value={sendToAddress} onChange={e => setSendToAddress(e.target.value)} placeholder={`Enter ${chain.symbol} address`} className="flex-1 bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
                      <button onClick={() => setScanMode(true)} className="bg-[#1e2026] border border-[#2b2f36] rounded-xl px-3 flex items-center justify-center">
                        <ScanLine className="w-5 h-5 text-[#f0b90b]" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Amount ({sendSymbol})</label>
                    <input type="number" inputMode="decimal" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="0.00" className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
                  </div>
                  <div>
                    <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Network Fee</label>
                    <div className="grid grid-cols-3 gap-2">
                      {FEE_OPTIONS.map((fee, i) => (
                        <button key={i} onClick={() => setSelectedFee(i)} className={`py-2.5 rounded-lg text-xs font-bold ${selectedFee === i ? 'bg-[#f0b90b] text-black' : 'bg-[#0b0e11] text-[#848e9c] border border-[#2b2f36]'}`}>
                          <p>{fee.label}</p>
                          <p className="text-[10px] opacity-70 mt-0.5">{fee.description}</p>
                        </button>
                      ))}
                    </div>
                    {gasEstimate && (
                      <p className="text-xs text-[#474d57] mt-2">Est. gas: {parseFloat(gasEstimate.gasCost).toFixed(6)} {chain.symbol}</p>
                    )}
                  </div>
                  {sendError && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {sendError}</p>}
                  <button onClick={handleSend} disabled={sending || !sendToAddress || !sendAmount} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2">
                    {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Fingerprint className="w-4 h-4" /> Confirm with Biometric</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {modal === 'history' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => setModal(null)}>
          <div className="w-full bg-[#181a20] rounded-t-2xl p-5 pb-8 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Transaction History</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            {txHistory.length === 0 ? (
              <p className="text-sm text-[#848e9c] text-center py-8">No transactions yet.</p>
            ) : (
              <div className="space-y-3">
                {txHistory.map((tx, i) => {
                  const txChain = SUPPORTED_CHAINS.find(c => c.id === tx.chainId);
                  return (
                    <div key={i} className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {tx.type === 'send' ? <ArrowUpFromLine className="w-4 h-4 text-rose-400" /> : <ArrowDownToLine className="w-4 h-4 text-emerald-400" />}
                          <span className="text-sm font-bold capitalize">{tx.type}</span>
                        </div>
                        <span className="text-xs text-[#848e9c]">{new Date(tx.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-[#eaecef]">{tx.amount} {tx.symbol}</p>
                      <p className="text-xs text-[#474d57] font-mono break-all">To: {tx.to}</p>
                      {txChain && (
                        <a href={`${txChain.explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#f0b90b] hover:underline flex items-center gap-1 mt-1">
                          View on Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR SCANNER OVERLAY */}
      {scanMode && (
        <div className="fixed inset-0 bg-black z-[70] flex flex-col items-center justify-center max-w-md mx-auto">
          <div className="absolute top-4 right-4">
            <button onClick={() => setScanMode(false)}><X className="w-6 h-6 text-white" /></button>
          </div>
          <div className="w-64 h-64 border-2 border-[#f0b90b] rounded-2xl relative overflow-hidden mb-4">
            <div className="absolute inset-0 bg-[#0b0e11] flex items-center justify-center">
              <ScanLine className="w-16 h-16 text-[#f0b90b]/30" />
            </div>
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#f0b90b] animate-pulse" />
          </div>
          <p className="text-sm text-[#848e9c] text-center max-w-xs">Camera-based QR scanning requires device permission. Paste the address manually or use your device camera app to scan.</p>
          <div className="w-full max-w-xs mt-4">
            <input type="text" value={sendToAddress} onChange={e => setSendToAddress(e.target.value)} placeholder="Paste scanned address" className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
            <button onClick={() => { setScanMode(false); setModal('send'); }} className="w-full bg-[#f0b90b] text-black font-bold py-3 rounded-xl text-sm mt-2">Use Address</button>
          </div>
        </div>
      )}

      {/* BIOMETRIC CONFIRMATION */}
      <BiometricConfirmModal
        open={showBiometric}
        title="Confirm Transaction"
        description={`Send ${sendAmount} ${sendSymbol} to ${shortenAddress(sendToAddress)}? Biometric confirmation required.`}
        onConfirm={executeSend}
        onCancel={() => setShowBiometric(false)}
      />
    </div>
  );
}
