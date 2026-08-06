import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Users, ShieldCheck, Megaphone, Gift, Ban,
  MessageSquare, Check, X, Loader2, Search, Crown, Building2, Send,
  TrendingUp, Wallet, Clock, UserCheck, UserX,
} from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';
import { isAdminEmail, isOwnerEmail, type UserRole } from '@/lib/auth';

type Props = {
  userId: string;
  profile: Profile;
  onBack: () => void;
  onLogout: () => void;
};

type Tab = 'dashboard' | 'users' | 'kyc' | 'announcements' | 'giveaways' | 'support' | 'merchant';

type SupportTicket = {
  id: string;
  user_id: string;
  user_email: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
};

type MerchantReq = {
  id: string;
  user_id: string;
  user_email: string;
  request_type: string;
  message: string | null;
  status: string;
  created_at: string;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  is_pinned: boolean;
  created_at: string;
};

type KycSubmission = {
  id: string;
  user_id: string;
  full_name: string;
  document_type: string;
  document_number: string;
  status: string;
  tier_level: number;
  created_at: string;
};

export default function AdminPanelScreen({ userId, profile, onBack, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [users, setUsers] = useState<Profile[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [merchantReqs, setMerchantReqs] = useState<MerchantReq[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [warnReason, setWarnReason] = useState('');
  const [banReason, setBanReason] = useState('');
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType] = useState('info');

  // Giveaway form
  const [giveTitle, setGiveTitle] = useState('');
  const [giveDesc, setGiveDesc] = useState('');
  const [giveAmount, setGiveAmount] = useState('');
  const [giveCodes, setGiveCodes] = useState('1');
  const [giveCurrency, setGiveCurrency] = useState('USDT');

  // Support reply
  const [replyText, setReplyText] = useState('');
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);

  const role: UserRole = profile.role || (isOwnerEmail(profile.email) ? 'owner' : isAdminEmail(profile.email) ? 'admin' : 'user');
  const isOwner = role === 'owner';

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const [usersRes, ticketsRes, merchantRes, annRes, kycRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('merchant_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('platform_announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('user_verifications').select('*').order('created_at', { ascending: false }),
    ]);
    setUsers((usersRes.data as Profile[]) || []);
    setTickets((ticketsRes.data as SupportTicket[]) || []);
    setMerchantReqs((merchantRes.data as MerchantReq[]) || []);
    setAnnouncements((annRes.data as Announcement[]) || []);
    setKycSubmissions((kycRes.data as KycSubmission[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid?.includes(searchQuery) ||
    u.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleWarnUser = async () => {
    if (!selectedUser || !warnReason.trim()) return;
    setLoading(true);
    const newWarningCount = (selectedUser.warning_count || 0) + 1;
    await supabase.from('user_warnings').insert({
      user_id: selectedUser.user_id,
      warned_by: userId,
      warned_by_email: profile.email,
      reason: warnReason,
      warning_number: newWarningCount,
    });
    await supabase.from('profiles').update({ warning_count: newWarningCount }).eq('user_id', selectedUser.user_id);

    // If 2 warnings, auto-ban and transfer funds to owner
    if (newWarningCount >= 2) {
      const ownerEmail = 'gojoexpresscom@gmail.com';
      const { data: ownerProfile } = await supabase.from('profiles').select('user_id, usdt_balance').eq('email', ownerEmail).maybeSingle();
      if (ownerProfile) {
        // Transfer all balances to owner
        const bannedUsdt = parseFloat(selectedUser.usdt_balance?.toString() || '0');
        const bannedBtc = parseFloat(selectedUser.btc_balance?.toString() || '0');
        const bannedEth = parseFloat(selectedUser.eth_balance?.toString() || '0');
        const ownerUsdt = parseFloat(ownerProfile.usdt_balance?.toString() || '0') + bannedUsdt;
        const ownerBtc = parseFloat(ownerProfile.btc_balance?.toString() || '0') + bannedBtc;
        const ownerEth = parseFloat(ownerProfile.eth_balance?.toString() || '0') + bannedEth;
        await supabase.from('profiles').update({
          usdt_balance: ownerUsdt, btc_balance: ownerBtc, eth_balance: ownerEth,
        }).eq('user_id', ownerProfile.user_id);
      }
      await supabase.from('profiles').update({
        is_banned: true, banned_at: new Date().toISOString(),
        ban_reason: `Banned after 2 warnings: ${warnReason}`,
        usdt_balance: 0, btc_balance: 0, eth_balance: 0,
      }).eq('user_id', selectedUser.user_id);
    }

    setWarnReason('');
    setShowWarnModal(false);
    setSelectedUser(null);
    setLoading(false);
    loadDashboard();
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) return;
    setLoading(true);
    // Transfer funds to owner
    const ownerEmail = 'gojoexpresscom@gmail.com';
    const { data: ownerProfile } = await supabase.from('profiles').select('user_id, usdt_balance, btc_balance, eth_balance').eq('email', ownerEmail).maybeSingle();
    if (ownerProfile) {
      const bannedUsdt = parseFloat(selectedUser.usdt_balance?.toString() || '0');
      const bannedBtc = parseFloat(selectedUser.btc_balance?.toString() || '0');
      const bannedEth = parseFloat(selectedUser.eth_balance?.toString() || '0');
      const ownerUsdt = parseFloat(ownerProfile.usdt_balance?.toString() || '0') + bannedUsdt;
      const ownerBtc = parseFloat(ownerProfile.btc_balance?.toString() || '0') + bannedBtc;
      const ownerEth = parseFloat(ownerProfile.eth_balance?.toString() || '0') + bannedEth;
      await supabase.from('profiles').update({
        usdt_balance: ownerUsdt, btc_balance: ownerBtc, eth_balance: ownerEth,
      }).eq('user_id', ownerProfile.user_id);
    }
    await supabase.from('profiles').update({
      is_banned: true, banned_at: new Date().toISOString(),
      ban_reason: banReason, usdt_balance: 0, btc_balance: 0, eth_balance: 0,
    }).eq('user_id', selectedUser.user_id);
    setBanReason('');
    setShowBanModal(false);
    setSelectedUser(null);
    setLoading(false);
    loadDashboard();
  };

  const handleApproveKyc = async (kyc: KycSubmission) => {
    setLoading(true);
    await supabase.from('user_verifications').update({ status: 'verified' }).eq('id', kyc.id);
    await supabase.from('profiles').update({ kyc_status: 'VERIFIED' }).eq('user_id', kyc.user_id);
    setLoading(false);
    loadDashboard();
  };

  const handleDenyKyc = async (kyc: KycSubmission) => {
    setLoading(true);
    await supabase.from('user_verifications').update({ status: 'rejected', rejection_reason: 'Denied by admin' }).eq('id', kyc.id);
    await supabase.from('profiles').update({ kyc_status: 'REJECTED' }).eq('user_id', kyc.user_id);
    setLoading(false);
    loadDashboard();
  };

  const handlePostAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) return;
    setLoading(true);
    await supabase.from('platform_announcements').insert({
      author_id: userId,
      author_email: profile.email,
      author_role: role,
      title: annTitle,
      content: annContent,
      type: annType,
    });
    setAnnTitle(''); setAnnContent(''); setAnnType('info');
    setLoading(false);
    loadDashboard();
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await supabase.from('platform_announcements').delete().eq('id', id);
    loadDashboard();
  };

  const handleCreateGiveaway = async () => {
    if (!giveTitle.trim() || !giveAmount) return;
    setLoading(true);
    const numCodes = parseInt(giveCodes) || 1;
    for (let i = 0; i < numCodes; i++) {
      const code = `CEO-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      await supabase.from('giveaway_campaigns').insert({
        creator_id: userId,
        creator_email: profile.email,
        title: giveTitle,
        description: giveDesc,
        reward_amount: parseFloat(giveAmount),
        reward_currency: giveCurrency,
        total_codes: 1,
        redeem_code: code,
      });
    }
    setGiveTitle(''); setGiveDesc(''); setGiveAmount(''); setGiveCodes('1');
    setLoading(false);
    loadDashboard();
  };

  const handleApproveMerchant = async (req: MerchantReq) => {
    setLoading(true);
    await supabase.from('merchant_requests').update({ status: 'approved', reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq('id', req.id);
    await supabase.from('profiles').update({ p2p_merchant_status: 'APPROVED' }).eq('user_id', req.user_id);
    setLoading(false);
    loadDashboard();
  };

  const handleDenyMerchant = async (req: MerchantReq) => {
    setLoading(true);
    await supabase.from('merchant_requests').update({ status: 'denied', reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq('id', req.id);
    await supabase.from('profiles').update({ p2p_merchant_status: 'REJECTED' }).eq('user_id', req.user_id);
    setLoading(false);
    loadDashboard();
  };

  const handleReplyTicket = async () => {
    if (!activeTicket || !replyText.trim()) return;
    setLoading(true);
    await supabase.from('support_ticket_replies').insert({
      ticket_id: activeTicket.id,
      replier_id: userId,
      replier_email: profile.email,
      replier_role: role,
      message: replyText,
    });
    await supabase.from('support_tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', activeTicket.id);
    setReplyText('');
    setLoading(false);
  };

  const handleResolveTicket = async (ticket: SupportTicket) => {
    await supabase.from('support_tickets').update({ status: 'resolved', updated_at: new Date().toISOString() }).eq('id', ticket.id);
    loadDashboard();
  };

  const totalUsers = users.length;
  const verifiedUsers = users.filter(u => u.kyc_status === 'VERIFIED').length;
  const pendingKyc = kycSubmissions.filter(k => k.status === 'pending').length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const pendingMerchants = merchantReqs.filter(m => m.status === 'pending').length;
  const bannedUsers = users.filter(u => u.is_banned).length;
  const totalUsdLiquidity = users.reduce((sum, u) => sum + parseFloat(u.usdt_balance?.toString() || '0'), 0);

  const tabs: Array<{ id: Tab; label: string; icon: typeof Users; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users, badge: totalUsers },
    { id: 'kyc', label: 'KYC Review', icon: ShieldCheck, badge: pendingKyc },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'giveaways', label: 'Giveaways', icon: Gift },
    { id: 'support', label: 'Support', icon: MessageSquare, badge: openTickets },
    { id: 'merchant', label: 'Merchant Reqs', icon: Wallet, badge: pendingMerchants },
  ];

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#0b0e11] z-20 border-b border-[#1e2026]">
        <button onClick={onBack}><ArrowLeft className="w-6 h-6" /></button>
        <div className="flex items-center gap-2">
          {isOwner ? <Crown className="w-5 h-5 text-amber-400" /> : <Building2 className="w-5 h-5 text-amber-400" />}
          <h1 className="text-base font-bold">{isOwner ? 'Owner Portal' : 'Admin Portal'}</h1>
        </div>
        <button onClick={onLogout} className="text-xs text-rose-400 hover:text-rose-300">Logout</button>
      </div>

      {/* Role badge */}
      <div className="px-4 py-2 bg-gradient-to-r from-amber-500/10 to-transparent">
        <p className="text-xs text-amber-400 font-semibold">
          {isOwner ? 'OWNER ACCESS — Full Control' : 'ADMIN ACCESS — Limited Control'}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-2 py-2 overflow-x-auto border-b border-[#1e2026]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${tab === t.id ? 'bg-[#f0b90b] text-black' : 'bg-[#1e2026] text-[#848e9c] hover:text-[#eaecef]'}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${tab === t.id ? 'bg-black/20' : 'bg-rose-500/20 text-rose-400'}`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-4 pb-8 overflow-y-auto">
        {loading && <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>}

        {/* DASHBOARD */}
        {tab === 'dashboard' && !loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-sky-400' },
                { label: 'Verified', value: verifiedUsers, icon: ShieldCheck, color: 'text-emerald-400' },
                { label: 'Pending KYC', value: pendingKyc, icon: Clock, color: 'text-amber-400' },
                { label: 'Banned', value: bannedUsers, icon: Ban, color: 'text-rose-400' },
                { label: 'Open Tickets', value: openTickets, icon: MessageSquare, color: 'text-purple-400' },
                { label: 'Merchant Reqs', value: pendingMerchants, icon: Wallet, color: 'text-orange-400' },
              ].map((stat, i) => (
                <div key={i} className="bg-[#1e2026] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    <span className="text-2xl font-black">{stat.value}</span>
                  </div>
                  <p className="text-xs text-[#848e9c]">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-5 h-5 text-amber-400" />
                <p className="text-sm font-bold text-amber-400">Platform USDT Liquidity</p>
              </div>
              <p className="text-2xl font-black text-[#eaecef]">{totalUsdLiquidity.toFixed(2)} USDT</p>
              <p className="text-xs text-[#848e9c] mt-1">Total USDT held by all users</p>
            </div>
            <div className="bg-[#1e2026] rounded-xl p-4">
              <p className="text-sm font-bold mb-3">Admin Permissions</p>
              <div className="space-y-2">
                {[
                  { label: 'View all user data', admin: true, owner: true },
                  { label: 'Post announcements', admin: true, owner: true },
                  { label: 'Approve/Deny KYC', admin: true, owner: true },
                  { label: 'Approve/Deny Merchant requests', admin: true, owner: true },
                  { label: 'Reply to support tickets', admin: true, owner: true },
                  { label: 'Create giveaways', admin: true, owner: true },
                  { label: 'Warn users', admin: false, owner: true },
                  { label: 'Ban users & seize funds', admin: false, owner: true },
                  { label: 'Edit user profiles', admin: false, owner: false },
                  { label: 'Withdraw user funds', admin: false, owner: false },
                ].map((perm, i) => {
                  const allowed = isOwner ? perm.owner : perm.admin;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-[#848e9c]">{perm.label}</span>
                      {allowed ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && !loading && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#848e9c]" />
              <input type="text" placeholder="Search by email, UID, or nickname..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#eaecef] placeholder:text-[#474d57] focus:outline-none focus:border-[#f0b90b]" />
            </div>
            {filteredUsers.map(u => (
              <div key={u.user_id} className="bg-[#1e2026] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-[#f0b90b]/10 flex items-center justify-center text-xs font-bold text-[#f0b90b]">
                      {(u.nickname || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{u.nickname || u.email}</p>
                      <p className="text-xs text-[#848e9c]">UID: {u.uid}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {u.is_banned && <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold">BANNED</span>}
                    {u.kyc_status === 'VERIFIED' && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">VERIFIED</span>}
                    {u.warning_count > 0 && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">{u.warning_count} WARN</span>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="bg-[#0b0e11] rounded-lg p-2">
                    <p className="text-[#474d57]">USDT</p>
                    <p className="font-bold">{parseFloat(u.usdt_balance?.toString() || '0').toFixed(2)}</p>
                  </div>
                  <div className="bg-[#0b0e11] rounded-lg p-2">
                    <p className="text-[#474d57]">BTC</p>
                    <p className="font-bold">{parseFloat(u.btc_balance?.toString() || '0').toFixed(6)}</p>
                  </div>
                  <div className="bg-[#0b0e11] rounded-lg p-2">
                    <p className="text-[#474d57]">ETH</p>
                    <p className="font-bold">{parseFloat(u.eth_balance?.toString() || '0').toFixed(6)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedUser(u); setShowWarnModal(true); }} disabled={!isOwner} className="flex-1 text-xs font-bold py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 disabled:opacity-40">Warn</button>
                  <button onClick={() => { setSelectedUser(u); setShowBanModal(true); }} disabled={!isOwner} className="flex-1 text-xs font-bold py-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 disabled:opacity-40">Ban</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KYC REVIEW */}
        {tab === 'kyc' && !loading && (
          <div className="space-y-3">
            {kycSubmissions.length === 0 ? <p className="text-sm text-[#848e9c] text-center py-8">No KYC submissions.</p> : (
              kycSubmissions.map(kyc => (
                <div key={kyc.id} className="bg-[#1e2026] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold">{kyc.full_name}</p>
                      <p className="text-xs text-[#848e9c]">{kyc.document_type}: {kyc.document_number}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${kyc.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : kyc.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{kyc.status.toUpperCase()}</span>
                  </div>
                  {kyc.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleApproveKyc(kyc)} className="flex-1 text-xs font-bold py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approve</button>
                      <button onClick={() => handleDenyKyc(kyc)} className="flex-1 text-xs font-bold py-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">Deny</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ANNOUNCEMENTS */}
        {tab === 'announcements' && !loading && (
          <div className="space-y-4">
            <div className="bg-[#1e2026] rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold">Post New Announcement</p>
              <input type="text" placeholder="Title" value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] placeholder:text-[#474d57] focus:outline-none focus:border-[#f0b90b]" />
              <textarea placeholder="Content" value={annContent} onChange={e => setAnnContent(e.target.value)} rows={3} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] placeholder:text-[#474d57] focus:outline-none focus:border-[#f0b90b] resize-none" />
              <select value={annType} onChange={e => setAnnType(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] focus:outline-none focus:border-[#f0b90b]">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="maintenance">Maintenance</option>
                <option value="promotion">Promotion</option>
              </select>
              <button onClick={handlePostAnnouncement} disabled={loading} className="w-full bg-[#f0b90b] text-black font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">Post Announcement</button>
            </div>
            {announcements.map(ann => (
              <div key={ann.id} className="bg-[#1e2026] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ann.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : ann.type === 'maintenance' ? 'bg-rose-500/20 text-rose-400' : ann.type === 'promotion' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'}`}>{ann.type.toUpperCase()}</span>
                  <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-rose-400 hover:text-rose-300"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-sm font-bold">{ann.title}</p>
                <p className="text-xs text-[#848e9c] mt-1">{ann.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* GIVEAWAYS */}
        {tab === 'giveaways' && !loading && (
          <div className="space-y-4">
            <div className="bg-[#1e2026] rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold">Create Giveaway</p>
              <input type="text" placeholder="Title" value={giveTitle} onChange={e => setGiveTitle(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] placeholder:text-[#474d57] focus:outline-none focus:border-[#f0b90b]" />
              <textarea placeholder="Description (optional)" value={giveDesc} onChange={e => setGiveDesc(e.target.value)} rows={2} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] placeholder:text-[#474d57] focus:outline-none focus:border-[#f0b90b] resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Amount" value={giveAmount} onChange={e => setGiveAmount(e.target.value)} className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] placeholder:text-[#474d57] focus:outline-none focus:border-[#f0b90b]" />
                <select value={giveCurrency} onChange={e => setGiveCurrency(e.target.value)} className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] focus:outline-none focus:border-[#f0b90b]">
                  <option value="USDT">USDT</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
              <input type="number" placeholder="Number of codes" value={giveCodes} onChange={e => setGiveCodes(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] placeholder:text-[#474d57] focus:outline-none focus:border-[#f0b90b]" />
              <button onClick={handleCreateGiveaway} disabled={loading} className="w-full bg-[#f0b90b] text-black font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">Create Giveaway Codes</button>
            </div>
          </div>
        )}

        {/* SUPPORT TICKETS */}
        {tab === 'support' && !loading && (
          <div className="space-y-3">
            {tickets.length === 0 ? <p className="text-sm text-[#848e9c] text-center py-8">No support tickets.</p> : (
              tickets.map(ticket => (
                <div key={ticket.id} className="bg-[#1e2026] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold">{ticket.subject}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ticket.status === 'open' ? 'bg-amber-500/20 text-amber-400' : ticket.status === 'in_progress' ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{ticket.status.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-[#848e9c]">{ticket.user_email}</p>
                  <p className="text-xs text-[#eaecef] mt-2">{ticket.message}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setActiveTicket(ticket)} className="flex-1 text-xs font-bold py-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">Reply</button>
                    <button onClick={() => handleResolveTicket(ticket)} className="flex-1 text-xs font-bold py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolve</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* MERCHANT REQUESTS */}
        {tab === 'merchant' && !loading && (
          <div className="space-y-3">
            {merchantReqs.length === 0 ? <p className="text-sm text-[#848e9c] text-center py-8">No merchant requests.</p> : (
              merchantReqs.map(req => (
                <div key={req.id} className="bg-[#1e2026] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold">{req.user_email}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{req.status.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-[#848e9c]">{req.request_type}</p>
                  {req.message && <p className="text-xs text-[#eaecef] mt-2">{req.message}</p>}
                  {req.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleApproveMerchant(req)} className="flex-1 text-xs font-bold py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approve</button>
                      <button onClick={() => handleDenyMerchant(req)} className="flex-1 text-xs font-bold py-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">Deny</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Warn Modal */}
      {showWarnModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4" onClick={() => setShowWarnModal(false)}>
          <div className="w-full max-w-sm bg-[#181a20] rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Warn User</h3>
              <button onClick={() => setShowWarnModal(false)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <p className="text-xs text-[#848e9c] mb-3">Warning will be sent to: <span className="text-[#eaecef] font-bold">{selectedUser.email}</span></p>
            <textarea placeholder="Reason for warning..." value={warnReason} onChange={e => setWarnReason(e.target.value)} rows={3} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] placeholder:text-[#474d57] focus:outline-none focus:border-[#f0b90b] resize-none mb-3" />
            <p className="text-[10px] text-amber-400 mb-3">Note: 2 warnings will auto-ban the user and transfer their funds to the owner account.</p>
            <button onClick={handleWarnUser} disabled={loading} className="w-full bg-amber-500 text-black font-bold py-3 rounded-xl text-sm disabled:opacity-50">Send Warning</button>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4" onClick={() => setShowBanModal(false)}>
          <div className="w-full max-w-sm bg-[#181a20] rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-rose-400">Ban User</h3>
              <button onClick={() => setShowBanModal(false)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <p className="text-xs text-[#848e9c] mb-3">Banning: <span className="text-[#eaecef] font-bold">{selectedUser.email}</span></p>
            <p className="text-xs text-rose-400 mb-3">All funds (USDT, BTC, ETH) will be transferred to the owner account and the user will be permanently banned.</p>
            <textarea placeholder="Reason for ban..." value={banReason} onChange={e => setBanReason(e.target.value)} rows={3} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] placeholder:text-[#474d57] focus:outline-none focus:border-rose-500 resize-none mb-3" />
            <button onClick={handleBanUser} disabled={loading} className="w-full bg-rose-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">Ban & Seize Funds</button>
          </div>
        </div>
      )}

      {/* Ticket Reply Modal */}
      {activeTicket && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4" onClick={() => { setActiveTicket(null); setReplyText(''); }}>
          <div className="w-full max-w-sm bg-[#181a20] rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Reply to Ticket</h3>
              <button onClick={() => { setActiveTicket(null); setReplyText(''); }}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <p className="text-xs text-[#848e9c] mb-1">Subject: <span className="text-[#eaecef]">{activeTicket.subject}</span></p>
            <p className="text-xs text-[#848e9c] mb-3">From: <span className="text-[#eaecef]">{activeTicket.user_email}</span></p>
            <textarea placeholder="Type your reply..." value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] placeholder:text-[#474d57] focus:outline-none focus:border-[#f0b90b] resize-none mb-3" />
            <button onClick={handleReplyTicket} disabled={loading || !replyText.trim()} className="w-full bg-[#f0b90b] text-black font-bold py-3 rounded-xl text-sm disabled:opacity-50">Send Reply</button>
          </div>
        </div>
      )}
    </div>
  );
}