import { useState, useEffect, useRef, type ReactNode } from 'react';
import {
  LayoutDashboard, Users, ShieldCheck, Store, ArrowLeftRight,
  Ticket, Megaphone, Gift, FileBarChart, Settings, KeyRound,
  ScrollText, LogOut, Bell, Calendar, Search, X, Check,
} from 'lucide-react';
import { usePortal, type PortalView } from '@/hooks/usePortal';
import { useToast } from './ToastProvider';
import { useSystemLog } from '@/hooks/useSystemLog';
import { DashboardView } from './views/DashboardView';
import { UsersView } from './views/UsersView';
import { KycView } from './views/KycView';
import { MerchantsView } from './views/MerchantsView';
import { TransactionsView } from './views/TransactionsView';
import { TicketsView } from './views/TicketsView';
import { AnnouncementsView } from './views/AnnouncementsView';
import { GiveawaysView } from './views/GiveawaysView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { RolesView } from './views/RolesView';
import { LogsView } from './views/LogsView';

const NAV: { key: PortalView; label: string; icon: typeof Users }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'kyc', label: 'KYC Verification', icon: ShieldCheck },
  { key: 'merchants', label: 'Merchants', icon: Store },
  { key: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { key: 'tickets', label: 'Tickets', icon: Ticket },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'giveaways', label: 'Giveaways', icon: Gift },
  { key: 'reports', label: 'Reports', icon: FileBarChart },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'roles', label: 'Roles & Permissions', icon: KeyRound },
  { key: 'logs', label: 'Logs', icon: ScrollText },
];

const NOTIFICATIONS = [
  { id: 1, title: 'New merchant application', detail: 'biruktrader submitted a merchant request', time: '5h ago', read: false },
  { id: 2, title: 'KYC submission pending', detail: 'johndoe awaiting verification', time: '1d ago', read: false },
  { id: 3, title: 'Support ticket #TKT-2043', detail: 'New high-priority ticket opened', time: '2h ago', read: false },
];

export function AdminPortal({ onLogout }: { onLogout: () => void }) {
  const { view, setView, dateRange, setDateRange } = usePortal();
  const { showToast } = useToast();
  const log = useSystemLog();
  const [notifOpen, setNotifOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [notifs, setNotifs] = useState(NOTIFICATIONS);
  const notifRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await log({ action: 'Admin Logout', actor: 'admin@bybit.com', details: 'Administrator logged out' });
    showToast('Logged out successfully', 'info');
    onLogout();
  };

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'success');
  };

  const renderView = (): ReactNode => {
    switch (view) {
      case 'dashboard': return <DashboardView />;
      case 'users': return <UsersView />;
      case 'kyc': return <KycView />;
      case 'merchants': return <MerchantsView />;
      case 'transactions': return <TransactionsView />;
      case 'tickets': return <TicketsView />;
      case 'announcements': return <AnnouncementsView />;
      case 'giveaways': return <GiveawaysView />;
      case 'reports': return <ReportsView />;
      case 'settings': return <SettingsView />;
      case 'roles': return <RolesView />;
      case 'logs': return <LogsView />;
      default: return <DashboardView />;
    }
  };

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-screen bg-[#0b0e11] text-white">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-[#1f2731] bg-[#0b0e11]">
        <div className="flex h-16 items-center gap-2 border-b border-[#1f2731] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500 text-black">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Bybit Admin</div>
            <div className="text-[10px] text-gray-500">Control Panel</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`flex w-full items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-yellow-500/10 text-yellow-400 border-r-2 border-yellow-500'
                    : 'text-gray-400 hover:bg-[#12161c] hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#1f2731] p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-[#1f2731] bg-[#0b0e11] px-6">
          <div className="relative" ref={dateRef}>
            <button
              onClick={() => setDateOpen(!dateOpen)}
              className="flex items-center gap-2 rounded-lg bg-[#12161c] px-3.5 py-2 text-sm text-gray-300 hover:text-white"
            >
              <Calendar className="h-4 w-4 text-gray-500" />
              {dateRange.start} - {dateRange.end}
            </button>
            {dateOpen && (
              <div className="absolute left-0 top-12 z-50 w-72 rounded-xl border border-[#1f2731] bg-[#12161c] p-4 shadow-2xl">
                <h4 className="mb-3 text-sm font-semibold text-white">Select Date Range</h4>
                <div className="mb-2">
                  <label className="mb-1 block text-xs text-gray-500">Start Date</label>
                  <input
                    type="text"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full rounded-lg bg-[#0b0e11] px-3 py-2 text-sm text-white outline-none ring-1 ring-[#1f2731] focus:ring-yellow-500"
                  />
                </div>
                <div className="mb-3">
                  <label className="mb-1 block text-xs text-gray-500">End Date</label>
                  <input
                    type="text"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full rounded-lg bg-[#0b0e11] px-3 py-2 text-sm text-white outline-none ring-1 ring-[#1f2731] focus:ring-yellow-500"
                  />
                </div>
                <div className="flex gap-2">
                  {['Today', '7D', '30D', '90D'].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setDateRange({ start: `Jul 2${p === '7D' ? '3' : '1'}, 2025`, end: 'Jul 29, 2025' });
                        showToast(`Date range set to ${p}`, 'info');
                      }}
                      className="flex-1 rounded-md bg-[#0b0e11] py-1.5 text-xs text-gray-400 hover:text-yellow-400"
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setDateOpen(false); showToast('Date range applied', 'success'); }}
                  className="mt-3 w-full rounded-lg bg-yellow-500 py-2 text-sm font-medium text-black hover:bg-yellow-400"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                placeholder="Search..."
                className="w-48 rounded-lg bg-[#12161c] py-2 pl-9 pr-3 text-sm text-white outline-none ring-1 ring-[#1f2731] focus:ring-yellow-500"
              />
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[#12161c] text-gray-400 hover:text-white"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-[#1f2731] bg-[#12161c] shadow-2xl">
                  <div className="flex items-center justify-between border-b border-[#1f2731] px-4 py-3">
                    <h4 className="text-sm font-semibold text-white">Notifications</h4>
                    <button onClick={markAllRead} className="text-xs text-yellow-400 hover:text-yellow-300">
                      Mark all as read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.map((n) => (
                      <div
                        key={n.id}
                        className={`flex gap-3 border-b border-[#1f2731] px-4 py-3 last:border-b-0 ${
                          n.read ? 'opacity-50' : ''
                        }`}
                      >
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-yellow-500" />}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{n.title}</p>
                          <p className="text-xs text-gray-400">{n.detail}</p>
                          <p className="mt-1 text-[10px] text-gray-600">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="w-full border-t border-[#1f2731] py-2.5 text-center text-xs text-gray-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            {/* Admin avatar */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-black">A</div>
              <div className="hidden sm:block">
                <div className="text-xs font-medium leading-tight">Super Admin</div>
                <div className="text-[10px] text-gray-500">admin@bybit.com</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{renderView()}</main>
      </div>
    </div>
  );
}
