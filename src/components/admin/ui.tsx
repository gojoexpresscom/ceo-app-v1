import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className={`w-full ${widths[size]} max-h-[85vh] overflow-y-auto rounded-2xl border border-[#1f2731] bg-[#12161c] p-5`}
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

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[#1f2731] bg-[#12161c] ${className}`}>
      {children}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-500/15 text-green-400',
    approved: 'bg-green-500/15 text-green-400',
    verified: 'bg-green-500/15 text-green-400',
    completed: 'bg-green-500/15 text-green-400',
    published: 'bg-green-500/15 text-green-400',
    closed: 'bg-gray-500/15 text-gray-400',
    banned: 'bg-red-500/15 text-red-400',
    rejected: 'bg-red-500/15 text-red-400',
    failed: 'bg-red-500/15 text-red-400',
    suspended: 'bg-orange-500/15 text-orange-400',
    pending: 'bg-yellow-500/15 text-yellow-400',
    open: 'bg-yellow-500/15 text-yellow-400',
    in_progress: 'bg-blue-500/15 text-blue-400',
    draft: 'bg-gray-500/15 text-gray-400',
    not_verified: 'bg-gray-500/15 text-gray-400',
  };
  const cls = map[status.toLowerCase()] || 'bg-gray-500/15 text-gray-400';
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg bg-[#0b0e11] px-3 py-2.5 text-sm text-white outline-none ring-1 ring-[#1f2731] focus:ring-yellow-500"
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-lg bg-[#0b0e11] px-3 py-2.5 text-sm text-white outline-none ring-1 ring-[#1f2731] focus:ring-yellow-500"
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-lg bg-[#0b0e11] px-3 py-2.5 text-sm text-white outline-none ring-1 ring-[#1f2731] focus:ring-yellow-500"
    />
  );
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: 'bg-yellow-500 text-black hover:bg-yellow-400',
    secondary: 'bg-[#1f2731] text-white hover:bg-[#2a3340]',
    danger: 'bg-red-500/15 text-red-400 hover:bg-red-500/25',
    ghost: 'text-gray-400 hover:text-white hover:bg-[#1f2731]',
  };
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-4 py-2 text-sm' };
  return (
    <button
      onClick={onClick}
      className={`rounded-lg font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function useModal() {
  const [open, setOpen] = useState(false);
  return { open, openModal: () => setOpen(true), closeModal: () => setOpen(false) };
}

export function formatCurrency(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

export function timeAgo(date: string | null) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}
