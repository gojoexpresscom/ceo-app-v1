import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './ToastProvider';
import { useSystemLog } from '@/hooks/useSystemLog';
import { ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('admin@bybit.com');
  const [password, setPassword] = useState('admin123');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { showToast } = useToast();
  const log = useSystemLog();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email || !password) {
      setErr('Please enter email and password');
      return;
    }
    setLoading(true);
    // Simulated credential check against platform_users admin record
    const { data, error } = await supabase
      .from('platform_users')
      .select('id, email, role, status')
      .eq('email', email)
      .eq('role', 'admin')
      .maybeSingle();

    setLoading(false);

    if (error || !data) {
      setErr('Invalid admin credentials');
      return;
    }
    if (data.status !== 'active') {
      setErr('Account suspended. Contact super admin.');
      return;
    }

    await log({
      action: 'Admin Login',
      actor: email,
      actor_role: 'Super Admin',
      target: email,
      details: 'Administrator logged in successfully',
      ip_address: '192.168.1.1',
      severity: 'info',
    });
    showToast('Welcome back, Admin', 'success');
    onSuccess();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0e11] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-yellow-500 text-black">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-white">Bybit Admin Portal</h1>
          <p className="mt-1 text-xs text-gray-500">Secure administration access</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-2xl bg-[#12161c] p-6">
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-[#0b0e11] px-3.5 py-2.5 text-sm text-white outline-none ring-1 ring-[#1f2731] focus:ring-yellow-500"
              placeholder="admin@bybit.com"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-[#0b0e11] px-3.5 py-2.5 pr-10 text-sm text-white outline-none ring-1 ring-[#1f2731] focus:ring-yellow-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {err && <p className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 py-2.5 text-sm font-semibold text-black hover:bg-yellow-400 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>

          <p className="mt-4 text-center text-[10px] text-gray-600">
            Demo credentials pre-filled. Click Sign In to continue.
          </p>
        </form>
      </div>
    </div>
  );
        }
