import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Store,
  ArrowLeftRight,
  Ticket,
  Megaphone,
  Gift,
  FileText,
  Settings,
  UserCheck,
  Activity,
  LogOut,
  Search,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  Bell,
  Lock,
  Mail,
  Key,
} from 'lucide-react';

interface UserRow {
  id: string;
  name: string;
  email: string;
  status: 'Active' | 'Banned' | 'Pending';
  kyc: 'Verified' | 'Not Verified' | 'Pending';
  role: 'User' | 'Merchant' | 'Admin';
  joined: string;
  lastActive: string;
}

export function AdminDashboard() {
  // Admin Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (emailInput === 'ceo.exchange.web@gmail.com' && passwordInput === 'Tech469339$') {
      setIsAuthenticated(true);
      showToast('Admin login successful!');
    } else {
      setAuthError('Invalid admin email or password.');
    }
  };

  const users: UserRow[] = [
    { id: '1', name: 'Abebe123', email: 'abebe123@example.com', status: 'Active', kyc: 'Verified', role: 'User', joined: 'Jul 29, 2025', lastActive: '2 min ago' },
    { id: '2', name: 'meaza22', email: 'meaza22@example.com', status: 'Active', kyc: 'Not Verified', role: 'User', joined: 'Jul 29, 2025', lastActive: '15 min ago' },
    { id: '3', name: 'testuser1', email: 'test1@example.com', status: 'Active', kyc: 'Not Verified', role: 'User', joined: 'Jul 28, 2025', lastActive: '1 hour ago' },
    { id: '4', name: 'solomon', email: 'solomons@example.com', status: 'Active', kyc: 'Not Verified', role: 'User', joined: 'Jul 27, 2025', lastActive: '3 hours ago' },
    { id: '5', name: 'biruktrader', email: 'biruk@example.com', status: 'Active', kyc: 'Not Verified', role: 'Merchant', joined: 'Jul 27, 2025', lastActive: '5 hours ago' },
  ];

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || u.status === statusFilter;
    const matchesRole = roleFilter === 'All Roles' || u.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  // If not authenticated, show secure Admin Login Screen
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0e11] px-4 text-white">
        <div className="w-full max-w-md rounded-2xl bg-[#12161c] p-8 border border-[#1e2329] shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/15 text-yellow-400 mb-3">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold tracking-wider">ADMIN PORTAL LOGIN</h2>
            <p className="text-xs text-gray-400 mt-1">Restricted access for authorized administrators only</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {authError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-medium">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="ceo.exchange.web@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full rounded-lg bg-[#1e2329] pl-10 pr-4 py-2.5 text-xs text-white outline-none border border-[#2b313a] focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full rounded-lg bg-[#1e2329] pl-10 pr-4 py-2.5 text-xs text-white outline-none border border-[#2b313a] focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-yellow-500 py-3 text-xs font-bold text-black hover:bg-yellow-400 transition-colors shadow-lg"
            >
              Access Admin Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard View
  return (
    <div className="flex min-h-screen bg-[#0b0e11] text-white">
      {toast && (
        <div className="fixed right-6 top-6 z-50 rounded-lg bg-[#2b313a] px-4 py-2.5 text-xs text-white shadow-xl border border-gray-700">
          {toast}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[#1e2329] bg-[#12161c] flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Area */}
          <div className="flex items-center gap-2 px-6 py-5 border-b border-[#1e2329]">
            <span className="text-xl font-black tracking-wider text-white">BYBIT</span>
            <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-black uppercase">Admin</span>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">Main</div>
            <SidebarItem icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />

            <div className="pt-4 px-3 pb-2 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">Management</div>
            <SidebarItem icon={<Users className="h-4 w-4" />} label="Users" active={activeTab === 'users'} onClick={() => { setActiveTab('users'); showToast('Opening Users Management'); }} />
            <SidebarItem icon={<ShieldCheck className="h-4 w-4" />} label="KYC Verification" active={activeTab === 'kyc'} onClick={() => { setActiveTab('kyc'); showToast('Opening KYC Verifications'); }} />
            <SidebarItem icon={<Store className="h-4 w-4" />} label="Merchants" active={activeTab === 'merchants'} onClick={() => { setActiveTab('merchants'); showToast('Opening Merchants'); }} />
            <SidebarItem icon={<ArrowLeftRight className="h-4 w-4" />} label="Transactions" active={activeTab === 'transactions'} onClick={() => { setActiveTab('transactions'); showToast('Opening Transactions Ledger'); }} />
            <SidebarItem icon={<Ticket className="h-4 w-4" />} label="Tickets" active={activeTab === 'tickets'} onClick={() => { setActiveTab('tickets'); showToast('Opening Support Tickets'); }} />
            <SidebarItem icon={<Megaphone className="h-4 w-4" />} label="Announcements" active={activeTab === 'announcements'} onClick={() => { setActiveTab('announcements'); showToast('Opening Announcements'); }} />
            <SidebarItem icon={<Gift className="h-4 w-4" />} label="Giveaways" active={activeTab === 'giveaways'} onClick={() => { setActiveTab('giveaways'); showToast('Opening Giveaways'); }} />

            <div className="pt-4 px-3 pb-2 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">System</div>
            <SidebarItem icon={<FileText className="h-4 w-4" />} label="Reports" active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); showToast('Generating System Reports'); }} />
            <SidebarItem icon={<Settings className="h-4 w-4" />} label="Settings" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); showToast('Opening Admin Settings'); }} />
            <SidebarItem icon={<UserCheck className="h-4 w-4" />} label="Roles & Permissions" active={activeTab === 'roles'} onClick={() => { setActiveTab('roles'); showToast('Opening Roles & Permissions'); }} />
            <SidebarItem icon={<Activity className="h-4 w-4" />} label="Logs" active={activeTab === 'logs'} onClick={() => { setActiveTab('logs'); showToast('Opening System Activity Logs'); }} />
          </div>
        </div>

        {/* Admin Profile & Logout */}
        <div className="p-4 border-t border-[#1e2329] bg-[#0e1117]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-400 font-bold">
                C
              </div>
              <div>
                <div className="text-xs font-semibold text-white">CEO Admin</div>
                <div className="text-[10px] text-gray-400">ceo.exchange.web@gmail.com</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setIsAuthenticated(false); showToast('Logged out successfully'); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-[#1e2329] px-8 bg-[#12161c]">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white">Admin Portal</h1>
            <span className="text-xs text-gray-400">| Full system control & overview</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-[#1e2329] px-3 py-1.5 text-xs text-gray-300 border border-[#2b313a]">
              <span>Jul 23, 2025 - Jul 29, 2025</span>
            </div>
            <button
              onClick={() => showToast('3 unread system alerts')}
              className="relative rounded-lg bg-[#1e2329] p-2 text-gray-400 hover:text-white border border-[#2b313a]"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                3
              </span>
            </button>
          </div>
        </header>

        <div className="p-8 space-y-6">
          {/* Top Metric Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Users" value="7" badge="+16.7%" desc="All registered users" />
            <MetricCard title="Verified Users" value="1" badge="+100%" desc="KYC verified users" />
            <MetricCard title="Pending KYC" value="0" badge="0%" desc="Waiting verification" />
            <MetricCard title="Banned Users" value="0" badge="0%" desc="Suspended accounts" />

            <MetricCard title="Open Tickets" value="0" badge="0%" desc="User support tickets" />
            <MetricCard title="Merchant Requests" value="0" badge="0%" desc="Pending merchant req." />
            <MetricCard title="Total Liquidity" value="500.00 USDT" badge="+0%" desc="Total platform liquidity" />
            <MetricCard title="Total Volume" value="0.00 USDT" badge="+0%" desc="Total trading volume" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl bg-[#12161c] p-5 border border-[#1e2329] lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">User Growth</h3>
                <span className="text-xs text-gray-400">Last 7 days</span>
              </div>
              <div className="h-56 flex flex-col justify-end">
                <svg className="w-full h-40 overflow-visible" viewBox="0 0 500 120">
                  <path d="M 0 110 Q 100 95 200 75 T 400 45 T 500 15" fill="none" stroke="#eab308" strokeWidth="2.5" />
                  <circle cx="0" cy="110" r="4" fill="#eab308" />
                  <circle cx="100" cy="95" r="4" fill="#eab308" />
                  <circle cx="200" cy="75" r="4" fill="#eab308" />
                  <circle cx="300" cy="60" r="4" fill="#eab308" />
                  <circle cx="400" cy="45" r="4" fill="#eab308" />
                  <circle cx="500" cy="15" r="4" fill="#eab308" />
                </svg>
                <div className="flex justify-between text-[10px] text-gray-500 pt-2 border-t border-[#1e2329]">
                  <span>Jul 23</span>
                  <span>Jul 24</span>
                  <span>Jul 25</span>
                  <span>Jul 26</span>
                  <span>Jul 27</span>
                  <span>Jul 28</span>
                  <span>Jul 29</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#12161c] p-5 border border-[#1e2329]">
              <h3 className="text-sm font-semibold text-white mb-4">KYC Status Distribution</h3>
              <div className="flex flex-col items-center justify-center h-52 space-y-4">
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-8 border-yellow-500/20 border-t-yellow-500">
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Total</div>
                    <div className="text-lg font-bold text-white">7</div>
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /><span className="text-gray-300">Verified (1)</span></div>
                  <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gray-600" /><span className="text-gray-300">Unverified (6)</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Users Overview Table Section */}
          <div className="rounded-xl bg-[#12161c] p-5 border border-[#1e2329]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
              <h3 className="text-sm font-semibold text-white">Users Overview</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-lg bg-[#1e2329] pl-9 pr-4 py-2 text-xs text-white outline-none border border-[#2b313a] focus:border-yellow-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg bg-[#1e2329] px-3 py-2 text-xs text-gray-300 border border-[#2b313a] outline-none"
                >
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Banned</option>
                </select>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-lg bg-[#1e2329] px-3 py-2 text-xs text-gray-300 border border-[#2b313a] outline-none"
                >
                  <option>All Roles</option>
                  <option>User</option>
                  <option>Merchant</option>
                  <option>Admin</option>
                </select>
                <button
                  onClick={() => showToast('Exporting users data CSV...')}
                  className="flex items-center gap-1.5 rounded-lg bg-[#1e2329] px-3 py-2 text-xs font-medium text-gray-300 hover:bg-[#2b313a] border border-[#2b313a]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1e2329] text-gray-400">
                    <th className="pb-3 font-medium">USER</th>
                    <th className="pb-3 font-medium">STATUS</th>
                    <th className="pb-3 font-medium">KYC STATUS</th>
                    <th className="pb-3 font-medium">ROLE</th>
                    <th className="pb-3 font-medium">JOINED</th>
                    <th className="pb-3 font-medium">LAST ACTIVE</th>
                    <th className="pb-3 font-medium text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2329]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#161a22] transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-400 font-bold uppercase">
                            {u.name[0]}
                          </div>
                          <div>
                            <div className="font-medium text-white">{u.name}</div>
                            <div className="text-[10px] text-gray-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="rounded bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-400">{u.status}</span>
                      </td>
                      <td className="py-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${u.kyc === 'Verified' ? 'bg-green-500/15 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}>
                          {u.kyc}
                        </span>
                      </td>
                      <td className="py-3 text-gray-300">{u.role}</td>
                      <td className="py-3 text-gray-400">{u.joined}</td>
                      <td className="py-3 text-gray-400">{u.lastActive}</td>
               
