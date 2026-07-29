import { useState } from 'react';
import { X, Send, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = { userId: string; onClose: () => void };

const TYPES = [
  { id: 'BUG', label: 'Bug Report' },
  { id: 'FEATURE', label: 'Feature Request' },
  { id: 'COMPLAINT', label: 'Complaint' },
  { id: 'PRAISE', label: 'Praise' },
];

export default function UserFeedbackModal({ userId, onClose }: Props) {
  const [type, setType] = useState('FEATURE');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!subject.trim() || !message.trim()) { setError('Subject and message are required'); return; }
    setLoading(true);
    const { error: insErr } = await supabase.from('user_feedback').insert({
      user_id: userId, type, subject: subject.trim(), message: message.trim(),
    });
    if (insErr) { setError('Failed to submit feedback'); setLoading(false); return; }
    setSuccess(true); setLoading(false);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">User Feedback</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check className="w-8 h-8 text-emerald-400" /></div>
              <p className="font-bold text-[#eaecef]">Feedback Submitted!</p>
              <p className="text-sm text-[#848e9c] text-center">Thank you. Our team will review your feedback.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {TYPES.map(t => (
                  <button key={t.id} onClick={() => setType(t.id)} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${type === t.id ? 'bg-[#f0b90b] text-black' : 'bg-[#1e2026] text-[#848e9c]'}`}>{t.label}</button>
                ))}
              </div>
              <div>
                <p className="text-xs text-[#848e9c] mb-1">Subject</p>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary" className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
              </div>
              <div>
                <p className="text-xs text-[#848e9c] mb-1">Message</p>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe in detail..." rows={5} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57] resize-none" />
              </div>
              {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
              <button onClick={submit} disabled={loading} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
                {loading ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit Feedback</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
