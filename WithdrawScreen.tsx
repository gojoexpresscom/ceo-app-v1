import { useState } from 'react';
import { ArrowUpRight, Clock, Check } from 'lucide-react';
import { DYNAMIC_FEES, OWNER_EMAIL, FLAT_FEE_USD } from '@/config/constants';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';

type Props = {
  userEmail: string;
  userId: string;
  usdtBalance: number;
  antiPhishingCode?: string;
  onWithdraw: (amount: number, fee: number) => void;
};

export default function WithdrawScreen({ userEmail, userId, usdtBalance, antiPhishingCode, onWithdraw }: Props) {
  const [withdrawCoin, setWithdrawCoin] = useState('USDT');
  const [withdrawNetwork, setWithdrawNetwork] = useState('TRC20');
  const [transferType, setTransferType] = useState<'EXTERNAL' | 'INTERNAL'>('EXTERNAL');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const calculateFee = () => {
    if (userEmail === OWNER_EMAIL) return 0.00; // Owner exempt from all fees
    if (transferType === 'INTERNAL') return 0.00;
    return FLAT_FEE_USD; // $1 flat fee for all standard users
  };

  const getEstimatedTime = () => {
    if (transferType === 'INTERNAL') return 'Instant';
    return DYNAMIC_FEES[withdrawCoin as keyof typeof DYNAMIC_FEES]?.[withdrawNetwork as keyof typeof DYNAMIC_FEES[typeof withdrawCoin]]?.time || '1-5 mins';
  };

  const getMinAmount = () => {
    if (transferType === 'INTERNAL') return 1;
    return DYNAMIC_FEES[withdrawCoin as keyof typeof DYNAMIC_FEES]?.[withdrawNetwork as keyof typeof DYNAMIC_FEES[typeof withdrawCoin]]?.minAmount || 1;
  };

  const handleSubmit = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || !destAddress) return;
    const fee = calculateFee();

    await supabase.from('transactions').insert({
      profile_email: userEmail,
      type: 'WITHDRAW',
      coin: withdrawCoin,
      network: transferType === 'EXTERNAL' ? withdrawNetwork : 'INTERNAL',
      amount: amount,
      fee: fee,
      destination: destAddress,
      status: 'PENDING',
    });

    // Route withdrawal fee to owner reserve
    if (fee > 0) {
      await supabase.from('owner_fees').insert({
        user_id: userId,
        fee_type: 'WITHDRAWAL',
        amount: fee,
        coin: withdrawCoin,
      });
    }

    onWithdraw(amount, fee);

    await sendNotification({
      userId,
      type: 'WITHDRAWAL',
      subject: 'CEO Exchange: Withdrawal Initiated',
      message: `Your withdrawal of ${amount} ${withdrawCoin} via ${transferType === 'EXTERNAL' ? withdrawNetwork : 'CEO Internal'} to ${destAddress} has been initiated. Network fee: ${fee.toFixed(2)}.`,
      antiPhishingCode,
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setWithdrawAmount('');
      setDestAddress('');
    }, 3000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-200">Withdraw Crypto</h2>
          <span className="text-xs text-slate-400">
            Available: <span className="text-emerald-400 font-bold">{usdtBalance.toFixed(2)} USDT</span>
          </span>
        </div>

        {/* Transfer type */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg">
          <button
            onClick={() => setTransferType('EXTERNAL')}
            className={`py-2 text-xs font-bold rounded transition-colors ${transferType === 'EXTERNAL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
          >
            Blockchain Network
          </button>
          <button
            onClick={() => setTransferType('INTERNAL')}
            className={`py-2 text-xs font-bold rounded transition-colors ${transferType === 'INTERNAL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
          >
            CEO Internal (Free)
          </button>
        </div>

        {transferType === 'EXTERNAL' && (
          <>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Select Asset</label>
              <select
                value={withdrawCoin}
                onChange={e => {
                  setWithdrawCoin(e.target.value);
                  setWithdrawNetwork(e.target.value === 'BTC' ? 'BTC' : e.target.value === 'ETH' ? 'ERC20' : 'TRC20');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200"
              >
                <option value="USDT">Tether (USDT)</option>
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Choose Chain Network</label>
              <select
                value={withdrawNetwork}
                onChange={e => setWithdrawNetwork(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200"
              >
                {withdrawCoin === 'USDT' && (
                  <>
                    <option value="TRC20">TRON (TRC20) - $1.00 Fee</option>
                    <option value="POLYGON">Polygon PoS - $1.00 Fee</option>
                    <option value="BEP20">BNB Chain (BEP20) - $1.00 Fee</option>
                    <option value="SOL">Solana (SOL) - $1.00 Fee</option>
                  </>
                )}
                {withdrawCoin === 'BTC' && <option value="BTC">Bitcoin Network - $1.00 Fee</option>}
                {withdrawCoin === 'ETH' && <option value="ERC20">Ethereum (ERC20) - $1.00 Fee</option>}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="text-xs text-slate-400 block mb-1">
            {transferType === 'INTERNAL' ? 'Recipient CEO Email' : 'Destination Wallet Address'}
          </label>
          <input
            type="text"
            placeholder={transferType === 'INTERNAL' ? 'user@ceo.com' : 'Enter wallet address'}
            value={destAddress}
            onChange={e => setDestAddress(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 placeholder:text-slate-600"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-slate-400">Amount</label>
            <button
              onClick={() => setWithdrawAmount(usdtBalance.toString())}
              className="text-xs text-amber-400 font-semibold"
            >
              MAX
            </button>
          </div>
          <input
            type="number"
            placeholder="0.00"
            value={withdrawAmount}
            onChange={e => setWithdrawAmount(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200"
          />
          <p className="text-xs text-slate-500 mt-1">Min: {getMinAmount()} {withdrawCoin}</p>
        </div>

        {/* Fee summary */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/50 space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Network Fee</span>
            <span className="font-bold text-amber-400">${calculateFee().toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Estimated Time</span>
            <span className="text-slate-200">{getEstimatedTime()}</span>
          </div>
          <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/50">
            <span>You'll receive</span>
            <span className="text-emerald-400 font-bold">
              {withdrawAmount ? (parseFloat(withdrawAmount) - calculateFee()).toFixed(2) : '0.00'} {withdrawCoin}
            </span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!withdrawAmount || !destAddress || submitted}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
        >
          {submitted ? (
            <><Check className="w-4 h-4" /> Withdrawal Submitted</>
          ) : (
            <><ArrowUpRight className="w-4 h-4" /> Confirm Withdrawal</>
          )}
        </button>
      </div>
    </div>
  );
}
