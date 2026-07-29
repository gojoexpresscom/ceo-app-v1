import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, Search, MessageCircle, X } from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';

type Props = {
  userId: string;
  profile: Profile;
  onBack: () => void;
  targetUserId?: string | null;
};

type Conversation = {
  id: string;
  participant1: string;
  participant2: string;
  last_message: string | null;
  last_message_at: string;
  other_email?: string;
  other_avatar?: string;
};

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export default function InboxScreen({ userId, onBack, targetUserId }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ user_id: string; email: string; profile_picture_url?: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant1.eq.${userId},participant2.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (!data) { setLoading(false); return; }

    const convos: Conversation[] = await Promise.all(
      (data as Conversation[]).map(async c => {
        const otherId = c.participant1 === userId ? c.participant2 : c.participant1;
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('email, profile_picture_url')
          .eq('user_id', otherId)
          .maybeSingle();
        return {
          ...c,
          other_email: otherProfile?.email || 'Unknown',
          other_avatar: otherProfile?.profile_picture_url,
        };
      })
    );
    setConversations(convos);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // If targetUserId provided, open or create conversation with them
  useEffect(() => {
    if (!targetUserId) return;
    (async () => {
      const p1 = userId < targetUserId ? userId : targetUserId;
      const p2 = userId < targetUserId ? targetUserId : userId;
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant1', p1)
        .eq('participant2', p2)
        .maybeSingle();

      if (existing) {
        const { data: otherProfile } = await supabase
          .from('profiles').select('email, profile_picture_url').eq('user_id', targetUserId).maybeSingle();
        setActiveConv({ ...existing, other_email: otherProfile?.email || 'Unknown', other_avatar: otherProfile?.profile_picture_url });
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ participant1: p1, participant2: p2 })
          .select()
          .single();
        if (newConv) {
          const { data: otherProfile } = await supabase
            .from('profiles').select('email, profile_picture_url').eq('user_id', targetUserId).maybeSingle();
          setActiveConv({ ...newConv, other_email: otherProfile?.email || 'Unknown', other_avatar: otherProfile?.profile_picture_url });
        }
      }
    })();
  }, [targetUserId, userId]);

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) || []);

    // Mark as read
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conv.id)
      .neq('sender_id', userId)
      .is('read_at', null);
  };

  useEffect(() => {
    if (!activeConv) return;
    const channel = supabase
      .channel(`messages-${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`,
      }, (payload: { new: Message & { sender_id: string; id: string } }) => {
        setMessages(prev => [...prev, payload.new as Message]);
        if (payload.new.sender_id !== userId) {
          supabase.from('messages').update({ read_at: new Date().toISOString() })
            .eq('id', payload.new.id).is('read_at', null);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConv, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv) return;
    const msg = newMsg.trim();
    setNewMsg('');
    await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      sender_id: userId,
      content: msg,
    });
    await supabase.from('conversations').update({
      last_message: msg,
      last_message_at: new Date().toISOString(),
    }).eq('id', activeConv.id);
    loadConversations();
  };

  const searchUsers = async (query: string) => {
    setSearch(query);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('user_id, email, profile_picture_url')
      .ilike('email', `%${query}%`)
      .neq('user_id', userId)
      .limit(10);
    setSearchResults((data as Array<{ user_id: string; email: string; profile_picture_url?: string }>) || []);
  };

  const startChatWith = async (targetId: string, email: string) => {
    setShowSearch(false);
    setSearch('');
    setSearchResults([]);
    const p1 = userId < targetId ? userId : targetId;
    const p2 = userId < targetId ? targetId : userId;
    const { data: existing } = await supabase
      .from('conversations').select('*').eq('participant1', p1).eq('participant2', p2).maybeSingle();
    if (existing) {
      setActiveConv({ ...existing, other_email: email });
    } else {
      const { data: newConv } = await supabase
        .from('conversations').insert({ participant1: p1, participant2: p2 }).select().single();
      if (newConv) setActiveConv({ ...newConv, other_email: email });
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (activeConv) {
    return (
      <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col max-w-md mx-auto">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e2026] sticky top-0 bg-[#0b0e11] z-10">
          <button onClick={() => setActiveConv(null)}><ArrowLeft className="w-5 h-5 text-[#848e9c]" /></button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-sm font-bold text-black overflow-hidden">
            {activeConv.other_avatar ? (
              <img src={activeConv.other_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              (activeConv.other_email || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-sm font-bold">{activeConv.other_email?.split('@')[0] || 'User'}</p>
            <p className="text-xs text-emerald-400">Online</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-10 h-10 text-[#474d57] mx-auto mb-2" />
              <p className="text-sm text-[#848e9c]">No messages yet. Say hello!</p>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${m.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${m.sender_id === userId ? 'bg-[#f0b90b] text-black rounded-br-sm' : 'bg-[#1e2026] text-[#eaecef] rounded-bl-sm'}`}>
                  <p className="break-words">{m.content}</p>
                  <p className={`text-[10px] mt-0.5 ${m.sender_id === userId ? 'text-black/50' : 'text-[#474d57]'}`}>{formatTime(m.created_at)}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 py-3 border-t border-[#1e2026] flex gap-2 items-end">
          <textarea
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type a message..."
            rows={1}
            maxLength={500}
            className="flex-1 bg-[#1e2026] border border-[#2b2f36] rounded-2xl px-4 py-2.5 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] resize-none placeholder-[#474d57]"
          />
          <button onClick={sendMessage} disabled={!newMsg.trim()} className="bg-[#f0b90b] disabled:opacity-50 text-black w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col max-w-md mx-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2026] sticky top-0 bg-[#0b0e11] z-10">
        <button onClick={onBack}><ArrowLeft className="w-5 h-5 text-[#848e9c]" /></button>
        <h1 className="text-base font-bold">Inbox</h1>
        <button onClick={() => setShowSearch(!showSearch)}><Search className="w-5 h-5 text-[#f0b90b]" /></button>
      </div>

      {showSearch && (
        <div className="px-4 py-3 border-b border-[#1e2026]">
          <div className="flex items-center gap-2 bg-[#1e2026] border border-[#2b2f36] rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-[#848e9c]" />
            <input
              value={search}
              onChange={e => searchUsers(e.target.value)}
              placeholder="Search users by email..."
              className="flex-1 bg-transparent text-sm text-[#eaecef] outline-none placeholder-[#474d57]"
              autoFocus
            />
            {search && <button onClick={() => { setSearch(''); setSearchResults([]); }}><X className="w-4 h-4 text-[#848e9c]" /></button>}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchResults.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => startChatWith(u.user_id, u.email)}
                  className="w-full flex items-center gap-3 bg-[#1e2026] rounded-xl p-3 hover:bg-[#2b2f36] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-xs font-bold text-black overflow-hidden">
                    {u.profile_picture_url ? <img src={u.profile_picture_url} alt="" className="w-full h-full object-cover" /> : u.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-[#eaecef]">{u.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#f0b90b] border-t-transparent rounded-full animate-spin" /></div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-[#474d57] mx-auto mb-3" />
            <p className="text-sm text-[#848e9c] font-semibold">No conversations yet</p>
            <p className="text-xs text-[#474d57] mt-1">Tap the search icon to find and message other users.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => openConversation(c)}
                className="w-full flex items-center gap-3 bg-[#1e2026] rounded-xl p-3 hover:bg-[#2b2f36] transition-colors text-left"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-sm font-bold text-black overflow-hidden flex-shrink-0">
                  {c.other_avatar ? <img src={c.other_avatar} alt="" className="w-full h-full object-cover" /> : (c.other_email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-[#eaecef] truncate">{c.other_email?.split('@')[0] || 'User'}</p>
                    <span className="text-xs text-[#474d57] flex-shrink-0">{c.last_message_at ? formatTime(c.last_message_at) : ''}</span>
                  </div>
                  <p className="text-xs text-[#848e9c] truncate mt-0.5">{c.last_message || 'No messages yet'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
