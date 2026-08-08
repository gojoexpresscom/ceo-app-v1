import { useState } from 'react';
import { Clock, Wallet, Gauge, ArrowDownToLine, Bell, MailCheck } from 'lucide-react';
import type { UserProfile } from '@/types';
import { Row, Toggle, SectionCard, Modal, Input, PrimaryButton, useModalState } from './ui';

type UpdateFn = (patch: Partial<UserProfile>) => Promise<{ error: string | null }>;

export function PreferenceTab({
  profile,
  update,
}: {
  profile: UserProfile;
  update: UpdateFn;
}) {
  const [toast, setToast] = useState<string | null>(null);

  const tzModal = useModalState();
  const withdrawModal = useModalState();
  const cryptoLimitsModal = useModalState();
  const switchRoutingModal = useModalState();
  const routeDepositsModal = useModalState();
  const notifModal = useModalState();
  const emailSubModal = useModalState();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="space-y-1">
      {toast && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-lg bg-[#2b313a] px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}

      <SectionCard title="Trading">
        <Row
          label="Benchmark Time Zone"
          value={profile.time_zone || 'UTC'}
          onClick={tzModal.openModal}
        />
      </SectionCard>

      <SectionCard title="Withdrawal & Deposits">
        <Row
          label="Withdrawal Address"
          value={profile.web3_wallet_address || 'Not set'}
          onClick={withdrawModal.openModal}
        />
        <Row
          label="Manage Crypto Withdrawal Limits"
          onClick={cryptoLimitsModal.openModal}
        />
        <Row
          label="Switch Routing"
          value={profile.routing_mode || 'auto'}
          onClick={switchRoutingModal.openModal}
        />
        <Row
          label="Route Deposits To"
          value={profile.deposit_to || 'funding'}
          onClick={routeDepositsModal.openModal}
        />
      </SectionCard>

      <SectionCard title="Notifications">
        <Row
          label="Notification Settings"
          onClick={notifModal.openModal}
        />
        <Row
          label="Email Subscriptions"
          onClick={emailSubModal.openModal}
        />
      </SectionCard>

      {/* Modals */}
      <TimezoneModal
        modal={tzModal}
        current={profile.time_zone || 'UTC'}
        update={update}
        showToast={showToast}
      />
      <WithdrawalAddressModal
        modal={withdrawModal}
        current={profile.web3_wallet_address || ''}
        update={update}
        showToast={showToast}
      />
      <CryptoLimitsModal modal={cryptoLimitsModal} showToast={showToast} />
      <SwitchRoutingModal
        modal={switchRoutingModal}
        current={profile.routing_mode || 'auto'}
        update={update}
        showToast={showToast}
      />
      <RouteDepositsModal
        modal={routeDepositsModal}
        current={profile.deposit_to || 'funding'}
        update={update}
        showToast={showToast}
      />
      <NotificationModal modal={notifModal} profile={profile} update={update} showToast={showToast} />
      <EmailSubModal modal={emailSubModal} profile={profile} update={update} showToast={showToast} />
    </div>
  );
}

function TimezoneModal({
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
  const options = ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'UTC', 'Local Time'];
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ time_zone: val });
    setSaving(false);
    if (res.error) {
      showToast('Failed to update');
    } else {
      showToast('Benchmark timezone updated');
      modal.closeModal();
    }
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Benchmark Time Zone">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Clock className="h-4 w-4" />
        Select the time frame used for performance benchmarks.
      </div>
      <div className="mb-3 space-y-1">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => setVal(o)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
              val === o ? 'bg-yellow-500/15 text-yellow-400' : 'bg-[#2b313a] text-gray-300'
            }`}
          >
            {o}
            {val === o && <span className="text-xs">✓</span>}
          </button>
        ))}
      </div>
      <PrimaryButton onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </PrimaryButton>
    </Modal>
  );
}

function WithdrawalAddressModal({
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
    const res = await update({ web3_wallet_address: val });
    setSaving(false);
    if (res.error) {
      showToast('Failed to update');
    } else {
      showToast('Withdrawal address updated');
      modal.closeModal();
    }
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Withdrawal Address">
      <Input label="Default Withdrawal Address" value={val} onChange={setVal} placeholder="Enter wallet address" />
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Wallet className="h-4 w-4" />
        This address will be used as the default for withdrawals.
      </div>
      <PrimaryButton onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </PrimaryButton>
    </Modal>
  );
}

function CryptoLimitsModal({
  modal,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  showToast: (m: string) => void;
}) {
  const [dailyLimit, setDailyLimit] = useState('10');
  const [monthlyLimit, setMonthlyLimit] = useState('100');
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Manage Crypto Withdrawal Limits">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Gauge className="h-4 w-4" />
        Set your daily and monthly crypto withdrawal limits.
      </div>
      <Input label="Daily Limit (USD)" value={dailyLimit} onChange={setDailyLimit} placeholder="e.g. 10" />
      <Input label="Monthly Limit (USD)" value={monthlyLimit} onChange={setMonthlyLimit} placeholder="e.g. 100" />
      <PrimaryButton
        onClick={() => {
          showToast('Withdrawal limits updated');
          modal.closeModal();
        }}
      >
        Save Limits
      </PrimaryButton>
    </Modal>
  );
}

function SwitchRoutingModal({
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
  const options: { value: string; label: string }[] = [
    { value: 'auto', label: 'Auto Routing Optimization' },
    { value: 'manual', label: 'Manual Routing' },
    { value: 'fastest', label: 'Fastest Route' },
  ];
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ routing_mode: val });
    setSaving(false);
    if (res.error) {
      showToast('Failed to update');
    } else {
      showToast('Switch routing updated');
      modal.closeModal();
    }
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Switch Routing">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Gauge className="h-4 w-4" />
        Choose how transactions are routed across networks.
      </div>
      <div className="mb-3 space-y-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => setVal(o.value)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
              val === o.value ? 'bg-yellow-500/15 text-yellow-400' : 'bg-[#2b313a] text-gray-300'
            }`}
          >
            {o.label}
            {val === o.value && <span className="text-xs">✓</span>}
          </button>
        ))}
      </div>
      <PrimaryButton onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </PrimaryButton>
    </Modal>
  );
}

function RouteDepositsModal({
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
  const options: { value: string; label: string }[] = [
    { value: 'funding', label: 'Funding Account' },
    { value: 'spot', label: 'Spot Account' },
    { value: 'derivatives', label: 'Derivatives Account' },
  ];
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ deposit_to: val });
    setSaving(false);
    if (res.error) {
      showToast('Failed to update');
    } else {
      showToast('Deposit routing updated');
      modal.closeModal();
    }
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Route Deposits To">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <ArrowDownToLine className="h-4 w-4" />
        Choose which account receives your deposits by default.
      </div>
      <div className="mb-3 space-y-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => setVal(o.value)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
              val === o.value ? 'bg-yellow-500/15 text-yellow-400' : 'bg-[#2b313a] text-gray-300'
            }`}
          >
            {o.label}
            {val === o.value && <span className="text-xs">✓</span>}
          </button>
        ))}
      </div>
      <PrimaryButton onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </PrimaryButton>
    </Modal>
  );
}

function NotificationModal({
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
  const items: { key: keyof UserProfile; label: string }[] = [
    { key: 'notification_push', label: 'Push Notifications' },
    { key: 'notification_trade', label: 'Trade Updates' },
    { key: 'notification_security', label: 'Security Alerts' },
    { key: 'notification_marketing', label: 'Promotions' },
  ];
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Notification Settings">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Bell className="h-4 w-4" />
        Choose which notifications you want to receive.
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-lg bg-[#2b313a] px-3 py-3">
            <span className="text-sm text-gray-300">{item.label}</span>
            <Toggle
              checked={Boolean(profile[item.key])}
              onChange={(v) => update({ [item.key]: v } as Partial<UserProfile>).then((r) => showToast(r.error ? 'Failed' : 'Updated'))}
            />
          </div>
        ))}
      </div>
      <PrimaryButton onClick={modal.closeModal}>Done</PrimaryButton>
    </Modal>
  );
}

function EmailSubModal({
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
  const items: { key: keyof UserProfile; label: string }[] = [
    { key: 'email_marketing', label: 'Newsletter' },
    { key: 'email_trade', label: 'Product Updates' },
    { key: 'email_security', label: 'Security Alerts' },
  ];
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Email Subscriptions">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <MailCheck className="h-4 w-4" />
        Manage which emails you'd like to receive.
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-lg bg-[#2b313a] px-3 py-3">
            <span className="text-sm text-gray-300">{item.label}</span>
            <Toggle
              checked={Boolean(profile[item.key])}
              onChange={(v) => update({ [item.key]: v } as Partial<UserProfile>).then((r) => showToast(r.error ? 'Failed' : 'Updated'))}
            />
          </div>
        ))}
      </div>
      <PrimaryButton onClick={modal.closeModal}>Done</PrimaryButton>
    </Modal>
  );
}
