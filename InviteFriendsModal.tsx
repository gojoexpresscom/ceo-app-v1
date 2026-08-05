import { useState, useEffect } from 'react';
import { X, Users, Copy, Check, Share2 } from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';

type Props = { userId: string; profile: Profile; onClose: () => void };

export default function InviteFriendsModal({ userId, profile, onClose }: Props) {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('referrals').select('*').eq('referrer_id', userId).maybeSingle();
      if (data) {
        setReferralCode(data.referral_code);
        setReferralCount(data.total_referrals || 0);
        setTotalRewards(data.total_rewards || 0);
      } else {
        const code = 'CEO' + profile.uid + Math.floor(Math.random() * 100);
        await supabase.from('referrals').insert({ referrer_id: userId, referral_code: code });
        setReferralCode(code);
      }
      setLoading(false);
    })();
  }, [userId, profile.uid]);

  const link = `https://ceo-exchange.app/register?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'CEO Exchange', text: 'Join me on CEO Exchange!', url: link }); } catch { /* ignore */ }
    } else { copyLink(); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Invite Friends</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-5">
          <div className="bg-gradient-to-br from-[#f0b90b]/20 to-orange-600/10 border border-[#f0b90b]/30 rounded-2xl p-5 text-center">
            <Users className="w-12 h-12 text-[#f0b90b] mx-auto mb-3" />
            <p className="text-sm font-bold text-[#eaecef]">Invite friends and earn rewards</p>
            <p className="text-xs text-[#848e9c] mt-1">Earn up to 20% of your friends' trading fees</p>
          </div>

          {!loading && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-[#f0b90b]">{referralCount}</p>
                  <p className="text-xs text-[#848e9c]">Referrals</p>
                </div>
                <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-400">{totalRewards.toFixed(2)}</p>
                  <p className="text-xs text-[#848e9c]">Total Earned</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Your Referral Link</p>
                <div className="flex items-center gap-2 bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3">
                  <p className="flex-1 text-xs text-[#eaecef] font-mono break-all">{link}</p>
                  <button onClick={copyLink} className="flex-shrink-0">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#848e9c]" />}
                  </button>
                </div>
              </div>

              <button onClick={share} className="w-full flex items-center justify-center gap-2 bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl">
                <Share2 className="w-5 h-5" /> Share Link
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
