import React, { useEffect, useState } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, increment, where, getDocs
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { PrayerRequest, Comment } from '../../types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { PlusIcon, HeartIcon, ChatBubbleLeftIcon, PencilIcon, TrashIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

const REACTIONS = ['🙏', '❤️', '🔥', '😢', '💪', '✨'];

const PrayerFeed: React.FC<{ filterUserId?: string }> = ({ filterUserId }) => {
  const { currentUser, userProfile, isAdmin, hasPrivilege } = useAuth();
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showReactions, setShowReactions] = useState<string | null>(null);

  useEffect(() => {
    let q = filterUserId
      ? query(collection(db, 'prayers'), where('authorId', '==', filterUserId), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'prayers'), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, snap => {
      setPrayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as PrayerRequest)));
    });
    return unsub;
  }, [filterUserId]);

  useEffect(() => {
    if (!selectedPrayer) { setComments([]); return; }
    const q = query(collection(db, 'comments'), where('postId', '==', selectedPrayer.id), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment))));
    return unsub;
  }, [selectedPrayer]);

  const postPrayer = async () => {
    if (!newContent.trim() || !currentUser || !userProfile) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'prayers'), {
        authorId: currentUser.uid,
        authorName: userProfile.nickname || userProfile.displayName,
        authorPhoto: userProfile.photoURL,
        content: newContent.trim(),
        createdAt: serverTimestamp(),
        reactions: {},
        commentCount: 0,
        isDeleted: false,
      });
      setNewContent('');
      setShowForm(false);
      toast.success('Prayer request posted! 🙏');
    } catch (e) { toast.error('Failed to post'); }
    setPosting(false);
  };

  const react = async (prayer: PrayerRequest, emoji: string) => {
    if (!currentUser) return;
    const ref = doc(db, 'prayers', prayer.id);
    const existing = prayer.reactions?.[currentUser.uid];
    const newReactions = { ...prayer.reactions };
    if (existing === emoji) delete newReactions[currentUser.uid];
    else newReactions[currentUser.uid] = emoji;
    await updateDoc(ref, { reactions: newReactions });
    setShowReactions(null);
  };

  const deletePost = async (p: PrayerRequest) => {
    if (!window.confirm('Delete this prayer request?')) return;
    try {
      await updateDoc(doc(db, 'prayers', p.id), {
        isDeleted: true, deletedAt: serverTimestamp(), deletedBy: currentUser?.uid
      });
      await addDoc(collection(db, 'deletedRecords'), {
        type: 'post', originalData: p, deletedAt: serverTimestamp(),
        deletedBy: currentUser?.uid, deletedByName: userProfile?.nickname
      });
      toast.success('Post deleted');
      if (selectedPrayer?.id === p.id) setSelectedPrayer(null);
    } catch { toast.error('Failed to delete'); }
  };

  const saveEdit = async (id: string) => {
    await updateDoc(doc(db, 'prayers', id), { content: editContent.trim(), updatedAt: serverTimestamp() });
    setEditingId(null);
    toast.success('Updated!');
  };

  const postComment = async () => {
    if (!newComment.trim() || !selectedPrayer || !currentUser || !userProfile) return;
    await addDoc(collection(db, 'comments'), {
      postId: selectedPrayer.id,
      authorId: currentUser.uid,
      authorName: userProfile.nickname || userProfile.displayName,
      authorPhoto: userProfile.photoURL,
      content: newComment.trim(),
      createdAt: serverTimestamp(),
      isDeleted: false,
    });
    await updateDoc(doc(db, 'prayers', selectedPrayer.id), { commentCount: increment(1) });
    setNewComment('');
    toast.success('Comment added!');
  };

  const deleteComment = async (c: Comment) => {
    if (!window.confirm('Delete this comment?')) return;
    await updateDoc(doc(db, 'comments', c.id), { isDeleted: true, deletedAt: serverTimestamp(), deletedBy: currentUser?.uid });
    await updateDoc(doc(db, 'prayers', c.postId), { commentCount: increment(-1) });
    await addDoc(collection(db, 'deletedRecords'), { type: 'comment', originalData: c, deletedAt: serverTimestamp(), deletedBy: currentUser?.uid, deletedByName: userProfile?.nickname });
    toast.success('Comment deleted');
  };

  const getReactionSummary = (reactions: { [k: string]: string }) => {
    const counts: { [emoji: string]: number } = {};
    Object.values(reactions || {}).forEach(e => { counts[e] = (counts[e] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch { return ''; }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Post button */}
      {!filterUserId && (
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full flex items-center gap-3 bg-white dark:bg-gray-800 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-2xl p-4 text-indigo-500 dark:text-indigo-400 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all mb-6 font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          Share your prayer request...
        </button>
      )}

      {/* Post form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🙏</span> New Prayer Request
          </h3>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Share your prayer request with the community..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancel</button>
            <button onClick={postPrayer} disabled={posting || !newContent.trim()} className="px-6 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold disabled:opacity-50 transition-colors">
              {posting ? 'Posting...' : 'Post Prayer 🙏'}
            </button>
          </div>
        </div>
      )}

      {/* Prayer list */}
      <div className="space-y-4">
        {prayers.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <div className="text-5xl mb-4">🙏</div>
            <p className="font-medium">No prayer requests yet</p>
            <p className="text-sm mt-1">Be the first to share!</p>
          </div>
        )}
        {prayers.map(prayer => {
          const reactionSummary = getReactionSummary(prayer.reactions || {});
          const myReaction = prayer.reactions?.[currentUser?.uid || ''];
          const isOwner = prayer.authorId === currentUser?.uid;
          const canDelete = isOwner || isAdmin || hasPrivilege('delete_post');
          const reactionCount = Object.keys(prayer.reactions || {}).length;

          return (
            <div key={prayer.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between p-5 pb-3">
                <div className="flex items-center gap-3">
                  {prayer.authorPhoto ? (
                    <img src={prayer.authorPhoto} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-indigo-100 dark:border-indigo-800" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                      {prayer.authorName?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{prayer.authorName}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatTime(prayer.createdAt)}</p>
                  </div>
                </div>
                {(isOwner || canDelete) && (
                  <div className="flex items-center gap-1">
                    {isOwner && (
                      <button onClick={() => { setEditingId(prayer.id); setEditContent(prayer.content); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => deletePost(prayer)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="px-5 pb-4">
                {editingId === prayer.id ? (
                  <div>
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => saveEdit(prayer.id)} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-medium">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{prayer.content}</p>
                )}
                {prayer.updatedAt && <p className="text-xs text-gray-400 mt-1 italic">edited</p>}
              </div>

              {/* Reactions summary */}
              {reactionSummary.length > 0 && (
                <div className="px-5 pb-2 flex items-center gap-1 flex-wrap">
                  {reactionSummary.map(([emoji, count]) => (
                    <span key={emoji} className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                      {emoji} {count}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="px-5 py-3 border-t border-gray-50 dark:border-gray-700 flex items-center gap-2">
                {/* Reaction button */}
                <div className="relative">
                  <button
                    onClick={() => setShowReactions(showReactions === prayer.id ? null : prayer.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${myReaction ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <span>{myReaction || '🙏'}</span>
                    <span>{reactionCount > 0 ? reactionCount : 'React'}</span>
                  </button>
                  {showReactions === prayer.id && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-2 flex gap-1 z-20">
                      {REACTIONS.map(e => (
                        <button key={e} onClick={() => react(prayer, e)} className={`text-xl p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${myReaction === e ? 'bg-indigo-100 dark:bg-indigo-900/40' : ''}`}>{e}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comment button */}
                <button
                  onClick={() => setSelectedPrayer(selectedPrayer?.id === prayer.id ? null : prayer)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${selectedPrayer?.id === prayer.id ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  {prayer.commentCount > 0 ? prayer.commentCount : 'Comment'}
                </button>
              </div>

              {/* Comments section */}
              {selectedPrayer?.id === prayer.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {comments.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No comments yet. Be the first!</p>}
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3">
                        {c.authorPhoto ? (
                          <img src={c.authorPhoto} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{c.authorName?.[0]}</div>
                        )}
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-bold text-gray-800 dark:text-white">{c.authorName}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">{formatTime(c.createdAt)}</span>
                              {(c.authorId === currentUser?.uid || isAdmin || hasPrivilege('delete_comment')) && (
                                <button onClick={() => deleteComment(c)} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors">
                                  <XMarkIcon className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Comment input */}
                  <div className="flex gap-2">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{userProfile?.nickname?.[0]}</div>
                    )}
                    <div className="flex-1 flex gap-2">
                      <input
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
                        placeholder="Write a comment..."
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button onClick={postComment} disabled={!newComment.trim()} className="p-2 bg-indigo-600 text-white rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition-colors">
                        <PaperAirplaneIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PrayerFeed;
