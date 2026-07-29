import { useState, useEffect, useCallback, useRef } from 'react';
import { Home, TrendingUp, Wallet, User, Gift, Plus, Bell, Menu, Headphones, X, Mail, MessageCircle, Search } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { supabase, type Profile } from '@/lib/supabase';
import { SUPPORT_WHATSAPP, SUPPORT_WHATSAPP_DISPLAY, SUPPORT_EMAIL, TELEGRAM_COMMUNITY } from '@/config/constants';
import AuthScreen from '@/components/auth/AuthScreen';
import HomeScreen from '@/screens/HomeScreen';
import TradingScreen from '@/screens/TradingScreen';
import ProfileOverviewScreen from '@/screens/ProfileOverviewScreen';
import UserCenterScreen from '@/screens/UserCenterScreen';
import P2PScreen from '@/screens/P2PScreen';
import Web3WalletScreen from '@/screens/Web3WalletScreen';
import EarnScreen from '@/screens/EarnScreen';
import InboxScreen from '@/screens/InboxScreen';
import NotificationsPanel from '@/components/modals/NotificationsPanel';
import MenuPanel from '@/components/modals/MenuPanel';
import DepositModal from '@/components/modals/DepositModal';
import DepositCryptoModal from '@/components/modals/DepositCryptoModal';
import ConvertModal from '@/components/modals/ConvertModal';
import AllServicesModal from '@/components/modals/AllServicesModal';
import AboutUsModal from '@/components/modals/AboutUsModal';
import InviteFriendsModal from '@/components/modals/InviteFriendsModal';
import RewardsHubModal from '@/components/modals/RewardsHubModal';
import GiveawayModal from '@/components/modals/GiveawayModal';
import { PlatformAlertHost } from '@/components/modals/PlatformAlert';

type Tab = 'home' | 'markets' | 'assets' | 'earn' | 'profile';
type Screen = 'main' | 'trading' | 'profileOverview' | 'userCenter' | 'p2p' | 'web3' | 'earnStake' | 'inbox';

export default function App() {
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [screen, setScreen] = useState<Screen>('main');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [tradePair, setTradePair] = useState<{ symbol: string; binanceSymbol: string; price: number; change: number } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showDepositCrypto, setShowDepositCrypto] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showGiveaway, setShowGiveaway] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  // Auth init — no blocking spinner, render auth screen immediately if no session
  // 3-day inactivity auto-logout: track last activity timestamp
  const lastActivityRef = useRef<number>(Date.now());
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!mounted) return;
      // Check inactivity: if last activity > 72h ago, sign out
      const lastActivity = localStorage.getItem('ceo_last_activity');
      if (lastActivity) {
        const elapsed = Date.now() - parseInt(lastActivity);
        if (elapsed > 72 * 60 * 60 * 1000) { // 72 hours
          await supabase.auth.signOut();
          localStorage.removeItem('ceo_last_activity');
          setSession(null);
          setAuthReady(true);
          return;
        }
      }
      setSession(s as { user: { id: string; email?: string } } | null);
      setAuthReady(true);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s as { user: { id: string; email?: string } } | null);
      if (s) localStorage.setItem('ceo_last_activity', Date.now().toString());
      if (!s) { setProfile(null); setProfileLoaded(false); setActiveTab('home'); setScreen('main'); localStorage.removeItem('ceo_last_activity'); }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Update last activity on user interaction
  useEffect(() => {
    if (!session) return;
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      localStorage.setItem('ceo_last_activity', Date.now().toString());
    };
    const events = ['click', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => document.addEventListener(e, updateActivity, { passive: true }));
    // Check every 5 minutes if session should be revoked
    const interval = setInterval(async () => {
      const lastActivity = localStorage.getItem('ceo_last_activity');
      if (lastActivity) {
        const elapsed = Date.now() - parseInt(lastActivity);
        if (elapsed > 72 * 60 * 60 * 1000) {
          await supabase.auth.signOut();
          localStorage.removeItem('ceo_last_activity');
          setSession(null);
        }
      }
    }, 5 * 60 * 1000);
    return () => {
      events.forEach(e => document.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [session]);

  useEffect(() => {
    if (session?.user) loadProfile(session.user.id, session.user.email || '');
    else { setProfile(null); setProfileLoaded(true); }
  }, [session]);

  const loadProfile = async (userId: string, email: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (data) {
      // Fetch latest KYC status from user_verifications
      const { data: kycData } = await supabase
        .from('user_verifications')
        .select('status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let merged = data as Profile;
      if (kycData) {
        const kycMap: Record<string, Profile['kyc_status']> = {
          pending: 'PENDING_VERIFICATION',
          verified: 'VERIFIED',
          rejected: 'REJECTED',
        };
        const mapped = kycMap[kycData.status];
        if (mapped && mapped !== merged.kyc_status) {
          merged = { ...merged, kyc_status: mapped };
          await supabase.from('profiles').update({ kyc_status: mapped }).eq('user_id', userId);
        }
      }
      setProfile(merged);
    } else {
      const newProfile = {
        user_id: userId, email, usdt_balance: 0.00, btc_balance: 0, eth_balance: 0,
        kyc_status: 'UNVERIFIED', vip_level: 0,
        uid: Math.floor(Math.random() * 900000000 + 100000000).toString(), security_level: 'Low',
      };
      const { data: inserted } = await supabase.from('profiles').insert(newProfile).select().maybeSingle();
      setProfile((inserted as Profile) || ({
        id: 'temp', user_id: userId, email, usdt_balance: 0, btc_balance: 0, eth_balance: 0,
        kyc_status: 'UNVERIFIED', vip_level: 0, uid: newProfile.uid, security_level: 'Low',
        p2p_merchant_status: 'NONE', fund_password_set: false, two_fa_enabled: false,
        preferred_language: 'English', preferred_currency: 'USD', created_at: new Date().toISOString(),
      } as Profile));
    }
    setProfileLoaded(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null); setProfile(null); setProfileLoaded(false); setActiveTab('home'); setScreen('main');
  };

  const updateBalance = (newBalance: number) => {
    if (profile) setProfile({ ...profile, usdt_balance: newBalance });
  };

  const handleProfileUpdate = (updates: Partial<Profile>) => {
    if (profile) setProfile({ ...profile, ...updates });
  };

  const navigateToScreen = (s: string) => {
    switch (s) {
      case 'markets': setActiveTab('markets'); setScreen('main'); break;
      case 'assets': setActiveTab('assets'); setScreen('main'); break;
      case 'earn': setScreen('earnStake'); break;
      case 'p2p': setScreen('p2p'); break;
      case 'web3': setScreen('web3'); break;
      case 'userCenter': setScreen('userCenter'); break;
      case 'inbox': setScreen('inbox'); break;
      case 'profileOverview': setScreen('profileOverview'); break;
      case 'about': setShowAbout(true); break;
      case 'invite': setShowInvite(true); break;
      case 'rewards': setShowRewards(true); break;
      case 'giveaway': setShowGiveaway(true); break;
      case 'allServices': setShowAllServices(true); break;
      default: setScreen('main'); break;
    }
  };

  // Show auth screen immediately if no session (no loading delay)
  if (!authReady) return <AuthScreen onAuth={() => {}} />;
  if (!session) return <AuthScreen onAuth={() => {}} />;

  // Enforce email confirmation before granting access
  if (session.user && !session.user.email_confirmed_at) {
    return (
      <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center px-6">
        <div className="bg-[#181a20] border border-[#2b2f36] rounded-2xl p-6 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#f0b90b]/15 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-[#f0b90b]" />
          </div>
          <h2 className="text-lg font-bold text-[#eaecef] mb-2">Confirm Your Email</h2>
          <p className="text-sm text-[#848e9c] mb-4 leading-relaxed">
            A confirmation link was sent to <span className="text-[#eaecef] font-semibold">{session.user.email}</span>. Please check your inbox and click the link to activate your account.
          </p>
          <p className="text-xs text-[#474d57] mb-5">After clicking the confirmation link, return here and the app will open automatically.</p>
          <button onClick={() => supabase.auth.resend({ type: 'signup', email: session.user.email || '' })}
            className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-sm mb-3">
            Resend Confirmation Email
          </button>
          <button onClick={() => supabase.auth.signOut()}
            className="w-full text-[#848e9c] text-sm py-2 hover:text-[#eaecef]">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // While profile loads, show a minimal non-blocking loader (no full-screen dim)
  if (!profileLoaded || !profile) {
    return (
      <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0b0e11] border-2 border-[#f0b90b] flex items-center justify-center mx-auto mb-3">
            <span className="text-[#f0b90b] font-black text-lg tracking-tighter">CEO</span>
          </div>
          <p className="text-[#f0b90b] font-bold tracking-wider text-sm">CEO EXCHANGE</p>
        </div>
      </div>
    );
  }

  const usdtBalance = parseFloat(profile.usdt_balance.toString());
  const userId = profile.user_id || session?.user?.id || '';

  // Full-screen trading view
  if (screen === 'trading' && tradePair) {
    return (
      <TradingScreen
        symbol={tradePair.symbol}
        binanceSymbol={tradePair.binanceSymbol}
        initialPrice={tradePair.price}
        initialChange={tradePair.change}
        userEmail={profile.email}
        userId={userId}
        usdtBalance={usdtBalance}
        antiPhishingCode={profile.anti_phishing_code || undefined}
        onBack={() => setScreen('main')}
        onBalanceChange={updateBalance}
      />
    );
  }

  // P2P Trading
  if (screen === 'p2p') {
    return <P2PScreen userId={userId} profile={profile} onBack={() => setScreen('main')} onProfileUpdate={handleProfileUpdate} />;
  }

  // Web3 Wallet
  if (screen === 'web3') {
    return <Web3WalletScreen userId={userId} profile={profile} onBack={() => setScreen('main')} onProfileUpdate={handleProfileUpdate} />;
  }

  // Earn Staking
  if (screen === 'earnStake') {
    return <EarnScreen userId={userId} profile={profile} onBack={() => setScreen('main')} onProfileUpdate={handleProfileUpdate} />;
  }

  // Inbox / Messaging
  if (screen === 'inbox') {
    return <InboxScreen userId={userId} profile={profile} onBack={() => setScreen('main')} />;
  }

  // User Center
  if (screen === 'userCenter') {
    return (
      <UserCenterScreen
        profile={profile}
        userId={userId}
        onBack={() => setScreen('profileOverview')}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
      />
    );
  }

  // Profile overview
  if (screen === 'profileOverview' || activeTab === 'profile') {
    return (
      <ProfileOverviewScreen
        profile={profile}
        userId={userId}
        onBack={() => { setScreen('main'); setActiveTab('home'); }}
        onOpenUserCenter={() => setScreen('userCenter')}
        onOpenDeposit={() => setShowDeposit(true)}
        onNavigate={navigateToScreen}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
      />
    );
  }

  const navItems: Array<{ id: Tab; label: string; icon: typeof Home }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'markets', label: 'Markets', icon: TrendingUp },
    { id: 'assets', label: 'Assets', icon: Wallet },
    { id: 'earn', label: 'Earn', icon: Gift },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] font-sans max-w-md mx-auto flex flex-col border-x border-[#1e2026] relative">
      {/* Header */}
      <header className="p-4 bg-[#0b0e11] border-b border-[#1e2026] flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0b0e11] border-2 border-[#f0b90b] flex items-center justify-center">
            <span className="text-[#f0b90b] font-black text-[10px] tracking-tighter">CEO</span>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wider text-[#f0b90b]">CEO EXCHANGE</h1>
            <p className="text-xs text-[#848e9c]">{profile.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-[#848e9c]">Balance</p>
            <p className="text-base font-extrabold text-[#0ecb81]">${usdtBalance.toFixed(2)}</p>
          </div>
          <button onClick={() => setShowSupport(true)} className="text-emerald-400 hover:text-emerald-300 relative">
            <Headphones className="w-5 h-5" />
          </button>
          <button onClick={() => setScreen('inbox')} className="text-[#848e9c] hover:text-[#eaecef] relative">
            <Mail className="w-5 h-5" />
          </button>
          <button onClick={() => setShowNotifications(true)} className="text-[#848e9c] hover:text-[#eaecef] relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#f0b90b]" />
          </button>
          <button onClick={() => setShowMenu(true)} className="text-[#848e9c] hover:text-[#eaecef]">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 flex-1 overflow-y-auto pb-32">
        {activeTab === 'home' && (
          <HomeScreen
            onTrade={(symbol, binanceSymbol, price, change) => {
              setTradePair({ symbol, binanceSymbol, price, change });
              setScreen('trading');
            }}
            onConvert={() => setShowConvert(true)}
            onDeposit={() => setShowDeposit(true)}
            usdtBalance={usdtBalance}
            onNavigate={navigateToScreen}
            userId={userId}
            profile={profile}
          />
        )}
        {activeTab === 'markets' && (
          <MarketsView
            onTrade={(symbol, binanceSymbol, price, change) => {
              setTradePair({ symbol, binanceSymbol, price, change });
              setScreen('trading');
            }}
          />
        )}
        {activeTab === 'assets' && (
          <AssetsScreen usdtBalance={usdtBalance} onDeposit={() => setShowDeposit(true)} onConvert={() => setShowConvert(true)} />
        )}
        {activeTab === 'earn' && (
          <EarnScreen userId={userId} profile={profile} onBack={() => {}} onProfileUpdate={handleProfileUpdate} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-[#181a20] border-t border-[#1e2026] grid grid-cols-5 fixed bottom-7 left-1/2 -translate-x-1/2 w-full max-w-md z-10">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if (item.id !== 'earn') setScreen('main'); else setScreen('earnStake'); }}
              className={`py-2.5 flex flex-col items-center gap-0.5 transition-colors ${isActive ? 'text-[#f0b90b]' : 'text-[#848e9c]'}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'fill-[#f0b90b]/10' : ''}`} />
              <span className={`text-xs ${isActive ? 'font-bold' : 'font-normal'}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Floating Deposit Button — hidden on home + markets tabs */}
      {activeTab !== 'home' && activeTab !== 'markets' && (
        <button
          onClick={() => setShowDeposit(true)}
          className="fixed bottom-28 right-4 max-w-md mx-auto w-12 h-12 bg-[#f0b90b] hover:bg-amber-400 text-black rounded-full shadow-lg shadow-[#f0b90b]/30 flex items-center justify-center z-20 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Modals */}
      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
      {showMenu && <MenuPanel onClose={() => setShowMenu(false)} onNavigate={navigateToScreen} />}
      {showDeposit && (
        <DepositModal
          profile={profile}
          onClose={() => setShowDeposit(false)}
          onDepositCrypto={() => { setShowDeposit(false); setShowDepositCrypto(true); }}
          onP2P={() => { setShowDeposit(false); setScreen('p2p'); }}
          onBuyFiat={() => { setShowDeposit(false); setScreen('p2p'); }}
          onReceiveInternal={() => {}}
        />
      )}
      {showDepositCrypto && <DepositCryptoModal userId={userId} onClose={() => setShowDepositCrypto(false)} />}
      {showConvert && (
        <ConvertModal
          usdtBalance={usdtBalance}
          userId={userId}
          onClose={() => setShowConvert(false)}
          onConvert={(fromAmt) => updateBalance(Math.max(0, usdtBalance - fromAmt))}
        />
      )}
      {showAllServices && <AllServicesModal onClose={() => setShowAllServices(false)} onNavigate={navigateToScreen} />}
      {showAbout && <AboutUsModal onClose={() => setShowAbout(false)} />}
      {showInvite && <InviteFriendsModal userId={userId} profile={profile} onClose={() => setShowInvite(false)} />}
      {showRewards && <RewardsHubModal userId={userId} profile={profile} onClose={() => setShowRewards(false)} onProfileUpdate={handleProfileUpdate} />}
      {showGiveaway && <GiveawayModal userId={userId} profile={profile} onClose={() => setShowGiveaway(false)} onProfileUpdate={handleProfileUpdate} />}
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      <PlatformAlertHost />
      <Analytics />
    </div>
  );
}

function SupportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Customer Support</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-3">
          <button onClick={() => window.open(SUPPORT_WHATSAPP, '_blank')}
            className="w-full flex items-center gap-4 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 hover:border-[#25D366]/30 transition-colors text-left">
            <div className="w-12 h-12 rounded-xl bg-[#25d366]/15 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-[#25d366]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#eaecef]">WhatsApp Community</p>
              <p className="text-xs text-[#848e9c] truncate">{SUPPORT_WHATSAPP_DISPLAY}</p>
            </div>
          </button>
          <button onClick={() => window.open(TELEGRAM_COMMUNITY, '_blank')}
            className="w-full flex items-center gap-4 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 hover:border-[#229ED9]/30 transition-colors text-left">
            <div className="w-12 h-12 rounded-xl bg-[#229ED9]/15 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-[#229ED9]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#eaecef]">Telegram Community</p>
              <p className="text-xs text-[#848e9c] truncate">CEO Exchange Telegram Group</p>
            </div>
          </button>
          <button onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`, '_blank')}
            className="w-full flex items-center gap-4 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 hover:border-amber-500/30 transition-colors text-left">
            <div className="w-12 h-12 rounded-xl bg-[#f0b90b]/15 flex items-center justify-center">
              <Mail className="w-6 h-6 text-[#f0b90b]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#eaecef]">Email Support</p>
              <p className="text-xs text-[#848e9c] truncate">{SUPPORT_EMAIL}</p>
            </div>
          </button>
          <p className="text-xs text-[#848e9c] text-center pt-2">Our support team is available 24/7 to assist you.</p>
        </div>
      </div>
    </div>
  );
}

// Inline Assets screen
function AssetsScreen({ usdtBalance, onDeposit, onConvert }: { usdtBalance: number; onDeposit: () => void; onConvert: () => void }) {
  const [assetTab, setAssetTab] = useState<'spot' | 'fiat' | 'futures' | 'options' | 'margin' | 'earn' | 'funding'>('spot');

  const tabs = [
    { id: 'spot', label: 'Spot' },
    { id: 'fiat', label: 'Fiat' },
    { id: 'futures', label: 'Futures' },
    { id: 'options', label: 'Options' },
    { id: 'margin', label: 'Margin' },
    { id: 'earn', label: 'Earn' },
    { id: 'funding', label: 'Funding' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-[#f0b90b] to-[#e0a800] rounded-2xl p-5">
        <p className="text-xs text-black/70 font-medium mb-1">Estimated Balance</p>
        <p className="text-3xl font-black text-black mb-1">${usdtBalance.toFixed(2)}</p>
        <p className="text-xs text-black/50">{usdtBalance === 0 ? 'Deposit real crypto to start trading' : 'Your deposited funds'}</p>
      </div>

      {/* Asset sub-tabs — Binance style */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar bg-[#1e2026] p-1 rounded-xl border border-[#2b2f36]">
        {tabs.map(sub => (
          <button
            key={sub.id}
            onClick={() => setAssetTab(sub.id as typeof assetTab)}
            className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-lg transition-colors ${assetTab === sub.id ? 'bg-[#f0b90b] text-black' : 'text-[#848e9c] hover:text-[#eaecef]'}`}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {/* Spot */}
      {assetTab === 'spot' && (
        <div className="bg-[#1e2026] p-4 rounded-xl border border-[#2b2f36]">
          <h3 className="text-sm font-semibold text-[#eaecef] mb-3">Spot Account</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-[#2b2f36]/50 last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0b0e11] flex items-center justify-center text-xs font-bold text-[#f0b90b]">U</div>
                <div>
                  <p className="text-sm text-[#eaecef]">USDT</p>
                  <p className="text-xs text-[#848e9c]">{usdtBalance.toFixed(2)} USDT</p>
                </div>
              </div>
              <p className="text-sm font-bold text-[#eaecef]">${usdtBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Fiat */}
      {assetTab === 'fiat' && (
        <div className="bg-[#1e2026] p-4 rounded-xl border border-[#2b2f36]">
          <h3 className="text-sm font-semibold text-[#eaecef] mb-3">Fiat Wallet</h3>
          <p className="text-xs text-[#848e9c] mb-3">Your fiat balances for buying and selling crypto with local currency.</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-[#2b2f36]/50 last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0b0e11] flex items-center justify-center text-xs font-bold text-[#f0b90b]">$</div>
                <div>
                  <p className="text-sm text-[#eaecef]">USD</p>
                  <p className="text-xs text-[#848e9c]">{usdtBalance.toFixed(2)} USD</p>
                </div>
              </div>
              <p className="text-sm font-bold text-[#eaecef]">${usdtBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Futures */}
      {assetTab === 'futures' && (
        <div className="bg-[#1e2026] p-4 rounded-xl border border-[#2b2f36]">
          <h3 className="text-sm font-semibold text-[#eaecef] mb-3">USD-M Futures</h3>
          <p className="text-xs text-[#848e9c] mb-3">Trade perpetual futures contracts with leverage.</p>
          <div className="flex justify-between items-center py-2"><span className="text-sm text-[#848e9c]">Margin Balance</span><span className="text-sm font-bold text-[#eaecef]">$0.00</span></div>
          <div className="flex justify-between items-center py-2"><span className="text-sm text-[#848e9c]">Available</span><span className="text-sm font-bold text-[#eaecef]">$0.00</span></div>
          <div className="flex justify-between items-center py-2"><span className="text-sm text-[#848e9c]">Unrealized PNL</span><span className="text-sm font-bold text-emerald-400">$0.00</span></div>
        </div>
      )}

      {/* Options */}
      {assetTab === 'options' && (
        <div className="bg-[#1e2026] p-4 rounded-xl border border-[#2b2f36]">
          <h3 className="text-sm font-semibold text-[#eaecef] mb-3">Options Account</h3>
          <p className="text-xs text-[#848e9c] mb-3">Trade European-style crypto options.</p>
          <div className="flex justify-between items-center py-2"><span className="text-sm text-[#848e9c]">Margin Balance</span><span className="text-sm font-bold text-[#eaecef]">$0.00</span></div>
          <div className="flex justify-between items-center py-2"><span className="text-sm text-[#848e9c]">Open Positions</span><span className="text-sm font-bold text-[#eaecef]">0</span></div>
        </div>
      )}

      {/* Margin */}
      {assetTab === 'margin' && (
        <div className="bg-[#1e2026] p-4 rounded-xl border border-[#2b2f36]">
          <h3 className="text-sm font-semibold text-[#eaecef] mb-3">Margin Account</h3>
          <p className="text-xs text-[#848e9c] mb-3">Trade with borrowed funds for amplified exposure.</p>
          <div className="flex justify-between items-center py-2"><span className="text-sm text-[#848e9c]">Margin Balance</span><span className="text-sm font-bold text-[#eaecef]">$0.00</span></div>
          <div className="flex justify-between items-center py-2"><span className="text-sm text-[#848e9c]">Borrowed</span><span className="text-sm font-bold text-rose-400">$0.00</span></div>
        </div>
      )}

      {/* Earn */}
      {assetTab === 'earn' && (
        <div className="bg-[#1e2026] p-4 rounded-xl border border-[#2b2f36]">
          <h3 className="text-sm font-semibold text-[#eaecef] mb-3">Earn Portfolio</h3>
          <p className="text-xs text-[#848e9c] mb-3">Your staked and earned assets from CEO Exchange Earn products.</p>
          <div className="flex justify-between items-center py-2"><span className="text-sm text-[#848e9c]">Total Staked</span><span className="text-sm font-bold text-[#eaecef]">$0.00</span></div>
          <div className="flex justify-between items-center py-2"><span className="text-sm text-[#848e9c]">Total Rewards</span><span className="text-sm font-bold text-emerald-400">$0.00</span></div>
        </div>
      )}

      {/* Funding */}
      {assetTab === 'funding' && (
        <div className="bg-[#1e2026] p-4 rounded-xl border border-[#2b2f36]">
          <h3 className="text-sm font-semibold text-[#eaecef] mb-3">Funding Account</h3>
          <p className="text-xs text-[#848e9c] mb-3">Funds available for transfers between Spot, Futures, and Margin accounts.</p>
          <div className="flex justify-between items-center py-2"><span className="text-sm text-[#848e9c]">Available</span><span className="text-sm font-bold text-[#eaecef]">${usdtBalance.toFixed(2)}</span></div>
        </div>
      )}

      {/* Convert button stays */}
      <button onClick={onConvert} className="w-full bg-[#1e2026] border border-[#2b2f36] text-[#eaecef] font-bold text-sm py-3 rounded-xl hover:bg-[#2b2f36]">
        Convert
      </button>
    </div>
  );
}

// Markets view — dedicated market overview without home widgets
function MarketsView({ onTrade }: { onTrade: (symbol: string, binanceSymbol: string, price: number, change: number) => void }) {
  const [marketSearch, setMarketSearch] = useState('');
  const [marketTab, setMarketTab] = useState<'hot' | 'new' | 'gainers' | 'losers' | 'favorites'>('hot');
  const [tickers, setTickers] = useState<Array<{ symbol: string; display: string; binance: string; price: number; change: number; volume: string }>>([]);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem('mkt_favs') || '[]')));

  const PAIRS = [
    { symbol: 'BTC/USDT', display: 'BTC/USDT', binance: 'BTCUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'ETH/USDT', display: 'ETH/USDT', binance: 'ETHUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'BNB/USDT', display: 'BNB/USDT', binance: 'BNBUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'SOL/USDT', display: 'SOL/USDT', binance: 'SOLUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'XRP/USDT', display: 'XRP/USDT', binance: 'XRPUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'ADA/USDT', display: 'ADA/USDT', binance: 'ADAUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'DOGE/USDT', display: 'DOGE/USDT', binance: 'DOGEUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'TRX/USDT', display: 'TRX/USDT', binance: 'TRXUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'AVAX/USDT', display: 'AVAX/USDT', binance: 'AVAXUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'LINK/USDT', display: 'LINK/USDT', binance: 'LINKUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'DOT/USDT', display: 'DOT/USDT', binance: 'DOTUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'LTC/USDT', display: 'LTC/USDT', binance: 'LTCUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'MATIC/USDT', display: 'MATIC/USDT', binance: 'MATICUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'UNI/USDT', display: 'UNI/USDT', binance: 'UNIUSDT', price: 0, change: 0, volume: '0' },
    { symbol: 'ATOM/USDT', display: 'ATOM/USDT', binance: 'ATOMUSDT', price: 0, change: 0, volume: '0' },
  ];

  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    const pairMap = new Map(PAIRS.map(p => [p.binance, p]));
    ws.onmessage = (e) => {
      try {
        const arr = JSON.parse(e.data);
        setTickers(prev => {
          const map = new Map(prev.map(t => [t.binance, t]));
          const updated: typeof prev = [];
          for (const p of PAIRS) {
            const existing = map.get(p.binance) || p;
            const live = arr.find((x: any) => x.s === p.binance);
            if (live) {
              updated.push({ ...existing, price: parseFloat(live.c), change: parseFloat(live.P), volume: (parseFloat(live.v) * parseFloat(live.c) / 1_000_000).toFixed(1) + 'M' });
            } else {
              updated.push(existing);
            }
          }
          return updated;
        });
      } catch {}
    };
    ws.onerror = () => ws.close();
    setTickers(PAIRS);
    return () => ws.close();
  }, []);

  const toggleFav = (sym: string) => {
    setFavorites(prev => {
      const n = new Set(prev);
      n.has(sym) ? n.delete(sym) : n.add(sym);
      localStorage.setItem('mkt_favs', JSON.stringify([...n]));
      return n;
    });
  };

  let displayed = [...tickers];
  if (marketSearch) displayed = displayed.filter(t => t.symbol.toLowerCase().includes(marketSearch.toLowerCase()));
  if (marketTab === 'gainers') displayed = [...displayed].sort((a, b) => b.change - a.change);
  else if (marketTab === 'losers') displayed = [...displayed].sort((a, b) => a.change - b.change);
  else if (marketTab === 'favorites') displayed = displayed.filter(t => favorites.has(t.symbol));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-[#1e2026] border border-[#2b2f36] rounded-xl px-3 py-2.5">
        <Search className="w-4 h-4 text-[#848e9c] flex-shrink-0" />
        <input value={marketSearch} onChange={e => setMarketSearch(e.target.value)}
          placeholder="Search markets..." className="flex-1 bg-transparent text-sm text-[#eaecef] outline-none placeholder-[#848e9c]" />
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {(['hot','new','gainers','losers','favorites'] as const).map(t => (
          <button key={t} onClick={() => setMarketTab(t)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap capitalize ${marketTab === t ? 'bg-[#f0b90b] text-black' : 'text-[#848e9c]'}`}>
            {t === 'hot' ? '🔥 Hot' : t === 'new' ? '✨ New' : t === 'gainers' ? '↑ Gainers' : t === 'losers' ? '↓ Losers' : '☆ Favorites'}
          </button>
        ))}
      </div>

      <div className="bg-[#1e2026] rounded-xl overflow-hidden border border-[#2b2f36]">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-2 px-4 py-2.5 border-b border-[#2b2f36]">
          <span className="text-xs text-[#474d57] font-semibold">Pair</span>
          <span className="text-xs text-[#474d57] font-semibold text-right">Last Price</span>
          <span className="text-xs text-[#474d57] font-semibold text-right">24h Change</span>
          <span className="text-xs text-[#474d57] font-semibold text-right">Action</span>
        </div>
        {displayed.length === 0 ? (
          <p className="text-center text-sm text-[#848e9c] py-8">No markets found</p>
        ) : displayed.map(t => (
          <div key={t.symbol} className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-2 px-4 py-3 border-b border-[#1e2026] last:border-0 items-center">
            <div className="flex items-center gap-2">
              <button onClick={() => toggleFav(t.symbol)} className="flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill={favorites.has(t.symbol) ? '#f0b90b' : 'none'} stroke={favorites.has(t.symbol) ? '#f0b90b' : '#474d57'} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              </button>
              <div>
                <p className="text-sm font-bold text-[#eaecef]">{t.display}</p>
                <p className="text-xs text-[#474d57]">Vol {t.volume || '—'}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-[#eaecef] text-right">{t.price > 0 ? t.price.toLocaleString(undefined, { maximumFractionDigits: t.price > 100 ? 2 : 6 }) : '—'}</p>
            <p className={`text-sm font-bold text-right ${t.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{t.price > 0 ? (t.change >= 0 ? '+' : '') + t.change.toFixed(2) + '%' : '—'}</p>
            <button onClick={() => onTrade(t.symbol, t.binance, t.price, t.change)}
              className="bg-[#f0b90b] hover:bg-amber-400 text-black text-xs font-bold px-2.5 py-1 rounded-lg">Trade</button>
          </div>
        ))}
      </div>
    </div>
  );
}
