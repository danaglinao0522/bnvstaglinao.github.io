import React, { useEffect, useState } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, increment, where
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { BiblePassage, Comment } from '../../types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { PlusIcon, ChatBubbleLeftIcon, PencilIcon, TrashIcon, XMarkIcon, PaperAirplaneIcon, BookOpenIcon } from '@heroicons/react/24/outline';

const REACTIONS = ['🙏', '❤️', '🔥', '😢', '💪', '✨'];

const BibleFeed: React.FC<{ filterUserId?: string }> = ({ filterUserId }) => {
  const { currentUser, userProfile, isAdmin, hasPrivilege } = useAuth();
  const [passages, setPassages] = useState<BiblePassage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reference: '', text: '', notes: '' });
  const [posting, setPosting] = useState(false);
  const [selectedPassage, setSelectedPassage] = useState<BiblePassage | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ reference: '', text: '', notes: '' });
  const [showReactions, setShowReactions] = useState<string | null>(null);

  useEffect(() => {
    let q = filterUserId
      ? query(collection(db, 'biblePassages'), where('authorId', '==', filterUserId), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'biblePassages'), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setPassages(snap.docs.map(d => ({ id: d.id, ...d.data() } as BiblePassage)));
    });
    return unsub;
  }, [filterUserId]);

  useEffect(() => {
    if (!selectedPassage) { setComments([]); return; }
    const q = query(collection(db, 'bibleComments'), where('postId', '==', selectedPassage.id), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment))));
    return unsub;
  }, [selectedPassage]);

  const postPassage = async () => {
    if (!form.reference.trim() || !form.text.trim() || !currentUser || !userProfile) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'biblePassages'), {
        authorId: currentUser.uid,
        authorName: userProfile.nickname || userProfile.displayName,
        authorPhoto: userProfile.photoURL,
        reference: form.reference.trim(),
        text: form.text.trim(),
        notes: form.notes.trim(),
        createdAt: serverTimestamp(),
        reactions: {},
        commentCount: 0,
        isDeleted: false,
      });
      setForm({ reference: '', text: '', notes: '' });
      setShowForm(false);
      toast.success('Bible passage shared! 📖');
    } catch { toast.error('Failed to post'); }
    setPosting(false);
  };

  const react = async (passage: BiblePassage, emoji: string) => {
    if (!currentUser) return;
    const ref = doc(db, 'biblePassages', passage.id);
    const existing = passage.reactions?.[currentUser.uid];
    const newReactions = { ...passage.reactions };
    if (existing === emoji) delete newReactions[currentUser.uid];
    else newReactions[currentUser.uid] = emoji;
    await updateDoc(ref, { reactions: newReactions });
    setShowReactions(null);
  };

  const deletePassage = async (p: BiblePassage) => {
    if (!window.confirm('Delete this passage?')) return;
    await updateDoc(doc(db, 'biblePassages', p.id), { isDeleted: true, deletedAt: serverTimestamp(), deletedBy: currentUser?.uid });
    await addDoc(collection(db, 'deletedRecords'), { type: 'post', originalData: p, deletedAt: serverTimestamp(), deletedBy: currentUser?.uid, deletedByName: userProfile?.nickname });
    toast.success('Passage deleted');
    if (selectedPassage?.id === p.id) setSelectedPassage(null);
  };

  const saveEdit = async (id: string) => {
    await updateDoc(doc(db, 'biblePassages', id), { ...editForm, updatedAt: serverTimestamp() });
    setEditingId(null);
    toast.success('Updated!');
  };

  const postComment = async () => {
    if (!newComment.trim() || !selectedPassage || !currentUser || !userProfile) return;
    await addDoc(collection(db, 'bibleComments'), {
      postId: selectedPassage.id,
      authorId: currentUser.uid,
      authorName: userProfile.nickname || userProfile.displayName,
      authorPhoto: userProfile.photoURL,
      content: newComment.trim(),
      createdAt: serverTimestamp(),
      isDeleted: false,
    });
    await updateDoc(doc(db, 'biblePassages', selectedPassage.id), { commentCount: increment(1) });
    setNewComment('');
  };

  const deleteComment = async (c: Comment) => {
    await updateDoc(doc(db, 'bibleComments', c.id), { isDeleted: true, deletedAt: serverTimestamp() });
    await updateDoc(doc(db, 'biblePassages', c.postId), { commentCount: increment(-1) });
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    try { return formatDistanceToNow(ts.toDate ? ts.toDate() : new Date(ts), { addSuffix: true }); } catch { return ''; }
  };

  const getReactionSummary = (reactions: { [k: string]: string }) => {
    const counts: { [e: string]: number } = {};
    Object.values(reactions || {}).forEach(e => { counts[e] = (counts[e] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {!filterUserId && (
        <button onClick={() => setShowForm(!showForm)} className="w-full flex items-center gap-3 bg-white dark:bg-gray-800 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-2xl p-4 text-purple-500 dark:text-purple-400 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all mb-6 font-medium">
          <BookOpenIcon className="w-5 h-5" />
          Share a Bible passage...
        </button>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">📖 Share Bible Passage</h3>
          <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Reference (e.g. John 3:16)" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3" />
          <textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="Paste the scripture text here..." rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-3" />
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Your notes / reflection..." rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
            <button onClick={postPassage} disabled={posting || !form.reference.trim() || !form.text.trim()} className="px-6 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold disabled:opacity-50">
              {posting ? 'Sharing...' : 'Share 📖'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {passages.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <div className="text-5xl mb-4">📖</div>
            <p className="font-medium">No passages shared yet</p>
          </div>
        )}
        {passages.map(passage => {
          const reactionSummary = getReactionSummary(passage.reactions || {});
          const myReaction = passage.reactions?.[currentUser?.uid || ''];
          const isOwner = passage.authorId === currentUser?.uid;
          const canDelete = isOwner || isAdmin || hasPrivilege('delete_post');
          const reactionCount = Object.keys(passage.reactions || {}).length;

          return (
            <div key={passage.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between p-5 pb-3">
                <div className="flex items-center gap-3">
                  {passage.authorPhoto ? <img src={passage.authorPhoto} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-purple-100 dark:border-purple-800" /> : <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">{passage.authorName?.[0]}</div>}
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{passage.authorName}</p>
                    <p className="text-xs text-gray-400">{formatTime(passage.createdAt)}</p>
                  </div>
                </div>
                {(isOwner || canDelete) && (
                  <div className="flex gap-1">
                    {isOwner && <button onClick={() => { setEditingId(passage.id); setEditForm({ reference: passage.reference, text: passage.text, notes: passage.notes }); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><PencilIcon className="w-4 h-4" /></button>}
                    {canDelete && <button onClick={() => deletePassage(passage)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>}
                  </div>
                )}
              </div>

              <div className="px-5 pb-4">
                {editingId === passage.id ? (
                  <div className="space-y-2">
                    <input value={editForm.reference} onChange={e => setEditForm({ ...editForm, reference: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <textarea value={editForm.text} onChange={e => setEditForm({ ...editForm, text: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(passage.id)} className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg font-medium">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-r-xl p-4 mb-3">
                      <p className="font-bold text-purple-700 dark:text-purple-300 text-sm mb-2">{passage.reference}</p>
                      <p className="text-gray-700 dark:text-gray-200 text-sm italic leading-relaxed">"{passage.text}"</p>
                    </div>
                    {passage.notes && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-gray-700 dark:text-gray-200 text-sm">{passage.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {reactionSummary.length > 0 && (
                <div className="px-5 pb-2 flex gap-1 flex-wrap">
                  {reactionSummary.map(([emoji, count]) => (
                    <span key={emoji} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">{emoji} {count}</span>
                  ))}
                </div>
              )}

              <div className="px-5 py-3 border-t border-gray-50 dark:border-gray-700 flex gap-2">
                <div className="relative">
                  <button onClick={() => setShowReactions(showReactions === passage.id ? null : passage.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${myReaction ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                    <span>{myReaction || '🙏'}</span>
                    <span>{reactionCount > 0 ? reactionCount : 'React'}</span>
                  </button>
                  {showReactions === passage.id && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-2 flex gap-1 z-20">
                      {REACTIONS.map(e => <button key={e} onClick={() => react(passage, e)} className={`text-xl p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 ${myReaction === e ? 'bg-purple-100 dark:bg-purple-900/40' : ''}`}>{e}</button>)}
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedPassage(selectedPassage?.id === passage.id ? null : passage)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${selectedPassage?.id === passage.id ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  {passage.commentCount > 0 ? passage.commentCount : 'Comment'}
                </button>
              </div>

              {selectedPassage?.id === passage.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {comments.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No comments yet.</p>}
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3">
                        {c.authorPhoto ? <img src={c.authorPhoto} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" /> : <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{c.authorName?.[0]}</div>}
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-bold text-gray-800 dark:text-white">{c.authorName}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">{formatTime(c.createdAt)}</span>
                              {(c.authorId === currentUser?.uid || isAdmin || hasPrivilege('delete_comment')) && <button onClick={() => deleteComment(c)} className="p-0.5 text-gray-400 hover:text-red-500"><XMarkIcon className="w-3.5 h-3.5" /></button>}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {userProfile?.photoURL ? <img src={userProfile.photoURL} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" /> : <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{userProfile?.nickname?.[0]}</div>}
                    <div className="flex-1 flex gap-2">
                      <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && postComment()} placeholder="Write a comment..." className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                      <button onClick={postComment} disabled={!newComment.trim()} className="p-2 bg-purple-600 text-white rounded-xl disabled:opacity-50 hover:bg-purple-700"><PaperAirplaneIcon className="w-4 h-4" /></button>
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

export default BibleFeed;
