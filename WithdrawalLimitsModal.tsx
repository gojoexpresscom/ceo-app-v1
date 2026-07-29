import { X, Wallet } from 'lucide-react';

type Props = { kycStatus: string; onClose: () => void };

const LIMITS = [
  { level: 'Unverified', daily: '500 USDT', monthly: '5,000 USDT', color: '#848e9c' },
  { level: 'Lv.1 Verified', daily: '5,000 USDT', monthly: '50,000 USDT', color: '#38bdf8' },
  { level: 'Lv.2 Verified', daily: '50,000 USDT', monthly: '500,000 USDT', color: '#34d399' },
  { level: 'VIP', daily: 'Unlimited', monthly: 'Unlimited', color: '#f0b90b' },
];

export default function WithdrawalLimitsModal({ kycStatus, onClose }: Props) {
  const currentIdx = kycStatus === 'VERIFIED' ? 2 : kycStatus === 'PENDING_VERIFICATION' || kycStatus === 'PENDING' ? 1 : 0;
  const current = LIMITS[currentIdx];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Withdrawal Limits</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="bg-gradient-to-br from-[#f0b90b]/20 to-orange-600/20 border border-[#f0b90b]/30 rounded-xl p-4">
            <p className="text-xs text-[#848e9c]">Current Level</p>
            <p className="text-lg font-bold" style={{ color: current.color }}>{current.level}</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-xs text-[#848e9c]">24h Limit</p>
                <p className="text-sm font-bold text-[#eaecef]">{current.daily}</p>
              </div>
              <div>
                <p className="text-xs text-[#848e9c]">30d Limit</p>
                <p className="text-sm font-bold text-[#eaecef]">{current.monthly}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[#848e9c] font-bold uppercase tracking-wider">All Tiers</p>
            {LIMITS.map((l, i) => (
              <div key={l.level} className={`rounded-xl p-4 border ${i === currentIdx ? 'bg-[#f0b90b]/10 border-[#f0b90b]' : 'bg-[#0b0e11] border-[#2b2f36]'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" style={{ color: l.color }} />
                    <p className="text-sm font-bold text-[#eaecef]">{l.level}</p>
                  </div>
                  {i === currentIdx && <span className="text-xs text-[#f0b90b] font-bold">Current</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <span><span className="text-[#848e9c]">24h: </span><span className="text-[#eaecef] font-semibold">{l.daily}</span></span>
                  <span><span className="text-[#848e9c]">30d: </span><span className="text-[#eaecef] font-semibold">{l.monthly}</span></span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#848e9c] text-center">Complete Identity Verification to increase your limits.</p>
        </div>
      </div>
    </div>
  );
}
