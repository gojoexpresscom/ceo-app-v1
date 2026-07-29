import { X, Shield, Mail, Globe, Users } from 'lucide-react';
import { SUPPORT_WHATSAPP } from '@/config/constants';

type Props = { onClose: () => void };

export default function AboutUsModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">About Us</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-5">
          <div className="flex flex-col items-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f0b90b] to-orange-600 flex items-center justify-center mb-3">
              <span className="text-2xl font-black text-black">CEO</span>
            </div>
            <p className="text-lg font-bold text-[#eaecef]">CEO Exchange</p>
            <p className="text-xs text-[#848e9c]">Version 1.0.0</p>
          </div>

          <div className="bg-gradient-to-br from-[#f0b90b]/10 to-orange-600/5 border border-[#f0b90b]/20 rounded-2xl p-5">
            <p className="text-sm text-[#eaecef] leading-relaxed">
              CEO Exchange is built to serve Ethiopian traders safely and privately. We provide secure local P2P solutions,
              real-time crypto trading, and complete privacy for every user. Our platform connects Ethiopian Birr (ETB)
              and regional African currencies to the global crypto market with trusted escrow protection.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4">
              <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#eaecef]">Secure & Private</p>
                <p className="text-xs text-[#848e9c]">Bank-grade encryption and complete privacy protection</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4">
              <Users className="w-5 h-5 text-[#f0b90b] flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#eaecef]">Local P2P Solutions</p>
                <p className="text-xs text-[#848e9c]">Telebirr, CBE Birr, and local bank transfers with escrow</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4">
              <Globe className="w-5 h-5 text-sky-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#eaecef]">Regional Focus</p>
                <p className="text-xs text-[#848e9c]">Serving Ethiopia and Africa with local currency support</p>
              </div>
            </div>
          </div>

          <button onClick={() => window.open(SUPPORT_WHATSAPP, '_blank')}
            className="w-full flex items-center justify-center gap-2 bg-[#25d366] hover:bg-[#1faa50] text-white font-bold py-3.5 rounded-xl">
            <Mail className="w-5 h-5" /> Contact Support via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
