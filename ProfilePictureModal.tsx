import { useState } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  userId: string;
  currentPicture?: string;
  email: string;
  onClose: () => void;
  onPictureChanged: (url: string) => void;
};

export default function ProfilePictureModal({ userId, currentPicture, email, onClose, onPictureChanged }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentPicture || null);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('File too large (max 5MB)'); return; }
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }

    setUploading(true);
    setError('');

    try {
      // Read as data URL for preview + storage
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);

        // Upload to Supabase Storage
        const fileName = `${userId}/avatar-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, file, { upsert: true });

        let url = dataUrl; // fallback to data URL
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
          url = urlData.publicUrl;
        }

        // Save URL to profile
        await supabase.from('profiles').update({ profile_picture_url: url }).eq('user_id', userId);
        onPictureChanged(url);
        setUploading(false);
        setTimeout(onClose, 1000);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Failed to upload image. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[#eaecef]">Profile Picture</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-black text-black">{email.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <label className="w-full flex items-center justify-center gap-2 bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl cursor-pointer transition-colors">
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
              <><Camera className="w-4 h-4" /> Upload New Picture</>
            )}
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>

          <p className="text-xs text-[#848e9c] text-center">JPG, PNG, or GIF. Max 5MB.</p>
        </div>
      </div>
    </div>
  );
}
