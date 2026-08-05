import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Heart, MessageCircle, Repeat2, Bookmark, Share2, X, Image as ImageIcon,
  Send, MoreHorizontal, Flag, Copy, Check, Video, AlertTriangle, Plus,
  FileText, Newspaper, Sparkles, LayoutGrid, Compass, Radio, Eye, Pin,
  Camera, Monitor, SwitchCamera, StopCircle, UserPlus, UserCheck, Loader2,
  Trash2,
} from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';
import { platformAlert } from '@/components/modals/PlatformAlert';

type Post = {
  id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  is_repost: boolean;
  original_post_id: string | null;
  like_count: number;
  comment_count: number;
  repost_count: number;
  save_count: number;
  share_count: number;
  view_count: number;
  is_announcement: boolean;
  is_news: boolean;
  post_type: string;
  created_at: string;
  author_email?: string;
  author_uid?: string;
  author_avatar?: string;
  liked?: boolean;
  saved?: boolean;
  reposted?: boolean;
};

type Props = {
  userId: string;
  profile: Profile;
};

const OFFICIAL_TELEGRAM = 'https://t.me/+-cQQMpJQAcxhNjlk';

const BANNED_WORDS = [
  'porn', 'xxx', 'nude', 'naked', 'sex', 'escort', 'hookup', 'onlyfans',
  'adult content', '18+', 'nsfw', 'strip', 'cam girl', 'prostitution',
  'cialis', 'viagra', 'casino bonus', 'free money', 'click here to win',
  'bitcoin generator', 'free crypto', 'double your money',
  'malware', 'trojan', 'phishing', 'ransomware', 'keylogger',
  'crack download', 'warez', 'pirated software', 'serial key',
  'nigerian prince', 'western union scam', 'gift card scam',
];

const BLOCKED_EXTENSIONS = [
  '.apk', '.exe', '.bat', '.cmd', '.sh', '.msi', '.dll', '.scr',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.js', '.jar', '.app', '.deb', '.rpm', '.dmg',
  '.iso', '.img', '.vmdk',
];

const BANNED_PATTERNS = [
  /https?:\/\/(bit\.ly|tinyurl|shorturl|t\.co|\/\/rb\.gy|\/\/cutt\.ly)/i,
  /(?:^|\s)(?:buy|sell|trade)\s+(?:cheap|discount|free)\s/i,
  /(?:visit|click)\s+(?:my|our|the)\s+(?:link|profile|channel)/i,
  /(?:send|deposit)\s+(?:crypto|btc|eth|usdt)\s+to\s+(?:my|this)\s+(?:address|wallet)/i,
  /(?:double|triple)\s+(?:your|my)\s+(?:crypto|bitcoin|money|investment)/i,
  /(?:guaranteed|risk[- ]?free)\s+(?:profit|return|investment)/i,
];

function containsBannedContent(text: string): { banned: boolean; reason: string } {
  if (text.includes(OFFICIAL_TELEGRAM)) {
    const withoutOfficial = text.replace(OFFICIAL_TELEGRAM, '');
    return containsBannedContent(withoutOfficial);
  }
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) return { banned: true, reason: `Prohibited content: "${word}"` };
  }
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(text)) return { banned: true, reason: 'Spam-like or scam content detected' };
  }
  return { banned: false, reason: '' };
}

function isBlockedFile(fileName: string): boolean {
  const dotIdx = fileName.lastIndexOf('.');
  if (dotIdx === -1) return false;
  const ext = fileName.slice(dotIdx).toLowerCase();
  return BLOCKED_EXTENSIONS.includes(ext);
}

function PostVideo({ src }: { src: string }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-[#2b2f36] bg-black relative">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center h-48 bg-[#1e2026]">
          <Loader2 className="w-6 h-6 text-[#f0b90b] animate-spin" />
        </div>
      )}
      {status === 'error' && (
        <div className="flex flex-col items-center justify-center h-48 bg-[#1e2026] gap-2">
          <AlertTriangle className="w-6 h-6 text-[#848e9c]" />
          <p className="text-xs text-[#848e9c]">Video could not be loaded</p>
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-xs text-[#f0b90b] underline">Open in new tab</a>
        </div>
      )}
      <video
        src={src}
        controls
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className={`w-full max-h-80 object-contain ${status !== 'ready' ? 'opacity-0' : 'opacity-100'}`}
        onLoadedData={() => setStatus('ready')}
        onError={() => setStatus('error')}
      />
    </div>
  );
}

export default function CommunityFeed({ userId, profile }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoError, setVideoError] = useState('');
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [expandedPost, setExpandedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Array<{ id: string; comment_text: string; user_id: string; created_at: string }>>([]);
  const [newComment, setNewComment] = useState('');
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [feedTab, setFeedTab] = useState<'discover' | 'following' | 'campaign' | 'announcements' | 'news' | 'live'>('discover');
  const [showCreatorMenu, setShowCreatorMenu] = useState(false);
  const [creatorMode, setCreatorMode] = useState<'post' | 'article' | 'video' | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [liveSessions, setLiveSessions] = useState<Array<Record<string, unknown>>>([]);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [liveStarting, setLiveStarting] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [platformAnnouncements, setPlatformAnnouncements] = useState<Array<{ id: string; title: string; content: string; type: string; created_at: string; author_role: string }>>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [commentAuthors, setCommentAuthors] = useState<Map<string, string>>(new Map());

  // Live streaming state
  const [liveMode, setLiveMode] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveSource, setLiveSource] = useState<'camera' | 'screen' | null>(null);
  const [activeLiveSession, setActiveLiveSession] = useState<Record<string, unknown> | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('user_follows').select('following_id').eq('follower_id', userId);
      setFollowingIds(new Set((data || []).map((d: Record<string, unknown>) => d.following_id as string)));
    })();
  }, [userId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('live_sessions').select('*').eq('status', 'live').order('created_at', { ascending: false });
      setLiveSessions((data as Array<Record<string, unknown>>) || []);
      const { data: annData } = await supabase.from('platform_announcements').select('id, title, content, type, created_at, author_role').eq('is_active', true).order('created_at', { ascending: false });
      setPlatformAnnouncements((annData as Array<{ id: string; title: string; content: string; type: string; created_at: string; author_role: string }>) || []);
    })();
  }, []);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (isBlockedFile(file.name)) {
      setVideoError('This file type is not allowed. Only short videos (max 2 minutes) are permitted.');
      return;
    }
    if (!file.type.startsWith('video/')) {
      setVideoError('Only video files are allowed. Photos, APKs, music, and executables are blocked.');
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration > 120) {
        setVideoError(`Video is ${Math.floor(video.duration)}s long. Maximum allowed is 2 minutes (120 seconds).`);
      } else {
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
      }
    };
    video.onerror = () => setVideoError('Could not load video. Please try a different file.');
    video.src = URL.createObjectURL(file);
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    setVideoError('');
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }
    setImageFile(file);
    setImageUrl('');
  };

  const removeImage = () => {
    setImageFile(null);
    setImageUrl('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const uploadMedia = async (): Promise<{ imageUrl: string | null; videoUrl: string | null }> => {
    let uploadedImageUrl: string | null = null;
    let uploadedVideoUrl: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.slice(imageFile.name.lastIndexOf('.'));
      const fileName = `${userId}/${Date.now()}-img${ext}`;
      const { error: upErr } = await supabase.storage.from('post-media').upload(fileName, imageFile);
      if (!upErr) {
        const { data } = supabase.storage.from('post-media').getPublicUrl(fileName);
        uploadedImageUrl = data.publicUrl;
      }
    } else if (imageUrl.trim()) {
      uploadedImageUrl = imageUrl.trim();
    }

    if (videoFile) {
      const ext = videoFile.name.slice(videoFile.name.lastIndexOf('.'));
      const fileName = `${userId}/${Date.now()}-vid${ext}`;
      const { error: upErr } = await supabase.storage.from('post-media').upload(fileName, videoFile);
      if (!upErr) {
        const { data } = supabase.storage.from('post-media').getPublicUrl(fileName);
        uploadedVideoUrl = data.publicUrl;
      }
    }

    return { imageUrl: uploadedImageUrl, videoUrl: uploadedVideoUrl };
  };

  const loadPosts = useCallback(async () => {
    // Step 1: Load posts without join (the FK relationship name may not match)
    const { data: postsData } = await supabase
      .from('community_posts')
      .select('*')
      .eq('is_removed', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!postsData || postsData.length === 0) { setPosts([]); setLoading(false); return; }

    // Step 2: Fetch author profiles separately
    const authorIds = [...new Set(postsData.map(p => p.author_id).filter(Boolean))];
    const { data: authorsData } = await supabase
      .from('profiles')
      .select('user_id, email, uid, profile_picture_url')
      .in('user_id', authorIds);

    const authorMap = new Map<string, Record<string, unknown>>();
    (authorsData || []).forEach(a => authorMap.set(a.user_id, a));

    // Step 3: Fetch user interactions
    const { data: interactions } = await supabase
      .from('post_interactions')
      .select('post_id, type')
      .eq('user_id', userId);

    const userInteractions = new Map<string, Set<string>>();
    (interactions || []).forEach((i: Record<string, unknown>) => {
      if (!userInteractions.has(i.post_id)) userInteractions.set(i.post_id, new Set());
      userInteractions.get(i.post_id)!.add(i.type);
    });

    const mapped: Post[] = (postsData as Array<Record<string, unknown>>).map(p => {
      const author = authorMap.get(p.author_id);
      const userInt = userInteractions.get(p.id) || new Set();
      return {
        id: p.id,
        author_id: p.author_id,
        content: p.content,
        image_url: p.image_url,
        video_url: p.video_url,
        is_repost: p.is_repost,
        original_post_id: p.original_post_id,
        like_count: p.like_count,
        comment_count: p.comment_count,
        repost_count: p.repost_count,
        save_count: p.save_count,
        share_count: p.share_count,
        view_count: p.view_count || 0,
        is_announcement: p.is_announcement || false,
        is_news: p.is_news || false,
        post_type: p.post_type || 'post',
        created_at: p.created_at,
        author_email: author?.email || 'Unknown',
        author_uid: author?.uid || '',
        author_avatar: author?.profile_picture_url,
        liked: userInt.has('LIKE'),
        saved: userInt.has('SAVE'),
        reposted: userInt.has('REPOST'),
      };
    });

    setPosts(mapped);
    setLoading(false);

    if (mapped.length > 0) {
      (async () => {
        for (const post of mapped.slice(0, 10)) {
          try {
            await supabase.from('post_views').insert({ post_id: post.id, user_id: userId });
            await supabase.rpc('increment_view_count', { post_id: post.id });
            supabase.from('community_posts').update({ view_count: (post.view_count || 0) + 1 }).eq('id', post.id);
          } catch { /* view already exists */ }
        }
      })();
    }
  }, [userId]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const publishPost = async () => {
    setError('');
    if (!newPost.trim() && !imageFile && !videoFile && !imageUrl.trim()) return;

    const { banned, reason } = containsBannedContent(newPost);
    if (banned) {
      setError(`Post blocked: ${reason}. Violations result in account ban and balance forfeiture.`);
      await supabase.from('content_reports').insert({
        post_id: null, reporter_id: userId, reason, auto_flagged: true, action_taken: 'BANNED',
      });
      await supabase.from('banned_users').insert({
        user_id: userId, reason, penalty_amount: parseFloat(profile.usdt_balance.toString()),
      });
      await supabase.from('owner_fees').insert({
        user_id: userId, fee_type: 'PENALTY', amount: parseFloat(profile.usdt_balance.toString()), coin: 'USDT',
      });
      await supabase.from('profiles').update({ usdt_balance: 0 }).eq('user_id', userId);
      return;
    }

    setPosting(true);
    try {
      const { imageUrl: upImg, videoUrl: upVid } = await uploadMedia();

      const postData: Record<string, unknown> = {
        author_id: userId,
        content: newPost.trim(),
        image_url: upImg,
        video_url: upVid,
        post_type: creatorMode === 'article' ? 'article' : creatorMode === 'video' ? 'video' : 'post',
        is_news: feedTab === 'news',
      };

      const { data, error: insertError } = await supabase
        .from('community_posts')
        .insert(postData)
        .select()
        .single();

      if (!insertError && data) {
        setNewPost('');
        setImageFile(null);
        setImageUrl('');
        setShowImageInput(false);
        removeVideo();
        setCreatorMode(null);
        loadPosts();
      } else if (insertError) {
        setError('Failed to publish post. Please try again.');
      }
    } catch {
      setError('Failed to upload media. Please try again.');
    }
    setPosting(false);
  };

  const toggleLike = async (post: Post) => {
    if (post.liked) {
      await supabase.from('post_interactions').delete().eq('post_id', post.id).eq('user_id', userId).eq('type', 'LIKE');
      await supabase.from('community_posts').update({ like_count: Math.max(0, post.like_count - 1) }).eq('id', post.id);
    } else {
      await supabase.from('post_interactions').insert({ post_id: post.id, user_id: userId, type: 'LIKE' });
      await supabase.from('community_posts').update({ like_count: post.like_count + 1 }).eq('id', post.id);
    }
    loadPosts();
  };

  const toggleSave = async (post: Post) => {
    if (post.saved) {
      await supabase.from('post_interactions').delete().eq('post_id', post.id).eq('user_id', userId).eq('type', 'SAVE');
      await supabase.from('community_posts').update({ save_count: Math.max(0, post.save_count - 1) }).eq('id', post.id);
    } else {
      await supabase.from('post_interactions').insert({ post_id: post.id, user_id: userId, type: 'SAVE' });
      await supabase.from('community_posts').update({ save_count: post.save_count + 1 }).eq('id', post.id);
    }
    loadPosts();
  };

  const repost = async (post: Post) => {
    if (post.reposted) return;
    await supabase.from('community_posts').insert({
      author_id: userId, content: '', is_repost: true, original_post_id: post.id,
    });
    await supabase.from('post_interactions').insert({ post_id: post.id, user_id: userId, type: 'REPOST' });
    await supabase.from('community_posts').update({ repost_count: post.repost_count + 1 }).eq('id', post.id);
    loadPosts();
  };

  const openComments = async (post: Post) => {
    setExpandedPost(post);
    const { data } = await supabase
      .from('post_interactions')
      .select('id, comment_text, user_id, created_at, parent_comment_id')
      .eq('post_id', post.id)
      .eq('type', 'COMMENT')
      .order('created_at', { ascending: true });
    const cmts = (data as Array<{ id: string; comment_text: string; user_id: string; created_at: string; parent_comment_id: string | null }>) || [];
    setComments(cmts);
    // Fetch author nicknames for comments
    const authorIds = [...new Set(cmts.map(c => c.user_id).filter(Boolean))];
    if (authorIds.length > 0) {
      const { data: authors } = await supabase.from('profiles').select('user_id, nickname, email').in('user_id', authorIds);
      const map = new Map<string, string>();
      (authors || []).forEach(a => map.set(a.user_id, a.nickname || a.email?.split('@')[0] || 'User'));
      setCommentAuthors(map);
    }
  };

  const submitReply = async (parentId: string) => {
    if (!replyText.trim() || !expandedPost) return;
    await supabase.from('post_interactions').insert({
      post_id: expandedPost.id, user_id: userId, type: 'COMMENT', comment_text: replyText.trim(), parent_comment_id: parentId,
    });
    await supabase.from('community_posts').update({ comment_count: expandedPost.comment_count + 1 }).eq('id', expandedPost.id);
    setReplyText('');
    setReplyTo(null);
    openComments(expandedPost);
    loadPosts();
  };

  const submitComment = async () => {
    if (!newComment.trim() || !expandedPost) return;
    const { banned } = containsBannedContent(newComment);
    if (banned) { setError('Comment blocked for policy violation.'); return; }
    await supabase.from('post_interactions').insert({
      post_id: expandedPost.id, user_id: userId, type: 'COMMENT', comment_text: newComment.trim(),
    });
    await supabase.from('community_posts').update({ comment_count: expandedPost.comment_count + 1 }).eq('id', expandedPost.id);
    setNewComment('');
    openComments(expandedPost);
    loadPosts();
  };

  const reportPost = async (post: Post) => {
    await supabase.from('content_reports').insert({
      post_id: post.id, reporter_id: userId, reason: 'User reported this post', auto_flagged: false, action_taken: 'PENDING',
    });
    platformAlert.info('Report Submitted', 'Thank you. Our team will review this post. If it violates our policies, it will be removed.');
  };

  const handleDeletePost = async (post: Post) => {
    if (post.author_id !== userId) return;
    // Immediately remove from local state so UI updates instantly
    setPosts(prev => prev.filter(p => p.id !== post.id));
    setShowPostMenu(null);
    // Hard DELETE from DB — the RLS DELETE policy allows auth.uid() = author_id
    const { error: delErr } = await supabase.from('community_posts').delete().eq('id', post.id);
    if (delErr) {
      // Fallback: try soft-delete (mark is_removed) if hard delete fails
      const { error: updErr } = await supabase.from('community_posts').update({ is_removed: true }).eq('id', post.id);
      if (updErr) {
        loadPosts();
        platformAlert.error('Error', 'Could not delete post. Please try again.');
        return;
      }
    }
    // Clean up storage files (best effort)
    const extractPath = (url: string | null) => {
      if (!url) return null;
      const idx = url.indexOf('/post-media/');
      return idx !== -1 ? url.slice(idx + '/post-media/'.length) : null;
    };
    const imgPath = extractPath(post.image_url);
    const vidPath = extractPath(post.video_url);
    if (imgPath) supabase.storage.from('post-media').remove([imgPath]);
    if (vidPath) supabase.storage.from('post-media').remove([vidPath]);
    platformAlert.info('Post Deleted', 'Your post has been removed.');
  };

  const sharePostHandler = (post: Post) => {
    setSharePost(post);
    setCopiedLink(false);
    // Increment share count
    supabase.from('community_posts').update({ share_count: post.share_count + 1 }).eq('id', post.id);
  };

  const copyLink = (post: Post) => {
    const link = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  const toggleFollow = async (targetId: string) => {
    if (targetId === userId) return;
    setFollowLoading(targetId);
    const isFollowing = followingIds.has(targetId);
    if (isFollowing) {
      await supabase.from('user_follows').delete().eq('follower_id', userId).eq('following_id', targetId);
      setFollowingIds(prev => { const n = new Set(prev); n.delete(targetId); return n; });
    } else {
      await supabase.from('user_follows').insert({ follower_id: userId, following_id: targetId });
      setFollowingIds(prev => { const n = new Set(prev); n.add(targetId); return n; });
    }
    setFollowLoading(null);
  };

  // Live streaming functions — requests permissions explicitly
  const startLiveStream = async (source: 'camera' | 'screen') => {
    setLiveStarting(true);
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        platformAlert.error('Not Supported', 'Your browser does not support camera/screen access. Try using Chrome or Safari on a secure (HTTPS) connection.');
        setLiveStarting(false);
        return;
      }

      let stream: MediaStream;
      if (source === 'screen') {
        // Screen capture requires getDisplayMedia
        if (!navigator.mediaDevices.getDisplayMedia) {
          platformAlert.error('Not Supported', 'Screen sharing is not supported in this browser. Try Chrome on desktop.');
          setLiveStarting(false);
          return;
        }
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: true,
        });
      } else {
        // Camera — request user/selfie camera first, browser will prompt for permission
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      }
      setLiveStream(stream);
      setLiveSource(source);
      setLiveMode(true);
      // Wait for video element to be rendered, then attach stream
      setTimeout(() => {
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.play().catch(() => {});
        }
      }, 100);

      const { data } = await supabase.from('live_sessions').insert({
        host_id: userId, title: liveTitle || 'Live Session', status: 'live',
      }).select().single();
      setActiveLiveSession(data);

      // Auto-stop when user ends screen share or camera is disconnected
      stream.getVideoTracks()[0].onended = () => stopLiveStream();
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e?.name === 'NotAllowedError') {
        platformAlert.error('Permission Denied', 'Camera/screen access was denied. Please allow access in your browser settings and try again.');
      } else if (e?.name === 'NotFoundError') {
        platformAlert.error('No Camera', 'No camera found on this device. Try screen sharing instead.');
      } else {
        platformAlert.error('Live Failed', `Could not start stream: ${e?.message || 'Unknown error'}. Please try again.`);
      }
    }
    setLiveStarting(false);
  };

  const stopLiveStream = async () => {
    if (liveStream) {
      liveStream.getTracks().forEach(t => t.stop());
      setLiveStream(null);
    }
    if (activeLiveSession) {
      await supabase.from('live_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', activeLiveSession.id);
    }
    setActiveLiveSession(null);
    setLiveMode(false);
    setLiveSource(null);
    setLiveTitle('');
    const { data } = await supabase.from('live_sessions').select('*').eq('status', 'live').order('created_at', { ascending: false });
    setLiveSessions((data as Array<Record<string, unknown>>) || []);
  };

  const switchCamera = async () => {
    if (liveStream && liveSource === 'camera') {
      liveStream.getTracks().forEach(t => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
      setLiveStream(newStream);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = newStream;
        liveVideoRef.current.play();
      }
    }
  };

  const renderComposeBox = () => (
    <div className="bg-[#1e2026] border border-[#2b2f36] rounded-2xl p-4">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-sm font-bold text-black flex-shrink-0 overflow-hidden">
          {profile.profile_picture_url ? (
            <img src={profile.profile_picture_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            (profile.email || 'U').charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          {creatorMode === 'article' && (
            <input
              type="text"
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              placeholder="Article title..."
              maxLength={120}
              className="w-full bg-transparent text-sm font-bold text-[#eaecef] outline-none placeholder-[#848e9c] mb-2"
            />
          )}
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder={creatorMode === 'article' ? 'Write your article content...' : creatorMode === 'video' ? 'Add a caption for your video...' : 'Share market analysis, trading insights, or crypto news...'}
            maxLength={creatorMode === 'article' ? 5000 : 500}
            rows={creatorMode === 'article' ? 6 : 2}
            className="w-full bg-transparent text-sm text-[#eaecef] outline-none resize-none placeholder-[#848e9c]"
          />

          {imageFile && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-[#2b2f36]">
              <img src={URL.createObjectURL(imageFile)} alt="" className="w-full max-h-40 object-cover" />
              <button onClick={removeImage} className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}

          {showImageInput && !imageFile && (
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="Paste image URL (e.g. from imgur)"
              className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-xs text-[#eaecef] outline-none focus:border-[#f0b90b] mb-2"
            />
          )}

          {videoPreview && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-[#2b2f36]">
              <video src={videoPreview} controls className="w-full max-h-40 object-cover" />
              <button onClick={removeVideo} className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}
          {videoError && (
            <p className="text-xs text-rose-400 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />{videoError}
            </p>
          )}
          {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => imageInputRef.current?.click()} className="text-[#848e9c] hover:text-[#eaecef]" title="Add photo">
                <ImageIcon className="w-4 h-4" />
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

              <button onClick={() => videoInputRef.current?.click()} className="text-[#848e9c] hover:text-[#eaecef]" title="Add video (max 2 min)">
                <Video className="w-4 h-4" />
              </button>
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />

              {creatorMode && (
                <span className="text-xs text-[#f0b90b] font-bold">
                  {creatorMode === 'article' ? 'Article' : creatorMode === 'video' ? 'Video' : 'Post'}
                </span>
              )}
              <span className="text-xs text-[#474d57]">{newPost.length}/{creatorMode === 'article' ? 5000 : 500}</span>
            </div>
            <button
              onClick={publishPost}
              disabled={posting || (!newPost.trim() && !imageFile && !videoFile && !imageUrl.trim())}
              className="bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-1"
            >
              {posting ? 'Posting...' : <><Send className="w-3 h-3" /> Post</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pt-2">
        <div className="w-1 h-5 bg-[#f0b90b] rounded-full" />
        <h3 className="text-sm font-bold text-[#eaecef]">CEO Square</h3>
        <span className="text-xs text-[#848e9c]">· Community</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-[#2b2f36]">
        {[
          { id: 'discover', label: 'Discover', Icon: Compass },
          { id: 'following', label: 'Following', Icon: Heart },
          { id: 'campaign', label: 'Campaign', Icon: Sparkles },
          { id: 'announcements', label: 'Announcements', Icon: Pin },
          { id: 'news', label: 'News', Icon: Newspaper },
          { id: 'live', label: 'Live', Icon: Radio },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFeedTab(tab.id as typeof feedTab)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${feedTab === tab.id ? 'border-[#f0b90b] text-[#f0b90b]' : 'border-transparent text-[#848e9c] hover:text-[#eaecef]'}`}
          >
            <tab.Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {(feedTab === 'discover' || feedTab === 'following' || feedTab === 'campaign' || feedTab === 'news') && renderComposeBox()}

      {feedTab === 'announcements' && (
        <div className="space-y-3">
          {platformAnnouncements.length === 0 ? (
            <div className="bg-[#1e2026] border border-[#2b2f36] rounded-2xl p-4 text-center">
              <Pin className="w-8 h-8 text-[#474d57] mx-auto mb-2" />
              <p className="text-sm text-[#848e9c]">No official announcements yet.</p>
            </div>
          ) : (
            <>
              {platformAnnouncements.map(ann => (
            <div key={ann.id} className="bg-[#1e2026] border border-[#2b2f36] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ann.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : ann.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : ann.type === 'maintenance' ? 'bg-rose-500/20 text-rose-400' : 'bg-sky-500/20 text-sky-400'}`}>{ann.type.toUpperCase()}</span>
                <span className="text-[10px] text-[#474d57]">{ann.author_role === 'owner' ? 'Owner' : 'Admin'}</span>
                <span className="text-[10px] text-[#474d57] ml-auto">{formatTime(ann.created_at)}</span>
              </div>
              <p className="text-sm font-bold text-[#eaecef] mb-1">{ann.title}</p>
              <p className="text-xs text-[#848e9c]">{ann.content}</p>
            </div>
              ))}
            </>
          )}
        </div>
      )}

      {feedTab === 'live' && (
        <div className="space-y-3">
          {!liveMode && !liveStream ? (
            <>
              <div className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 border border-rose-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Radio className="w-4 h-4 text-rose-400" />
                  <p className="text-sm font-bold text-[#eaecef]">Go Live</p>
                </div>
                <p className="text-xs text-[#848e9c] mb-3">Start a real-time live stream using your camera or screen. Share market analysis with the community.</p>
                <input
                  type="text"
                  value={liveTitle}
                  onChange={e => setLiveTitle(e.target.value)}
                  placeholder="Stream title (e.g. BTC Analysis Live)"
                  className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] outline-none focus:border-rose-500 mb-3 placeholder-[#474d57]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => startLiveStream('camera')}
                    disabled={liveStarting}
                    className="bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    {liveStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Camera
                  </button>
                  <button
                    onClick={() => startLiveStream('screen')}
                    disabled={liveStarting}
                    className="bg-[#0b0e11] border border-rose-500/30 text-rose-400 font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-rose-500/10 disabled:opacity-50"
                  >
                    {liveStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Monitor className="w-4 h-4" />} Screen
                  </button>
                </div>
                <p className="text-xs text-[#474d57] mt-2 text-center">Your browser will ask for camera/microphone permission. Tap Allow to start streaming.</p>
              </div>

              {liveSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Radio className="w-10 h-10 text-[#474d57] mx-auto mb-2" />
                  <p className="text-sm text-[#848e9c]">No live streams right now. Start one!</p>
                </div>
              ) : (
                liveSessions.map(session => (
                  <div key={session.id} className="bg-[#1e2026] border border-rose-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-rose-400">LIVE</span>
                      <span className="text-xs text-[#848e9c]">{session.viewer_count || 0} watching</span>
                    </div>
                    <p className="text-sm font-bold text-[#eaecef]">{session.title}</p>
                    <button
                      onClick={() => platformAlert.info('Live Stream', 'This live stream is in progress. Join via the host\'s stream link.')}
                      className="mt-2 text-xs text-rose-400 font-bold"
                    >
                      Tap to watch
                    </button>
                  </div>
                ))
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black">
                <video ref={liveVideoRef} autoPlay playsInline muted className="w-full max-h-[60vh] object-cover" />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-white bg-rose-500 px-2 py-0.5 rounded">LIVE</span>
                </div>
                {liveTitle && <p className="absolute bottom-3 left-3 text-sm text-white font-bold">{liveTitle}</p>}
              </div>
              <div className="flex gap-2">
                {liveSource === 'camera' && (
                  <button onClick={switchCamera} className="flex-1 bg-[#1e2026] border border-[#2b2f36] text-[#eaecef] font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                    <SwitchCamera className="w-4 h-4" /> Switch Camera
                  </button>
                )}
                <button onClick={stopLiveStream} className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                  <StopCircle className="w-4 h-4" /> End Stream
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {feedTab !== 'live' && (loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#f0b90b] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-10 h-10 text-[#474d57] mx-auto mb-2" />
          <p className="text-sm text-[#848e9c]">
            {feedTab === 'following' ? 'No posts from people you follow.' : feedTab === 'announcements' ? 'No announcements yet.' : feedTab === 'news' ? 'No news posts yet.' : 'No posts yet. Be the first to share!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(feedTab === 'following' ? posts.filter(p => followingIds.has(p.author_id)) : feedTab === 'announcements' ? posts.filter(p => p.is_announcement) : feedTab === 'news' ? posts.filter(p => p.is_news) : feedTab === 'campaign' ? posts.filter(p => p.post_type === 'campaign') : posts).map(post => (
            <div key={post.id} className="bg-[#1e2026] border border-[#2b2f36] rounded-2xl p-4">
              {post.is_repost && (
                <div className="flex items-center gap-1.5 text-xs text-[#848e9c] mb-2">
                  <Repeat2 className="w-3.5 h-3.5" /> Reposted
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-sm font-bold text-black flex-shrink-0 overflow-hidden">
                  {post.author_avatar ? (
                    <img src={post.author_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (post.author_email || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#eaecef] truncate">
                      {post.author_email ? post.author_email.split('@')[0] : 'Unknown'}
                      {post.author_uid && <span className="text-xs text-[#474d57] ml-1.5 font-normal">UID: {post.author_uid}</span>}
                    </p>
                    <span className="text-xs text-[#474d57]">· {formatTime(post.created_at)}</span>
                    {post.is_announcement && <span className="text-xs text-[#f0b90b] font-bold bg-[#f0b90b]/10 px-1.5 py-0.5 rounded">Official</span>}
                    {post.is_news && <span className="text-xs text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded">News</span>}
                    {post.author_id !== userId && (
                      <button
                        onClick={() => toggleFollow(post.author_id)}
                        disabled={followLoading === post.author_id}
                        className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${followingIds.has(post.author_id) ? 'bg-[#2b2f36] text-[#848e9c]' : 'bg-[#f0b90b]/20 text-[#f0b90b]'}`}
                      >
                        {followLoading === post.author_id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : followingIds.has(post.author_id) ? <><UserCheck className="w-2.5 h-2.5" /> Following</> : <><UserPlus className="w-2.5 h-2.5" /> Follow</>}
                      </button>
                    )}
                  </div>
                  {post.content && (
                    <p className="text-sm text-[#eaecef] mt-1 break-words whitespace-pre-wrap">{post.content}</p>
                  )}
                  {post.image_url && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-[#2b2f36]">
                      <img
                        src={post.image_url}
                        alt=""
                        className="w-full max-h-80 object-cover"
                        loading="lazy"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const ph = e.currentTarget.nextElementSibling as HTMLElement;
                          if (ph) ph.style.display = 'flex';
                        }}
                      />
                      <div className="hidden items-center justify-center h-32 bg-[#1e2026] text-xs text-[#848e9c]">
                        Image could not be loaded
                      </div>
                    </div>
                  )}
                  {post.video_url && (
                    <PostVideo src={post.video_url} />
                  )}
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}
                    className="text-[#474d57] hover:text-[#848e9c] p-1"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {showPostMenu === post.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowPostMenu(null)} />
                      <div className="absolute right-0 top-8 z-50 bg-[#1e2026] border border-[#2b2f36] rounded-xl shadow-xl py-1 min-w-[160px]">
                        {post.author_id === userId ? (
                          <>
                            <button
                              onClick={() => { handleDeletePost(post); setShowPostMenu(null); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-[#0b0e11]"
                            >
                              <Trash2 className="w-4 h-4" /> Delete Post
                            </button>
                            <div className="border-t border-[#2b2f36] my-1" />
                          </>
                        ) : null}
                        <button
                          onClick={() => { reportPost(post); setShowPostMenu(null); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#848e9c] hover:bg-[#0b0e11]"
                        >
                          <Flag className="w-3.5 h-3.5" /> Report Post
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2b2f36]">
                <button onClick={() => toggleLike(post)} className={`flex items-center gap-1.5 text-xs ${post.liked ? 'text-rose-400' : 'text-[#848e9c] hover:text-rose-400'}`}>
                  <Heart className={`w-4 h-4 ${post.liked ? 'fill-rose-400' : ''}`} />
                  {post.like_count > 0 && <span>{post.like_count}</span>}
                </button>
                <button onClick={() => openComments(post)} className="flex items-center gap-1.5 text-xs text-[#848e9c] hover:text-sky-400">
                  <MessageCircle className="w-4 h-4" />
                  {post.comment_count > 0 && <span>{post.comment_count}</span>}
                </button>
                <button onClick={() => repost(post)} className={`flex items-center gap-1.5 text-xs ${post.reposted ? 'text-emerald-400' : 'text-[#848e9c] hover:text-emerald-400'}`}>
                  <Repeat2 className="w-4 h-4" />
                  {post.repost_count > 0 && <span>{post.repost_count}</span>}
                </button>
                <button onClick={() => toggleSave(post)} className={`flex items-center gap-1.5 text-xs ${post.saved ? 'text-[#f0b90b]' : 'text-[#848e9c] hover:text-[#f0b90b]'}`}>
                  <Bookmark className={`w-4 h-4 ${post.saved ? 'fill-[#f0b90b]' : ''}`} />
                  {post.save_count > 0 && <span>{post.save_count}</span>}
                </button>
                <button onClick={() => sharePostHandler(post)} className="flex items-center gap-1.5 text-xs text-[#848e9c] hover:text-[#eaecef]">
                  <Share2 className="w-4 h-4" />
                  {post.share_count > 0 && <span>{post.share_count}</span>}
                </button>
                <span className="flex items-center gap-1.5 text-xs text-[#474d57]">
                  <Eye className="w-4 h-4" />
                  {post.view_count > 0 && <span>{post.view_count}</span>}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Comments modal */}
      {expandedPost && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => setExpandedPost(null)}>
          <div className="w-full bg-[#181a20] rounded-t-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
              <h3 className="font-bold text-base text-[#eaecef]">Comments ({expandedPost.comment_count})</h3>
              <button onClick={() => setExpandedPost(null)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-[#848e9c] text-center py-8">No comments yet. Start the conversation!</p>
              ) : (
                comments.filter(c => !c.parent_comment_id).map(c => (
                  <div key={c.id} className="space-y-2">
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#2b2f36] flex items-center justify-center text-xs font-bold text-[#eaecef] flex-shrink-0">
                        {(commentAuthors.get(c.user_id) || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-amber-400">{commentAuthors.get(c.user_id) || 'User'}</p>
                        <p className="text-sm text-[#eaecef] break-words">{c.comment_text}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-[#474d57]">{formatTime(c.created_at)}</p>
                          <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="text-xs text-[#848e9c] hover:text-amber-400 font-semibold">Reply</button>
                        </div>
                      </div>
                    </div>
                    {/* Threaded replies */}
                    {comments.filter(r => r.parent_comment_id === c.id).map(reply => (
                      <div key={reply.id} className="flex gap-3 ml-10">
                        <div className="w-6 h-6 rounded-full bg-[#2b2f36] flex items-center justify-center text-[10px] font-bold text-[#eaecef] flex-shrink-0">
                          {(commentAuthors.get(reply.user_id) || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-sky-400">{commentAuthors.get(reply.user_id) || 'User'}</p>
                          <p className="text-sm text-[#eaecef] break-words">{reply.comment_text}</p>
                          <p className="text-xs text-[#474d57] mt-0.5">{formatTime(reply.created_at)}</p>
                        </div>
                      </div>
                    ))}
                    {/* Reply input */}
                    {replyTo === c.id && (
                      <div className="flex gap-2 ml-10">
                        <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply..." maxLength={300}
                          className="flex-1 bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-3 py-2 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]" />
                        <button onClick={() => submitReply(c.id)} disabled={!replyText.trim()} className="bg-[#f0b90b] disabled:opacity-50 text-black font-bold text-sm px-3 rounded-xl">Reply</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="px-5 py-4 border-t border-[#2b2f36] flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                maxLength={300}
                className="flex-1 bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-2.5 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b]"
              />
              <button onClick={submitComment} disabled={!newComment.trim()} className="bg-[#f0b90b] disabled:opacity-50 text-black font-bold text-sm px-4 rounded-xl">Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {sharePost && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => setSharePost(null)}>
          <div className="w-full bg-[#181a20] rounded-t-2xl px-5 py-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-[#eaecef]">Share Post</h3>
              <button onClick={() => setSharePost(null)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="space-y-2">
              {['WhatsApp', 'Telegram', 'Twitter/X', 'Facebook', 'Email'].map(platform => (
                <button
                  key={platform}
                  onClick={() => {
                    const link = `${window.location.origin}${window.location.pathname}#post-${sharePost.id}`;
                    if (platform === 'WhatsApp') window.open(`https://wa.me/?text=${encodeURIComponent(link)}`, '_blank');
                    else if (platform === 'Telegram') window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}`, '_blank');
                    else if (platform === 'Twitter/X') window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}`, '_blank');
                    else if (platform === 'Facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
                    else if (platform === 'Email') window.open(`mailto:?subject=CEO Exchange Post&body=${encodeURIComponent(link)}`, '_blank');
                    setSharePost(null);
                  }}
                  className="w-full flex items-center justify-between bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] hover:bg-[#1e2026]"
                >
                  {platform}
                  <Share2 className="w-4 h-4 text-[#848e9c]" />
                </button>
              ))}
              <button onClick={() => copyLink(sharePost)} className="w-full flex items-center justify-between bg-[#0b0e11] border border-[#f0b90b]/30 rounded-xl px-4 py-3 text-sm text-[#f0b90b] hover:bg-[#f0b90b]/10">
                Copy Link
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowCreatorMenu(true)}
        className="fixed bottom-24 right-4 max-w-md mx-auto w-14 h-14 bg-[#f0b90b] hover:bg-amber-400 text-black rounded-full shadow-lg shadow-[#f0b90b]/30 flex items-center justify-center z-40 transition-transform active:scale-95"
        aria-label="Create"
      >
        <Plus className="w-6 h-6" />
      </button>

      {showCreatorMenu && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => setShowCreatorMenu(false)}>
          <div className="w-full bg-[#181a20] rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-[#eaecef]">Create</h3>
              <button onClick={() => setShowCreatorMenu(false)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="space-y-2">
              {[
                { Icon: Send, label: 'Post', desc: 'Share a quick text post, image, or short video', action: () => { setShowCreatorMenu(false); setCreatorMode('post'); setFeedTab('discover'); } },
                { Icon: FileText, label: 'Article', desc: 'Write an in-depth analysis or blog-style article', action: () => { setShowCreatorMenu(false); setCreatorMode('article'); setFeedTab('discover'); } },
                { Icon: Video, label: 'Video', desc: 'Upload a short video (max 2 minutes)', action: () => { setShowCreatorMenu(false); setCreatorMode('video'); setFeedTab('discover'); setTimeout(() => videoInputRef.current?.click(), 200); } },
                { Icon: LayoutGrid, label: 'Creator Center', desc: 'Manage your posts, followers, and analytics', action: () => { setShowCreatorMenu(false); platformAlert.info('Creator Center', 'Creator Center coming soon. View your post stats in your profile.'); } },
                { Icon: Sparkles, label: 'CreatorPad', desc: 'Launch a token or campaign to the community', action: () => { setShowCreatorMenu(false); setFeedTab('campaign'); } },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 hover:border-[#f0b90b]/40 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#f0b90b]/10 flex items-center justify-center flex-shrink-0">
                    <item.Icon className="w-5 h-5 text-[#f0b90b]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#eaecef]">{item.label}</p>
                    <p className="text-xs text-[#848e9c] mt-0.5">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
