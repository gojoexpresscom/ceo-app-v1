import { X, Info, FileText, Shield, Mail } from 'lucide-react';

type Props = { onClose: () => void };

export default function AboutModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">About CEO Exchange</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="flex flex-col items-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f0b90b] to-orange-600 flex items-center justify-center mb-3">
              <span className="text-2xl font-black text-black">CEO</span>
            </div>
            <p className="text-lg font-bold text-[#eaecef]">CEO Exchange</p>
            <p className="text-xs text-[#848e9c]">Version 1.0.0</p>
          </div>

          <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-[#f0b90b]" />
              <div>
                <p className="text-sm font-bold text-[#eaecef]">CEO Exchange</p>
                <p className="text-xs text-[#848e9c]">Trade crypto, fiat, and gold with real-time market data. Built for traders worldwide.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#f0b90b]" />
              <div>
                <p className="text-sm font-bold text-[#eaecef]">Support Email</p>
                <p className="text-xs text-[#848e9c]">ceo.exchange.web@gmail.com</p>
              </div>
            </div>
          </div>

          <button onClick={() => window.open('mailto:ceo.exchange.web@gmail.com?subject=Terms of Service', '_blank')} className="w-full flex items-center gap-3 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 hover:border-[#f0b90b]">
            <FileText className="w-5 h-5 text-[#848e9c]" />
            <span className="flex-1 text-sm text-[#eaecef] text-left">Terms of Service</span>
          </button>
          <button onClick={() => window.open('mailto:ceo.exchange.web@gmail.com?subject=Privacy Policy', '_blank')} className="w-full flex items-center gap-3 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 hover:border-[#f0b90b]">
            <Shield className="w-5 h-5 text-[#848e9c]" />
            <span className="flex-1 text-sm text-[#eaecef] text-left">Privacy Policy</span>
          </button>
        </div>
      </div>
    </div>
  );
}
