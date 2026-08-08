import { useState } from 'react';
import {
  Mail,
  KeyRound,
  Fingerprint,
  ShieldAlert,
  Lock,
  Wallet,
  Key,
  MonitorSmartphone,
  Cog,
  LockKeyhole,
  Loader2,
} from 'lucide-react';
import type { UserProfile } from '@/types';
import { Row, Toggle, SectionCard, Modal, Input, PrimaryButton, useModalState, StatusBadge } from './ui';
import { supabase } from '@/lib/supabase';
import { generateTOTPSecret, verifyTOTP, getOtpAuthURI } from '@/lib/totp';

type UpdateFn = (patch: Partial<UserProfile>) => Promise<{ error: string | null }>;

export function SecurityTab({
  profile,
  update,
}: {
  profile: UserProfile;
  update: UpdateFn;
}) {
  const [toast, setToast] = useState<string | null>(null);

  const emailModal = useModalState();
  const google2faModal = useModalState();
  const passkeyModal = useModalState();
  const fundPasswordModal = useModalState();
  const changePasswordModal = useModalState();
  const txApprovalModal = useModalState();
  const withdrawalSecurityModal = useModalState();
  const trustedDevicesModal = useModalState();
  const accountSettingsModal = useModalState();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleToggle = async (field: keyof UserProfile, value: boolean, label: string) => {
    const res = await update({ [field]: value } as Partial<UserProfile>);
    if (res.error) {
      showToast('Failed to update');
    } else {
      showToast(`${label} ${value ? 'enabled' : 'disabled'}`);
    }
  };

  return (
    <div className="space-y-1">
      {toast && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-lg bg-[#2b313a] px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}

      <SectionCard title="Account Security">
        <Row label="Email" value={profile.email} onClick={emailModal.openModal} />
        <Row
          label="Google 2FA Authentication"
          badge={
            <Toggle
              checked={profile.two_fa_enabled}
              onChange={(v) => {
                if (v) google2faModal.openModal();
                else handleToggle('two_fa_enabled', false, 'Google 2FA');
              }}
            />
          }
          rightIcon={false}
        />
        <Row label="Passkeys" value={profile.passkey_count ? `${profile.passkey_count} registered` : 'None'} onClick={passkeyModal.openModal} />
      </SectionCard>

      <SectionCard title="Security Settings">
        <Row
          label="Fund Password"
          badge={<StatusBadge status={profile.fund_password_set ? 'set' : 'not_set'} />}
          onClick={fundPasswordModal.openModal}
        />
        <Row
          label="Secure Transaction Approval"
          badge={
            <Toggle
              checked={profile.secure_tx_approval ?? false}
              onChange={(v) => handleToggle('secure_tx_approval', v, 'Secure Transaction Approval')}
            />
          }
          rightIcon={false}
        />
        <Row label="Withdrawal Security" onClick={withdrawalSecurityModal.openModal} />
        <Row label="Change Password" onClick={changePasswordModal.openModal} />
      </SectionCard>

      <SectionCard title="Devices & Access">
        <Row label="Trusted Devices" onClick={trustedDevicesModal.openModal} />
        <Row label="Account Settings" onClick={accountSettingsModal.openModal} />
        <Row
          label="App Lock"
          badge={
            <Toggle
              checked={profile.app_lock_enabled ?? false}
              onChange={(v) => handleToggle('app_lock_enabled', v, 'App Lock')}
            />
          }
          rightIcon={false}
        />
      </SectionCard>

      <EmailModal modal={emailModal} current={profile.email} update={update} showToast={showToast} />
      <Google2FAModal modal={google2faModal} profile={profile} update={update} showToast={showToast} />
      <PasskeyModal modal={passkeyModal} profile={profile} update={update} showToast={showToast} />
      <FundPasswordModal modal={fundPasswordModal} update={update} showToast={showToast} />
      <ChangePasswordModal modal={changePasswordModal} showToast={showToast} />
      <TxApprovalModal modal={txApprovalModal} profile={profile} update={update} showToast={showToast} />
      <WithdrawalSecurityModal modal={withdrawalSecurityModal} profile={profile} update={update} showToast={showToast} />
      <TrustedDevicesModal modal={trustedDevicesModal} showToast={showToast} />
      <AccountSettingsModal modal={accountSettingsModal} profile={profile} update={update} showToast={showToast} />
    </div>
  );
}

function EmailModal({
  modal,
  current,
  update,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  current: string;
  update: UpdateFn;
  showToast: (m: string) => void;
}) {
  const [step, setStep] = useState<'current_otp' | 'new_email' | 'new_otp'>('current_otp');
  const [otp, setOtp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const sendOtp = async (email: string) => {
    setSaving(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem('ceo_email_otp', code);
    const { error } = await supabase.functions.invoke('send-otp', {
      body: { email, code },
    });
    setSaving(false);
    if (error) {
      showToast('Failed to send OTP. Please try again.');
      return false;
    }
    return true;
  };

  const handleStart = async () => {
    const ok = await sendOtp(current);
    if (ok) {
      showToast('OTP sent to your current email');
      setStep('current_otp');
    }
  };

  const verifyCurrentOtp = () => {
    const stored = sessionStorage.getItem('ceo_email_otp');
    if (otp !== stored) {
      showToast('Incorrect OTP. Please try again.');
      return;
    }
    setOtp('');
    setStep('new_email');
  };

  const submitNewEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      showToast('Enter a valid email address');
      return;
    }
    const ok = await sendOtp(newEmail);
    if (ok) {
      showToast('OTP sent to your new email');
      setStep('new_otp');
      setOtp('');
    }
  };

  const verifyNewOtp = async () => {
    const stored = sessionStorage.getItem('ceo_email_otp');
    if (otp !== stored) {
      showToast('Incorrect OTP. Please try again.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      showToast('Failed to update email');
      setSaving(false);
      return;
    }
    const res = await update({ email: newEmail });
    setSaving(false);
    if (res.error) {
      showToast('Email changed in auth but profile update failed');
    } else {
      showToast('Email updated successfully');
      modal.closeModal();
      resetForm();
    }
  };

  const resetForm = () => {
    setStep('current_otp');
    setOtp('');
    setNewEmail('');
    setSaving(false);
    sessionStorage.removeItem('ceo_email_otp');
  };

  return (
    <Modal open={modal.open} onClose={() => { modal.closeModal(); resetForm(); }} title="Change Email">
      {step === 'current_otp' && (
        <>
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
            <Mail className="h-4 w-4" />
            An OTP will be sent to your current email: {current}
          </div>
          <Input label="6-digit OTP" value={otp} onChange={setOtp} placeholder="Enter OTP" />
          <PrimaryButton onClick={verifyCurrentOtp} disabled={otp.length !== 6}>
            Verify Current Email
          </PrimaryButton>
          <button onClick={handleStart} disabled={saving} className="mt-2 w-full text-xs text-yellow-500 hover:text-yellow-400">
            {saving ? 'Sending...' : 'Resend OTP'}
          </button>
        </>
      )}
      {step === 'new_email' && (
        <>
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
            <Mail className="h-4 w-4" />
            Current email verified. Enter your new email.
          </div>
          <Input label="New Email Address" value={newEmail} onChange={setNewEmail} placeholder="Enter new email" />
          <PrimaryButton onClick={submitNewEmail} disabled={saving || !newEmail}>
            {saving ? 'Sending OTP...' : 'Send OTP to New Email'}
          </PrimaryButton>
        </>
      )}
      {step === 'new_otp' && (
        <>
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
            <Mail className="h-4 w-4" />
            Enter the OTP sent to {newEmail}
          </div>
          <Input label="6-digit OTP" value={otp} onChange={setOtp} placeholder="Enter OTP" />
          <PrimaryButton onClick={verifyNewOtp} disabled={saving || otp.length !== 6}>
            {saving ? 'Saving...' : 'Confirm New Email'}
          </PrimaryButton>
        </>
      )}
    </Modal>
  );
}

function Google2FAModal({
  modal,
  profile,
  update,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  profile: UserProfile;
  update: UpdateFn;
  showToast: (m: string) => void;
}) {
  const [step, setStep] = useState<'setup' | 'verify' | 'disable'>('setup');
  const [secret, setSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  const startSetup = () => {
    const newSecret = generateTOTPSecret();
    setSecret(newSecret);
    setQrUrl(getOtpAuthURI(newSecret, profile.email));
    setStep('verify');
  };

  const enable2FA = async () => {
    if (code.length !== 6) {
      showToast('Enter a 6-digit code');
      return;
    }
    if (!verifyTOTP(secret, code)) {
      showToast('Incorrect code. Please try again.');
      return;
    }
    setSaving(true);
    const res = await update({ two_fa_enabled: true, totp_secret: secret });
    setSaving(false);
    if (res.error) {
      showToast('Failed to enable 2FA');
    } else {
      showToast('2FA enabled successfully');
      modal.closeModal();
      resetForm();
    }
  };

  const disable2FA = async () => {
    if (code.length !== 6) {
      showToast('Enter a 6-digit code');
      return;
    }
    if (!profile.totp_secret || !verifyTOTP(profile.totp_secret, code)) {
      showToast('Incorrect code. Please try again.');
      return;
    }
    setSaving(true);
    const res = await update({ two_fa_enabled: false, totp_secret: null });
    setSaving(false);
    if (res.error) {
      showToast('Failed to disable 2FA');
    } else {
      showToast('2FA disabled');
      modal.closeModal();
      resetForm();
    }
  };

  const resetForm = () => {
    setStep('setup');
    setSecret('');
    setQrUrl('');
    setCode('');
    setSaving(false);
  };

  const isEnabled = profile.two_fa_enabled;

  return (
    <Modal open={modal.open} onClose={() => { modal.closeModal(); resetForm(); }} title="Google 2FA Authentication">
      {!isEnabled && step === 'setup' && (
        <>
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
            <KeyRound className="h-4 w-4" />
            Scan the QR code with Google Authenticator, then enter the 6-digit code.
          </div>
          <PrimaryButton onClick={startSetup}>Generate 2FA Secret</PrimaryButton>
        </>
      )}
      {!isEnabled && step === 'verify' && (
        <>
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
            <KeyRound className="h-4 w-4" />
            Add this secret to your authenticator app, then enter the 6-digit code.
          </div>
          <div className="mb-3 rounded-lg bg-[#2b313a] p-3">
            <p className="mb-1 text-xs text-gray-400">Secret (or scan a QR app with this):</p>
            <p className="break-all font-mono text-sm text-yellow-400">{secret}</p>
            <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs text-blue-400 hover:text-blue-300">
              Open QR link
            </a>
          </div>
          <Input label="6-digit Code" value={code} onChange={setCode} placeholder="Enter code from authenticator" />
          <PrimaryButton onClick={enable2FA} disabled={saving || code.length !== 6}>
            {saving ? 'Enabling...' : 'Verify & Enable'}
          </PrimaryButton>
        </>
      )}
      {isEnabled && (
        <>
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
            <KeyRound className="h-4 w-4" />
            2FA is currently enabled. Enter your authenticator code to disable.
          </div>
          <Input label="6-digit Code" value={code} onChange={setCode} placeholder="Enter 2FA code" />
          <PrimaryButton onClick={disable2FA} disabled={saving || code.length !== 6}>
            {saving ? 'Disabling...' : 'Disable 2FA'}
          </PrimaryButton>
        </>
      )}
    </Modal>
  );
}

function PasskeyModal({
  modal,
  profile,
  update,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  profile: UserProfile;
  update: UpdateFn;
  showToast: (m: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  const registerPasskey = async () => {
    if (!window.PublicKeyCredential) {
      showToast('Passkeys are not supported on this device');
      return;
    }
    setSaving(true);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = new Uint8Array(profile.user_id.replace(/-/g, '').match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'CEO Exchange' },
          user: { id: userId, name: profile.email, displayName: profile.nickname || profile.email },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: { userVerification: 'preferred' },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (credential) {
        const newCount = (profile.passkey_count ?? 0) + 1;
        const res = await update({ passkey_count: newCount });
        if (res.error) {
          showToast('Failed to save passkey');
        } else {
          showToast('Passkey registered successfully');
        }
      }
    } catch {
      showToast('Passkey registration cancelled or failed');
    }
    setSaving(false);
  };

  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Passkeys">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Fingerprint className="h-4 w-4" />
        Add a passkey to sign in faster with Face ID, Touch ID, or a security key.
      </div>
      <div className="mb-3 rounded-lg bg-[#2b313a] p-3 text-xs text-gray-400">
        {profile.passkey_count ? `${profile.passkey_count} passkey(s) registered.` : 'No passkeys registered yet.'}
      </div>
      <PrimaryButton onClick={registerPasskey} disabled={saving}>
        {saving ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Registering...</span> : 'Add Passkey'}
      </PrimaryButton>
    </Modal>
  );
}

function FundPasswordModal({
  modal,
  update,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  update: UpdateFn;
  showToast: (m: string) => void;
}) {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (pwd.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }
    if (pwd !== confirm) {
      showToast('Passwords do not match');
      return;
    }
    setSaving(true);
    const res = await update({ fund_password_set: true, passcode: pwd });
    setSaving(false);
    if (res.error) {
      showToast('Failed to set fund password');
    } else {
      showToast('Fund password set');
      modal.closeModal();
      setPwd('');
      setConfirm('');
    }
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Fund Password">
      <Input label="New Fund Password" value={pwd} onChange={setPwd} type="password" placeholder="Enter fund password" />
      <Input label="Confirm Password" value={confirm} onChange={setConfirm} type="password" placeholder="Re-enter password" />
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Lock className="h-4 w-4" />
        Required for withdrawals and fund transfers.
      </div>
      <PrimaryButton onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Set Fund Password'}
      </PrimaryButton>
    </Modal>
  );
}

function ChangePasswordModal({
  modal,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  showToast: (m: string) => void;
}) {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!oldPwd || !newPwd || !confirm) {
      showToast('Fill in all fields');
      return;
    }
    if (newPwd.length < 8) {
      showToast('New password must be at least 8 characters');
      return;
    }
    if (newPwd !== confirm) {
      showToast('New passwords do not match');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSaving(false);
    if (error) {
      showToast('Failed to change password. Please try again.');
      return;
    }
    showToast('Password changed successfully');
    modal.closeModal();
    setOldPwd('');
    setNewPwd('');
    setConfirm('');
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Change Password">
      <Input label="Current Password" value={oldPwd} onChange={setOldPwd} type="password" placeholder="Enter current password" />
      <Input label="New Password" value={newPwd} onChange={setNewPwd} type="password" placeholder="Enter new password" />
      <Input label="Confirm New Password" value={confirm} onChange={setConfirm} type="password" placeholder="Re-enter new password" />
      <PrimaryButton onClick={save} disabled={saving}>
        {saving ? 'Changing...' : 'Change Password'}
      </PrimaryButton>
    </Modal>
  );
}

function TxApprovalModal({
  modal,
  profile,
  update,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  profile: UserProfile;
  update: UpdateFn;
  showToast: (m: string) => void;
}) {
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Secure Transaction Approval">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <ShieldAlert className="h-4 w-4" />
        Require fund password approval for all transactions.
      </div>
      <div className="mb-3 flex items-center justify-between rounded-lg bg-[#2b313a] px-3 py-3">
        <span className="text-sm text-gray-300">Require for all transfers</span>
        <Toggle
          checked={profile.secure_tx_approval ?? false}
          onChange={(v) => update({ secure_tx_approval: v }).then((r) => showToast(r.error ? 'Failed' : 'Updated'))}
        />
      </div>
      <PrimaryButton onClick={modal.closeModal}>Done</PrimaryButton>
    </Modal>
  );
}

function WithdrawalSecurityModal({
  modal,
  profile,
  update,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  profile: UserProfile;
  update: UpdateFn;
  showToast: (m: string) => void;
}) {
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Withdrawal Security">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Wallet className="h-4 w-4" />
        Configure withdrawal protection settings.
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-[#2b313a] px-3 py-3">
          <span className="text-sm text-gray-300">Require fund password</span>
          <Toggle checked={profile.fund_password_set} onChange={() => showToast('Configure fund password first')} />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-[#2b313a] px-3 py-3">
          <span className="text-sm text-gray-300">App Lock on withdrawal</span>
          <Toggle
            checked={profile.app_lock_enabled ?? false}
            onChange={(v) => update({ app_lock_enabled: v }).then((r) => showToast(r.error ? 'Failed' : 'Updated'))}
          />
        </div>
      </div>
      <PrimaryButton onClick={modal.closeModal}>Done</PrimaryButton>
    </Modal>
  );
}

function TrustedDevicesModal({
  modal,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  showToast: (m: string) => void;
}) {
  const [devices] = useState<{ id: string; name: string; lastActive: string }[]>([
    { id: 'current', name: 'This Device', lastActive: 'Active now' },
  ]);
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Trusted Devices">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <MonitorSmartphone className="h-4 w-4" />
        Devices currently trusted for your account.
      </div>
      <div className="space-y-2">
        {devices.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg bg-[#2b313a] px-3 py-3">
            <div>
              <p className="text-sm text-gray-300">{d.name}</p>
              <p className="text-xs text-gray-500">{d.lastActive}</p>
            </div>
            {d.id !== 'current' && (
              <button onClick={() => showToast('Device revoked')} className="text-xs text-red-400 hover:text-red-300">
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
      <PrimaryButton onClick={modal.closeModal}>Done</PrimaryButton>
    </Modal>
  );
}

function AccountSettingsModal({
  modal,
  profile,
  update,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  profile: UserProfile;
  update: UpdateFn;
  showToast: (m: string) => void;
}) {
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Account Settings">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Cog className="h-4 w-4" />
        Manage your account preferences.
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-[#2b313a] px-3 py-3">
          <span className="text-sm text-gray-300">App Lock</span>
          <Toggle
            checked={profile.app_lock_enabled ?? false}
            onChange={(v) => update({ app_lock_enabled: v }).then((r) => showToast(r.error ? 'Failed' : 'Updated'))}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-[#2b313a] px-3 py-3">
          <span className="text-sm text-gray-300">Secure Transaction Approval</span>
          <Toggle
            checked={profile.secure_tx_approval ?? false}
            onChange={(v) => update({ secure_tx_approval: v }).then((r) => showToast(r.error ? 'Failed' : 'Updated'))}
          />
        </div>
      </div>
      <PrimaryButton onClick={modal.closeModal}>Done</PrimaryButton>
    </Modal>
  );
}
