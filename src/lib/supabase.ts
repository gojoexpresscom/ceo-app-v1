import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sfrlnakpddzgouzihgrj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmcmxuYWtwZGR6Z291emloZ3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMjEzMzgsImV4cCI6MjEwMDc5NzMzOH0.avV2WhXxtEaMUMwjto6Rdq-Mf649YVGDguvUVPVMN_U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseConfigured = true;

export type Profile = {
  id: string;
  user_id: string;
  email: string;
  usdt_balance: number;
  btc_balance: number;
  eth_balance: number;
  kyc_status: 'UNVERIFIED' | 'PENDING' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  vip_level: number;
  uid: string;
  security_level: string;
  anti_phishing_code?: string;
  phone?: string;
  phone_verified?: boolean;
  country_code?: string;
  nickname?: string;
  passcode?: string;
  profile_picture_url?: string;
  telegram_handle?: string;
  twitter_handle?: string;
  whatsapp_number?: string;
  p2p_merchant_status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  p2p_merchant_applied_at?: string;
  fund_password_set: boolean;
  two_fa_enabled: boolean;
  totp_secret?: string;
  passkey_count?: number;
  preferred_language: string;
  preferred_currency: string;
  color_up?: 'green' | 'red';
  routing_mode?: string;
  deposit_to?: string;
  app_lock_enabled?: boolean;
  withdrawal_lock_until?: string;
  secure_tx_approval?: boolean;
  notification_push?: boolean;
  notification_trade?: boolean;
  notification_security?: boolean;
  notification_marketing?: boolean;
  email_trade?: boolean;
  email_security?: boolean;
  email_marketing?: boolean;
  time_zone?: string;
  web3_wallet_address?: string;
  created_at: string;
  role?: string;
  is_banned?: boolean;
  banned_at?: string;
  ban_reason?: string;
  warning_count?: number;
};

export type P2POrder = {
  id: string;
  merchant_name: string;
  price_etb: number;
  min_limit: number;
  max_limit: number;
  completion_rate: number;
  available_usdt: number;
  payment_methods: string[];
  is_active: boolean;
  side?: 'BUY' | 'SELL';
  fiat_currency?: string;
  price_usd?: number;
  expires_at?: string;
  creator_id?: string;
};

export type Transaction = {
  id: string;
  profile_email: string;
  type: 'WITHDRAW' | 'DEPOSIT' | 'TRADE';
  coin: string;
  network?: string;
  amount: number;
  fee: number;
  destination?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
};

export type MarketTicker = {
  symbol: string;
  display: string;
  base: string;
  price: number;
  change: number;
  volume: string;
};

