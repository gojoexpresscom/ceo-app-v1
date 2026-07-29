import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, Check, Info, ShieldAlert } from 'lucide-react';

export type AlertType = 'warning' | 'success' | 'info' | 'error';

export type AlertState = {
  open: boolean;
  type: AlertType;
  title: string;
  message: string;
};

let _listener: ((s: AlertState) => void) | null = null;

// eslint-disable-next-line react-refresh/only-export-components
export function showPlatformAlert(type: AlertType, title: string, message: string) {
  _listener?.({ open: true, type, title, message });
}

// eslint-disable-next-line react-refresh/only-export-components
export const platformAlert = {
  warn: (title: string, message: string) => showPlatformAlert('warning', title, message),
  success: (title: string, message: string) => showPlatformAlert('success', title, message),
  info: (title: string, message: string) => showPlatformAlert('info', title, message),
  error: (title: string, message: string) => showPlatformAlert('error', title, message),
};

// eslint-disable-next-line react-refresh/only-export-components
export function usePlatformAlert() {
  const [state, setState] = useState<AlertState>({ open: false, type: 'info', title: '', message: '' });

  useEffect(() => {
    _listener = setState;
    return () => { _listener = null; };
  }, []);

  const close = useCallback(() => setState(s => ({ ...s, open: false })), []);

  return { state, close };
}

export function PlatformAlertHost() {
  const { state, close } = usePlatformAlert();
  if (!state.open) return null;

  const icons = {
    warning: ShieldAlert,
    success: Check,
    info: Info,
    error: AlertTriangle,
  };
  const colors = {
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    info: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    error: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  };
  const Icon = icons[state.type];

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center max-w-md mx-auto px-6" onClick={close}>
      <div className="w-full bg-[#181a20] border border-[#2b2f36] rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end mb-1">
          <button onClick={close} className="text-[#848e9c] hover:text-[#eaecef]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border ${colors[state.type]}`}>
          <Icon className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-[#eaecef] text-center mb-2">{state.title}</h3>
        <p className="text-sm text-[#848e9c] text-center leading-relaxed whitespace-pre-line mb-5">{state.message}</p>
        <button
          onClick={close}
          className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl text-sm transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
}
