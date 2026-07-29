import { X, Percent } from 'lucide-react';

type Props = { vipLevel: number; onClose: () => void };

const SPOT_FEES = [
  { level: 0, maker: '0.100%', taker: '0.100%' },
  { level: 1, maker: '0.090%', taker: '0.100%' },
  { level: 2, maker: '0.080%', taker: '0.090%' },
  { level: 3, maker: '0.070%', taker: '0.080%' },
  { level: 4, maker: '0.060%', taker: '0.070%' },
  { level: 5, maker: '0.040%', taker: '0.060%' },
  { level: 6, maker: '0.020%', taker: '0.050%' },
  { level: 7, maker: '0.000%', taker: '0.040%' },
];

const FUTURES_FEES = [
  { level: 0, maker: '0.020%', taker: '0.060%' },
  { level: 1, maker: '0.015%', taker: '0.050%' },
  { level: 2, maker: '0.012%', taker: '0.045%' },
  { level: 3, maker: '0.010%', taker: '0.040%' },
  { level: 4, maker: '0.008%', taker: '0.035%' },
  { level: 5, maker: '0.005%', taker: '0.030%' },
  { level: 6, maker: '0.003%', taker: '0.025%' },
  { level: 7, maker: '0.000%', taker: '0.020%' },
];

export default function FeeRatesModal({ vipLevel, onClose }: Props) {
  const spot = SPOT_FEES.find(f => f.level === vipLevel) || SPOT_FEES[0];
  const futures = FUTURES_FEES.find(f => f.level === vipLevel) || FUTURES_FEES[0];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">My Fee Rates</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="bg-[#1e2026] rounded-xl p-4 flex items-center gap-3">
            <Percent className="w-6 h-6 text-[#f0b90b]" />
            <div>
              <p className="text-sm font-bold text-[#eaecef]">Current VIP Level: {vipLevel === 0 ? 'Regular' : `VIP ${vipLevel}`}</p>
              <p className="text-xs text-[#848e9c]">Lower fees with higher trading volume</p>
            </div>
          </div>

          <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4">
            <p className="text-sm font-bold text-[#eaecef] mb-3">Spot Trading</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#848e9c]">Maker Fee</p>
                <p className="text-lg font-black text-emerald-400">{spot.maker}</p>
              </div>
              <div>
                <p className="text-xs text-[#848e9c]">Taker Fee</p>
                <p className="text-lg font-black text-rose-400">{spot.taker}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4">
            <p className="text-sm font-bold text-[#eaecef] mb-3">Futures Trading</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#848e9c]">Maker Fee</p>
                <p className="text-lg font-black text-emerald-400">{futures.maker}</p>
              </div>
              <div>
                <p className="text-xs text-[#848e9c]">Taker Fee</p>
                <p className="text-lg font-black text-rose-400">{futures.taker}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4">
            <p className="text-xs text-[#848e9c] mb-3">Fee Tier Table</p>
            <div className="space-y-1 text-xs">
              <div className="grid grid-cols-3 gap-2 text-[#848e9c] font-bold pb-1 border-b border-[#2b2f36]">
                <span>VIP</span><span>Spot Maker/Taker</span><span>Futures M/T</span>
              </div>
              {SPOT_FEES.map((s, i) => (
                <div key={s.level} className={`grid grid-cols-3 gap-2 py-1 ${s.level === vipLevel ? 'text-[#f0b90b] font-bold' : 'text-[#eaecef]'}`}>
                  <span>{s.level === 0 ? 'Reg' : `V${s.level}`}</span>
                  <span>{s.maker} / {s.taker}</span>
                  <span>{FUTURES_FEES[i].maker} / {FUTURES_FEES[i].taker}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
