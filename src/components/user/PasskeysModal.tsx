import { useState } from 'react';
import { X, Fingerprint, Plus, Trash2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = { userId: string; email: string; onClose: () => void; onUpdate: (count: number) => void };

type Passkey = { id: string; name: string; created_at: string };

export default function PasskeysModal({ userId, email, onClose, onUpdate }: Props) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const registerPasskey = async () => {
    setError('');
    if (!window.PublicKeyCredential) { setError('Your browser does not support Passkeys/WebAuthn. Please use a modern browser.'); return; }
    setRegistering(true);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'CEO Exchange', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(userId),
            name: email,
            displayName: email,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },  // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: { userVerification: 'preferred', residentKey: 'preferred' },
          timeout: 60000,
          attestation: 'none',
        },
      }) as PublicKeyCredential | null;

      if (!credential) throw new Error('Registration cancelled');

      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      const deviceName = getDeviceName();

      // Store credential ID in DB (we store ID only — server would normally store full credential)
      await supabase.from('passkeys' as never).insert({ user_id: userId, credential_id: credId, name: deviceName });
      await supabase.from('profiles').update({ passkey_count: (passkeys.length + 1) }).eq('user_id', userId);

      localStorage.setItem('ceo_passkey_email', email);

      const newKey: Passkey = { id: credId, name: deviceName, created_at: new Date().toISOString() };
      setPasskeys(prev => [...prev, newKey]);
      onUpdate(passkeys.length + 1);
      setSuccess('Passkey registered successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      if (message.includes('cancelled') || message.includes('abort')) {
        setError('Registration was cancelled.');
      } else if (
        message.includes('publickey-credentials-create') ||
        message.includes('Permissions Policy') ||
        message.includes('not allowed') ||
        message.includes('cross-origin')
      ) {
        setError(
          'Passkeys are not supported in this environment (browser iframe or Permissions Policy restriction). ' +
          'To use passkeys, open CEO Exchange in a full browser tab (not embedded). ' +
          'Your account is still protected by your password and 2FA.'
        );
      } else {
        setError('Could not register passkey: ' + message);
      }
    } finally {
      setRegistering(false);
    }
  };

  const removePasskey = async (id: string) => {
    await supabase.from('passkeys' as never).delete().eq('user_id', userId).eq('credential_id', id);
    const next = passkeys.filter(p => p.id !== id);
    setPasskeys(next);
    onUpdate(next.length);
  };

  const getDeviceName = (): string => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android Device';
    if (/iphone/i.test(ua)) return 'iPhone';
    if (/ipad/i.test(ua)) return 'iPad';
    if (/mac/i.test(ua)) return 'Mac (Touch ID)';
    if (/windows/i.test(ua)) return 'Windows Device';
    return 'Web Browser';
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Passkeys</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-5">
          <div className="bg-[#1e2026] rounded-xl p-4 flex gap-3">
            <Fingerprint className="w-6 h-6 text-[#f0b90b] flex-shrink-0" />
            <p className="text-sm text-[#848e9c] leading-relaxed">Passkeys use your device's biometrics (fingerprint, Face ID) or hardware security key for instant, passwordless sign-in.</p>
          </div>

          {success && <p className="text-sm text-emerald-400 flex items-center gap-2"><Check className="w-4 h-4" />{success}</p>}
          {error && <p className="text-sm text-rose-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}

          {passkeys.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[#848e9c] font-bold uppercase tracking-wider">Registered Passkeys</p>
              {passkeys.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="w-5 h-5 text-[#f0b90b]" />
                    <div>
                      <p className="text-sm font-semibold text-[#eaecef]">{p.name}</p>
                      <p className="text-xs text-[#848e9c]">Added {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button onClick={() => removePasskey(p.id)} className="text-rose-400 hover:text-rose-300 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {passkeys.length === 0 && (
            <div className="text-center py-8 text-[#848e9c]">
              <Fingerprint className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No passkeys registered yet</p>
            </div>
          )}

          <button onClick={registerPasskey} disabled={registering} className="w-full flex items-center justify-center gap-2 bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-60 text-black font-bold py-3.5 rounded-xl">
            {registering ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Plus className="w-5 h-5" /> Add Passkey</>}
          </button>
          <p className="text-xs text-[#848e9c] text-center">Your device must support biometric authentication or have a hardware security key.</p>
        </div>
      </div>
    </div>
  );
}
