import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

export default function DepositSection() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [selectedCoin, setSelectedCoin] = useState('usdttrc20');

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in first');
        return;
      }

      // Call your backend or NOWPayments API directly to create a payment
      const response = await fetch('https://api.nowpayments.io/v1/payment', {
        method: 'POST',
        headers: {
          'x-api-key': 'A7ADSTY-499M76F-P9FH9CB-DWBBFV5',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_amount: parseFloat(amount),
          price_currency: 'usd',
          pay_currency: selectedCoin,
          order_id: user.id, // Links payment back to your Supabase User ID
          order_description: 'CEO Exchange Balance Top-up',
        }),
      });

      const data = await response.json();
      if (data && data.pay_address) {
        setCryptoAddress(data.pay_address);
      } else {
        alert('Error generating deposit address. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 text-white rounded-xl max-w-md mx-auto mt-10 shadow-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4">Deposit Funds (Crypto)</h2>
      
      <div className="mb-4">
        <label className="block text-sm text-slate-400 mb-1">Amount in USD</label>
        <input 
          type="number" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 50"
          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm text-slate-400 mb-1">Select Network/Coin</label>
        <select 
          value={selectedCoin} 
          onChange={(e) => setSelectedCoin(e.target.value)}
          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
        >
          <option value="usdttrc20">USDT (TRC20)</option>
          <option value="usdtbsc">USDT (BSC / BEP20)</option>
          <option value="sol">Solana (SOL)</option>
          <option value="btc">Bitcoin (BTC)</option>
        </select>
      </div>

      <button 
        onClick={handleDeposit}
        disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition"
      >
        {loading ? 'Generating Address...' : 'Generate Deposit Address'}
      </button>

      {cryptoAddress && (
        <div className="mt-6 p-4 bg-slate-800 border border-slate-700 rounded-lg text-center">
          <p className="text-xs text-slate-400 mb-1">Send exact crypto to this address:</p>
          <p className="font-mono text-sm bg-slate-900 p-2 rounded text-green-400 break-all">{cryptoAddress}</p>
        </div>
      )}
    </div>
  );
        }

