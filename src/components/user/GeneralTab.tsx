import { useState } from 'react';
import {
  Globe,
  DollarSign,
  Palette,
  Eye,
  HelpCircle,
  MessageSquare,
  Info,
  HardDrive,
  Star,
  Sun,
  Moon,
  Mail,
} from 'lucide-react';
import type { UserProfile } from '@/types';
import { Row, Toggle, SectionCard, Modal, PrimaryButton, useModalState } from './ui';
import { SUPPORT_EMAIL } from '@/config/constants';

type UpdateFn = (patch: Partial<UserProfile>) => Promise<{ error: string | null }>;

export function GeneralTab({
  profile,
  update,
}: {
  profile: UserProfile;
  update: UpdateFn;
}) {
  const [toast, setToast] = useState<string | null>(null);

  const langModal = useModalState();
  const currencyModal = useModalState();
  const themeModal = useModalState();
  const colorPrefModal = useModalState();
  const helpModal = useModalState();
  const supportModal = useModalState();
  const aboutModal = useModalState();
  const storageModal = useModalState();
  const rateModal = useModalState();

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

      <SectionCard title="Display">
        <Row label="Language" value={profile.preferred_language} onClick={langModal.openModal} />
        <Row label="Currency Display" value={profile.preferred_currency} onClick={currencyModal.openModal} />
        <Row label="Color Theme" value="Dark Mode" onClick={themeModal.openModal} />
        <Row label="Color Preferences (Chart Candles)" value={profile.color_up === 'red' ? 'Red Up / Green Down' : 'Green Up / Red Down'} onClick={colorPrefModal.openModal} />
        <Row
          label="Always on (no screen lock)"
          badge={
            <Toggle
              checked={profile.app_lock_enabled ?? false}
              onChange={(v) => handleToggle('app_lock_enabled', v, 'Always on')}
            />
          }
          rightIcon={false}
        />
      </SectionCard>

      <SectionCard title="Support">
        <Row label="Help Center" onClick={helpModal.openModal} />
        <Row label="Contact Support" onClick={supportModal.openModal} />
        <Row label="User Feedback" onClick={() => window.location.href = `mailto:${SUPPORT_EMAIL}?subject=CEO%20Exchange%20Feedback`} />
        <Row label="About Us" onClick={aboutModal.openModal} />
      </SectionCard>

      <SectionCard title="System">
        <Row label="Storage Management" onClick={storageModal.openModal} />
        <Row label="Rate Our App" onClick={rateModal.openModal} />
      </SectionCard>

      <LanguageModal modal={langModal} current={profile.preferred_language} update={update} showToast={showToast} />
      <CurrencyModal modal={currencyModal} current={profile.preferred_currency} update={update} showToast={showToast} />
      <ThemeModal modal={themeModal} update={update} showToast={showToast} />
      <ColorPrefModal modal={colorPrefModal} current={profile.color_up || 'green'} update={update} showToast={showToast} />
      <HelpModal modal={helpModal} />
      <SupportModal modal={supportModal} />
      <AboutModal modal={aboutModal} />
      <ComingSoonModal modal={storageModal} title="Storage Management" />
      <ComingSoonModal modal={rateModal} title="Rate Our App" />
    </div>
  );
}

function LanguageModal({
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
  const options = ['English', '繁體中文', '简体中文', 'Português', 'Español', 'Français', 'Deutsch', 'Русский', 'Türkçe', '日本語', '한국어', 'العربية', 'हिन्दी', 'Amharic'];
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ preferred_language: val });
    setSaving(false);
    if (res.error) {
      showToast('Failed to update');
    } else {
      showToast('Language updated');
      modal.closeModal();
    }
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Language">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Globe className="h-4 w-4" />
        Select your preferred display language.
      </div>
      <div className="mb-3 max-h-60 space-y-1 overflow-y-auto">
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

function CurrencyModal({
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
  const options = ['USD', 'EUR', 'GBP', 'JPY', 'KRW', 'AUD', 'CAD', 'BRL', 'INR', 'RUB', 'TRY', 'SGD', 'CNY', 'ETB', 'AED', 'ZAR'];
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ preferred_currency: val });
    setSaving(false);
    if (res.error) {
      showToast('Failed to update');
    } else {
      showToast('Currency updated');
      modal.closeModal();
    }
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Currency Display">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <DollarSign className="h-4 w-4" />
        Choose the fiat currency used to display values.
      </div>
      <div className="mb-3 max-h-60 space-y-1 overflow-y-auto">
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

function ThemeModal({
  modal,
  update,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  update: UpdateFn;
  showToast: (m: string) => void;
}) {
  const [val, setVal] = useState<'dark' | 'light'>('dark');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ color_up: val === 'dark' ? 'green' : 'green' });
    setSaving(false);
    if (res.error) {
      showToast('Failed to update theme');
    } else {
      showToast('Theme updated');
      modal.closeModal();
    }
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Color Theme">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Palette className="h-4 w-4" />
        Choose between dark and light appearance.
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setVal('dark')}
          className={`flex flex-col items-center gap-2 rounded-lg p-4 ${
            val === 'dark' ? 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500' : 'bg-[#2b313a] text-gray-300'
          }`}
        >
          <Moon className="h-6 w-6" />
          <span className="text-sm">Dark</span>
        </button>
        <button
          onClick={() => setVal('light')}
          className={`flex flex-col items-center gap-2 rounded-lg p-4 ${
            val === 'light' ? 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500' : 'bg-[#2b313a] text-gray-300'
          }`}
        >
          <Sun className="h-6 w-6" />
          <span className="text-sm">Light</span>
        </button>
      </div>
      <PrimaryButton onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </PrimaryButton>
    </Modal>
  );
}

function ColorPrefModal({
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
  const options: { value: string; label: string; up: string; down: string }[] = [
    { value: 'green', label: 'Green Up / Red Down', up: 'bg-green-500', down: 'bg-red-500' },
    { value: 'red', label: 'Red Up / Green Down', up: 'bg-red-500', down: 'bg-green-500' },
  ];
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ color_up: val as 'green' | 'red' });
    setSaving(false);
    if (res.error) {
      showToast('Failed to update');
    } else {
      showToast('Color preferences updated');
      modal.closeModal();
    }
  };
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Color Preferences">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <Eye className="h-4 w-4" />
        Choose which colors represent price increases and decreases.
      </div>
      <div className="mb-3 space-y-2">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => setVal(o.value)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-3 ${
              val === o.value ? 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500' : 'bg-[#2b313a] text-gray-300'
            }`}
          >
            <span className="text-sm">{o.label}</span>
            <div className="flex items-center gap-1">
              <span className={`h-4 w-4 rounded ${o.up}`} />
              <span className={`h-4 w-4 rounded ${o.down}`} />
            </div>
          </button>
        ))}
      </div>
      <PrimaryButton onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </PrimaryButton>
    </Modal>
  );
}

function HelpModal({ modal }: { modal: ReturnType<typeof useModalState> }) {
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Help Center">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <HelpCircle className="h-4 w-4" />
        Need help? Contact our support team directly.
      </div>
      <a
        href="https://t.me/CEO_ExchangeAdmin"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-lg bg-yellow-500 py-2.5 text-center text-sm font-medium text-black hover:bg-yellow-400"
      >
        Open Telegram Support
      </a>
    </Modal>
  );
}

function SupportModal({ modal }: { modal: ReturnType<typeof useModalState> }) {
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="Contact Support">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <MessageSquare className="h-4 w-4" />
        Create a support ticket and our team will respond.
      </div>
      <a
        href="https://t.me/CEO_ExchangeAdmin"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-lg bg-yellow-500 py-2.5 text-center text-sm font-medium text-black hover:bg-yellow-400"
      >
        Open Live Chat
      </a>
    </Modal>
  );
}

function AboutModal({ modal }: { modal: ReturnType<typeof useModalState> }) {
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title="About Us">
      <div className="space-y-3 text-sm text-gray-300">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Info className="h-4 w-4" />
          About CEO Exchange
        </div>
        <p>
          CEO Exchange is a cryptocurrency trading platform built by Ethiopians, for the Ethiopian people and the global community.
        </p>
        <p>
          Our mission is to provide a secure, accessible, and professional trading experience that connects local users with global markets. We believe in empowering our community with the tools to trade, invest, and grow their wealth in the digital economy.
        </p>
        <p>
          From Addis Ababa to the world, CEO Exchange is committed to delivering excellence, transparency, and innovation in every transaction.
        </p>
      </div>
      <PrimaryButton onClick={modal.closeModal}>Close</PrimaryButton>
    </Modal>
  );
}

function ComingSoonModal({
  modal,
  title,
}: {
  modal: ReturnType<typeof useModalState>;
  title: string;
}) {
  return (
    <Modal open={modal.open} onClose={modal.closeModal} title={title}>
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/15">
          {title.includes('Storage') ? <HardDrive className="h-8 w-8 text-yellow-400" /> : <Star className="h-8 w-8 text-yellow-400" />}
        </div>
        <p className="text-sm text-gray-400">Coming Soon</p>
        <p className="text-center text-xs text-gray-500">
          This feature is under development and will be available in a future update.
        </p>
      </div>
      <PrimaryButton onClick={modal.closeModal}>OK</PrimaryButton>
    </Modal>
  );
}
