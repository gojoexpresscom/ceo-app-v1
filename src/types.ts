import type { Profile } from '@/lib/supabase';

export type UserProfile = Profile;

export type UpdateProfileFn = (patch: Partial<UserProfile>) => Promise<{ error: string | null }>;
