import { useState } from 'react';
import {
  Globe,
  DollarSign,
  Palette,
  Eye,
  HelpCircle,
  BarChart3,
  HeadphonesIcon,
  MessageSquare,
  Info,
  HardDrive,
  Star,
  Sun,
  Moon,
} from 'lucide-react';
import type { UserProfile } from '@/types';
import { Row, Toggle, SectionCard, Modal, PrimaryButton, useModalState } from './ui';

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

      <SectionCard title="Display">
        <Row label="Language" value={profile.language} onClick={langModal.openModal} />
        <Row label="Currency Display" value={profile.currency_display} onClick={currencyModal.openModal} />
        <Row label="Color Theme" value={profile.color_theme === 'dark' ? 'Dark' : 'Light'} onClick={themeModal.openModal} />
        <Row label="Color Preferences" value={profile.color_preferences === 'green_red' ? 'Green / Red' : 'Red / Green'} onClick={colorPrefModal.openModal} />
        <Row
          label="Always on (no screen lock)"
          badge={
            <Toggle
              checked={profile.always_on_enabled}
              onChange={(v) => handleToggle('always_on_enabled', v, 'Always on')}
            />
          }
          rightIcon={false}
        />
      </SectionCard>

      <SectionCard title="Support">
        <Row
          label="Help Center"
          onClick={() => showToast('Opening Help Center')}
        />
        <Row
          label="Trade Market Overview"
          onClick={() => showToast('Opening Trade Market Overview')}
        />
        <Row
          label="Contact Support"
          onClick={() => showToast('Opening Contact Support')}
        />
        <Row
          label="User Feedback"
          onClick={() => showToast('Opening User Feedback')}
        />
        <Row
          label="About Us"
          onClick={() => showToast('Opening About Us')}
        />
      </SectionCard>

      <SectionCard title="System">
        <Row
          label="Storage Management"
          onClick={() => showToast('Opening Storage Management')}
        />
        <Row
          label="Rate Our App"
          onClick={() => showToast('Opening Rate Our App')}
        />
      </SectionCard>

      {/* Modals */}
      <LanguageModal
        modal={langModal}
        current={profile.language}
        update={update}
        showToast={showToast}
      />
      <CurrencyModal
        modal={currencyModal}
        current={profile.currency_display}
        update={update}
        showToast={showToast}
      />
      <ThemeModal
        modal={themeModal}
        current={profile.color_theme}
        update={update}
        showToast={showToast}
      />
      <ColorPrefModal
        modal={colorPrefModal}
        current={profile.color_preferences}
        update={update}
        showToast={showToast}
      />
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
  const options = ['English', '繁體中文', '简体中文', 'Português', 'Español', 'Français', 'Deutsch', 'Русский', 'Türkçe', '日本語', '한국어'];
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ language: val });
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
  const options = ['USD', 'EUR', 'GBP', 'JPY', 'KRW', 'AUD', 'CAD', 'BRL', 'INR', 'RUB', 'TRY', 'SGD'];
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ currency_display: val });
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
  current,
  update,
  showToast,
}: {
  modal: ReturnType<typeof useModalState>;
  current: 'dark' | 'light';
  update: UpdateFn;
  showToast: (m: string) => void;
}) {
  const [val, setVal] = useState<'dark' | 'light'>(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ color_theme: val });
    setSaving(false);
    if (res.error) {
      showToast('Failed to update');
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
    { value: 'green_red', label: 'Green Up / Red Down', up: 'bg-green-500', down: 'bg-red-500' },
    { value: 'red_green', label: 'Red Up / Green Down', up: 'bg-red-500', down: 'bg-green-500' },
  ];
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const res = await update({ color_preferences: val });
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
