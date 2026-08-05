import { useState } from 'react';
import {
  Mail,
  Smartphone,
  KeyRound,
  Fingerprint,
  ShieldAlert,
  Lock,
  Wallet,
  Key,
  MonitorSmartphone,
  Cog,
  LockKeyhole,
} from 'lucide-react';
import type { UserProfile } from '@/types';
import { Row, Toggle, SectionCard, Modal, Input, PrimaryButton, useModalState, StatusBadge } from './ui';

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
  const mobileModal = useModalState();
  const google2faModal = useModalState();
  const passkeyModal = useModalState();
  const antiPhishingModal = useModalState();
  const fundPasswordModal = useModalState();
  const changePasswordModal = useModalState();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
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

      {/* Account Security */}
      <SectionCard title="Account Security">
        <Row
          label="Email"
          value={profile.email}
          onClick={emailModal.openModal}
        />
        <Row
          label="Mobile"
          value={profile.mobile}
          onClick={mobileModal.openModal}
        />
        <Row
          label="Google 2FA Authentication"
          badge={
            <Toggle
              checked={profile.google_2fa_enabled}
              onChange={(v) => handleToggle('google_2fa_enabled', v, 'Google 2FA')}
            />
          }
          rightIcon={false}
        />
        <Row
          label="Passkeys"
          onClick={passkeyModal.openModal}
        />
      </SectionCard>

      {/* Security Settings */}
      <SectionCard title="Security Settings">
        <Row
          label="Anti-phishing Code"
          value={profile.anti_phishing_code}
          onClick={antiPhishingModal.openModal}
        />
        <Row
          label="Fund Password"
          badge={<StatusBadge status={profile.fund_password_set ? 'set' : 'not_set'} />}
          onClick={fundPasswordModal.openModal}
        />
        <Row
          label="Secure Transaction Approval"
          onClick={() => showToast('Opening Secure Transaction Approval settings')}
        />
        <Row
          label="Withdrawal Security"
          onClick={() => showToast('Opening Withdrawal Security settings')}
        />
        <Row
          label="Change Password"
          onClick={changePasswordModal.openModal}
        />
      </SectionCard>

      {/* Devices & Access */}
      <SectionCard title="Devices & Access">
        <Row
          label="Trusted Devices"
          onClick={() => showToast('Opening Trusted Devices')}
        />
        <Row
          label="Account Settings"
          onClick={() => showToast('Opening Account Settings')}
        />
        <Row
          label="App Lock"
          badge={
            <Toggle
              checked={profile.app_lock_enabled}
              onChange={(v) => handleToggle('app_lock_enabled', v, 'App Lock')}
            />
          }
          rightIcon={false}
        />
      </SectionCard>

      {/* Modals */}
      <EmailModal modal={emailModal} current={profile.email} update={update} showToast={showToast} />
      <MobileModal modal={mobileModal} current={profile.mobile} update={update} showToast={showToast} />
      <Google2FAModal modal={google2faModal} enabled={profile.google_2fa_enabled} showToast={showToast} />
      <PasskeyModal modal={passkeyModal} showToast={showToast} />
      <AntiPhishingModal
        modal={antiPhishingModal}
        current={profile.anti_phishing_code}
        update={update}
        showToast={showToast}
      />
      <FundPasswordModal modal={fundPasswordModal} update={update} showToast={showToast} />
      <ChangePasswordModal modal={changePasswordModal} showToast={showToast} />
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
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ email: val });
    setSaving(false);
    if (res.error) {
      showToast('Failed to update email');
    } else {
      showToast('Email updated');
      modal.closeModal();
    }
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Email">
      <Input label="Email Address" value={val} onChange={setVal} placeholder="Enter new email" />
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Mail className="h-4 w-4" />
        Used for account notifications and recovery.
      </div>
      <PrimaryButton onClick={save} disabled={saving || !val}>
        {saving ? 'Saving...' : 'Save'}
      </PrimaryButton>
    </Modal>
  );
}

function MobileModal({
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
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ mobile: val });
    setSaving(false);
    if (res.error) {
      showToast('Failed to update mobile');
    } else {
      showToast('Mobile updated');
      modal.closeModal();
    }
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Mobile">
      <Input label="Mobile Number" value={val} onChange={setVal} placeholder="Enter mobile number" />
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Smartphone className="h-4 w-4" />
        Used for SMS verification and security alerts.
      </div>
      <PrimaryButton onClick={save} disabled={saving || !val}>
        {saving ? 'Saving...' : 'Save'}
      </PrimaryButton>
    </Modal>
  );
}

function Google2FAModal({
  modal,
  enabled,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  enabled: boolean;
  showToast: (m: string) => void;
}) {
  const [code, setCode] = useState('');
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Google 2FA Authentication">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <KeyRound className="h-4 w-4" />
        {enabled ? 'Currently enabled. Enter your 2FA code to disable.' : 'Enter your Google Authenticator code to enable.'}
      </div>
      <Input label="6-digit Code" value={code} onChange={setCode} placeholder="Enter 2FA code" />
      <PrimaryButton
        onClick={() => {
          if (code.length !== 6) {
            showToast('Enter a 6-digit code');
            return;
          }
          showToast(enabled ? '2FA disabled' : '2FA enabled');
          modal.closeModal();
        }}
      >
        {enabled ? 'Disable 2FA' : 'Enable 2FA'}
      </PrimaryButton>
    </Modal>
  );
}

function PasskeyModal({
  modal,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  showToast: (m: string) => void;
}) {
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Passkeys">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Fingerprint className="h-4 w-4" />
        Add a passkey to sign in faster with Face ID, Touch ID, or a security key.
      </div>
      <div className="mb-3 rounded-lg bg-[#2b313a] p-3 text-xs text-gray-400">
        No passkeys registered yet.
      </div>
      <PrimaryButton
        onClick={() => {
          showToast('Passkey registration started');
          modal.closeModal();
        }}
      >
        Add Passkey
      </PrimaryButton>
    </Modal>
  );
}

function AntiPhishingModal({
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
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ anti_phishing_code: val });
    setSaving(false);
    if (res.error) {
      showToast('Failed to update');
    } else {
      showToast('Anti-phishing code updated');
      modal.closeModal();
    }
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Anti-phishing Code">
      <Input label="Anti-phishing Code" value={val} onChange={setVal} placeholder="Enter code" />
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <ShieldAlert className="h-4 w-4" />
        This code appears in legitimate Bybit emails to help detect phishing.
      </div>
      <PrimaryButton onClick={save} disabled={saving || !val}>
        {saving ? 'Saving...' : 'Save'}
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
    const res = await update({ fund_password_set: true });
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
  const save = () => {
    if (!oldPwd || !newPwd || !confirm) {
      showToast('Fill in all fields');
      return;
    }
    if (newPwd !== confirm) {
      showToast('New passwords do not match');
      return;
    }
    showToast('Password changed');
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
      <PrimaryButton onClick={save}>Change Password</PrimaryButton>
    </Modal>
  );
}
