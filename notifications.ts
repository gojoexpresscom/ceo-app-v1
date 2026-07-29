import { supabase } from '@/lib/supabase';

type Params = {
  userId: string;
  type: 'TRADE' | 'DEPOSIT' | 'WITHDRAWAL' | 'SECURITY' | 'SYSTEM';
  subject: string;
  message: string;
  antiPhishingCode?: string;
};

export async function sendNotification({ userId, type, subject, message, antiPhishingCode }: Params) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      subject,
      message,
      anti_phishing_code: antiPhishingCode || null,
      email_sent: false,
      read: false,
    });
  } catch {
    // Silent fail - notifications are best-effort
  }
}
