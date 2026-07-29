import { useState, useEffect } from 'react';
import { X, Copy, Check, ChevronDown, AlertTriangle, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { generateDepositAddress, DEPOSIT_COINS, NETWORK_LABELS, NETWORK_CONFIRMATIONS } from '@/lib/addressGenerator';

type Props = { userId: string; onClose: () => void };

const COIN_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', USDT: '#26a17b', BNB: '#f3ba2f', SOL: '#9945ff',
  XRP: '#346aa9', ADA: '#0033ad', AVAX: '#e84142', DOT: '#e6007a', TRX: '#ef0027',
  DOGE: '#c3a634', MATIC: '#8247e5', LINK: '#2a5ada', LTC: '#a6a9aa', ATOM: '#6f4e7c',
};

export default function DepositCryptoModal({ userId, onClose }: Props) {
  const [selectedCoin, setSelectedCoin] = useState(DEPOSIT_COINS[0]);
  const [selectedNetwork, setSelectedNetwork] = useState(DEPOSIT_COINS[0].networks[0]);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCoinPicker, setShowCoinPicker] = useState(false);
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);

  useEffect(() => {
    setSelectedNetwork(selectedCoin.networks[0]);
  }, [selectedCoin]);

  useEffect(() => {
    loadAddress();
  }, [selectedCoin, selectedNetwork]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAddress = async () => {
    setLoading(true);
    setAddress('');
    // Check DB first
    const { data } = await supabase
      .from('deposit_addresses')
      .select('address')
      .eq('user_id', userId)
      .eq('coin', selectedCoin.id)
      .eq('network', selectedNetwork)
      .maybeSingle();

    if (data?.address) {
      setAddress(data.address);
      setLoading(false);
      return;
    }

    // Generate new address and store it
    const newAddress = await generateDepositAddress(userId, selectedCoin.id, selectedNetwork);
    await supabase.from('deposit_addresses').upsert({
      user_id: userId, coin: selectedCoin.id, network: selectedNetwork, address: newAddress,
    }, { onConflict: 'user_id,coin,network' });
    setAddress(newAddress);
    setLoading(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const coinColor = COIN_COLORS[selectedCoin.id] || '#848e9c';

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col justify-end max-w-md mx-auto">
      <div className="bg-[#181a20] rounded-t-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-[#181a20] border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Deposit Crypto</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Coin selector */}
          <div>
            <p className="text-xs text-[#848e9c] mb-1.5">Coin</p>
            <button
              onClick={() => setShowCoinPicker(!showCoinPicker)}
              className="w-full flex items-center gap-3 bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 hover:border-[#474d57]"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black flex-shrink-0" style={{ background: coinColor }}>
                {selectedCoin.id.slice(0, 2)}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-[#eaecef]">{selectedCoin.id}</p>
                <p className="text-xs text-[#848e9c]">{selectedCoin.name}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#848e9c] transition-transform ${showCoinPicker ? 'rotate-180' : ''}`} />
            </button>
            {showCoinPicker && (
              <div className="mt-1 bg-[#0b0e11] border border-[#2b2f36] rounded-xl overflow-hidden">
                {DEPOSIT_COINS.map(coin => (
                  <button
                    key={coin.id}
                    onClick={() => { setSelectedCoin(coin); setShowCoinPicker(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1e2026] ${selectedCoin.id === coin.id ? 'bg-[#1e2026]' : ''}`}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                      style={{ background: COIN_COLORS[coin.id] || '#848e9c' }}>
                      {coin.id.slice(0, 2)}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-sm font-semibold text-[#eaecef]">{coin.id}</span>
                      <span className="text-xs text-[#848e9c] ml-2">{coin.name}</span>
                    </div>
                    {selectedCoin.id === coin.id && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Network selector */}
          <div>
            <p className="text-xs text-[#848e9c] mb-1.5">Network</p>
            <button
              onClick={() => setShowNetworkPicker(!showNetworkPicker)}
              className="w-full flex items-center justify-between bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 hover:border-[#474d57]"
            >
              <div>
                <p className="text-sm font-bold text-[#eaecef] text-left">{selectedNetwork}</p>
                <p className="text-xs text-[#848e9c] text-left">{NETWORK_LABELS[selectedNetwork]}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#848e9c] transition-transform ${showNetworkPicker ? 'rotate-180' : ''}`} />
            </button>
            {showNetworkPicker && (
              <div className="mt-1 bg-[#0b0e11] border border-[#2b2f36] rounded-xl overflow-hidden">
                {selectedCoin.networks.map(net => (
                  <button
                    key={net}
                    onClick={() => { setSelectedNetwork(net); setShowNetworkPicker(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[#1e2026] ${selectedNetwork === net ? 'bg-[#1e2026]' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#eaecef] text-left">{net}</p>
                      <p className="text-xs text-[#848e9c] text-left">{NETWORK_LABELS[net]}</p>
                    </div>
                    {selectedNetwork === net && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* QR Code + Address */}
          {loading ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <RefreshCw className="w-8 h-8 text-[#f0b90b] animate-spin" />
              <p className="text-sm text-[#848e9c]">Generating your deposit address...</p>
            </div>
          ) : address ? (
            <>
              {/* QR Code */}
              <div className="flex justify-center py-4">
                <div className="bg-white p-4 rounded-2xl">
                  <QRCodeSVG
                    value={address}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                </div>
              </div>

              {/* Address display */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-[#848e9c]">{selectedCoin.id} Deposit Address ({selectedNetwork})</p>
                  <button onClick={loadAddress} className="text-xs text-[#f0b90b]">Refresh</button>
                </div>
                <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4">
                  <p className="text-sm text-[#eaecef] font-mono break-all leading-relaxed">{address}</p>
                  <button
                    onClick={copyAddress}
                    className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#f0b90b]/10 text-[#f0b90b] hover:bg-[#f0b90b]/20'}`}
                  >
                    {copied ? <><Check className="w-4 h-4" /> Address Copied!</> : <><Copy className="w-4 h-4" /> Copy Address</>}
                  </button>
                </div>
              </div>

              {/* Network info */}
              <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#848e9c]">Min. Deposit</span>
                  <span className="text-[#eaecef] font-semibold">{selectedCoin.minDeposit} {selectedCoin.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#848e9c]">Deposit Fee</span>
                  <span className="text-emerald-400 font-semibold">Free</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#848e9c]">Arrival Time</span>
                  <span className="text-[#eaecef] font-semibold">{NETWORK_CONFIRMATIONS[selectedNetwork]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#848e9c]">Withdrawal Fee</span>
                  <span className="text-[#eaecef] font-semibold">0.5 USDT (flat)</span>
                </div>
              </div>

              {/* Warning */}
              <div className="flex gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-300 leading-relaxed">
                  <p className="font-bold mb-1">Important:</p>
                  <p>Only send <strong>{selectedCoin.id}</strong> on the <strong>{NETWORK_LABELS[selectedNetwork]}</strong> network to this address. Sending any other asset or using a different network will result in permanent loss of funds.</p>
                </div>
              </div>
            </>
          ) : null}
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}
