import { useState, useRef, useEffect } from 'react';
import { X, Send, Headphones, Mail, MessageCircle } from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP, TELEGRAM_COMMUNITY } from '@/config/constants';

type Props = {
  userId: string;
  profile: Profile;
  onClose: () => void;
};

type ChatMessage = {
  id: string;
  sender: 'user' | 'support';
  text: string;
  created_at: string;
};

const QUICK_REPLIES = [
  'How do I deposit crypto?',
  'What are the withdrawal fees?',
  'How long does KYC verification take?',
  'How do I enable 2FA?',
];

export default function LiveChatModal({ userId, profile, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel('support-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `user_id=eq.${userId}` }, payload => {
        const row = payload.new as Record<string, string>;
        setMessages(prev => [...prev, {
          id: row.id,
          sender: row.sender,
          text: row.message,
          created_at: row.created_at,
        }]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map((r: Record<string, string>) => ({
        id: r.id, sender: r.sender, text: r.message, created_at: r.created_at,
      })));
    }
    setLoading(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput('');
    await supabase.from('support_messages').insert({
      user_id: userId,
      sender: 'user',
      message: text.trim(),
    });
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      sender: 'user',
      text: text.trim(),
      created_at: new Date().toISOString(),
    }]);
    setSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-[#181a20] rounded-t-2xl flex flex-col" style={{ height: '85vh' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#2b2f36] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f0b90b]/15 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-[#f0b90b]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#eaecef]">Live Support</h3>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
              </p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#f0b90b] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <Headphones className="w-12 h-12 text-[#2b2f36] mx-auto mb-3" />
              <p className="text-sm text-[#848e9c] mb-1">No messages yet</p>
              <p className="text-xs text-[#474d57]">Send a message to start chatting with our support team</p>
              <div className="mt-5 space-y-2">
                <p className="text-xs text-[#474d57] font-semibold">Quick questions:</p>
                {QUICK_REPLIES.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="block w-full text-left text-xs text-[#eaecef] bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 hover:border-[#f0b90b]/30 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.sender === 'user'
                    ? 'bg-[#f0b90b] text-black rounded-br-md'
                    : 'bg-[#2b2f36] text-[#eaecef] rounded-bl-md'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* External channels */}
        <div className="px-4 py-2 border-t border-[#2b2f36] flex items-center gap-3 flex-shrink-0">
          <button onClick={() => window.open(SUPPORT_WHATSAPP, '_blank')} title="WhatsApp"
            className="w-9 h-9 rounded-full bg-[#25d366]/15 flex items-center justify-center hover:bg-[#25d366]/25 transition-colors">
            <MessageCircle className="w-4 h-4 text-[#25d366]" />
          </button>
          <button onClick={() => window.open(TELEGRAM_COMMUNITY, '_blank')} title="Telegram"
            className="w-9 h-9 rounded-full bg-[#229ED9]/15 flex items-center justify-center hover:bg-[#229ED9]/25 transition-colors">
            <MessageCircle className="w-4 h-4 text-[#229ED9]" />
          </button>
          <button onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`, '_blank')} title="Email"
            className="w-9 h-9 rounded-full bg-[#f0b90b]/15 flex items-center justify-center hover:bg-[#f0b90b]/25 transition-colors">
            <Mail className="w-4 h-4 text-[#f0b90b]" />
          </button>
          <span className="text-xs text-[#474d57]">Or chat here</span>
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-[#2b2f36] flex items-center gap-2 flex-shrink-0">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(input); }}
            placeholder="Type a message..."
            className="flex-1 bg-[#0b0e11] border border-[#2b2f36] rounded-full px-4 py-2.5 text-sm text-[#eaecef] placeholder-[#474d57] outline-none focus:border-[#f0b90b]/40"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full bg-[#f0b90b] disabled:opacity-40 flex items-center justify-center hover:bg-amber-400 transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}
