import { useState } from 'react';
import {
  Shield, BadgeCheck, AlertTriangle, ChevronRight, LogOut, TrendingUp,
  KeyRound, Lock, Gift, Headphones, Globe, ChevronDown, Clock, FlagCircle, X, Send, Loader2,
} from 'lucide-react';
import { EARN_PRODUCTS, SUPPORT_EMAIL } from '@/config/constants';
import type { Profile } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import EarnModal from '@/components/modals/EarnModal';
import KYCModal from '@/components/modals/KYCModal';
import SecurityModal from '@/components/modals/SecurityModal';

type Props = {
  profile: Profile;
  usdtBalance: number;
  userId: string;
  onOpenKyc: () => void;
  onOpenSecurity: (type: 'security' | 'antiphishing' | 'password' | 'passcode') => void;
  onSubscribeEarn: (amount: number) => void;
  onLogout: () => void;
  onProfileUpdate?: (updates: Partial<Profile>) => void;
};

type Tab = 'assets' | 'earn' | 'profile' | 'security';
type AssetTab = 'spot' | 'fiat' | 'futures' | 'options' | 'margin' | 'earn' | 'funding';

export default function ProfileScreen({ profile, usdtBalance, userId, onSubscribeEarn, onLogout, onProfileUpdate }: Props) {
  const [tab, setTab] = useState<Tab>('assets');
  const [assetTab, setAssetTab] = useState<AssetTab>('spot');
  const [selectedEarn, setSelectedEarn] = useState<{ coin: string; apy: string; type: string; minAmount: number } | null>(null);
  const [showKyc, setShowKyc] = useState(false);
  const [securityModal, setSecurityModal] = useState<'security' | 'antiphishing' | 'password' | 'passcode' | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const kycBadge = {
    VERIFIED: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Verified', icon: BadgeCheck },
    PENDING_VERIFICATION: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Pending', icon: Clock },
    PENDING: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Pending', icon: Clock },
    UNVERIFIED: { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', label: 'Unverified', icon: AlertTriangle },
  }[profile.kyc_status] || { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', label: profile.kyc_status, icon: AlertTriangle };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'assets', label: 'Assets' },
    { id: 'earn', label: 'Earn' },
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
  ];

  const totalValue = usdtBalance + parseFloat((profile.btc_balance || 0).toString()) * 67000 + parseFloat((profile.eth_balance || 0).toString()) * 3500;

  // Check if user is locked/reported
  useState(() => {
    supabase.from('profiles').select('is_locked, lock_reason').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (data?.is_locked) setIsLocked(true);
    });
  });

  const submitReport = async () => {
    if (!reportText.trim()) return;
    setReportLoading(true);
    await supabase.from('support_tickets').insert({
      user_id: userId,
      user_email: profile.email,
      subject: 'User Report / Support Request',
      message: reportText,
      category: 'report',
      status: 'open',
    });
    setReportLoading(false);
    setReportSent(true);
    setReportText('');
    setTimeout(() => { setShowReport(false); setReportSent(false); }, 2500);
  };

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-xl font-black text-slate-900">
            {profile.email.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-200">{profile.nickname || profile.email}</p>
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded border ${kycBadge.bg} ${kycBadge.color}`}>
                <kycBadge.icon className="w-3 h-3" /> {kycBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">UID: {profile.uid}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800">
          <div className="text-center">
            <p className="text-xs text-slate-500">Total Value</p>
            <p className="text-sm font-bold text-slate-200">${totalValue.toFixed(2)}</p>
          </div>
          <div className="text-center border-x border-slate-800">
            <p className="text-xs text-slate-500">VIP</p>
            <p className="text-sm font-bold text-amber-400">VIP {profile.vip_level}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Security</p>
            <p className="text-sm font-bold text-emerald-400">{profile.security_level}</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tab === t.id ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Assets tab */}
      {tab === 'assets' && (
        <div className="space-y-3">
          {/* Asset sub-tabs — Binance style */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar bg-slate-900 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'spot', label: 'Spot' },
              { id: 'fiat', label: 'Fiat' },
              { id: 'futures', label: 'Futures' },
              { id: 'options', label: 'Options' },
              { id: 'margin', label: 'Margin' },
              { id: 'earn', label: 'Earn' },
              { id: 'funding', label: 'Funding' },
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setAssetTab(sub.id as AssetTab)}
                className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-lg transition-colors ${assetTab === sub.id ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Spot Account */}
          {assetTab === 'spot' && (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Spot Account</h3>
              <div className="space-y-2">
                {[
                  { coin: 'USDT', balance: usdtBalance, usdValue: usdtBalance },
                  { coin: 'BTC', balance: parseFloat((profile.btc_balance || 0).toString()), usdValue: parseFloat((profile.btc_balance || 0).toString()) * 67000 },
                  { coin: 'ETH', balance: parseFloat((profile.eth_balance || 0).toString()), usdValue: parseFloat((profile.eth_balance || 0).toString()) * 3500 },
                ].map(asset => (
                  <div key={asset.coin} className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400">
                        {asset.coin.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-slate-200">{asset.coin}</p>
                        <p className="text-xs text-slate-500">{asset.balance.toFixed(asset.coin === 'USDT' ? 2 : 6)} {asset.coin}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-200">${asset.usdValue.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fiat Account */}
          {assetTab === 'fiat' && (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Fiat Wallet</h3>
              <p className="text-xs text-slate-500 mb-3">Your fiat balances for buying and selling crypto with local currency.</p>
              <div className="space-y-2">
                {[
                  { coin: 'USD', balance: usdtBalance, usdValue: usdtBalance },
                  { coin: 'ETB', balance: 0, usdValue: 0 },
                ].map(asset => (
                  <div key={asset.coin} className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400">
                        {asset.coin.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-slate-200">{asset.coin}</p>
                        <p className="text-xs text-slate-500">{asset.balance.toFixed(2)} {asset.coin}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-200">${asset.usdValue.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Futures Account */}
          {assetTab === 'futures' && (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">USD-M Futures</h3>
              <p className="text-xs text-slate-500 mb-3">Trade perpetual futures contracts with leverage. Your futures margin balance.</p>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-300">Margin Balance</span>
                <span className="text-sm font-bold text-slate-200">$0.00</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-300">Available</span>
                <span className="text-sm font-bold text-slate-200">$0.00</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-300">Unrealized PNL</span>
                <span className="text-sm font-bold text-emerald-400">$0.00</span>
              </div>
            </div>
          )}

          {/* Options Account */}
          {assetTab === 'options' && (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Options Account</h3>
              <p className="text-xs text-slate-500 mb-3">Trade European-style crypto options. Your options margin balance.</p>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-300">Margin Balance</span>
                <span className="text-sm font-bold text-slate-200">$0.00</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-300">Open Positions</span>
                <span className="text-sm font-bold text-slate-200">0</span>
              </div>
            </div>
          )}

          {/* Margin Account */}
          {assetTab === 'margin' && (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Margin Account</h3>
              <p className="text-xs text-slate-500 mb-3">Trade with borrowed funds for amplified exposure. Your margin balance.</p>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-300">Margin Balance</span>
                <span className="text-sm font-bold text-slate-200">$0.00</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-300">Borrowed</span>
                <span className="text-sm font-bold text-rose-400">$0.00</span>
              </div>
            </div>
          )}

          {/* Earn Account */}
          {assetTab === 'earn' && (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Earn Portfolio</h3>
              <p className="text-xs text-slate-500 mb-3">Your staked and earned assets from CEO Exchange Earn products.</p>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-300">Total Staked</span>
                <span className="text-sm font-bold text-slate-200">$0.00</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-300">Total Rewards</span>
                <span className="text-sm font-bold text-emerald-400">$0.00</span>
              </div>
            </div>
          )}

          {/* Funding Account */}
          {assetTab === 'funding' && (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Funding Account</h3>
              <p className="text-xs text-slate-500 mb-3">Funds available for transfers between Spot, Futures, and Margin accounts.</p>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-300">Available</span>
                <span className="text-sm font-bold text-slate-200">${usdtBalance.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Earn tab */}
      {tab === 'earn' && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-1 mb-1">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-300">Earn Products</h3>
          </div>
          {EARN_PRODUCTS.map(product => (
            <div
              key={product.coin}
              onClick={() => setSelectedEarn({ coin: product.coin, apy: product.apy, type: product.type, minAmount: product.minAmount })}
              className="bg-slate-900 p-3 rounded-xl border border-slate-800 cursor-pointer hover:border-amber-500/30 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400">
                    {product.coin.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{product.coin}</p>
                    <p className="text-xs text-slate-500">{product.type} · Min {product.minAmount}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-400">{product.apy}%</p>
                  <p className="text-xs text-slate-500">APY</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="space-y-3">
          {/* KYC card */}
          {profile.kyc_status !== 'VERIFIED' && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <BadgeCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-400">Complete Identity Verification</p>
                  <p className="text-xs text-slate-400 mt-1">Verify with Fayda ID, Passport, or Driver's License to unlock all features.</p>
                  <button onClick={() => setShowKyc(true)} className="mt-2 bg-amber-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold">
                    Verify Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Menu items */}
          {[
            { icon: BadgeCheck, label: 'Identity Verification', desc: kycBadge.label, color: 'text-sky-400', action: () => setShowKyc(true) },
            { icon: Gift, label: 'Rewards Hub', desc: 'Claim rewards and bonuses', color: 'text-amber-400' },
            { icon: Globe, label: 'Language', desc: profile.preferred_language, color: 'text-slate-400' },
            { icon: Headphones, label: '24/7 Support', desc: SUPPORT_EMAIL, color: 'text-emerald-400' },
            { icon: FlagCircle, label: 'Report a Problem', desc: 'Send a report in any language', color: 'text-rose-400', action: () => setShowReport(true) },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center gap-3 hover:border-slate-700 transition-colors"
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <div className="flex-1 text-left">
                <p className="text-sm text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          ))}

          {/* Account locked banner */}
          {isLocked && (
            <div className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3">
              <Lock className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-rose-400">Account Under Review</p>
                <p className="text-xs text-slate-400">Your account has been reported and is under investigation. Some features may be restricted until resolved.</p>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">Account Security</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-300">Security Level</span>
                <span className={`text-sm font-bold ${profile.security_level === 'High' ? 'text-emerald-400' : 'text-amber-400'}`}>{profile.security_level}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-300">2FA</span>
                <span className={`text-sm font-bold ${profile.two_fa_enabled ? 'text-emerald-400' : 'text-slate-500'}`}>{profile.two_fa_enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>

          {[
            { icon: Shield, label: 'Security Center', desc: 'Manage 2FA and security level', color: 'text-emerald-400', action: () => setSecurityModal('security') },
            { icon: Lock, label: 'Anti-Phishing Code', desc: profile.anti_phishing_code ? 'Set' : 'Not set', color: 'text-amber-400', action: () => setSecurityModal('antiphishing') },
            { icon: KeyRound, label: 'Change Password', desc: 'Update your account password', color: 'text-sky-400', action: () => setSecurityModal('password') },
            { icon: Lock, label: '6-Digit Passcode', desc: profile.passcode ? 'Set' : 'Not set', color: 'text-amber-400', action: () => setSecurityModal('passcode') },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center gap-3 hover:border-slate-700 transition-colors"
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <div className="flex-1 text-left">
                <p className="text-sm text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          ))}
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => setShowReport(false)}>
          <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
              <h3 className="font-bold text-lg text-[#eaecef]">Report a Problem</h3>
              <button onClick={() => setShowReport(false)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="px-5 py-5 space-y-4">
              {reportSent ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Send className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="font-bold text-[#eaecef]">Report Sent!</p>
                  <p className="text-xs text-[#848e9c] text-center">Your report has been sent to our admin team. We will review it and get back to you via the support inbox.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[#848e9c]">Describe the issue you're experiencing. You can write in any language. Our admin team will review your report and respond via the support inbox.</p>
                  <textarea
                    value={reportText}
                    onChange={e => setReportText(e.target.value)}
                    placeholder="Describe the problem..."
                    rows={5}
                    className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57] resize-none"
                  />
                  <button
                    onClick={submitReport}
                    disabled={reportLoading || !reportText.trim()}
                    className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
                  >
                    {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Report
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedEarn && (
        <EarnModal
          coin={selectedEarn.coin}
          apy={selectedEarn.apy}
          productType={selectedEarn.type}
          minAmount={selectedEarn.minAmount}
          userId={userId}
          usdtBalance={usdtBalance}
          onClose={() => setSelectedEarn(null)}
          onSubscribe={onSubscribeEarn}
        />
      )}
      {showKyc && (
        <KYCModal
          onClose={() => setShowKyc(false)}
          userId={userId}
          onComplete={(status) => {
            if (status === 'pending') {
              onProfileUpdate({ kyc_status: 'PENDING_VERIFICATION' });
            } else if (status === 'verified') {
              onProfileUpdate({ kyc_status: 'VERIFIED' });
            } else if (status === 'rejected') {
              onProfileUpdate({ kyc_status: 'REJECTED' });
            }
          }}
        />
      )}
      {securityModal && (
        <SecurityModal
          type={securityModal}
          onClose={() => setSecurityModal(null)}
          userId={userId}
          currentSecurityLevel={profile.security_level}
          antiPhishingCode={profile.anti_phishing_code || undefined}
          onUpdate={() => {}}
        />
      )}
    </div>
  );
}
