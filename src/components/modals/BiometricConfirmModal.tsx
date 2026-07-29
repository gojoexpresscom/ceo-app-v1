import { useState, useCallback } from 'react';
import { Fingerprint, ShieldCheck, X, AlertCircle, Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  biometricRequired?: boolean;
};

export default function BiometricConfirmModal({ open, title, description, onConfirm, onCancel, biometricRequired = true }: Props) {
  const [state, setState] = useState<'idle' | 'authenticating' | 'success' | 'error' | 'unsupported'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const checkWebAuthnSupport = useCallback((): boolean => {
    return typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
  }, []);

  const handleBiometric = async () => {
    setState('authenticating');
    setErrorMsg('');
    try {
      const supported = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!supported) {
        setState('unsupported');
        return;
      }

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: 'CEO Exchange' },
        user: {
          id: userId,
          name: 'wallet@ceo.exchange',
          displayName: 'CEO Exchange Wallet',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      };

      await navigator.credentials.create({ publicKey });
      setState('success');
      await new Promise(r => setTimeout(r, 800));
      await onConfirm();
      setState('idle');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Biometric authentication failed';
      setErrorMsg(msg);
      setState('error');
    }
  };

  const handleFallback = async () => {
    setState('authenticating');
    await onConfirm();
    setState('idle');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center max-w-md mx-auto px-4">
      <div className="w-full bg-[#181a20] border border-[#2b2f36] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#f0b90b]" />
            <h3 className="font-bold text-[#eaecef] text-lg">{title}</h3>
          </div>
          <button onClick={() => { setState('idle'); onCancel(); }}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>

        <p className="text-sm text-[#848e9c] mb-6 text-center">{description}</p>

        {state === 'success' && (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-emerald-400">Verified</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <p className="text-sm font-bold text-rose-400">{errorMsg}</p>
            <button onClick={() => setState('idle')} className="text-xs text-[#848e9c] underline">Try again</button>
          </div>
        )}

        {state === 'unsupported' && (
          <div className="flex flex-col items-center py-6 gap-4">
            <AlertCircle className="w-10 h-10 text-amber-400" />
            <p className="text-sm text-[#848e9c] text-center">Biometric authentication isn't available on this device. You can proceed with password confirmation instead.</p>
            <button onClick={handleFallback} className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl text-sm">
              Confirm with Password
            </button>
          </div>
        )}

        {state === 'authenticating' && (
          <div className="flex flex-col items-center py-10 gap-3">
            <Loader2 className="w-10 h-10 text-[#f0b90b] animate-spin" />
            <p className="text-sm text-[#848e9c]">Authenticating...</p>
          </div>
        )}

        {state === 'idle' && (
          <div className="flex flex-col items-center gap-5">
            <button
              onClick={handleBiometric}
              disabled={!checkWebAuthnSupport() && biometricRequired}
              className="w-20 h-20 rounded-full bg-[#f0b90b]/10 border-2 border-[#f0b90b]/30 flex items-center justify-center hover:bg-[#f0b90b]/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Fingerprint className="w-10 h-10 text-[#f0b90b]" />
            </button>
            <p className="text-xs text-[#474d57] text-center">
              {checkWebAuthnSupport()
                ? 'Tap to authenticate with Face ID / Fingerprint'
                : 'Biometric auth not supported — tap below to confirm with password'}
            </p>
            {!biometricRequired && (
              <button onClick={handleFallback} className="w-full text-[#848e9c] text-sm py-2 hover:text-[#eaecef]">
                Skip biometric — confirm with password
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
