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
          value={profile.benchmark_timezone}
          onClick={tzModal.openModal}
        />
      </SectionCard>

      <SectionCard title="Withdrawal & Deposits">
        <Row
          label="Withdrawal Address"
          value={profile.withdrawal_address || 'Not set'}
          onClick={withdrawModal.openModal}
        />
        <Row
          label="Manage Crypto Withdrawal Limits"
          onClick={cryptoLimitsModal.openModal}
        />
        <Row
          label="Switch Routing"
          value={profile.switch_routing}
          onClick={switchRoutingModal.openModal}
        />
        <Row
          label="Route Deposits To"
          value={profile.route_deposits_to}
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
        current={profile.benchmark_timezone}
        update={update}
        showToast={showToast}
      />
      <WithdrawalAddressModal
        modal={withdrawModal}
        current={profile.withdrawal_address || ''}
        update={update}
        showToast={showToast}
      />
      <CryptoLimitsModal modal={cryptoLimitsModal} showToast={showToast} />
      <SwitchRoutingModal
        modal={switchRoutingModal}
        current={profile.switch_routing}
        update={update}
        showToast={showToast}
      />
      <RouteDepositsModal
        modal={routeDepositsModal}
        current={profile.route_deposits_to}
        update={update}
        showToast={showToast}
      />
      <NotificationModal modal={notifModal} showToast={showToast} />
      <EmailSubModal modal={emailSubModal} showToast={showToast} />
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
    const res = await update({ benchmark_timezone: val });
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
    const res = await update({ withdrawal_address: val });
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
  const options = ['Auto Routing Optimization', 'Manual Routing', 'Fastest Route'];
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ switch_routing: val });
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
  const options = ['Funding Account', 'Spot Account', 'Derivatives Account'];
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ route_deposits_to: val });
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

function NotificationModal({
  modal,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  showToast: (m: string) => void;
}) {
  const [price, setPrice] = useState(true);
  const [order, setOrder] = useState(true);
  const [security, setSecurity] = useState(true);
  const [promo, setPromo] = useState(false);
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Notification Settings">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Bell className="h-4 w-4" />
        Choose which notifications you want to receive.
      </div>
      <div className="space-y-1">
        {[
          { label: 'Price Alerts', val: price, set: setPrice },
          { label: 'Order Updates', val: order, set: setOrder },
          { label: 'Security Alerts', val: security, set: setSecurity },
          { label: 'Promotions', val: promo, set: setPromo },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg bg-[#2b313a] px-3 py-3"
          >
            <span className="text-sm text-gray-300">{item.label}</span>
            <button
              onClick={() => item.set(!item.val)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                item.val ? 'bg-yellow-500' : 'bg-[#3a4150]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  item.val ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <PrimaryButton
          onClick={() => {
            showToast('Notification settings saved');
            modal.closeModal();
          }}
        >
          Save
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function EmailSubModal({
  modal,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  showToast: (m: string) => void;
}) {
  const [news, setNews] = useState(true);
  const [product, setProduct] = useState(false);
  const [market, setMarket] = useState(true);
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Email Subscriptions">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <MailCheck className="h-4 w-4" />
        Manage which emails you'd like to receive.
      </div>
      <div className="space-y-1">
        {[
          { label: 'Newsletter', val: news, set: setNews },
          { label: 'Product Updates', val: product, set: setProduct },
          { label: 'Market Analysis', val: market, set: setMarket },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg bg-[#2b313a] px-3 py-3"
          >
            <span className="text-sm text-gray-300">{item.label}</span>
            <button
              onClick={() => item.set(!item.val)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                item.val ? 'bg-yellow-500' : 'bg-[#3a4150]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  item.val ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <PrimaryButton
          onClick={() => {
            showToast('Email subscriptions saved');
            modal.closeModal();
          }}
        >
          Save
        </PrimaryButton>
      </div>
    </Modal>
  );
}
