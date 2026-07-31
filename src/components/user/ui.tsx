import { ChevronRight, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export function Row({
  label,
  value,
  onClick,
  rightIcon = true,
  badge,
}: {
  label: string;
  value?: ReactNode;
  onClick?: () => void;
  rightIcon?: boolean;
  badge?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center justify-between border-b border-[#23262d] px-5 py-4 text-left last:border-b-0 disabled:cursor-default"
    >
      <span className="text-sm text-gray-300">{label}</span>
      <span className="flex items-center gap-2">
        {badge}
        {value && <span className="text-sm text-gray-400">{value}</span>}
        {onClick && rightIcon && <ChevronRight className="h-4 w-4 text-gray-600" />}
      </span>
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? 'bg-yellow-500' : 'bg-[#2b313a]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function SectionCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      {title && (
        <h3 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-gray-500">
          {title}
        </h3>
      )}
      <div className="overflow-hidden rounded-xl bg-[#1b1f26]">{children}</div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-[#1b1f26] p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-[#2b313a] px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-500"
      />
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-lg bg-yellow-500 py-2.5 text-sm font-medium text-black hover:bg-yellow-400 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function useModalState() {
  const [open, setOpen] = useState(false);
  return { open, openModal: () => setOpen(true), closeModal: () => setOpen(false) };
}

export function StatusBadge({ status }: { status: 'enabled' | 'disabled' | 'set' | 'not_set' }) {
  const map: Record<string, { text: string; cls: string }> = {
    enabled: { text: 'Enabled', cls: 'text-green-400' },
    disabled: { text: 'Disabled', cls: 'text-gray-400' },
    set: { text: 'Set', cls: 'text-green-400' },
    not_set: { text: 'Not Set', cls: 'text-gray-400' },
  };
  const s = map[status] || map.disabled;
  return <span className={`text-sm ${s.cls}`}>{s.text}</span>;
}
