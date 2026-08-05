import { X, Star, Crown, TrendingUp } from 'lucide-react';

type Props = { currentLevel: number; onClose: () => void };

const TIERS = [
  { level: 0, name: 'Regular', volume: '$0', maker: '0.100%', taker: '0.100%', withdrawal: '500 USDT', color: '#848e9c' },
  { level: 1, name: 'VIP 1', volume: '$5,000', maker: '0.090%', taker: '0.100%', withdrawal: '5,000 USDT', color: '#848e9c' },
  { level: 2, name: 'VIP 2', volume: '$50,000', maker: '0.080%', taker: '0.090%', withdrawal: '50,000 USDT', color: '#94a3b8' },
  { level: 3, name: 'VIP 3', volume: '$250,000', maker: '0.070%', taker: '0.080%', withdrawal: '200,000 USDT', color: '#38bdf8' },
  { level: 4, name: 'VIP 4', volume: '$1,000,000', maker: '0.060%', taker: '0.070%', withdrawal: '500,000 USDT', color: '#a78bfa' },
  { level: 5, name: 'VIP 5', volume: '$5,000,000', maker: '0.040%', taker: '0.060%', withdrawal: '1,000,000 USDT', color: '#f0b90b' },
  { level: 6, name: 'VIP 6', volume: '$25,000,000', maker: '0.020%', taker: '0.050%', withdrawal: '5,000,000 USDT', color: '#f0b90b' },
  { level: 7, name: 'VIP 7', volume: '$100,000,000', maker: '0.000%', taker: '0.040%', withdrawal: '10,000,000 USDT', color: '#f0b90b' },
];

export default function VIPModal({ currentLevel, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">VIP Benefits</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="bg-gradient-to-br from-[#f0b90b]/20 to-orange-600/20 border border-[#f0b90b]/30 rounded-xl p-4 flex items-center gap-3">
            <Crown className="w-8 h-8 text-[#f0b90b]" />
            <div>
              <p className="text-sm font-bold text-[#eaecef]">Current Level: {currentLevel === 0 ? 'Regular' : `VIP ${currentLevel}`}</p>
              <p className="text-xs text-[#848e9c]">Trade more to unlock higher tiers and lower fees</p>
            </div>
          </div>

          <div className="space-y-2">
            {TIERS.map(t => (
              <div key={t.level} className={`rounded-xl p-4 border ${t.level === currentLevel ? 'bg-[#f0b90b]/10 border-[#f0b90b]' : 'bg-[#0b0e11] border-[#2b2f36]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" style={{ color: t.color }} fill={t.color} />
                    <p className="text-sm font-bold text-[#eaecef]">{t.name}</p>
                    {t.level === currentLevel && <span className="text-xs text-[#f0b90b] font-bold">Current</span>}
                  </div>
                  <TrendingUp className="w-4 h-4 text-[#848e9c]" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-[#848e9c]">30d Volume: </span><span className="text-[#eaecef] font-semibold">{t.volume}</span></div>
                  <div><span className="text-[#848e9c]">Maker: </span><span className="text-[#eaecef] font-semibold">{t.maker}</span></div>
                  <div><span className="text-[#848e9c]">Taker: </span><span className="text-[#eaecef] font-semibold">{t.taker}</span></div>
                  <div><span className="text-[#848e9c]">24h Withdrawal: </span><span className="text-[#eaecef] font-semibold">{t.withdrawal}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
