import { X, Bell, ChevronRight, TrendingUp, Shield, RefreshCw } from 'lucide-react';

const NOTIFICATIONS = [
  { id: 1, icon: TrendingUp, color: 'text-amber-400', title: 'Gold hit $2,750', body: 'XAUUSD touched a new intraday high.', time: '2m ago' },
  { id: 2, icon: Shield, color: 'text-emerald-400', title: 'P2P Trade Completed', body: 'Your escrow order #48921 was released.', time: '1h ago' },
  { id: 3, icon: RefreshCw, color: 'text-sky-400', title: 'New P2P Merchant', body: 'FastSwap_ETH added a new USDT listing.', time: '3h ago' },
  { id: 4, icon: Bell, color: 'text-slate-400', title: 'Welcome to CEO Exchange', body: 'Complete KYC to unlock all features.', time: '1d ago' },
];

type Props = { onClose: () => void };

export default function NotificationsPanel({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 max-w-md mx-auto" onClick={onClose}>
      <div className="absolute top-16 right-0 left-0 mx-4 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h3 className="font-bold text-slate-200">Notifications</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
          {NOTIFICATIONS.map(n => {
            const Icon = n.icon;
            return (
              <div key={n.id} className="flex items-start gap-3 p-3.5 hover:bg-slate-800/30">
                <div className={`w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 ${n.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{n.body}</p>
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap">{n.time}</span>
              </div>
            );
          })}
        </div>
        <div className="p-3 border-t border-slate-800">
          <button className="w-full text-center text-xs text-amber-400 font-semibold flex items-center justify-center gap-1">
            View All Notifications <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
