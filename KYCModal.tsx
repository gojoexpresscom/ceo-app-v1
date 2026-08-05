import { useState, useRef, useEffect } from 'react';
import { X, CreditCard, BookUser, Car, Check, AlertCircle, FileImage, ShieldCheck, ScanLine, Clock, Loader2, Lock, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  onClose: () => void;
  userId: string;
  onComplete: (status: string) => void;
};

type KycMethod = 'national_id' | 'passport' | 'license' | null;

type KycStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export default function KYCModal({ onClose, userId, onComplete }: Props) {
  const [method, setMethod] = useState<KycMethod>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatus>('NONE');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState('');

  const [fullName, setFullName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [frontPhotoFile, setFrontPhotoFile] = useState<File | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [backPhotoFile, setBackPhotoFile] = useState<File | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Fetch KYC status from user_verifications table on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('user_verifications')
        .select('status, rejection_reason, full_name')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        if (data.status === 'verified') {
          setKycStatus('VERIFIED');
        } else if (data.status === 'pending') {
          setKycStatus('PENDING');
          setSubmitted(true);
        } else if (data.status === 'rejected') {
          setKycStatus('REJECTED');
          setRejectionReason(data.rejection_reason || 'Your document was rejected. Please try again.');
        }
        if (data.full_name) setFullName(data.full_name);
      }
    })();
  }, [userId]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void, fileSetter: (f: File | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, photo: 'Only image files are allowed' }));
      return;
    }
    setter(file.name);
    fileSetter(file);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!docNumber.trim() || docNumber.replace(/\D/g, '').length < 5)
      errs.docNumber = 'Document number must be at least 5 characters';
    const day = parseInt(dobDay);
    const month = parseInt(dobMonth);
    const year = parseInt(dobYear);
    if (!day || day < 1 || day > 31) errs.dob = 'Enter a valid day (1-31)';
    else if (!month || month < 1 || month > 12) errs.dob = 'Enter a valid month (1-12)';
    else if (!year || year < 1900 || year > new Date().getFullYear() - 18) errs.dob = 'You must be 18 or older';
    if (!frontPhoto) errs.frontPhoto = 'Front photo is required';
    if (method !== 'passport' && !backPhoto) errs.backPhoto = 'Back photo is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const detectManipulation = (file: File): Promise<{ isScreenshot: boolean; isTooSmall: boolean; aspectOk: boolean }> => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const isScreenshot = img.width >= 1080 && img.height >= 1920 && (img.width % 2 === 0 && img.height % 2 === 0);
        const isTooSmall = img.width < 300 || img.height < 300;
        const ratio = img.width / img.height;
        const aspectOk = ratio > 0.8 && ratio < 2.5;
        resolve({ isScreenshot, isTooSmall, aspectOk });
      };
      img.onerror = () => resolve({ isScreenshot: false, isTooSmall: true, aspectOk: false });
      img.src = URL.createObjectURL(file);
    });
  };

  const checkImageQuality = (file: File): Promise<{ ok: boolean; brightness: number; contrast: number }> => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve({ ok: false, brightness: 0, contrast: 0 }); return; }
        const w = Math.min(img.width, 200);
        const h = Math.min(img.height, 200);
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        let sum = 0;
        const vals: number[] = [];
        for (let i = 0; i < imgData.data.length; i += 4) {
          const v = (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
          sum += v;
          vals.push(v);
        }
        const avg = sum / (w * h);
        const variance = vals.reduce((acc, v) => acc + (v - avg) ** 2, 0) / vals.length;
        const contrast = Math.sqrt(variance);
        const ok = avg > 25 && avg < 235 && contrast > 15;
        resolve({ ok, brightness: avg, contrast });
      };
      img.onerror = () => resolve({ ok: false, brightness: 0, contrast: 0 });
      img.src = URL.createObjectURL(file);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    setOcrScanning(true);
    setOcrResult('Preparing document for verification...');

    try {
      // Client-side pre-checks
      setOcrResult('Checking image quality...');
      const frontQ = frontPhotoFile ? await checkImageQuality(frontPhotoFile) : { ok: true, brightness: 128, contrast: 50 };
      const backQ = backPhotoFile && method !== 'passport' ? await checkImageQuality(backPhotoFile) : { ok: true, brightness: 128, contrast: 50 };

      if (!frontQ.ok || (!backQ.ok && method !== 'passport')) {
        await rejectKyc('Image quality too low. Ensure photos are well-lit, not blurry, and show all details clearly. Avoid screenshots or flat images.');
        return;
      }

      setOcrResult('Detecting image authenticity...');
      const frontManip = frontPhotoFile ? await detectManipulation(frontPhotoFile) : { isScreenshot: false, isTooSmall: false, aspectOk: true };
      if (frontManip.isScreenshot || frontManip.isTooSmall || !frontManip.aspectOk) {
        const reason = frontManip.isScreenshot
          ? 'Screenshot detected. Please upload a real photo of your physical document, not a screen capture.'
          : frontManip.isTooSmall
          ? 'Image resolution too low. Use a higher quality photo (at least 300x300 pixels).'
          : 'Image aspect ratio does not match a real ID document. Please photograph the actual document.';
        await rejectKyc(reason);
        return;
      }

      // Call server-side verification edge function
      setOcrResult('Sending document to AI verification engine...');
      const frontBase64 = frontPhotoFile ? await fileToBase64(frontPhotoFile) : '';
      const backBase64 = backPhotoFile && method !== 'passport' ? await fileToBase64(backPhotoFile) : '';

      const docTypeStr = method === 'passport' ? 'passport' : method === 'license' ? 'drivers_license' : 'national_id';

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-kyc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          fullName,
          docNumber,
          dobDay,
          dobMonth,
          dobYear,
          docType: docTypeStr === 'national_id' ? 'NATIONAL_ID' : docTypeStr === 'passport' ? 'PASSPORT' : 'DRIVERS_LICENSE',
          frontPhotoBase64: frontBase64,
          backPhotoBase64: backBase64,
        }),
      });

      if (!response.ok) {
        await rejectKyc('Verification service is temporarily unavailable. Please try again in a moment.');
        return;
      }

      const result = await response.json();

      // Upload photos to storage
      let frontUrl: string | null = null;
      let backUrl: string | null = null;

      if (frontPhotoFile) {
        const frontPath = `kyc/${userId}/${Date.now()}-front-${frontPhotoFile.name}`;
        await supabase.storage.from('post-media').upload(frontPath, frontPhotoFile);
        frontUrl = supabase.storage.from('post-media').getPublicUrl(frontPath).data.publicUrl;
      }
      if (backPhotoFile && method !== 'passport') {
        const backPath = `kyc/${userId}/${Date.now()}-back-${backPhotoFile.name}`;
        await supabase.storage.from('post-media').upload(backPath, backPhotoFile);
        backUrl = supabase.storage.from('post-media').getPublicUrl(backPath).data.publicUrl;
      }

      const dobStr = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;

      if (result.verified) {
        // Insert into user_verifications with status = 'pending'
        await supabase.from('user_verifications').insert({
          user_id: userId,
          full_name: fullName,
          document_type: docTypeStr,
          document_number: docNumber,
          date_of_birth: dobStr,
          front_photo_url: frontUrl,
          back_photo_url: backUrl,
          status: 'pending',
        });

        // Also update profiles for backward compatibility
        await supabase.from('profiles').update({
          kyc_status: 'PENDING_VERIFICATION',
          kyc_full_name: fullName,
          kyc_submitted_at: new Date().toISOString(),
        }).eq('user_id', userId);

        setKycStatus('PENDING');
        setOcrResult('Documents submitted for 24h AI review.');
        setSubmitted(true);
        onComplete('pending');
      } else {
        // Insert rejected record
        await supabase.from('user_verifications').insert({
          user_id: userId,
          full_name: fullName,
          document_type: docTypeStr,
          document_number: docNumber,
          date_of_birth: dobStr,
          front_photo_url: frontUrl,
          back_photo_url: backUrl,
          status: 'rejected',
          rejection_reason: result.reason || 'Document verification failed.',
        });

        await supabase.from('profiles').update({ kyc_status: 'REJECTED', kyc_full_name: fullName }).eq('user_id', userId);
        setKycStatus('REJECTED');
        setRejectionReason(result.reason || 'Document verification failed. Please ensure you are uploading a real photo of your actual document.');
        onComplete('rejected');
      }
    } catch {
      await rejectKyc('Verification failed due to a technical error. Please try again.');
    }

    setOcrScanning(false);
    setLoading(false);
    setSubmitted(true);
  };

  const rejectKyc = async (reason: string) => {
    const docTypeStr = method === 'passport' ? 'passport' : method === 'license' ? 'drivers_license' : 'national_id';
    setKycStatus('REJECTED');
    setRejectionReason(reason);

    const dobStr = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;

    await supabase.from('user_verifications').insert({
      user_id: userId,
      full_name: fullName,
      document_type: docTypeStr,
      document_number: docNumber,
      date_of_birth: dobStr,
      status: 'rejected',
      rejection_reason: reason,
    });

    await supabase.from('profiles').update({ kyc_status: 'REJECTED', kyc_full_name: fullName }).eq('user_id', userId);
    setSubmitted(true);
    setOcrScanning(false);
    setLoading(false);
    onComplete('rejected');
  };

  const renderError = (field: string) => errors[field] && (
    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />{errors[field]}
    </p>
  );

  const inputCls = "w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] placeholder:text-[#474d57] focus:outline-none focus:border-[#f0b90b]/60 transition-colors";

  const docLabel = method === 'passport' ? 'Passport' : method === 'license' ? "Driver's License" : 'National ID';

  // Pending status — locked form
  if (kycStatus === 'PENDING') {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
        <div className="w-full bg-[#181a20] border-t border-[#2b2f36] rounded-t-3xl p-5 pb-8" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#f0b90b]" />
              <h3 className="font-bold text-[#eaecef] text-lg">Identity Verification</h3>
            </div>
            <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
          </div>
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
            <p className="text-lg font-bold text-[#eaecef] mb-1">Verification Pending</p>
            <p className="text-sm text-[#848e9c] mb-4">Under AI Review (up to 24 hours)</p>
            <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 w-full">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-[#848e9c]" />
                <p className="text-xs font-bold text-[#848e9c]">Form Locked</p>
              </div>
              <p className="text-xs text-[#474d57]">Your submission is being processed. You cannot edit or resubmit while under review.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verified status
  if (kycStatus === 'VERIFIED') {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
        <div className="w-full bg-[#181a20] border-t border-[#2b2f36] rounded-t-3xl p-5 pb-8" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-[#eaecef] text-lg">Identity Verification</h3>
            </div>
            <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
          </div>
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-emerald-400 mb-1">Verified</p>
            <p className="text-sm text-[#848e9c]">Your identity has been verified. You now have full access to all features including P2P trading.</p>
          </div>
        </div>
      </div>
    );
  }

  // Rejected status — allow retry
  const showRejection = kycStatus === 'REJECTED' && submitted;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] border-t border-[#2b2f36] rounded-t-3xl p-5 pb-8 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex justify-between items-center mb-5 sticky top-0 bg-[#181a20] -mx-5 px-5 pb-4 border-b border-[#2b2f36] z-10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#f0b90b]" />
            <h3 className="font-bold text-[#eaecef] text-lg">Identity Verification</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>

        {ocrScanning ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Loader2 className="w-12 h-12 text-[#f0b90b] animate-spin mb-4" />
            <p className="text-sm font-bold text-[#eaecef] mb-1">AI Verification in Progress</p>
            <p className="text-xs text-[#848e9c]">{ocrResult}</p>
          </div>
        ) : showRejection ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-rose-400" />
              </div>
              <p className="text-lg font-bold text-[#eaecef] mb-1">Verification Rejected</p>
              <p className="text-sm text-rose-400 mb-4">{rejectionReason}</p>
              <button
                onClick={() => { setKycStatus('NONE'); setSubmitted(false); setFrontPhoto(null); setBackPhoto(null); setFrontPhotoFile(null); setBackPhotoFile(null); setErrors({}); }}
                className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : !method ? (
          <div className="space-y-3">
            <p className="text-xs text-[#848e9c] mb-3">
              Choose the type of ID document to verify your identity. Each document type has a dedicated form.
            </p>
            {[
              { id: 'national_id', icon: CreditCard, title: 'National ID', desc: 'National identity card (front & back required)' },
              { id: 'passport', icon: BookUser, title: 'Passport', desc: 'International passport (front photo page only)' },
              { id: 'license', icon: Car, title: "Driver's License", desc: 'Valid driving license (front & back required)' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id as KycMethod)}
                className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-2xl p-4 flex items-center gap-3 hover:border-[#f0b90b]/40 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f0b90b]/10 flex items-center justify-center flex-shrink-0">
                  <m.icon className="w-5 h-5 text-[#f0b90b]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#eaecef]">{m.title}</p>
                  <p className="text-xs text-[#848e9c] mt-0.5">{m.desc}</p>
                </div>
              </button>
            ))}
            <div className="bg-[#f0b90b]/8 border border-[#f0b90b]/20 rounded-xl p-3 flex gap-2">
              <ShieldCheck className="w-4 h-4 text-[#f0b90b] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#848e9c]">
                We only collect the minimum information required for identity verification. Your data is securely encrypted and never shared with third parties.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              {method === 'national_id' && <CreditCard className="w-4 h-4 text-[#f0b90b]" />}
              {method === 'passport' && <BookUser className="w-4 h-4 text-[#f0b90b]" />}
              {method === 'license' && <Car className="w-4 h-4 text-[#f0b90b]" />}
              <h4 className="text-sm font-bold text-[#eaecef]">{docLabel} Verification</h4>
              <button onClick={() => { setMethod(null); setErrors({}); }} className="ml-auto text-xs text-[#848e9c] underline">Change</button>
            </div>

            {/* Full Name */}
            <div>
              <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Full Name <span className="text-rose-400">*</span></label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name exactly as on your document" className={inputCls} />
              {renderError('fullName')}
            </div>

            {/* Document Number */}
            <div>
              <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">
                {method === 'passport' ? 'Passport Number' : method === 'license' ? "Driver's License Number" : 'National ID Number'} <span className="text-rose-400">*</span>
              </label>
              <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder={`Your ${docLabel.toLowerCase()} number`} className={inputCls} />
              {renderError('docNumber')}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Date of Birth <span className="text-rose-400">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" inputMode="numeric" min={1} max={31} value={dobDay} onChange={e => setDobDay(e.target.value)} placeholder="Day" className={inputCls} />
                <select value={dobMonth} onChange={e => setDobMonth(e.target.value)} className={inputCls}>
                  <option value="">Month</option>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <input type="number" inputMode="numeric" min={1900} max={new Date().getFullYear()} value={dobYear} onChange={e => setDobYear(e.target.value)} placeholder="Year" className={inputCls} />
              </div>
              {renderError('dob')}
            </div>

            {/* Front Photo */}
            <div>
              <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Front Photo of {docLabel} <span className="text-rose-400">*</span></label>
              <label className="flex items-center justify-center gap-3 w-full bg-[#0b0e11] border border-dashed border-[#2b2f36] rounded-xl p-4 cursor-pointer hover:border-[#f0b90b]/40 transition-colors">
                {frontPhoto ? <Check className="w-5 h-5 text-emerald-400" /> : <FileImage className="w-5 h-5 text-[#848e9c]" />}
                <span className="text-sm text-[#848e9c]">{frontPhoto || 'Tap to upload front photo'}</span>
                <input ref={frontInputRef} type="file" accept="image/*" onChange={e => handleFile(e, setFrontPhoto, setFrontPhotoFile)} className="hidden" />
              </label>
              {renderError('frontPhoto')}
            </div>

            {/* Back Photo — only for National ID and Driver's License, NOT Passport */}
            {method !== 'passport' && (
              <div>
                <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Back Photo of {docLabel} <span className="text-rose-400">*</span></label>
                <label className="flex items-center justify-center gap-3 w-full bg-[#0b0e11] border border-dashed border-[#2b2f36] rounded-xl p-4 cursor-pointer hover:border-[#f0b90b]/40 transition-colors">
                  {backPhoto ? <Check className="w-5 h-5 text-emerald-400" /> : <FileImage className="w-5 h-5 text-[#848e9c]" />}
                  <span className="text-sm text-[#848e9c]">{backPhoto || 'Tap to upload back photo'}</span>
                  <input ref={backInputRef} type="file" accept="image/*" onChange={e => handleFile(e, setBackPhoto, setBackPhotoFile)} className="hidden" />
                </label>
                {renderError('backPhoto')}
              </div>
            )}

            {/* Passport note */}
            {method === 'passport' && (
              <div className="bg-sky-500/8 border border-sky-500/20 rounded-xl p-3 flex gap-2">
                <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#848e9c]">Passports only require the front photo page. No back photo needed.</p>
              </div>
            )}

            {/* AI Verification notice */}
            <div className="bg-[#f0b90b]/8 border border-[#f0b90b]/20 rounded-xl p-3 flex gap-2">
              <ScanLine className="w-4 h-4 text-[#f0b90b] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#848e9c]">
                Our AI engine performs multi-layer verification: OCR text extraction, MRZ parsing, name and document number cross-checking, duplicate document detection, screenshot and manipulation detection, and confidence scoring. Verified documents are locked for a 24-hour final review period before activation.
              </p>
            </div>

            <button onClick={submit} disabled={loading} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-4 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><ScanLine className="w-4 h-4" /> Submit & Scan</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
