import { useState } from 'react';
import { X, Send, Check, AlertCircle, ChevronDown, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  userId: string;
  onClose: () => void;
  onVerified: (phone: string, countryCode: string) => void;
};

const COUNTRY_CODES = [
  { code: '+1', name: 'United States/Canada', flag: '🇺🇸' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+251', name: 'Ethiopia', flag: '🇪🇹' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+233', name: 'Ghana', flag: '🇬🇭' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+255', name: 'Tanzania', flag: '🇹🇿' },
  { code: '+256', name: 'Uganda', flag: '🇺🇬' },
  { code: '+260', name: 'Zambia', flag: '🇿🇲' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬' },
  { code: '+212', name: 'Morocco', flag: '🇲🇦' },
  { code: '+216', name: 'Tunisia', flag: '🇹🇳' },
  { code: '+213', name: 'Algeria', flag: '🇩🇿' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+233', name: 'Ghana', flag: '🇬🇭' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+7', name: 'Russia/Kazakhstan', flag: '🇷🇺' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+972', name: 'Israel', flag: '🇮🇱' },
  { code: '+965', name: 'Kuwait', flag: '🇰🇼' },
  { code: '+973', name: 'Bahrain', flag: '🇧🇭' },
  { code: '+974', name: 'Qatar', flag: '🇶🇦' },
  { code: '+977', name: 'Nepal', flag: '🇳🇵' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+95', name: 'Myanmar', flag: '🇲🇲' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: '+886', name: 'Taiwan', flag: '🇹🇼' },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+51', name: 'Peru', flag: '🇵🇪' },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
  { code: '+598', name: 'Uruguay', flag: '🇺🇾' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: '+30', name: 'Greece', flag: '🇬🇷' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: '+420', name: 'Czech Republic', flag: '🇨🇿' },
  { code: '+36', name: 'Hungary', flag: '🇭🇺' },
  { code: '+40', name: 'Romania', flag: '🇷🇴' },
  { code: '+380', name: 'Ukraine', flag: '🇺🇦' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿' },
];

export default function PhoneVerifyModal({ userId, onClose, onVerified }: Props) {
  const [step, setStep] = useState(1);
  const [countryCode, setCountryCode] = useState('+1');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const sendCode = async () => {
    setError('');
    if (!phone.trim() || phone.length < 6) {
      setError('Please enter a valid phone number');
      return;
    }
    setSending(true);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const fullPhone = `${countryCode}${phone}`;

    await supabase.from('phone_otp_codes').insert({
      user_id: userId, code: otp, phone: fullPhone, country_code: countryCode, expires_at: expires,
    });

    // In production this would call an SMS gateway. For now, the code is stored in DB.
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          userId, type: 'SECURITY',
          subject: 'CEO Exchange: Phone Verification Code',
          message: `Your phone verification code is: ${otp}. This code expires in 10 minutes. Phone: ${fullPhone}`,
        }),
      });
    } catch {
      // Code stored in DB regardless
    }

    setSending(false);
    setStep(2);
  };

  const verifyCode = async () => {
    setError('');
    setVerifying(true);
    const fullPhone = `${countryCode}${phone}`;

    const { data } = await supabase
      .from('phone_otp_codes')
      .select('code, expires_at, used')
      .eq('user_id', userId)
      .eq('phone', fullPhone)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) { setError('No code found. Please request a new code.'); setVerifying(false); return; }
    if (new Date(data.expires_at) < new Date()) { setError('Code expired. Please request a new code.'); setVerifying(false); return; }
    if (data.code !== code.trim()) { setError('Invalid code. Please try again.'); setVerifying(false); return; }

    await supabase.from('phone_otp_codes').update({ used: true }).eq('user_id', userId).eq('code', data.code);
    await supabase.from('profiles').update({ phone: fullPhone, phone_verified: true, country_code: countryCode }).eq('user_id', userId);

    setSuccess(true);
    setVerifying(false);
    onVerified(fullPhone, countryCode);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl p-5 pb-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[#eaecef]">Phone Verification</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-[#eaecef]">Phone Verified!</p>
            <p className="text-sm text-[#848e9c] text-center">{countryCode}{phone}</p>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#848e9c] mb-1">Country Code</p>
              <button
                onClick={() => setShowCountryPicker(!showCountryPicker)}
                className="w-full flex items-center justify-between bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 hover:border-[#f0b90b]"
              >
                <span className="text-sm text-[#eaecef]">
                  {COUNTRY_CODES.find(c => c.code === countryCode)?.flag} {countryCode} {COUNTRY_CODES.find(c => c.code === countryCode)?.name}
                </span>
                <ChevronDown className={`w-4 h-4 text-[#848e9c] transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
              </button>
              {showCountryPicker && (
                <div className="mt-1 bg-[#0b0e11] border border-[#2b2f36] rounded-xl max-h-60 overflow-y-auto">
                  {COUNTRY_CODES.map(c => (
                    <button
                      key={c.code + c.name}
                      onClick={() => { setCountryCode(c.code); setShowCountryPicker(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1e2026] text-left ${countryCode === c.code ? 'bg-[#1e2026]' : ''}`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <span className="text-sm text-[#eaecef] flex-1">{c.name}</span>
                      <span className="text-sm text-[#848e9c]">{c.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-[#848e9c] mb-1">Phone Number</p>
              <div className="flex items-center gap-2">
                <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#848e9c]" />
                  <span className="text-sm text-[#eaecef]">{countryCode}</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter phone number"
                  className="flex-1 bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]"
                />
              </div>
            </div>
            {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
            <p className="text-xs text-[#848e9c]">A 6-digit verification code will be sent to your phone number.</p>
            <button
              onClick={sendCode}
              disabled={sending}
              className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              {sending ? 'Sending...' : <><Send className="w-4 h-4" /> Send Code</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#848e9c]">Code sent to <strong className="text-[#eaecef]">{countryCode}{phone}</strong></p>
            <div>
              <p className="text-xs text-[#848e9c] mb-1">Enter Verification Code</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-2xl font-bold text-center text-[#eaecef] tracking-[0.5em] outline-none focus:border-[#f0b90b] placeholder-[#474d57]"
              />
            </div>
            {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
            <button
              onClick={verifyCode}
              disabled={verifying || code.length !== 6}
              className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl"
            >
              {verifying ? 'Verifying...' : 'Verify Phone'}
            </button>
            <button onClick={() => setStep(1)} className="w-full text-[#848e9c] text-sm py-2">Change number</button>
          </div>
        )}
      </div>
    </div>
  );
}
