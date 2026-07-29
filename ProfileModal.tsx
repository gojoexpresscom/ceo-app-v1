import { useState } from 'react';
import { X, Shield, Lock, BadgeCheck, AlertTriangle, Check, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ModalType = 'security' | 'kyc' | 'antiphishing' | null;

type Props = {
  type: ModalType;
  onClose: () => void;
  userId: string;
  currentSecurityLevel: string;
  currentKycStatus: string;
  onUpdate: (updates: { securityLevel?: string; kycStatus?: string; antiPhishingCode?: string }) => void;
};

export default function ProfileModal({ type, onClose, userId, currentSecurityLevel, currentKycStatus, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Security center state
  const [twoFA, setTwoFA] = useState(currentSecurityLevel === 'High');
  const [withdrawalLock, setWithdrawalLock] = useState(false);

  // KYC state
  const [kycName, setKycName] = useState('');
  const [kycId, setKycId] = useState('');
  const [kycStep, setKycStep] = useState(1);

  // Anti-phishing state
  const [phishingCode, setPhishingCode] = useState('');

  const handleSave = async (updates: { securityLevel?: string; kycStatus?: string; antiPhishingCode?: string }) => {
    setLoading(true);
    await supabase.from('profiles').update({
      security_level: updates.securityLevel || currentSecurityLevel,
      kyc_status: updates.kycStatus || currentKycStatus,
      anti_phishing_code: updates.antiPhishingCode || null,
    }).eq('user_id', userId);
    setLoading(false);
    setSuccess(true);
    onUpdate(updates);
    setTimeout(onClose, 1200);
  };

  if (!type) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-slate-900 border border-slate-800 rounded-t-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-200 text-lg flex items-center gap-2">
            {type === 'security' && <><Shield className="w-5 h-5 text-emerald-400" /> Security Center</>}
            {type === 'kyc' && <><BadgeCheck className="w-5 h-5 text-sky-400" /> KYC Verification</>}
            {type === 'antiphishing' && <><Lock className="w-5 h-5 text-amber-400" /> Anti-Phishing Code</>}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {success ? (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            <Check className="w-5 h-5" /> Saved Successfully!
          </div>
        ) : (
          <>
            {/* Security Center */}
            {type === 'security' && (
              <div className="space-y-4">
                <div className="bg-slate-950 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">2FA Authentication</p>
                    <p className="text-xs text-slate-400 mt-0.5">Add an extra layer of security to your account</p>
                  </div>
                  <button
                    onClick={() => setTwoFA(!twoFA)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${twoFA ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${twoFA ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="bg-slate-950 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Withdrawal Lock (24h)</p>
                    <p className="text-xs text-slate-400 mt-0.5">Pause withdrawals for 24 hours if suspicious activity</p>
                  </div>
                  <button
                    onClick={() => setWithdrawalLock(!withdrawalLock)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${withdrawalLock ? 'bg-amber-500' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${withdrawalLock ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="bg-slate-950 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-2">Current Security Level</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div className={`h-full rounded-full ${twoFA ? 'w-full bg-emerald-500' : 'w-1/2 bg-amber-500'}`} />
                    </div>
                    <span className={`text-xs font-bold ${twoFA ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {twoFA ? 'High' : 'Medium'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleSave({ securityLevel: twoFA ? 'High' : 'Medium' })}
                  disabled={loading}
                  className="w-full bg-emerald-500 text-slate-950 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Security Settings'}
                </button>
              </div>
            )}

            {/* KYC Verification */}
            {type === 'kyc' && (
              <div className="space-y-4">
                {currentKycStatus === 'VERIFIED' ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <BadgeCheck className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-emerald-400">Identity Verified</p>
                    <p className="text-xs text-slate-400 mt-1">Your account is fully verified. All features unlocked.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      {[1, 2, 3].map(step => (
                        <div key={step} className={`flex-1 h-1 rounded-full ${kycStep >= step ? 'bg-amber-500' : 'bg-slate-700'}`} />
                      ))}
                    </div>
                    {kycStep === 1 && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-400">Step 1: Personal Information</p>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Full Legal Name</label>
                          <input type="text" value={kycName} onChange={e => setKycName(e.target.value)} placeholder="Amanuel Birhanu" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">ID Number</label>
                          <input type="text" value={kycId} onChange={e => setKycId(e.target.value)} placeholder="National ID / Passport" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200" />
                        </div>
                        <button onClick={() => setKycStep(2)} disabled={!kycName || !kycId} className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-sm disabled:opacity-50">Continue</button>
                      </div>
                    )}
                    {kycStep === 2 && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-400">Step 2: Document Upload</p>
                        <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center">
                          <Phone className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">Upload front of your ID</p>
                          <button className="mt-2 text-xs text-amber-400 font-semibold">Choose File</button>
                        </div>
                        <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center">
                          <Phone className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">Upload back of your ID</p>
                          <button className="mt-2 text-xs text-amber-400 font-semibold">Choose File</button>
                        </div>
                        <button onClick={() => setKycStep(3)} className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-sm">Continue</button>
                      </div>
                    )}
                    {kycStep === 3 && (
                      <div className="space-y-3 text-center">
                        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                        <p className="text-sm text-slate-200">Confirm your information is correct before submitting.</p>
                        <div className="bg-slate-950 rounded-xl p-3 text-left text-xs space-y-1">
                          <p className="text-slate-400">Name: <span className="text-slate-200">{kycName}</span></p>
                          <p className="text-slate-400">ID: <span className="text-slate-200">{kycId}</span></p>
                        </div>
                        <button onClick={() => handleSave({ kycStatus: 'VERIFIED' })} disabled={loading} className="w-full bg-emerald-500 text-slate-950 py-3 rounded-xl font-bold text-sm disabled:opacity-50">
                          {loading ? 'Submitting...' : 'Submit for Verification'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Anti-Phishing Code */}
            {type === 'antiphishing' && (
              <div className="space-y-4">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-xs text-amber-400/80">
                    Set a unique anti-phishing code. CEO Exchange will include this code in all legitimate emails so you can verify authenticity.
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Anti-Phishing Code (4-16 characters)</label>
                  <input
                    type="text"
                    value={phishingCode}
                    onChange={e => setPhishingCode(e.target.value)}
                    placeholder="e.g. CEO-Safe-2024"
                    maxLength={16}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200"
                  />
                </div>
                <button
                  onClick={() => handleSave({ antiPhishingCode: phishingCode })}
                  disabled={loading || phishingCode.length < 4}
                  className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Set Anti-Phishing Code'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
