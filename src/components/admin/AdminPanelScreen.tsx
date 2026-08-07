import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard, Users, ShieldCheck, Building2, ArrowLeftRight, Ticket,
  Megaphone, Gift, FileBarChart, Settings, ShieldAlert, ScrollText, LogOut,
  Search, Bell, Eye, Pencil, MoreHorizontal, Check, X, Loader2, Ban,
  Crown, TrendingUp, Wallet, Clock, UserCheck, UserX, Plus, Send,
  Download, Filter, ChevronLeft, ChevronRight, AlertCircle, Trash2,
  KeyRound, Lock, Unlock, Power, RefreshCw, MessageSquare, ArrowLeft, Menu,
} from 'lucide-react';
import { supabase, type Profile, type Transaction } from '@/lib/supabase';
import { isAdminEmail, isOwnerEmail, type UserRole } from '@/lib/auth';

type Props = {
  userId: string;
  profile: Profile;
  onBack: () => void;
  onLogout: () => void;
};

type Tab = 'dashboard' | 'users' | 'kyc' | 'merchants' | 'transactions' | 'tickets' | 'announcements' | 'giveaways' | 'reports' | 'settings' | 'roles' | 'logs';

type SupportTicket = {
  id: string; user_id: string; user_email: string; subject: string;
  message: string; category: string; status: string; priority: string; created_at: string;
};

type MerchantReq = {
  id: string; user_id: string; user_email: string; request_type: string;
  message: string | null; status: string; created_at: string;
};

type Announcement = {
  id: string; title: string; content: string; type: string;
  is_active: boolean; is_pinned: boolean; created_at: string;
};

type KycSubmission = {
  id: string; user_id: string; full_name: string; document_type: string;
  document_number: string; status: string; tier_level: number; created_at: string;
  front_photo_url: string | null; back_photo_url: string | null;
  rejection_reason: string | null; date_of_birth: string | null;
};

type AdminLog = {
  id: string; admin_email: string; action: string; target_type: string | null;
  target_id: string | null; details: string | null; created_at: string;
};

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

const PAGE_SIZE = 8;

export default function AdminPanelScreen({ userId, profile, onBack, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [users, setUsers] = useState<Profile[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [merchantReqs, setMerchantReqs] = useState<MerchantReq[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmission[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; text: string; read: boolean }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Users tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [viewUser, setViewUser] = useState<Profile | null>(null);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [moreUser, setMoreUser] = useState<Profile | null>(null);
  const [viewKyc, setViewKyc] = useState<KycSubmission | null>(null);
  const [viewTicket, setViewTicket] = useState<SupportTicket | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPostAnn, setShowPostAnn] = useState(false);
  const [showCreateGiveaway, setShowCreateGiveaway] = useState(false);
  const [banUser, setBanUser] = useState<Profile | null>(null);
  const [warnUser, setWarnUser] = useState<Profile | null>(null);
  const [resetPassUser, setResetPassUser] = useState<Profile | null>(null);
  const [directMsgUser, setDirectMsgUser] = useState<Profile | null>(null);

  // Edit user form
  const [editRole, setEditRole] = useState('');
  const [editKyc, setEditKyc] = useState('');
  const [editBanned, setEditBanned] = useState(false);

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

  // Ticket reply
  const [replyText, setReplyText] = useState('');

  // Add user form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');

  // Settings
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    withdrawalsEnabled: true,
    tradingEnabled: true,
    signupEnabled: true,
    minKycAge: '18',
    maxWithdrawPerDay: '10000',
    supportEmail: 'support@ceoexchange.com',
  });

  // Roles
  const [roles, setRoles] = useState([
    { name: 'Super Admin', users: ['gojoexpresscom@gmail.com'], perms: { all: true } },
    { name: 'Support', users: [], perms: { tickets: true, users: true, kyc: false, announcements: false, finance: false } },
    { name: 'Compliance', users: [], perms: { tickets: false, users: false, kyc: true, announcements: false, finance: false } },
    { name: 'Finance', users: [], perms: { tickets: false, users: false, kyc: false, announcements: false, finance: true } },
  ]);

  const role: UserRole = profile.role || (isOwnerEmail(profile.email) ? 'owner' : isAdminEmail(profile.email) ? 'admin' : 'user');
  const isOwner = role === 'owner';

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const logAdminAction = async (action: string, targetType: string, targetId: string, details?: string) => {
    await supabase.from('admin_logs').insert({
      admin_id: userId, admin_email: profile.email,
      action, target_type: targetType, target_id: targetId, details: details || null,
    });
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [usersRes, ticketsRes, merchantRes, annRes, kycRes, txRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('merchant_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('platform_announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('user_verifications').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setUsers((usersRes.data as Profile[]) || []);
    setTickets((ticketsRes.data as SupportTicket[]) || []);
    setMerchantReqs((merchantRes.data as MerchantReq[]) || []);
    setAnnouncements((annRes.data as Announcement[]) || []);
    setKycSubmissions((kycRes.data as KycSubmission[]) || []);
    setTransactions((txRes.data as Transaction[]) || []);
    setAdminLogs((logsRes.data as AdminLog[]) || []);

    // Generate notifications from pending items
    const pendingKyc = (kycRes.data || []).filter((k: KycSubmission) => k.status === 'pending').length;
    const openTickets = (ticketsRes.data || []).filter((t: SupportTicket) => t.status === 'open').length;
    const pendingMerch = (merchantRes.data || []).filter((m: MerchantReq) => m.status === 'pending').length;
    const notifs: { id: string; text: string; read: boolean }[] = [];
    if (pendingKyc > 0) notifs.push({ id: 'n1', text: `${pendingKyc} KYC submissions pending review`, read: false });
    if (openTickets > 0) notifs.push({ id: 'n2', text: `${openTickets} open support tickets`, read: false });
    if (pendingMerch > 0) notifs.push({ id: 'n3', text: `${pendingMerch} merchant requests pending`, read: false });
    setNotifications(notifs);

    setLoading(false);
  }, [userId, profile.email]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ===== FILTERED USERS =====
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchQuery ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.uid?.includes(searchQuery) ||
        u.nickname?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && !u.is_banned) ||
        (statusFilter === 'banned' && u.is_banned);
      const matchesRole = roleFilter === 'all' ||
        (u.role || 'user') === roleFilter ||
        (roleFilter === 'admin' && (isAdminEmail(u.email) || isOwnerEmail(u.email)));
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE) || 1;
  const pagedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ===== STATS =====
  const totalUsers = users.length;
  const verifiedUsers = users.filter(u => u.kyc_status === 'VERIFIED').length;
  const pendingKyc = kycSubmissions.filter(k => k.status === 'pending').length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const pendingMerchants = merchantReqs.filter(m => m.status === 'pending').length;
  const bannedUsers = users.filter(u => u.is_banned).length;
  const totalUsdtLiquidity = users.reduce((sum, u) => sum + parseFloat(u.usdt_balance?.toString() || '0'), 0);
  const totalDeposits = transactions.filter(t => t.type === 'DEPOSIT' && t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type === 'WITHDRAW' && t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0);

  // ===== ACTIONS =====
  const handleBanUser = async () => {
    if (!banUser) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      is_banned: true, banned_at: new Date().toISOString(),
      ban_reason: 'Banned by admin',
    }).eq('user_id', banUser.user_id);
    if (error) { showToast('Failed to ban user. Please try again.', 'error'); setLoading(false); return; }
    await logAdminAction('ban_user', 'user', banUser.user_id, 'Banned by admin');
    showToast(`User ${banUser.email} has been banned`, 'success');
    setBanUser(null);
    setLoading(false);
    loadAll();
  };

  const handleWarnUser = async () => {
    if (!warnUser) return;
    setLoading(true);
    const newCount = (warnUser.warning_count || 0) + 1;
    const { error: wErr } = await supabase.from('user_warnings').insert({
      user_id: warnUser.user_id, warned_by: userId, warned_by_email: profile.email,
      reason: 'Warned by admin', warning_number: newCount,
    });
    if (wErr) { showToast('Failed to send warning. Please try again.', 'error'); setLoading(false); return; }
    const { error: pErr } = await supabase.from('profiles').update({ warning_count: newCount }).eq('user_id', warnUser.user_id);
    if (pErr) { showToast('Warning recorded but profile update failed.', 'error'); setLoading(false); return; }
    await logAdminAction('warn_user', 'user', warnUser.user_id, `Warning #${newCount}`);
    showToast(`Warning sent to ${warnUser.email}`, 'success');
    setWarnUser(null);
    setLoading(false);
    loadAll();
  };

  const handleUnbanUser = async (u: Profile) => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      is_banned: false, banned_at: null, ban_reason: null,
    }).eq('user_id', u.user_id);
    if (error) { showToast('Failed to unban user. Please try again.', 'error'); setLoading(false); return; }
    await logAdminAction('unban_user', 'user', u.user_id);
    showToast(`User ${u.email} has been unbanned`, 'success');
    setLoading(false);
    loadAll();
  };

  const handleSaveEditUser = async () => {
    if (!editUser) return;
    setLoading(true);
    const updates: Record<string, unknown> = {};
    if (editRole !== (editUser.role || 'user')) updates.role = editRole;
    if (editKyc !== editUser.kyc_status) updates.kyc_status = editKyc;
    if (editBanned !== !!editUser.is_banned) {
      updates.is_banned = editBanned;
      updates.banned_at = editBanned ? new Date().toISOString() : null;
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('profiles').update(updates).eq('user_id', editUser.user_id);
      if (error) { showToast('Failed to update profile. Please try again.', 'error'); setLoading(false); return; }
      await logAdminAction('edit_user', 'user', editUser.user_id, JSON.stringify(updates));
      showToast(`Profile updated for ${editUser.email}`, 'success');
    }
    setEditUser(null);
    setLoading(false);
    loadAll();
  };

  const handleApproveKyc = async (kyc: KycSubmission) => {
    setLoading(true);
    const { error: vErr } = await supabase.from('user_verifications').update({ status: 'verified' }).eq('id', kyc.id);
    if (vErr) { showToast('Failed to update verification record.', 'error'); setLoading(false); return; }
    const { error: pErr } = await supabase.from('profiles').update({ kyc_status: 'VERIFIED' }).eq('user_id', kyc.user_id);
    if (pErr) { showToast('Verification updated but profile sync failed.', 'error'); setLoading(false); return; }
    await logAdminAction('approve_kyc', 'kyc', kyc.id, `Approved for ${kyc.full_name}`);
    showToast(`KYC approved for ${kyc.full_name}`, 'success');
    setLoading(false);
    loadAll();
  };

  const handleRejectKyc = async (kyc: KycSubmission, reason: string) => {
    setLoading(true);
    const { error: vErr } = await supabase.from('user_verifications').update({ status: 'rejected', rejection_reason: reason }).eq('id', kyc.id);
    if (vErr) { showToast('Failed to update verification record.', 'error'); setLoading(false); return; }
    const { error: pErr } = await supabase.from('profiles').update({ kyc_status: 'REJECTED' }).eq('user_id', kyc.user_id);
    if (pErr) { showToast('Rejection recorded but profile sync failed.', 'error'); setLoading(false); return; }
    await logAdminAction('reject_kyc', 'kyc', kyc.id, `Rejected: ${reason}`);
    showToast(`KYC rejected for ${kyc.full_name}`, 'error');
    setLoading(false);
    loadAll();
  };

  const handlePostAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) { showToast('Title and content are required', 'error'); return; }
    setLoading(true);
    const { error } = await supabase.from('platform_announcements').insert({
      author_id: userId, author_email: profile.email, author_role: role,
      title: annTitle, content: annContent, type: annType, is_active: true,
    });
    if (error) { showToast('Failed to post announcement: ' + error.message, 'error'); setLoading(false); return; }
    await logAdminAction('post_announcement', 'announcement', '', annTitle);
    showToast('Announcement posted successfully', 'success');
    setAnnTitle(''); setAnnContent(''); setAnnType('info');
    setShowPostAnn(false);
    setLoading(false);
    loadAll();
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from('platform_announcements').delete().eq('id', id);
    if (error) { showToast('Failed to delete announcement.', 'error'); return; }
    await logAdminAction('delete_announcement', 'announcement', id);
    showToast('Announcement deleted', 'success');
    loadAll();
  };

  const handleToggleAnnouncement = async (ann: Announcement) => {
    const { error } = await supabase.from('platform_announcements').update({ is_active: !ann.is_active }).eq('id', ann.id);
    if (error) { showToast('Failed to toggle announcement.', 'error'); return; }
    showToast(`Announcement ${ann.is_active ? 'disabled' : 'enabled'}`, 'success');
    loadAll();
  };

  const handleCreateGiveaway = async () => {
    if (!giveTitle.trim() || !giveAmount) { showToast('Title and amount are required', 'error'); return; }
    setLoading(true);
    const numCodes = parseInt(giveCodes) || 1;
    let created = 0;
    for (let i = 0; i < numCodes; i++) {
      const code = `CEO-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const { error } = await supabase.from('giveaway_campaigns').insert({
        creator_id: userId, creator_email: profile.email,
        title: giveTitle, description: giveDesc,
        reward_amount: parseFloat(giveAmount), reward_currency: giveCurrency,
        total_codes: 1, redeem_code: code,
      });
      if (!error) created++;
    }
    if (created === 0) { showToast('Failed to create giveaway codes.', 'error'); setLoading(false); return; }
    await logAdminAction('create_giveaway', 'giveaway', '', `${giveTitle} (${created} codes)`);
    showToast(`${created} giveaway codes created`, 'success');
    setGiveTitle(''); setGiveDesc(''); setGiveAmount(''); setGiveCodes('1');
    setShowCreateGiveaway(false);
    setLoading(false);
    loadAll();
  };

  const handleApproveMerchant = async (req: MerchantReq) => {
    setLoading(true);
    const { error: rErr } = await supabase.from('merchant_requests').update({ status: 'approved', reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq('id', req.id);
    if (rErr) { showToast('Failed to approve merchant request.', 'error'); setLoading(false); return; }
    const { error: pErr } = await supabase.from('profiles').update({ p2p_merchant_status: 'APPROVED' }).eq('user_id', req.user_id);
    if (pErr) { showToast('Request approved but profile sync failed.', 'error'); setLoading(false); return; }
    await logAdminAction('approve_merchant', 'merchant', req.id, req.user_email);
    showToast(`Merchant approved for ${req.user_email}`, 'success');
    setLoading(false);
    loadAll();
  };

  const handleDenyMerchant = async (req: MerchantReq) => {
    setLoading(true);
    const { error: rErr } = await supabase.from('merchant_requests').update({ status: 'denied', reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq('id', req.id);
    if (rErr) { showToast('Failed to deny merchant request.', 'error'); setLoading(false); return; }
    const { error: pErr } = await supabase.from('profiles').update({ p2p_merchant_status: 'REJECTED' }).eq('user_id', req.user_id);
    if (pErr) { showToast('Request denied but profile sync failed.', 'error'); setLoading(false); return; }
    await logAdminAction('deny_merchant', 'merchant', req.id, req.user_email);
    showToast(`Merchant denied for ${req.user_email}`, 'error');
    setLoading(false);
    loadAll();
  };

  const handleReplyTicket = async () => {
    if (!viewTicket || !replyText.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('support_messages').insert({
      ticket_id: viewTicket.id, user_id: userId, message: replyText,
    });
    if (error) { showToast('Failed to send reply. Please try again.', 'error'); setLoading(false); return; }
    const { error: tErr } = await supabase.from('support_tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', viewTicket.id);
    if (tErr) { showToast('Reply sent but ticket status update failed.', 'error'); setLoading(false); return; }
    await logAdminAction('reply_ticket', 'ticket', viewTicket.id, viewTicket.subject);
    showToast('Reply sent', 'success');
    setReplyText('');
    setLoading(false);
  };

  const handleCloseTicket = async (ticket: SupportTicket) => {
    const { error } = await supabase.from('support_tickets').update({ status: 'resolved', updated_at: new Date().toISOString() }).eq('id', ticket.id);
    if (error) { showToast('Failed to close ticket.', 'error'); return; }
    await logAdminAction('close_ticket', 'ticket', ticket.id, ticket.subject);
    showToast('Ticket resolved', 'success');
    setViewTicket(null);
    loadAll();
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim()) { showToast('Email and password are required', 'error'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.admin.createUser({
      email: newUserEmail.trim().toLowerCase(),
      password: newUserPassword,
      email_confirm: true,
    });
    if (error) {
      // Fallback: use regular signup
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newUserEmail.trim().toLowerCase(),
        password: newUserPassword,
      });
      if (signUpError) { showToast('Failed to create user: ' + signUpError.message, 'error'); setLoading(false); return; }
      if (signUpData.user) {
        await supabase.from('profiles').upsert({
          user_id: signUpData.user.id, email: newUserEmail.trim().toLowerCase(),
          nickname: newUserName || newUserEmail.split('@')[0], role: newUserRole,
          kyc_status: 'UNVERIFIED', vip_level: 0,
          uid: Math.floor(Math.random() * 900000000 + 100000000).toString(),
          security_level: 'Low', fund_password_set: false, two_fa_enabled: false,
          p2p_merchant_status: 'NONE', preferred_language: 'English', preferred_currency: 'USD',
        }, { onConflict: 'user_id' });
      }
    } else if (data.user) {
      await supabase.from('profiles').upsert({
        user_id: data.user.id, email: newUserEmail.trim().toLowerCase(),
        nickname: newUserName || newUserEmail.split('@')[0], role: newUserRole,
        kyc_status: 'UNVERIFIED', vip_level: 0,
        uid: Math.floor(Math.random() * 900000000 + 100000000).toString(),
        security_level: 'Low', fund_password_set: false, two_fa_enabled: false,
        p2p_merchant_status: 'NONE', preferred_language: 'English', preferred_currency: 'USD',
      }, { onConflict: 'user_id' });
    }
    await logAdminAction('add_user', 'user', newUserEmail, `Role: ${newUserRole}`);
    showToast('User created successfully', 'success');
    setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserRole('user');
    setShowAddUser(false);
    setLoading(false);
    loadAll();
  };

  const handleResetPassword = async () => {
    if (!resetPassUser) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetPassUser.email, {
      redirectTo: `${window.location.origin}${window.location.pathname}?type=recovery`,
    });
    if (error) { showToast('Failed to send reset email', 'error'); }
    else {
      await logAdminAction('reset_password', 'user', resetPassUser.user_id, resetPassUser.email);
      showToast(`Password reset email sent to ${resetPassUser.email}`, 'success');
    }
    setResetPassUser(null);
    setLoading(false);
  };

  const handleDirectMessage = async () => {
    if (!directMsgUser) return;
    // Navigate to support ticket creation for this user
    setViewTicket({
      id: 'new-' + directMsgUser.user_id,
      user_id: directMsgUser.user_id,
      user_email: directMsgUser.email,
      subject: 'Direct message from admin',
      message: '',
      category: 'admin',
      status: 'open',
      priority: 'normal',
      created_at: new Date().toISOString(),
    });
    setDirectMsgUser(null);
  };

  const handleExportUsers = () => {
    const headers = ['UID', 'Email', 'Nickname', 'Role', 'KYC Status', 'Banned', 'USDT', 'BTC', 'ETH', 'Created'];
    const rows = filteredUsers.map(u => [
      u.uid, u.email, u.nickname || '', u.role || 'user', u.kyc_status,
      u.is_banned ? 'Yes' : 'No',
      parseFloat(u.usdt_balance?.toString() || '0').toFixed(2),
      parseFloat(u.btc_balance?.toString() || '0').toFixed(6),
      parseFloat(u.eth_balance?.toString() || '0').toFixed(6),
      u.created_at || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `users-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Users exported to CSV', 'success');
  };

  const handleExportReport = (type: string) => {
    let csv = '';
    if (type === 'users') {
      csv = 'UID,Email,Role,KYC,Banned,Created\n' + users.map(u => `${u.uid},${u.email},${u.role || 'user'},${u.kyc_status},${u.is_banned ? 'Yes' : 'No'},${u.created_at}`).join('\n');
    } else if (type === 'transactions') {
      csv = 'ID,Email,Type,Coin,Amount,Fee,Status,Date\n' + transactions.map(t => `${t.id},${t.profile_email},${t.type},${t.coin},${t.amount},${t.fee},${t.status},${t.created_at}`).join('\n');
    } else if (type === 'kyc') {
      csv = 'ID,User,Document,Number,Status,Date\n' + kycSubmissions.map(k => `${k.id},${k.full_name},${k.document_type},${k.document_number},${k.status},${k.created_at}`).join('\n');
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${type}-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported`, 'success');
  };

  const markAllNotifsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'success');
  };

  const sidebarTabs: Array<{ id: Tab; label: string; icon: typeof Users; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users, badge: totalUsers },
    { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck, badge: pendingKyc },
    { id: 'merchants', label: 'Merchants', icon: Building2, badge: pendingMerchants },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'tickets', label: 'Tickets', icon: Ticket, badge: openTickets },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'giveaways', label: 'Giveaways', icon: Gift },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'roles', label: 'Roles & Permissions', icon: ShieldAlert },
    { id: 'logs', label: 'Logs', icon: ScrollText },
  ];

  const docTypeLabel = (dt: string) => {
    if (dt === 'passport') return 'Passport';
    if (dt === 'drivers_license' || dt === 'license') return "Driver's License";
    return 'National ID';
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex">
      {/* ===== SIDEBAR OVERLAY (mobile) ===== */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* ===== SIDEBAR ===== */}
      <aside className={`w-60 bg-[#181a20] border-r border-[#1e2026] flex flex-col fixed h-screen z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="px-5 py-4 border-b border-[#1e2026]">
          <div className="flex items-center gap-2">
            {isOwner ? <Crown className="w-5 h-5 text-amber-400" /> : <ShieldCheck className="w-5 h-5 text-amber-400" />}
            <span className="font-bold text-sm">{isOwner ? 'Owner Portal' : 'Admin Portal'}</span>
          </div>
          <p className="text-[10px] text-[#848e9c] mt-1">{isOwner ? 'Full Access' : 'Limited Access'}</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {sidebarTabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors ${tab === t.id ? 'bg-[#f0b90b]/10 text-[#f0b90b] border-r-2 border-[#f0b90b]' : 'text-[#848e9c] hover:text-[#eaecef] hover:bg-[#1e2026]'}`}>
              <t.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{t.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-[#1e2026] p-3">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-[#181a20] border-b border-[#1e2026] px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 hover:bg-[#1e2026] rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">{sidebarTabs.find(t => t.id === tab)?.label}</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Date Range */}
            <div className="relative">
              <button onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center gap-2 bg-[#1e2026] border border-[#2b2f36] rounded-lg px-3 py-2 text-xs text-[#848e9c] hover:text-[#eaecef]">
                <Clock className="w-3.5 h-3.5" />
                {dateRange.start && dateRange.end ? `${dateRange.start} - ${dateRange.end}` : 'Select Date Range'}
              </button>
              {showDateDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-[#181a20] border border-[#2b2f36] rounded-xl p-4 shadow-xl w-72 z-50">
                  <p className="text-xs font-bold mb-2">Filter by Date Range</p>
                  <input type="date" value={dateRange.start} onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-xs mb-2" />
                  <input type="date" value={dateRange.end} onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-xs mb-3" />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowDateDropdown(false); showToast('Date range applied', 'success'); }}
                      className="flex-1 bg-[#f0b90b] text-black text-xs font-bold py-2 rounded-lg">Apply</button>
                    <button onClick={() => { setDateRange({ start: '', end: '' }); setShowDateDropdown(false); }}
                      className="flex-1 bg-[#1e2026] text-[#848e9c] text-xs font-bold py-2 rounded-lg">Clear</button>
                  </div>
                </div>
              )}
            </div>
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className="relative">
                <Bell className="w-5 h-5 text-[#848e9c] hover:text-[#eaecef]" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-[#181a20] border border-[#2b2f36] rounded-xl shadow-xl w-80 z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b2f36]">
                    <p className="text-sm font-bold">Notifications</p>
                    <button onClick={markAllNotifsRead} className="text-xs text-[#f0b90b] hover:underline">Mark all as read</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-[#848e9c] text-center py-6">No notifications</p>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-[#1e2026] ${n.read ? 'opacity-50' : ''}`}>
                        <p className="text-xs text-[#eaecef]">{n.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Admin profile */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#f0b90b]/10 flex items-center justify-center text-xs font-bold text-[#f0b90b]">
                {profile.email?.[0]?.toUpperCase()}
              </div>
              <span className="text-xs text-[#848e9c]">{profile.email}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#f0b90b] animate-spin" /></div>
          )}

          {/* ===== DASHBOARD ===== */}
          {tab === 'dashboard' && !loading && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/10' },
                  { label: 'Verified Users', value: verifiedUsers, icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Pending KYC', value: pendingKyc, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { label: 'Banned Users', value: bannedUsers, icon: Ban, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                  { label: 'Open Tickets', value: openTickets, icon: Ticket, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  { label: 'Merchant Reqs', value: pendingMerchants, icon: Building2, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                  { label: 'Total Deposits', value: `$${totalDeposits.toFixed(0)}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Total Withdrawals', value: `$${totalWithdrawals.toFixed(0)}`, icon: Wallet, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#181a20] rounded-xl p-4 border border-[#1e2026]">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                    </div>
                    <p className="text-2xl font-black">{stat.value}</p>
                    <p className="text-xs text-[#848e9c] mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Liquidity + KYC Distribution */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-amber-400" />
                    <p className="text-sm font-bold text-amber-400">Platform USDT Liquidity</p>
                  </div>
                  <p className="text-3xl font-black">{totalUsdtLiquidity.toFixed(2)} USDT</p>
                  <p className="text-xs text-[#848e9c] mt-2">Total USDT held by all users across the platform</p>
                </div>
                <div className="bg-[#181a20] rounded-xl p-5 border border-[#1e2026]">
                  <p className="text-sm font-bold mb-3">KYC Distribution</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Verified', count: verifiedUsers, color: 'bg-emerald-500' },
                      { label: 'Pending', count: users.filter(u => u.kyc_status === 'PENDING_VERIFICATION' || u.kyc_status === 'PENDING').length, color: 'bg-amber-500' },
                      { label: 'Rejected', count: users.filter(u => u.kyc_status === 'REJECTED').length, color: 'bg-rose-500' },
                      { label: 'Unverified', count: users.filter(u => u.kyc_status === 'UNVERIFIED').length, color: 'bg-[#474d57]' },
                    ].map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${d.color}`} />
                        <span className="text-xs text-[#848e9c] flex-1">{d.label}</span>
                        <span className="text-xs font-bold">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-[#181a20] rounded-xl border border-[#1e2026] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2026]">
                  <p className="text-sm font-bold">Users Overview</p>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#848e9c]" />
                      <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg pl-8 pr-3 py-1.5 text-xs w-48 focus:outline-none focus:border-[#f0b90b]/40" />
                    </div>
                    <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                      className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="banned">Banned</option>
                    </select>
                    <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                      className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                      <option value="all">All Roles</option>
                      <option value="user">User</option>
                      <option value="merchant">Merchant</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button onClick={handleExportUsers} className="flex items-center gap-1.5 bg-[#1e2026] hover:bg-[#2b2f36] text-[#848e9c] hover:text-[#eaecef] rounded-lg px-3 py-1.5 text-xs font-medium">
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-[#474d57] uppercase border-b border-[#1e2026]">
                      <th className="text-left px-5 py-2 font-medium">User</th>
                      <th className="text-left px-3 py-2 font-medium">UID</th>
                      <th className="text-left px-3 py-2 font-medium">Role</th>
                      <th className="text-left px-3 py-2 font-medium">KYC</th>
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                      <th className="text-left px-3 py-2 font-medium">Balance</th>
                      <th className="text-right px-5 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.map(u => (
                      <tr key={u.user_id} className="border-b border-[#1e2026] hover:bg-[#1e2026]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#f0b90b]/10 flex items-center justify-center text-xs font-bold text-[#f0b90b]">
                              {(u.nickname || u.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold">{u.nickname || u.email}</p>
                              <p className="text-[10px] text-[#848e9c]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-[#848e9c]">{u.uid}</td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${(u.role || 'user') === 'admin' || isOwnerEmail(u.email) || isAdminEmail(u.email) ? 'bg-amber-500/20 text-amber-400' : (u.role === 'merchant' || u.p2p_merchant_status === 'APPROVED') ? 'bg-sky-500/20 text-sky-400' : 'bg-[#2b2f36] text-[#848e9c]'}`}>
                            {(u.role && u.role !== 'user' ? u.role : isOwnerEmail(u.email) ? 'owner' : isAdminEmail(u.email) ? 'admin' : u.p2p_merchant_status === 'APPROVED' ? 'merchant' : 'user').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${u.kyc_status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' : u.kyc_status === 'PENDING_VERIFICATION' || u.kyc_status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : u.kyc_status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' : 'bg-[#2b2f36] text-[#848e9c]'}`}>
                            {u.kyc_status?.replace('_', ' ') || 'UNVERIFIED'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {u.is_banned ? <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold">BANNED</span>
                            : <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold">{parseFloat(u.usdt_balance?.toString() || '0').toFixed(2)} USDT</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setViewUser(u)} className="p-1.5 hover:bg-[#2b2f36] rounded-lg" title="View"><Eye className="w-3.5 h-3.5 text-[#848e9c]" /></button>
                            <button onClick={() => { setEditUser(u); setEditRole(u.role || 'user'); setEditKyc(u.kyc_status); setEditBanned(!!u.is_banned); }} className="p-1.5 hover:bg-[#2b2f36] rounded-lg" title="Edit"><Pencil className="w-3.5 h-3.5 text-[#848e9c]" /></button>
                            <button onClick={() => setMoreUser(u)} className="p-1.5 hover:bg-[#2b2f36] rounded-lg" title="More"><MoreHorizontal className="w-3.5 h-3.5 text-[#848e9c]" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pagedUsers.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-8 text-xs text-[#848e9c]">No users found</td></tr>
                    )}
                  </tbody>
                </table>
                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[#1e2026]">
                  <p className="text-xs text-[#848e9c]">{filteredUsers.length} users total</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="p-1.5 rounded-lg hover:bg-[#2b2f36] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return <button key={page} onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold ${currentPage === page ? 'bg-[#f0b90b] text-black' : 'bg-[#1e2026] text-[#848e9c] hover:text-[#eaecef]'}`}>{page}</button>;
                    })}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg hover:bg-[#2b2f36] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              {/* Recent Activity + Quick Actions */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 bg-[#181a20] rounded-xl border border-[#1e2026] p-5">
                  <p className="text-sm font-bold mb-3">Recent Activity</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {adminLogs.slice(0, 10).map(log => (
                      <div key={log.id} className="flex items-center gap-3 text-xs">
                        <div className="w-7 h-7 rounded-lg bg-[#1e2026] flex items-center justify-center">
                          <TrendingUp className="w-3.5 h-3.5 text-[#f0b90b]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[#eaecef]">{log.action.replace(/_/g, ' ')}</p>
                          <p className="text-[10px] text-[#848e9c]">{log.admin_email} {log.details ? `— ${log.details}` : ''}</p>
                        </div>
                        <span className="text-[10px] text-[#474d57]">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                    {adminLogs.length === 0 && <p className="text-xs text-[#848e9c] text-center py-4">No recent activity</p>}
                  </div>
                </div>
                <div className="bg-[#181a20] rounded-xl border border-[#1e2026] p-5">
                  <p className="text-sm font-bold mb-3">Quick Actions</p>
                  <div className="space-y-2">
                    <button onClick={() => setShowAddUser(true)} className="w-full flex items-center gap-2 bg-[#1e2026] hover:bg-[#2b2f36] rounded-lg px-3 py-2 text-xs font-medium text-left">
                      <Plus className="w-3.5 h-3.5 text-[#f0b90b]" /> Add New User
                    </button>
                    <button onClick={() => setShowPostAnn(true)} className="w-full flex items-center gap-2 bg-[#1e2026] hover:bg-[#2b2f36] rounded-lg px-3 py-2 text-xs font-medium text-left">
                      <Megaphone className="w-3.5 h-3.5 text-[#f0b90b]" /> Post Announcement
                    </button>
                    <button onClick={() => setTab('kyc')} className="w-full flex items-center gap-2 bg-[#1e2026] hover:bg-[#2b2f36] rounded-lg px-3 py-2 text-xs font-medium text-left">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#f0b90b]" /> Review KYC Applications
                    </button>
                    <button onClick={() => setTab('merchants')} className="w-full flex items-center gap-2 bg-[#1e2026] hover:bg-[#2b2f36] rounded-lg px-3 py-2 text-xs font-medium text-left">
                      <Building2 className="w-3.5 h-3.5 text-[#f0b90b]" /> Review Merchant Requests
                    </button>
                    <button onClick={() => setTab('logs')} className="w-full flex items-center gap-2 bg-[#1e2026] hover:bg-[#2b2f36] rounded-lg px-3 py-2 text-xs font-medium text-left">
                      <ScrollText className="w-3.5 h-3.5 text-[#f0b90b]" /> View System Logs
                    </button>
                    <button onClick={() => handleExportReport('users')} className="w-full flex items-center gap-2 bg-[#1e2026] hover:bg-[#2b2f36] rounded-lg px-3 py-2 text-xs font-medium text-left">
                      <FileBarChart className="w-3.5 h-3.5 text-[#f0b90b]" /> Generate Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== USERS TAB ===== */}
          {tab === 'users' && !loading && (
            <div className="bg-[#181a20] rounded-xl border border-[#1e2026] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2026]">
                <p className="text-sm font-bold">User Management</p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#848e9c]" />
                    <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg pl-8 pr-3 py-1.5 text-xs w-56 focus:outline-none focus:border-[#f0b90b]/40" />
                  </div>
                  <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-2 py-1.5 text-xs">
                    <option value="all">All Status</option><option value="active">Active</option><option value="banned">Banned</option>
                  </select>
                  <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                    className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-2 py-1.5 text-xs">
                    <option value="all">All Roles</option><option value="user">User</option><option value="merchant">Merchant</option><option value="admin">Admin</option>
                  </select>
                  <button onClick={handleExportUsers} className="flex items-center gap-1.5 bg-[#1e2026] hover:bg-[#2b2f36] rounded-lg px-3 py-1.5 text-xs">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                  <button onClick={() => setShowAddUser(true)} className="flex items-center gap-1.5 bg-[#f0b90b] text-black rounded-lg px-3 py-1.5 text-xs font-bold">
                    <Plus className="w-3.5 h-3.5" /> Add User
                  </button>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-[#474d57] uppercase border-b border-[#1e2026]">
                    <th className="text-left px-5 py-2 font-medium">User</th>
                    <th className="text-left px-3 py-2 font-medium">UID</th>
                    <th className="text-left px-3 py-2 font-medium">Role</th>
                    <th className="text-left px-3 py-2 font-medium">KYC</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Balance</th>
                    <th className="text-right px-5 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map(u => (
                    <tr key={u.user_id} className="border-b border-[#1e2026] hover:bg-[#1e2026]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#f0b90b]/10 flex items-center justify-center text-xs font-bold text-[#f0b90b]">
                            {(u.nickname || u.email || '?')[0].toUpperCase()}
                          </div>
                          <div><p className="text-xs font-semibold">{u.nickname || u.email}</p><p className="text-[10px] text-[#848e9c]">{u.email}</p></div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#848e9c]">{u.uid}</td>
                      <td className="px-3 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#2b2f36] text-[#848e9c]">{(u.role || 'user').toUpperCase()}</span></td>
                      <td className="px-3 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${u.kyc_status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' : u.kyc_status === 'PENDING_VERIFICATION' ? 'bg-amber-500/20 text-amber-400' : 'bg-[#2b2f36] text-[#848e9c]'}`}>{u.kyc_status?.replace('_', ' ') || 'UNVERIFIED'}</span></td>
                      <td className="px-3 py-3">{u.is_banned ? <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold">BANNED</span> : <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}</td>
                      <td className="px-3 py-3 text-xs font-semibold">{parseFloat(u.usdt_balance?.toString() || '0').toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewUser(u)} className="p-1.5 hover:bg-[#2b2f36] rounded-lg"><Eye className="w-3.5 h-3.5 text-[#848e9c]" /></button>
                          <button onClick={() => { setEditUser(u); setEditRole(u.role || 'user'); setEditKyc(u.kyc_status); setEditBanned(!!u.is_banned); }} className="p-1.5 hover:bg-[#2b2f36] rounded-lg"><Pencil className="w-3.5 h-3.5 text-[#848e9c]" /></button>
                          <button onClick={() => setMoreUser(u)} className="p-1.5 hover:bg-[#2b2f36] rounded-lg"><MoreHorizontal className="w-3.5 h-3.5 text-[#848e9c]" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pagedUsers.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-xs text-[#848e9c]">No users found</td></tr>}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#1e2026]">
                <p className="text-xs text-[#848e9c]">{filteredUsers.length} users</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-[#2b2f36] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return <button key={page} onClick={() => setCurrentPage(page)} className={`w-7 h-7 rounded-lg text-xs font-bold ${currentPage === page ? 'bg-[#f0b90b] text-black' : 'bg-[#1e2026] text-[#848e9c]'}`}>{page}</button>;
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-[#2b2f36] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}

          {/* ===== KYC TAB ===== */}
          {tab === 'kyc' && !loading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#848e9c]">{kycSubmissions.length} total submissions — {pendingKyc} pending review</p>
                <button onClick={loadAll} className="flex items-center gap-1.5 bg-[#1e2026] hover:bg-[#2b2f36] rounded-lg px-3 py-1.5 text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
              </div>
              {kycSubmissions.length === 0 ? (
                <div className="bg-[#181a20] rounded-xl p-12 text-center"><ShieldCheck className="w-12 h-12 text-[#474d57] mx-auto mb-3" /><p className="text-sm text-[#848e9c]">No KYC submissions yet</p></div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {kycSubmissions.map(kyc => (
                    <div key={kyc.id} className="bg-[#181a20] rounded-xl border border-[#1e2026] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold">{kyc.full_name || 'Unknown'}</p>
                          <p className="text-[10px] text-[#848e9c]">{docTypeLabel(kyc.document_type)} — {kyc.document_number || 'N/A'}</p>
                          {kyc.date_of_birth && <p className="text-[10px] text-[#848e9c]">DOB: {kyc.date_of_birth}</p>}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${kyc.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : kyc.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{kyc.status.toUpperCase()}</span>
                      </div>
                      <div className="flex gap-2 mb-3">
                        {kyc.front_photo_url && <img src={kyc.front_photo_url} alt="Front" className="w-20 h-20 rounded-lg object-cover border border-[#2b2f36]" />}
                        {kyc.back_photo_url && <img src={kyc.back_photo_url} alt="Back" className="w-20 h-20 rounded-lg object-cover border border-[#2b2f36]" />}
                        {!kyc.front_photo_url && <div className="w-20 h-20 rounded-lg bg-[#0b0e11] border border-[#2b2f36] flex items-center justify-center"><FileBarChart className="w-5 h-5 text-[#474d57]" /></div>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setViewKyc(kyc)} className="flex-1 text-xs font-bold py-2 rounded-lg bg-[#1e2026] text-[#eaecef] hover:bg-[#2b2f36]">View Details</button>
                        {kyc.status === 'pending' && <>
                          <button onClick={() => handleApproveKyc(kyc)} className="flex-1 text-xs font-bold py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">Approve</button>
                          <button onClick={() => handleRejectKyc(kyc, 'Document rejected by admin')} className="flex-1 text-xs font-bold py-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20">Reject</button>
                        </>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== MERCHANTS TAB ===== */}
          {tab === 'merchants' && !loading && (
            <div className="bg-[#181a20] rounded-xl border border-[#1e2026] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1e2026]"><p className="text-sm font-bold">Merchant Applications</p></div>
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] text-[#474d57] uppercase border-b border-[#1e2026]">
                  <th className="text-left px-5 py-2 font-medium">Email</th><th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-left px-3 py-2 font-medium">Message</th><th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Date</th><th className="text-right px-5 py-2 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {merchantReqs.map(req => (
                    <tr key={req.id} className="border-b border-[#1e2026] hover:bg-[#1e2026]">
                      <td className="px-5 py-3 text-xs font-semibold">{req.user_email}</td>
                      <td className="px-3 py-3 text-xs text-[#848e9c]">{req.request_type}</td>
                      <td className="px-3 py-3 text-xs text-[#848e9c] max-w-xs truncate">{req.message || '—'}</td>
                      <td className="px-3 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{req.status.toUpperCase()}</span></td>
                      <td className="px-3 py-3 text-[10px] text-[#848e9c]">{new Date(req.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handleApproveMerchant(req)} className="text-xs font-bold py-1.5 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approve</button>
                            <button onClick={() => handleDenyMerchant(req)} className="text-xs font-bold py-1.5 px-3 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">Deny</button>
                          </div>
                        ) : <span className="text-[10px] text-[#474d57]">Reviewed</span>}
                      </td>
                    </tr>
                  ))}
                  {merchantReqs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-xs text-[#848e9c]">No merchant requests</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== TRANSACTIONS TAB ===== */}
          {tab === 'transactions' && !loading && (
            <div className="bg-[#181a20] rounded-xl border border-[#1e2026] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2026]">
                <p className="text-sm font-bold">Global Transaction Ledger</p>
                <button onClick={() => handleExportReport('transactions')} className="flex items-center gap-1.5 bg-[#1e2026] hover:bg-[#2b2f36] rounded-lg px-3 py-1.5 text-xs"><Download className="w-3.5 h-3.5" /> Export</button>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] text-[#474d57] uppercase border-b border-[#1e2026]">
                  <th className="text-left px-5 py-2 font-medium">ID</th><th className="text-left px-3 py-2 font-medium">User</th>
                  <th className="text-left px-3 py-2 font-medium">Type</th><th className="text-left px-3 py-2 font-medium">Coin</th>
                  <th className="text-left px-3 py-2 font-medium">Amount</th><th className="text-left px-3 py-2 font-medium">Fee</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th><th className="text-left px-3 py-2 font-medium">Date</th>
                </tr></thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-[#1e2026] hover:bg-[#1e2026]">
                      <td className="px-5 py-3 text-[10px] text-[#474d57] font-mono">{tx.id.slice(0, 8)}...</td>
                      <td className="px-3 py-3 text-xs">{tx.profile_email}</td>
                      <td className="px-3 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tx.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400' : tx.type === 'WITHDRAW' ? 'bg-rose-500/20 text-rose-400' : 'bg-sky-500/20 text-sky-400'}`}>{tx.type}</span></td>
                      <td className="px-3 py-3 text-xs text-[#848e9c]">{tx.coin}</td>
                      <td className="px-3 py-3 text-xs font-semibold">{tx.amount}</td>
                      <td className="px-3 py-3 text-xs text-[#848e9c]">{tx.fee}</td>
                      <td className="px-3 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tx.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : tx.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : tx.status === 'FAILED' ? 'bg-rose-500/20 text-rose-400' : 'bg-sky-500/20 text-sky-400'}`}>{tx.status}</span></td>
                      <td className="px-3 py-3 text-[10px] text-[#848e9c]">{new Date(tx.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-xs text-[#848e9c]">No transactions</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== TICKETS TAB ===== */}
          {tab === 'tickets' && !loading && (
            <div className="bg-[#181a20] rounded-xl border border-[#1e2026] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1e2026]"><p className="text-sm font-bold">Support Tickets</p></div>
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] text-[#474d57] uppercase border-b border-[#1e2026]">
                  <th className="text-left px-5 py-2 font-medium">Subject</th><th className="text-left px-3 py-2 font-medium">User</th>
                  <th className="text-left px-3 py-2 font-medium">Category</th><th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Date</th><th className="text-right px-5 py-2 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="border-b border-[#1e2026] hover:bg-[#1e2026]">
                      <td className="px-5 py-3 text-xs font-semibold">{ticket.subject}</td>
                      <td className="px-3 py-3 text-xs text-[#848e9c]">{ticket.user_email}</td>
                      <td className="px-3 py-3 text-xs text-[#848e9c]">{ticket.category}</td>
                      <td className="px-3 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ticket.status === 'open' ? 'bg-amber-500/20 text-amber-400' : ticket.status === 'in_progress' ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{ticket.status.replace('_', ' ').toUpperCase()}</span></td>
                      <td className="px-3 py-3 text-[10px] text-[#848e9c]">{new Date(ticket.created_at).toLocaleString()}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => setViewTicket(ticket)} className="text-xs font-bold py-1.5 px-3 rounded-lg bg-[#1e2026] text-[#eaecef] hover:bg-[#2b2f36]">View & Reply</button>
                      </td>
                    </tr>
                  ))}
                  {tickets.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-xs text-[#848e9c]">No support tickets</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== ANNOUNCEMENTS TAB ===== */}
          {tab === 'announcements' && !loading && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#181a20] rounded-xl border border-[#1e2026] p-5 space-y-3">
                <p className="text-sm font-bold">Post New Announcement</p>
                <input type="text" placeholder="Title" value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40" />
                <textarea placeholder="Content" value={annContent} onChange={e => setAnnContent(e.target.value)} rows={4} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40 resize-none" />
                <select value={annType} onChange={e => setAnnType(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                  <option value="info">Info</option><option value="warning">Warning</option><option value="maintenance">Maintenance</option><option value="promotion">Promotion</option>
                </select>
                <button onClick={handlePostAnnouncement} disabled={loading} className="w-full bg-[#f0b90b] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">Post Announcement</button>
              </div>
              <div className="col-span-2 space-y-3">
                {announcements.map(ann => (
                  <div key={ann.id} className="bg-[#181a20] rounded-xl border border-[#1e2026] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ann.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : ann.type === 'maintenance' ? 'bg-rose-500/20 text-rose-400' : ann.type === 'promotion' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'}`}>{ann.type.toUpperCase()}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleAnnouncement(ann)} className={`text-[10px] px-2 py-1 rounded-lg font-bold ${ann.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#2b2f36] text-[#848e9c]'}`}>{ann.is_active ? 'Active' : 'Inactive'}</button>
                        <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-rose-400 hover:text-rose-300 p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <p className="text-sm font-bold">{ann.title}</p>
                    <p className="text-xs text-[#848e9c] mt-1">{ann.content}</p>
                    <p className="text-[10px] text-[#474d57] mt-2">{new Date(ann.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {announcements.length === 0 && <div className="bg-[#181a20] rounded-xl p-12 text-center"><Megaphone className="w-12 h-12 text-[#474d57] mx-auto mb-3" /><p className="text-sm text-[#848e9c]">No announcements posted</p></div>}
              </div>
            </div>
          )}

          {/* ===== GIVEAWAYS TAB ===== */}
          {tab === 'giveaways' && !loading && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#181a20] rounded-xl border border-[#1e2026] p-5 space-y-3">
                <p className="text-sm font-bold">Create Giveaway Campaign</p>
                <input type="text" placeholder="Title" value={giveTitle} onChange={e => setGiveTitle(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40" />
                <textarea placeholder="Description (optional)" value={giveDesc} onChange={e => setGiveDesc(e.target.value)} rows={2} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#f0b90b]/40" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Amount" value={giveAmount} onChange={e => setGiveAmount(e.target.value)} className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40" />
                  <select value={giveCurrency} onChange={e => setGiveCurrency(e.target.value)} className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm">
                    <option value="USDT">USDT</option><option value="BTC">BTC</option><option value="ETH">ETH</option>
                  </select>
                </div>
                <input type="number" placeholder="Number of codes" value={giveCodes} onChange={e => setGiveCodes(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40" />
                <button onClick={handleCreateGiveaway} disabled={loading} className="w-full bg-[#f0b90b] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">Create Giveaway</button>
              </div>
              <div className="col-span-2">
                <GiveawayList reloadKey={announcements.length} />
              </div>
            </div>
          )}

          {/* ===== REPORTS TAB ===== */}
          {tab === 'reports' && !loading && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { type: 'users', label: 'User Report', desc: 'All registered users with roles, KYC status, and account state', icon: Users },
                { type: 'transactions', label: 'Financial Report', desc: 'All deposits, withdrawals, and trades with status', icon: TrendingUp },
                { type: 'kyc', label: 'KYC Report', desc: 'All identity verification submissions and outcomes', icon: ShieldCheck },
              ].map(r => (
                <div key={r.type} className="bg-[#181a20] rounded-xl border border-[#1e2026] p-5">
                  <div className="w-12 h-12 rounded-xl bg-[#f0b90b]/10 flex items-center justify-center mb-3"><r.icon className="w-6 h-6 text-[#f0b90b]" /></div>
                  <p className="text-sm font-bold mb-1">{r.label}</p>
                  <p className="text-xs text-[#848e9c] mb-4">{r.desc}</p>
                  <button onClick={() => handleExportReport(r.type)} className="w-full flex items-center justify-center gap-2 bg-[#1e2026] hover:bg-[#2b2f36] rounded-lg py-2.5 text-xs font-bold">
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {tab === 'settings' && !loading && (
            <div className="max-w-3xl space-y-4">
              <div className="bg-[#181a20] rounded-xl border border-[#1e2026] p-5">
                <p className="text-sm font-bold mb-4">Platform Configuration</p>
                <div className="space-y-4">
                  {[
                    { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Disable all user-facing features', icon: Power },
                    { key: 'withdrawalsEnabled', label: 'Withdrawals', desc: 'Allow users to withdraw funds', icon: Wallet },
                    { key: 'tradingEnabled', label: 'Trading', desc: 'Allow users to place trades', icon: TrendingUp },
                    { key: 'signupEnabled', label: 'Signups', desc: 'Allow new user registration', icon: UserCheck },
                  ].map(s => (
                    <div key={s.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#1e2026] flex items-center justify-center"><s.icon className="w-4 h-4 text-[#848e9c]" /></div>
                        <div><p className="text-sm font-semibold">{s.label}</p><p className="text-[10px] text-[#848e9c]">{s.desc}</p></div>
                      </div>
                      <button onClick={() => { setSettings(p => ({ ...p, [s.key]: !p[s.key as keyof typeof p] })); showToast(`${s.label} ${!settings[s.key as keyof typeof settings] ? 'enabled' : 'disabled'}`); }}
                        className={`relative w-11 h-6 rounded-full transition-colors ${settings[s.key as keyof typeof settings] ? 'bg-[#f0b90b]' : 'bg-[#2b2f36]'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings[s.key as keyof typeof settings] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#181a20] rounded-xl border border-[#1e2026] p-5">
                <p className="text-sm font-bold mb-4">Financial Limits</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#848e9c] block mb-1.5">Min KYC Age</label>
                    <input type="number" value={settings.minKycAge} onChange={e => setSettings(p => ({ ...p, minKycAge: e.target.value }))} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40" />
                  </div>
                  <div>
                    <label className="text-xs text-[#848e9c] block mb-1.5">Max Withdraw/Day (USDT)</label>
                    <input type="number" value={settings.maxWithdrawPerDay} onChange={e => setSettings(p => ({ ...p, maxWithdrawPerDay: e.target.value }))} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40" />
                  </div>
                </div>
              </div>
              <div className="bg-[#181a20] rounded-xl border border-[#1e2026] p-5">
                <p className="text-sm font-bold mb-4">Support Configuration</p>
                <div>
                  <label className="text-xs text-[#848e9c] block mb-1.5">Support Email</label>
                  <input type="email" value={settings.supportEmail} onChange={e => setSettings(p => ({ ...p, supportEmail: e.target.value }))} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40" />
                </div>
              </div>
              <button onClick={() => { showToast('Settings saved successfully', 'success'); logAdminAction('update_settings', 'settings', ''); }}
                className="bg-[#f0b90b] text-black font-bold py-2.5 px-6 rounded-lg text-sm">Save Settings</button>
            </div>
          )}

          {/* ===== ROLES TAB ===== */}
          {tab === 'roles' && !loading && (
            <div className="grid grid-cols-2 gap-4">
              {roles.map((r, idx) => (
                <div key={idx} className="bg-[#181a20] rounded-xl border border-[#1e2026] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="w-5 h-5 text-[#f0b90b]" />
                    <p className="text-sm font-bold">{r.name}</p>
                  </div>
                  <div className="space-y-2 mb-3">
                    {Object.entries(r.perms).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-[#848e9c] capitalize">{key === 'all' ? 'Full Access' : key}</span>
                        {val ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] text-[#474d57] uppercase mb-1">Assigned Users</p>
                    {r.users.length > 0 ? r.users.map(u => <p key={u} className="text-xs text-[#eaecef]">{u}</p>) : <p className="text-xs text-[#848e9c]">No users assigned</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ===== LOGS TAB ===== */}
          {tab === 'logs' && !loading && (
            <div className="bg-[#181a20] rounded-xl border border-[#1e2026] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2026]">
                <p className="text-sm font-bold">Audit Trail</p>
                <button onClick={loadAll} className="flex items-center gap-1.5 bg-[#1e2026] hover:bg-[#2b2f36] rounded-lg px-3 py-1.5 text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] text-[#474d57] uppercase border-b border-[#1e2026]">
                  <th className="text-left px-5 py-2 font-medium">Admin</th><th className="text-left px-3 py-2 font-medium">Action</th>
                  <th className="text-left px-3 py-2 font-medium">Target</th><th className="text-left px-3 py-2 font-medium">Details</th>
                  <th className="text-left px-3 py-2 font-medium">Timestamp</th>
                </tr></thead>
                <tbody>
                  {adminLogs.map(log => (
                    <tr key={log.id} className="border-b border-[#1e2026] hover:bg-[#1e2026]">
                      <td className="px-5 py-3 text-xs">{log.admin_email}</td>
                      <td className="px-3 py-3 text-xs font-semibold">{log.action.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-3 text-xs text-[#848e9c]">{log.target_type || '—'}</td>
                      <td className="px-3 py-3 text-xs text-[#848e9c] max-w-xs truncate">{log.details || '—'}</td>
                      <td className="px-3 py-3 text-[10px] text-[#848e9c]">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {adminLogs.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-xs text-[#848e9c]">No audit logs yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* ===== TOASTS ===== */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2 ${t.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : t.type === 'error' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'}`}>
            {t.type === 'success' ? <Check className="w-4 h-4" /> : t.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            {t.message}
          </div>
        ))}
      </div>

      {/* ===== VIEW USER MODAL ===== */}
      {viewUser && (
        <Modal onClose={() => setViewUser(null)} title="User Profile">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-[#f0b90b]/10 flex items-center justify-center text-lg font-bold text-[#f0b90b]">{(viewUser.nickname || viewUser.email || '?')[0].toUpperCase()}</div>
            <div><p className="text-sm font-bold">{viewUser.nickname || viewUser.email}</p><p className="text-xs text-[#848e9c]">{viewUser.email}</p><p className="text-[10px] text-[#474d57]">UID: {viewUser.uid}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Info label="Role" value={viewUser.role || 'user'} />
            <Info label="KYC Status" value={viewUser.kyc_status || 'UNVERIFIED'} />
            <Info label="VIP Level" value={String(viewUser.vip_level || 0)} />
            <Info label="Security Level" value={viewUser.security_level || 'Low'} />
            <Info label="2FA Enabled" value={viewUser.two_fa_enabled ? 'Yes' : 'No'} />
            <Info label="Fund Password" value={viewUser.fund_password_set ? 'Set' : 'Not Set'} />
            <Info label="Banned" value={viewUser.is_banned ? 'Yes' : 'No'} />
            <Info label="Warnings" value={String(viewUser.warning_count || 0)} />
            <Info label="USDT Balance" value={parseFloat(viewUser.usdt_balance?.toString() || '0').toFixed(2)} />
            <Info label="BTC Balance" value={parseFloat(viewUser.btc_balance?.toString() || '0').toFixed(6)} />
            <Info label="ETH Balance" value={parseFloat(viewUser.eth_balance?.toString() || '0').toFixed(6)} />
            <Info label="Joined" value={viewUser.created_at ? new Date(viewUser.created_at).toLocaleDateString() : '—'} />
          </div>
          {viewUser.is_banned && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mb-3">
              <p className="text-xs text-rose-400"><b>Ban Reason:</b> {viewUser.ban_reason || 'Not specified'}</p>
              <p className="text-xs text-rose-400"><b>Banned At:</b> {viewUser.banned_at ? new Date(viewUser.banned_at).toLocaleString() : '—'}</p>
            </div>
          )}
          {viewUser.is_banned && <button onClick={() => { handleUnbanUser(viewUser); setViewUser(null); }} className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold py-2.5 rounded-lg text-sm">Unban User</button>}
        </Modal>
      )}

      {/* ===== EDIT USER MODAL ===== */}
      {editUser && (
        <Modal onClose={() => setEditUser(null)} title="Edit User">
          <p className="text-xs text-[#848e9c] mb-4">Editing: <b className="text-[#eaecef]">{editUser.email}</b></p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#848e9c] block mb-1.5">Role</label>
              <select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40">
                <option value="user">User</option><option value="merchant">Merchant</option><option value="admin">Admin</option><option value="owner">Owner</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#848e9c] block mb-1.5">KYC Status</label>
              <select value={editKyc} onChange={e => setEditKyc(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40">
                <option value="UNVERIFIED">Unverified</option><option value="PENDING_VERIFICATION">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#848e9c]">Account Banned</label>
              <button onClick={() => setEditBanned(!editBanned)} className={`relative w-11 h-6 rounded-full transition-colors ${editBanned ? 'bg-rose-500' : 'bg-[#2b2f36]'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${editBanned ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <button onClick={handleSaveEditUser} disabled={loading} className="w-full bg-[#f0b90b] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">Save Changes</button>
          </div>
        </Modal>
      )}

      {/* ===== MORE USER POPUP ===== */}
      {moreUser && (
        <div className="fixed inset-0 z-50" onClick={() => setMoreUser(null)}>
          <div className="absolute bg-[#181a20] border border-[#2b2f36] rounded-xl shadow-xl py-2 w-48" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setResetPassUser(moreUser); setMoreUser(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#eaecef] hover:bg-[#1e2026]"><KeyRound className="w-3.5 h-3.5" /> Reset Password</button>
            <button onClick={() => { setBanUser(moreUser); setMoreUser(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-400 hover:bg-[#1e2026]"><Ban className="w-3.5 h-3.5" /> Suspend Account</button>
            <button onClick={() => { setDirectMsgUser(moreUser); setMoreUser(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#eaecef] hover:bg-[#1e2026]"><MessageSquare className="w-3.5 h-3.5" /> Send Direct Message</button>
          </div>
        </div>
      )}

      {/* ===== VIEW KYC MODAL ===== */}
      {viewKyc && (
        <Modal onClose={() => setViewKyc(null)} title="KYC Submission Details" wide>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Info label="Full Name" value={viewKyc.full_name || '—'} />
            <Info label="Document Type" value={docTypeLabel(viewKyc.document_type)} />
            <Info label="Document Number" value={viewKyc.document_number || '—'} />
            <Info label="Date of Birth" value={viewKyc.date_of_birth || '—'} />
            <Info label="Status" value={viewKyc.status.toUpperCase()} />
            <Info label="Tier Level" value={String(viewKyc.tier_level)} />
            <Info label="Submitted" value={new Date(viewKyc.created_at).toLocaleString()} />
          </div>
          {viewKyc.rejection_reason && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mb-4"><p className="text-xs text-rose-400"><b>Rejection Reason:</b> {viewKyc.rejection_reason}</p></div>}
          <div className="space-y-3 mb-4">
            {viewKyc.front_photo_url && (
              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Front Photo</p>
                <img src={viewKyc.front_photo_url} alt="Document front" className="w-full max-w-md rounded-xl border border-[#2b2f36]" />
              </div>
            )}
            {viewKyc.back_photo_url && (
              <div>
                <p className="text-xs text-[#848e9c] mb-1.5">Back Photo</p>
                <img src={viewKyc.back_photo_url} alt="Document back" className="w-full max-w-md rounded-xl border border-[#2b2f36]" />
              </div>
            )}
            {!viewKyc.front_photo_url && !viewKyc.back_photo_url && <p className="text-xs text-[#848e9c]">No photos uploaded</p>}
          </div>
          {viewKyc.status === 'pending' && (
            <div className="flex gap-2">
              <button onClick={() => { handleApproveKyc(viewKyc); setViewKyc(null); }} className="flex-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold py-2.5 rounded-lg text-sm">Approve</button>
              <button onClick={() => { handleRejectKyc(viewKyc, 'Document rejected by admin'); setViewKyc(null); }} className="flex-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold py-2.5 rounded-lg text-sm">Reject</button>
            </div>
          )}
        </Modal>
      )}

      {/* ===== VIEW TICKET MODAL ===== */}
      {viewTicket && (
        <Modal onClose={() => { setViewTicket(null); setReplyText(''); }} title="Support Ticket">
          <div className="mb-4">
            <p className="text-sm font-bold mb-1">{viewTicket.subject}</p>
            <p className="text-xs text-[#848e9c] mb-2">From: {viewTicket.user_email} — {viewTicket.category}</p>
            {viewTicket.message && <div className="bg-[#0b0e11] rounded-lg p-3 mb-3"><p className="text-xs text-[#eaecef]">{viewTicket.message}</p></div>}
          </div>
          <textarea placeholder="Type your reply..." value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:border-[#f0b90b]/40" />
          <div className="flex gap-2">
            <button onClick={handleReplyTicket} disabled={loading || !replyText.trim()} className="flex-1 bg-[#f0b90b] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">Send Reply</button>
            <button onClick={() => handleCloseTicket(viewTicket)} className="flex-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold py-2.5 rounded-lg text-sm">Close Ticket</button>
          </div>
        </Modal>
      )}

      {/* ===== ADD USER MODAL ===== */}
      {showAddUser && (
        <Modal onClose={() => setShowAddUser(false)} title="Add New User">
          <div className="space-y-3">
            <input type="text" placeholder="Full Name" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40" />
            <input type="email" placeholder="Email Address" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40" />
            <input type="password" placeholder="Password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f0b90b]/40" />
            <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2.5 text-sm focus:outline-none">
              <option value="user">User</option><option value="merchant">Merchant</option><option value="admin">Admin</option>
            </select>
            <button onClick={handleAddUser} disabled={loading} className="w-full bg-[#f0b90b] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">Create User</button>
          </div>
        </Modal>
      )}

      {/* ===== BAN MODAL ===== */}
      {banUser && (
        <Modal onClose={() => setBanUser(null)} title="Ban User">
          <p className="text-xs text-[#848e9c] mb-3">Banning: <b className="text-[#eaecef]">{banUser.email}</b></p>
          <p className="text-xs text-rose-400 mb-4">The user will be permanently banned and unable to access the platform.</p>
          <button onClick={handleBanUser} disabled={loading} className="w-full bg-rose-500 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">Confirm Ban</button>
        </Modal>
      )}

      {/* ===== WARN MODAL ===== */}
      {warnUser && (
        <Modal onClose={() => setWarnUser(null)} title="Warn User">
          <p className="text-xs text-[#848e9c] mb-3">Warning will be sent to: <b className="text-[#eaecef]">{warnUser.email}</b></p>
          <button onClick={handleWarnUser} disabled={loading} className="w-full bg-amber-500 text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">Send Warning</button>
        </Modal>
      )}

      {/* ===== RESET PASSWORD MODAL ===== */}
      {resetPassUser && (
        <Modal onClose={() => setResetPassUser(null)} title="Reset Password">
          <p className="text-xs text-[#848e9c] mb-3">A password reset link will be sent to: <b className="text-[#eaecef]">{resetPassUser.email}</b></p>
          <button onClick={handleResetPassword} disabled={loading} className="w-full bg-[#f0b90b] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">Send Reset Link</button>
        </Modal>
      )}
    </div>
  );
}

// ===== HELPER COMPONENTS =====
function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} bg-[#181a20] rounded-2xl border border-[#2b2f36] p-5 max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0b0e11] rounded-lg p-3">
      <p className="text-[10px] text-[#474d57] uppercase">{label}</p>
      <p className="text-xs font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function GiveawayList({ reloadKey }: { reloadKey: number }) {
  const [giveaways, setGiveaways] = useState<Array<{ id: string; title: string; reward_amount: number; reward_currency: string; redeem_code: string; is_redeemed: boolean; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('giveaway_campaigns').select('*').order('created_at', { ascending: false }).limit(50);
      setGiveaways((data as Array<{ id: string; title: string; reward_amount: number; reward_currency: string; redeem_code: string; is_redeemed: boolean; created_at: string }>) || []);
      setLoading(false);
    })();
  }, [reloadKey]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#f0b90b] animate-spin" /></div>;

  return (
    <div className="bg-[#181a20] rounded-xl border border-[#1e2026] p-5">
      <p className="text-sm font-bold mb-3">Active Giveaway Campaigns</p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {giveaways.map(g => (
          <div key={g.id} className="flex items-center justify-between bg-[#0b0e11] rounded-lg p-3">
            <div>
              <p className="text-xs font-semibold">{g.title}</p>
              <p className="text-[10px] text-[#848e9c]">{g.reward_amount} {g.reward_currency} — Code: {g.redeem_code}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${g.is_redeemed ? 'bg-[#2b2f36] text-[#848e9c]' : 'bg-emerald-500/20 text-emerald-400'}`}>{g.is_redeemed ? 'REDEEMED' : 'ACTIVE'}</span>
          </div>
        ))}
        {giveaways.length === 0 && <p className="text-xs text-[#848e9c] text-center py-4">No giveaways created</p>}
      </div>
    </div>
  );
}
