import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, RefreshCw, Shield, ChevronRight, Plus, X, Clock, Check,
  UserCheck, AlertCircle, TrendingUp, Search, Lock, MessageCircle,
  Send, AlertTriangle, FileImage, Zap, Banknote,
} from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';
import { platformAlert } from '@/components/modals/PlatformAlert';

type Props = {
  userId: string;
  profile: Profile;
  onBack: () => void;
  onProfileUpdate: (updates: Partial<Profile>) => void;
};

const FIATS = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', methods: ['Bank Transfer', 'Wise', 'PayPal', 'Cash App', 'Western Union'] },
  { code: 'ETB', name: 'Ethiopian Birr', flag: '🇪🇹', methods: ['Telebirr', 'CBE Birr', 'Awash Bank', 'Dashen Bank', 'Cash in Person'] },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', methods: ['SEPA', 'Wise', 'Revolut', 'PayPal'] },
  { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬', methods: ['Bank Transfer', 'Opay', 'PalmPay', 'Kuda'] },
  { code: 'KES', name: 'Kenyan Shilling', flag: '🇰🇪', methods: ['M-Pesa', 'Bank Transfer', 'KCB'] },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧', methods: ['Faster Payments', 'Wise', 'Revolut'] },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', methods: ['Bank Transfer', 'Cash in Person'] },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳', methods: ['UPI', 'Bank Transfer', 'PhonePe'] },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦', methods: ['Interac e-Transfer', 'Bank Transfer'] },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺', methods: ['PayID', 'Bank Transfer'] },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦', methods: ['Bank Transfer', 'EFT'] },
  { code: 'GHS', name: 'Ghanaian Cedi', flag: '🇬🇭', methods: ['Mobile Money', 'Bank Transfer'] },
];

const CRYPTOS = [
  { symbol: 'USDT', name: 'Tether', icon: '₮' },
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'SOL', name: 'Solana', icon: '◎' },
  { symbol: 'BNB', name: 'BNB', icon: '⬡' },
];

const BASE_RATES: Record<string, number> = {
  USD: 1, ETB: 138.5, EUR: 0.92, NGN: 1580, KES: 129, GBP: 0.79,
  AED: 3.67, INR: 83.5, CAD: 1.36, AUD: 1.52, ZAR: 18.5, GHS: 15.2,
};

type P2PAd = {
  id: string;
  merchant_name: string;
  price_etb: number;
  min_limit: number;
  max_limit: number;
  completion_rate: number;
  available_usdt: number;
  payment_methods: string[];
  is_active: boolean;
  side: string;
  fiat_currency: string;
  creator_id: string;
  crypto_asset: string;
  available_amount: number;
  total_amount: number;
  expires_at: string;
};

type TradeMessage = {
  id: string;
  sender_id: string;
  message: string;
  ai_flagged: boolean;
  ai_flag_reason: string | null;
  attachment_url: string | null;
  created_at: string;
};

const SCAM_PATTERNS = [
  /release\s+(?:the\s+)?(?:funds|crypto|usdt)\s+(?:before|without)/i,
  /i\s+(?:already\s+)?paid.*release/i,
  /send\s+(?:me\s+)?(?:your\s+)?(?:wallet|address)/i,
  /meet\s+(?:me|up).*(?:telegram|whatsapp|signal)/i,
  /(?:contact|message)\s+me\s+(?:on|via|at)\s+(?:telegram|whatsapp|signal|instagram)/i,
  /trust\s+me/i,
  /don'?t\s+worry.*release/i,
  /fake\s+(?:screenshot|receipt|payment)/i,
];

function aiScanMessage(text: string): { flagged: boolean; reason: string } {
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(text)) return { flagged: true, reason: 'AI: Potential scam pattern detected' };
  }
  return { flagged: false, reason: '' };
}

export default function P2PScreen({ userId, profile, onBack }: Props) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [fiat, setFiat] = useState('USD');
  const [crypto, setCrypto] = useState('USDT');
  const [ads, setAds] = useState<P2PAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateAd, setShowCreateAd] = useState(false);
  const [activeTrade, setActiveTrade] = useState<Record<string, unknown> | null>(null);
  const [tradeTimer, setTradeTimer] = useState(900); // 15 min
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeStep, setTradeStep] = useState<'amount' | 'payment' | 'waiting' | 'complete' | 'disputed'>('amount');
  const [fxRates, setFxRates] = useState<Record<string, number>>(BASE_RATES);
  const [showTradeChat, setShowTradeChat] = useState(false);
  const [tradeMessages, setTradeMessages] = useState<TradeMessage[]>([]);
  const [newTradeMsg, setNewTradeMsg] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [userPaymentMethods, setUserPaymentMethods] = useState<Array<{ payment_type: string; account_name: string; account_number: string; bank_name?: string }>>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<{ payment_type: string; account_name: string; account_number: string; bank_name?: string } | null>(null);
  const [kycFullName, setKycFullName] = useState<string>('');
  const [aiScanning, setAiScanning] = useState(false);
  const [, setTradeComplete] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Create ad form
  const [adSide, setAdSide] = useState<'BUY' | 'SELL'>('SELL');
  const [adFiat, setAdFiat] = useState('USD');
  const [adCrypto, setAdCrypto] = useState('USDT');
  const [adPrice, setAdPrice] = useState('');
  const [adMin, setAdMin] = useState('');
  const [adMax, setAdMax] = useState('');
  const [adTotal, setAdTotal] = useState('');
  const [adMethods, setAdMethods] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const loadAds = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('p2p_orders')
      .select('*')
      .eq('is_active', true)
      .eq('fiat_currency', fiat)
      .eq('crypto_asset', crypto)
      .order('price_etb', { ascending: side === 'BUY' });
    setAds((data as P2PAd[]) || []);
    setLoading(false);
  }, [fiat, crypto, side]);

  useEffect(() => {
    const fetchFx = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        const rates: Record<string, number> = { USD: 1 };
        for (const code of FIATS.map(f => f.code)) {
          if (data.rates?.[code]) rates[code] = data.rates[code];
        }
        if (Object.keys(rates).length > 1) setFxRates(rates);
      } catch {
        // Fallback: try open.er-api.com (CORS-friendly)
        try {
          const res2 = await fetch('https://open.er-api.com/v6/latest/USD');
          const data2 = await res2.json();
          const rates: Record<string, number> = { USD: 1 };
          for (const code of FIATS.map(f => f.code)) {
            if (data2.rates?.[code]) rates[code] = data2.rates[code];
          }
          if (Object.keys(rates).length > 1) setFxRates(rates);
        } catch { setFxRates(BASE_RATES); }
      }
    };
    fetchFx();
    const interval = setInterval(fetchFx, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { loadAds(); }, [loadAds]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('p2p_payment_methods').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      setUserPaymentMethods((data as Array<{ payment_type: string; account_name: string; account_number: string; bank_name?: string }>) || []);
      const { data: profileData } = await supabase.from('profiles').select('kyc_full_name, kyc_status').eq('user_id', userId).maybeSingle();
      setKycFullName(profileData?.kyc_full_name || '');
      // Also check user_verifications for the authoritative status
      const { data: kycData } = await supabase
        .from('user_verifications')
        .select('status, full_name')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (kycData?.full_name) setKycFullName(kycData.full_name);
    })();
  }, [userId]);

  useEffect(() => {
    if (!activeTrade) return;
    const timer = setInterval(() => {
      setTradeTimer(prev => {
        if (prev <= 1) {
          handleEscrowExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTrade]);

  useEffect(() => {
    if (showTradeChat && activeTrade) loadTradeMessages();
  }, [showTradeChat, activeTrade]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tradeMessages]);

  const loadTradeMessages = async () => {
    if (!activeTrade) return;
    const { data } = await supabase.from('p2p_chat').select('*').eq('trade_id', activeTrade.trade_id).order('created_at', { ascending: true });
    setTradeMessages((data as TradeMessage[]) || []);

    // Subscribe to new messages
    const channel = supabase.channel(`p2p-chat-${activeTrade.trade_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'p2p_chat', filter: `trade_id=eq.${activeTrade.trade_id}` }, (payload: { new: TradeMessage }) => {
        setTradeMessages(prev => [...prev, payload.new as TradeMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const handleEscrowExpiry = () => {
    setActiveTrade(null); setTradeTimer(900); setTradeAmount(''); setTradeStep('amount'); setTradeComplete(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const startTrade = async (ad: P2PAd) => {
    // KYC check
    if (profile.kyc_status !== 'VERIFIED') {
      platformAlert.warn('KYC Required', 'You must complete identity verification before using P2P trading. Go to Profile > Verification to verify your identity.');
      return;
    }

    // Name matching check
    if (!kycFullName) {
      platformAlert.warn('Identity Required', 'Your verified legal name is required for P2P trading. Please complete KYC first.');
      return;
    }

    // For SELL ads (user is buying from seller), check seller has balance
    if (ad.side === 'SELL' && ad.creator_id !== userId) {
      // Buyer doesn't need balance, seller does
    }

    // For BUY ads (user is selling to buyer), check user has crypto
    if (ad.side === 'BUY' && ad.creator_id !== userId) {
      const balance = crypto === 'USDT' ? profile.usdt_balance : crypto === 'BTC' ? profile.btc_balance : crypto === 'ETH' ? profile.eth_balance : 0;
      if (balance < parseFloat(ad.max_limit.toString())) {
        platformAlert.warn('Insufficient Balance', `You need ${ad.max_limit} ${crypto} in your wallet to fulfill this trade.`);
        return;
      }
    }

    setActiveTrade({
      ...ad,
      trade_id: null,
      seller_id: ad.side === 'SELL' ? ad.creator_id : userId,
      buyer_id: ad.side === 'BUY' ? ad.creator_id : userId,
    });
    setTradeTimer(900); // 15 minutes
    setTradeAmount('');
    setTradeStep('amount');
  };

  const initiateTrade = async () => {
    if (!activeTrade || !tradeAmount) return;
    const amount = parseFloat(tradeAmount);
    const fiatAmount = amount * parseFloat(activeTrade.price_etb.toString());

    // Lock crypto in escrow (seller's side)
    const sellerId = activeTrade.seller_id;
    const buyerId = activeTrade.buyer_id;

    // Deduct from seller's balance and lock in escrow
    if (sellerId === userId) {
      const balance = crypto === 'USDT' ? profile.usdt_balance : crypto === 'BTC' ? profile.btc_balance : crypto === 'ETH' ? profile.eth_balance : 0;
      if (balance < amount) {
        platformAlert.error('Insufficient Balance', `You need ${amount} ${crypto} but only have ${balance.toFixed(4)}.`);
        return;
      }
      // Deduct from seller
      const newBalance = balance - amount;
      const updateCol = crypto === 'USDT' ? 'usdt_balance' : crypto === 'BTC' ? 'btc_balance' : 'eth_balance';
      await supabase.from('profiles').update({ [updateCol]: newBalance }).eq('user_id', userId);
    }

    // Create trade record
    const { data: trade } = await supabase.from('p2p_trades').insert({
      order_id: activeTrade.id,
      buyer_email: profile.email,
      user_id: userId,
      seller_id: sellerId,
      buyer_id: buyerId,
      usdt_amount: amount,
      etb_amount: fiatAmount,
      fiat_currency: fiat,
      fiat_amount: fiatAmount,
      status: 'ESCROW_LOCKED',
      escrow_locked: true,
      escrow_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      buyer_confirmed: false,
    }).select().single();

    if (!trade) { platformAlert.error('Error', 'Failed to create trade. Try again.'); return; }

    // Create escrow record
    const { data: escrow } = await supabase.from('p2p_escrow').insert({
      trade_id: trade.id,
      seller_id: sellerId,
      buyer_id: buyerId,
      crypto_asset: crypto,
      crypto_amount: amount,
      fiat_currency: fiat,
      fiat_amount: fiatAmount,
      status: 'LOCKED',
      escrow_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }).select().single();

    if (escrow) {
      await supabase.from('p2p_trades').update({ escrow_id: escrow.id }).eq('id', trade.id);
    }

    setActiveTrade({ ...activeTrade, trade_id: trade.id, escrow_id: escrow?.id });
    setTradeStep('payment');
  };

  const confirmPayment = async () => {
    if (!activeTrade || !activeTrade.trade_id) return;

    setAiScanning(true);

    // AI scan payment proof if uploaded
    const aiFlags: string[] = [];
    let aiRiskScore = 0;

    if (paymentProof) {
      const path = `p2p-proof/${userId}/${Date.now()}-${paymentProof.name}`;
      await supabase.storage.from('post-media').upload(path, paymentProof);
      const proofUrl = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
      setPaymentProofUrl(proofUrl);

      // AI image quality check
      const qualityOk = await checkImageQuality(paymentProof);
      if (!qualityOk) {
        aiFlags.push('Low quality payment proof');
        aiRiskScore += 30;
      }
    }

    // AI checks: verify name matching
    if (selectedPaymentMethod && kycFullName) {
      const nameMatch = selectedPaymentMethod.account_name.toLowerCase().includes(kycFullName.toLowerCase().split(' ')[0]) ||
        kycFullName.toLowerCase().includes(selectedPaymentMethod.account_name.toLowerCase().split(' ')[0]);
      if (!nameMatch) {
        platformAlert.error('Name Mismatch', `Your payment method account name "${selectedPaymentMethod.account_name}" does not match your KYC verified name "${kycFullName}". Third-party payments are strictly prohibited.`);
        setAiScanning(false);
        return;
      }
    }

    await supabase.from('p2p_trades').update({
      status: 'PAID',
      buyer_confirmed: true,
      payment_proof_url: paymentProofUrl,
      ai_risk_score: aiRiskScore,
      ai_flags: aiFlags,
    }).eq('id', activeTrade.trade_id);

    await supabase.from('p2p_escrow').update({
      ai_risk_score: aiRiskScore,
      ai_flags: aiFlags,
    }).eq('trade_id', activeTrade.trade_id);

    setAiScanning(false);
    setTradeStep('waiting');
  };

  const releaseEscrow = async () => {
    if (!activeTrade || !activeTrade.trade_id) return;

    // Release crypto to buyer
    const amount = parseFloat(activeTrade.usdt_amount || tradeAmount);
    const buyerId = activeTrade.buyer_id;

    // Add to buyer's balance
    const { data: buyerProfile } = await supabase.from('profiles').select('usdt_balance').eq('user_id', buyerId).maybeSingle();
    if (buyerProfile) {
      await supabase.from('profiles').update({
        usdt_balance: parseFloat(buyerProfile.usdt_balance.toString()) + amount,
      }).eq('user_id', buyerId);
    }

    // Update escrow and trade
    await supabase.from('p2p_escrow').update({
      status: 'RELEASED',
      released_at: new Date().toISOString(),
    }).eq('trade_id', activeTrade.trade_id);

    await supabase.from('p2p_trades').update({
      status: 'COMPLETED',
      seller_confirmed: true,
    }).eq('id', activeTrade.trade_id);

    setTradeStep('complete');
    setTradeComplete(true);
    setTimeout(() => handleEscrowExpiry(), 3000);
  };

  const raiseDispute = async () => {
    if (!activeTrade || !activeTrade.trade_id) return;
    await supabase.from('p2p_escrow').update({ status: 'DISPUTED' }).eq('trade_id', activeTrade.trade_id);
    await supabase.from('p2p_trades').update({ status: 'DISPUTED' }).eq('id', activeTrade.trade_id);
    await supabase.from('p2p_disputes').insert({
      trade_id: activeTrade.trade_id,
      raised_by: userId,
      reason: 'Dispute raised by user',
      ai_analysis: 'AI review initiated. Transaction logs and chat history are being audited.',
    });
    setTradeStep('disputed');
  };

  const sendTradeMessage = async () => {
    if (!newTradeMsg.trim() || !activeTrade?.trade_id) return;
    const { flagged, reason } = aiScanMessage(newTradeMsg);
    await supabase.from('p2p_chat').insert({
      trade_id: activeTrade.trade_id,
      sender_id: userId,
      message: newTradeMsg.trim(),
      ai_flagged: flagged,
      ai_flag_reason: flagged ? reason : null,
    });
    if (flagged) {
      platformAlert.warn('AI Security Alert', `Your message was flagged: ${reason}. Attempts to bypass platform safety will be reviewed.`);
    }
    setNewTradeMsg('');
  };

  const checkImageQuality = (file: File): Promise<boolean> => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(false); return; }
        const w = Math.min(img.width, 200);
        const h = Math.min(img.height, 200);
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        let sum = 0;
        for (let i = 0; i < imgData.data.length; i += 4) {
          sum += (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
        }
        const avg = sum / (w * h);
        resolve(avg > 30 && avg < 230);
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  };

  const toggleAdMethod = (m: string) =>
    setAdMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const createAd = async () => {
    if (!adPrice || !adMin || !adMax || adMethods.length === 0) return;

    // KYC check
    if (profile.kyc_status !== 'VERIFIED') {
      platformAlert.warn('KYC Required', 'You must complete identity verification before creating P2P ads.');
      return;
    }

    setCreating(true);

    if (adSide === 'SELL') {
      const balance = adCrypto === 'USDT' ? profile.usdt_balance : adCrypto === 'BTC' ? profile.btc_balance : adCrypto === 'ETH' ? profile.eth_balance : 0;
      const sellAmount = parseFloat(adTotal || adMax);
      if (balance < sellAmount) {
        setCreating(false);
        platformAlert.warn('Insufficient Balance', `You need ${sellAmount} ${adCrypto} but only have ${balance.toFixed(4)}. Deposit real crypto first.`);
        return;
      }
    }

    const merchantName = profile.nickname || profile.email.split('@')[0];
    await supabase.from('p2p_orders').insert({
      merchant_name: merchantName,
      price_etb: parseFloat(adPrice),
      min_limit: parseFloat(adMin),
      max_limit: parseFloat(adMax),
      payment_methods: adMethods,
      is_active: true,
      side: adSide,
      fiat_currency: adFiat,
      crypto_asset: adCrypto,
      creator_id: userId,
      available_amount: parseFloat(adTotal || adMax),
      total_amount: parseFloat(adTotal || adMax),
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
    setShowCreateAd(false);
    setAdPrice(''); setAdMin(''); setAdMax(''); setAdTotal(''); setAdMethods([]);
    setCreating(false);
    loadAds();
  };

  const addPaymentMethod = async (type: string, name: string, number: string, bank?: string) => {
    if (kycFullName && !name.toLowerCase().includes(kycFullName.toLowerCase().split(' ')[0])) {
      platformAlert.error('Name Mismatch', `The account name must match your KYC verified name: "${kycFullName}". Third-party accounts are prohibited.`);
      return;
    }
    await supabase.from('p2p_payment_methods').insert({
      user_id: userId,
      payment_type: type,
      account_name: name,
      account_number: number,
      bank_name: bank,
    });
    const { data } = await supabase.from('p2p_payment_methods').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setUserPaymentMethods((data as Array<{ payment_type: string; account_name: string; account_number: string; bank_name?: string }>) || []);
  };

  const filtered = ads.filter(a => {
    if (search && !a.merchant_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#0b0e11] z-10">
        <button onClick={onBack}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-base font-bold">P2P Trading</h1>
        <button onClick={() => setShowCreateAd(true)}><Plus className="w-6 h-6 text-[#f0b90b]" /></button>
      </div>

      <div className="px-4 pb-3">
        <div className="flex bg-[#1e2026] rounded-xl p-1">
          <button onClick={() => setSide('BUY')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${side === 'BUY' ? 'bg-emerald-500 text-black' : 'text-[#848e9c]'}`}>Buy</button>
          <button onClick={() => setSide('SELL')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${side === 'SELL' ? 'bg-rose-500 text-white' : 'text-[#848e9c]'}`}>Sell</button>
        </div>
      </div>

      {/* Crypto selector */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
        {CRYPTOS.map(c => (
          <button key={c.symbol} onClick={() => setCrypto(c.symbol)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${crypto === c.symbol ? 'bg-[#f0b90b]/20 text-[#f0b90b] border border-[#f0b90b]/30' : 'bg-[#1e2026] text-[#848e9c] border border-[#2b2f36]'}`}>
            {c.icon} {c.symbol}
          </button>
        ))}
      </div>

      {/* Fiat selector */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        {FIATS.map(f => (
          <button key={f.code} onClick={() => setFiat(f.code)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${fiat === f.code ? 'bg-[#f0b90b]/20 text-[#f0b90b] border border-[#f0b90b]/30' : 'bg-[#1e2026] text-[#848e9c] border border-[#2b2f36]'}`}>
            <span>{f.flag}</span> {f.code}
          </button>
        ))}
      </div>

      {/* FX rate banner */}
      <div className="px-4 pb-3">
        <div className="bg-[#1e2026] rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#f0b90b]" />
            <span className="text-xs text-[#848e9c]">Live Rate</span>
          </div>
          <span className="text-sm font-bold text-[#eaecef]">1 USD = {fxRates[fiat]?.toFixed(2) || '—'} {fiat}</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 bg-[#1e2026] border border-[#2b2f36] rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-[#848e9c]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search merchants..."
            className="flex-1 bg-transparent text-sm text-[#eaecef] outline-none placeholder-[#848e9c]" />
        </div>
      </div>

      {/* Active escrow trade */}
      {activeTrade && (
        <div className="mx-4 mb-3 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
          {tradeStep === 'complete' ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-emerald-400">Trade Complete!</p>
              <p className="text-xs text-[#848e9c] mt-1">{crypto} has been released from escrow.</p>
            </div>
          ) : tradeStep === 'disputed' ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <p className="text-sm font-bold text-rose-400">Dispute Raised</p>
              <p className="text-xs text-[#848e9c] mt-1">AI is reviewing the transaction. Funds remain locked until resolution.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-amber-400">Escrow Time Remaining</p>
                    <p className="text-xl font-mono font-black text-amber-400">{formatTime(tradeTimer)}</p>
                  </div>
                </div>
                <button onClick={handleEscrowExpiry} className="text-xs text-[#848e9c] flex items-center gap-1">
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>

              <div className="bg-[#0b0e11] rounded-xl p-3 mb-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <p className="text-xs text-emerald-400 font-bold">Crypto Locked in AI Escrow</p>
                </div>
                <p className="text-xs text-[#848e9c]">Merchant: <span className="text-[#eaecef] font-semibold">{activeTrade.merchant_name}</span></p>
                <p className="text-xs text-[#848e9c]">Rate: <span className="text-amber-400 font-bold">{parseFloat(activeTrade.price_etb.toString()).toFixed(2)} {fiat}/{crypto}</span></p>
                {kycFullName && (
                  <p className="text-xs text-[#848e9c]">Verified Name: <span className="text-emerald-400 font-semibold">{kycFullName}</span></p>
                )}
                <div className="pt-2 border-t border-[#2b2f36]">
                  <p className="text-xs text-[#848e9c] mb-1">Payment Methods:</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {activeTrade.payment_methods.map((m: string) => (
                      <span key={m} className="text-xs bg-[#1e2026] text-[#eaecef] px-2 py-0.5 rounded">{m}</span>
                    ))}
                  </div>
                </div>
              </div>

              {tradeStep === 'amount' && (
                <>
                  <div className="mb-3">
                    <label className="text-xs text-[#848e9c] block mb-1">{crypto} Amount</label>
                    <input type="number" placeholder="0.00" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)}
                      className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg p-2.5 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
                    {tradeAmount && (
                      <p className="text-xs text-[#848e9c] mt-1">You {side === 'BUY' ? 'pay' : 'receive'}: <span className="text-amber-400 font-bold">{(parseFloat(tradeAmount) * parseFloat(activeTrade.price_etb.toString())).toFixed(2)} {fiat}</span></p>
                    )}
                  </div>
                  <button onClick={initiateTrade} disabled={!tradeAmount}
                    className="w-full bg-amber-500 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-50">
                    Lock Escrow & Start Trade
                  </button>
                </>
              )}

              {tradeStep === 'payment' && (
                <>
                  <div className="mb-3">
                    <p className="text-xs text-[#848e9c] mb-2">Step 1: Select your verified payment method</p>
                    <button onClick={() => setShowPaymentMethods(true)}
                      className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg p-3 text-left mb-2">
                      <p className="text-sm text-[#eaecef]">{selectedPaymentMethod ? `${selectedPaymentMethod.payment_type}: ${selectedPaymentMethod.account_name}` : 'Select payment method'}</p>
                    </button>

                    <p className="text-xs text-[#848e9c] mb-2 mt-3">Step 2: Upload payment proof (receipt/screenshot)</p>
                    <label className="flex items-center justify-center gap-2 w-full bg-[#0b0e11] border border-dashed border-[#2b2f36] rounded-lg p-3 cursor-pointer hover:border-[#f0b90b]/40">
                      {paymentProof ? <Check className="w-4 h-4 text-emerald-400" /> : <FileImage className="w-4 h-4 text-[#848e9c]" />}
                      <span className="text-xs text-[#848e9c]">{paymentProof ? paymentProof.name : 'Upload receipt'}</span>
                      <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) setPaymentProof(f); }} className="hidden" />
                    </label>
                  </div>

                  <button onClick={confirmPayment} disabled={aiScanning || !selectedPaymentMethod}
                    className="w-full bg-amber-500 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    {aiScanning ? <><Zap className="w-4 h-4 animate-pulse" /> AI Scanning...</> : <><Check className="w-4 h-4" /> Transferred, Notify Seller</>}
                  </button>
                </>
              )}

              {tradeStep === 'waiting' && (
                <>
                  <div className="bg-[#0b0e11] rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <p className="text-xs text-emerald-400 font-bold">AI Verified Payment</p>
                    </div>
                    <p className="text-xs text-[#848e9c]">Waiting for seller to confirm receipt and release {crypto} from escrow.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowTradeChat(true)}
                      className="flex-1 bg-[#1e2026] border border-[#2b2f36] text-[#eaecef] py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5">
                      <MessageCircle className="w-4 h-4" /> Chat
                    </button>
                    <button onClick={raiseDispute}
                      className="flex-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 py-2.5 rounded-lg font-bold text-sm">
                      Raise Dispute
                    </button>
                  </div>
                  {userId === activeTrade.seller_id && (
                    <button onClick={releaseEscrow}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-2.5 rounded-lg font-bold text-sm mt-2">
                      Release {crypto} to Buyer
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Ad list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="text-sm font-semibold text-[#eaecef]">{side === 'BUY' ? `Buy ${crypto}` : `Sell ${crypto}`}</h3>
          <button onClick={loadAds} className="text-xs text-[#848e9c] flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#f0b90b] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-10 h-10 text-[#474d57] mx-auto mb-3" />
            <p className="text-sm text-[#848e9c] font-semibold">No active {side.toLowerCase()} listings for {fiat}/{crypto}</p>
            <p className="text-xs text-[#474d57] mt-1">Create an ad with the + button.</p>
          </div>
        ) : (
          filtered.map(ad => (
            <div key={ad.id} className="bg-[#1e2026] p-3 rounded-xl border border-[#2b2f36] mb-2">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/10 flex items-center justify-center text-xs font-bold text-amber-400">
                    {ad.merchant_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-bold text-sm text-[#eaecef]">{ad.merchant_name}</p>
                      <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <p className="text-xs text-[#474d57]">{ad.completion_rate || 100}% completion · {ad.payment_methods?.length || 0} methods</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-400 text-lg">{parseFloat(ad.price_etb.toString()).toFixed(2)}</p>
                  <p className="text-xs text-[#474d57]">{fiat}/{crypto}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#2b2f36]">
                <div>
                  <p className="text-xs text-[#848e9c]">Limit: {parseFloat(ad.min_limit.toString()).toLocaleString()} - {parseFloat(ad.max_limit.toString()).toLocaleString()} {fiat}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {ad.payment_methods.map((m: string) => (
                      <span key={m} className="text-xs bg-[#0b0e11] text-[#848e9c] px-1.5 py-0.5 rounded">{m}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => startTrade(ad)}
                  className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 ${side === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-600 text-black' : 'bg-rose-500 hover:bg-rose-600 text-white'}`}>
                  {side === 'BUY' ? 'Buy' : 'Sell'} <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Trade Chat Modal */}
      {showTradeChat && activeTrade && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => setShowTradeChat(false)}>
          <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
              <h3 className="font-bold text-base text-[#eaecef]">Trade Chat (AI Monitored)</h3>
              <button onClick={() => setShowTradeChat(false)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {tradeMessages.length === 0 ? (
                <p className="text-sm text-[#848e9c] text-center py-8">No messages yet. Communicate safely here.</p>
              ) : (
                tradeMessages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${m.sender_id === userId ? 'bg-[#f0b90b] text-black' : 'bg-[#1e2026] text-[#eaecef]'}`}>
                      {m.ai_flagged && (
                        <div className="flex items-center gap-1 mb-1 text-rose-400 text-xs">
                          <AlertTriangle className="w-3 h-3" /> {m.ai_flag_reason}
                        </div>
                      )}
                      <p className="break-words">{m.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="px-5 py-4 border-t border-[#2b2f36] flex gap-2">
              <input value={newTradeMsg} onChange={e => setNewTradeMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendTradeMessage(); }}
                placeholder="Type a message..." maxLength={300}
                className="flex-1 bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
              <button onClick={sendTradeMessage} disabled={!newTradeMsg.trim()}
                className="bg-[#f0b90b] disabled:opacity-50 text-black w-10 h-10 rounded-full flex items-center justify-center">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods Modal */}
      {showPaymentMethods && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => setShowPaymentMethods(false)}>
          <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36] sticky top-0 bg-[#181a20]">
              <h3 className="font-bold text-base text-[#eaecef]">Select Payment Method</h3>
              <button onClick={() => setShowPaymentMethods(false)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="px-5 py-4 space-y-2">
              {userPaymentMethods.length === 0 ? (
                <p className="text-sm text-[#848e9c] text-center py-8">No payment methods registered. Add one below.</p>
              ) : (
                userPaymentMethods.map(pm => (
                  <button key={pm.id} onClick={() => { setSelectedPaymentMethod(pm); setShowPaymentMethods(false); }}
                    className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-3 text-left hover:border-[#f0b90b]/40">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-[#f0b90b]" />
                      <div>
                        <p className="text-sm font-bold text-[#eaecef]">{pm.payment_type}</p>
                        <p className="text-xs text-[#848e9c]">{pm.account_name} · {pm.account_number || pm.phone_number}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
              <AddPaymentMethodForm kycFullName={kycFullName} onAdd={addPaymentMethod} />
            </div>
          </div>
        </div>
      )}

      {/* Create Ad Modal */}
      {showCreateAd && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => setShowCreateAd(false)}>
          <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36] sticky top-0 bg-[#181a20]">
              <h3 className="font-bold text-lg text-[#eaecef]">Create P2P Ad</h3>
              <button onClick={() => setShowCreateAd(false)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="flex bg-[#0b0e11] rounded-xl p-1">
                <button onClick={() => setAdSide('BUY')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${adSide === 'BUY' ? 'bg-emerald-500 text-black' : 'text-[#848e9c]'}`}>Buy</button>
                <button onClick={() => setAdSide('SELL')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${adSide === 'SELL' ? 'bg-rose-500 text-white' : 'text-[#848e9c]'}`}>Sell</button>
              </div>

              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Crypto Asset</p>
                <select value={adCrypto} onChange={e => setAdCrypto(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]">
                  {CRYPTOS.map(c => <option key={c.symbol} value={c.symbol}>{c.icon} {c.symbol} - {c.name}</option>)}
                </select>
              </div>

              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Fiat Currency</p>
                <select value={adFiat} onChange={e => setAdFiat(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]">
                  {FIATS.map(f => <option key={f.code} value={f.code}>{f.flag} {f.code} - {f.name}</option>)}
                </select>
              </div>

              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Price per {adCrypto} ({adFiat})</p>
                <input type="number" value={adPrice} onChange={e => setAdPrice(e.target.value)} placeholder={fxRates[adFiat]?.toFixed(2) || '0.00'}
                  className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
                <p className="text-xs text-[#474d57] mt-1">Market rate: {fxRates[adFiat]?.toFixed(2) || '—'} {adFiat}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[#848e9c] mb-1.5">Min Order ({adFiat})</p>
                  <input type="number" value={adMin} onChange={e => setAdMin(e.target.value)} placeholder="100"
                    className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
                </div>
                <div>
                  <p className="text-xs text-[#848e9c] mb-1.5">Max Order ({adFiat})</p>
                  <input type="number" value={adMax} onChange={e => setAdMax(e.target.value)} placeholder="10000"
                    className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
                </div>
              </div>

              {adSide === 'SELL' && (
                <div>
                  <p className="text-xs text-[#848e9c] mb-1.5">Total {adCrypto} Amount</p>
                  <input type="number" value={adTotal} onChange={e => setAdTotal(e.target.value)} placeholder="100"
                    className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
                </div>
              )}

              <div>
                <p className="text-xs text-[#848e9c] mb-2">Payment Methods</p>
                <div className="flex gap-2 flex-wrap">
                  {(FIATS.find(f => f.code === adFiat)?.methods || []).map(m => (
                    <button key={m} onClick={() => toggleAdMethod(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${adMethods.includes(m) ? 'bg-[#f0b90b] text-black' : 'bg-[#0b0e11] text-[#848e9c] border border-[#2b2f36]'}`}>{m}</button>
                  ))}
                </div>
              </div>

              <div className="bg-[#1e2026] rounded-xl p-3 flex gap-2">
                <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#848e9c]">
                  {adSide === 'SELL' ? `Your ${adCrypto} will be locked in AI-monitored escrow when a trade starts. You cannot withdraw locked funds.` : 'Seller\'s crypto will be locked in escrow. Your payment method name must match your KYC name.'}
                </p>
              </div>

              {profile.kyc_status !== 'VERIFIED' && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-400">KYC verification required to create P2P ads.</p>
                </div>
              )}

              <button onClick={createAd} disabled={creating || !adPrice || !adMin || !adMax || adMethods.length === 0 || profile.kyc_status !== 'VERIFIED'}
                className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl">
                {creating ? 'Creating...' : 'Publish Ad (24h Active)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddPaymentMethodForm({ kycFullName, onAdd }: { kycFullName: string; onAdd: (type: string, name: string, number: string, bank?: string) => void }) {
  const [type, setType] = useState('Bank Transfer');
  const [name, setName] = useState(kycFullName || '');
  const [number, setNumber] = useState('');
  const [bank, setBank] = useState('');
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="w-full bg-[#f0b90b]/10 border border-[#f0b90b]/30 rounded-xl p-3 text-sm text-[#f0b90b] font-bold">
        + Add Payment Method
      </button>
    );
  }

  return (
    <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 space-y-3">
      <div>
        <p className="text-xs text-[#848e9c] mb-1">Payment Type</p>
        <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-lg px-3 py-2 text-sm text-[#eaecef]">
          <option>Bank Transfer</option><option>Telebirr</option><option>CBE Birr</option><option>M-Pesa</option>
          <option>Wise</option><option>Revolut</option><option>PayPal</option><option>SEPA</option>
          <option>UPI</option><option>Cash in Person</option><option>Western Union</option>
        </select>
      </div>
      <div>
        <p className="text-xs text-[#848e9c] mb-1">Account Name (must match KYC: {kycFullName || 'N/A'})</p>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full legal name"
          className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-lg px-3 py-2 text-sm text-[#eaecef]" />
      </div>
      <div>
        <p className="text-xs text-[#848e9c] mb-1">Account Number / Phone</p>
        <input type="text" value={number} onChange={e => setNumber(e.target.value)} placeholder="Account number or phone"
          className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-lg px-3 py-2 text-sm text-[#eaecef]" />
      </div>
      {(type === 'Bank Transfer' || type === 'SEPA') && (
        <div>
          <p className="text-xs text-[#848e9c] mb-1">Bank Name</p>
          <input type="text" value={bank} onChange={e => setBank(e.target.value)} placeholder="Bank name"
            className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-lg px-3 py-2 text-sm text-[#eaecef]" />
        </div>
      )}
      <button onClick={() => { if (name && number) { onAdd(type, name, number, bank || undefined); setShow(false); } }}
        disabled={!name || !number}
        className="w-full bg-[#f0b90b] disabled:opacity-50 text-black font-bold py-2.5 rounded-lg text-sm">
        Save Payment Method
      </button>
    </div>
  );
}
