import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { PrayerRequest, BiblePassage } from '../../types';
import toast from 'react-hot-toast';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const MyProfile: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, userProfile, refreshProfile, isMasterAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(userProfile?.nickname || '');
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [bibles, setBibles] = useState<BiblePassage[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'prayers' | 'bible'>('prayers');

  useEffect(() => {
    if (!currentUser) return;
    const loadPrayers = async () => {
      const q = query(collection(db, 'prayers'), where('authorId', '==', currentUser.uid), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setPrayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as PrayerRequest)));
    };
    const loadBible = async () => {
      const q = query(collection(db, 'biblePassages'), where('authorId', '==', currentUser.uid), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setBibles(snap.docs.map(d => ({ id: d.id, ...d.data() } as BiblePassage)));
    };
    loadPrayers();
    loadBible();
  }, [currentUser]);

  const saveNickname = async () => {
    if (!nickname.trim() || !currentUser) return;
    setSaving(true);
    await updateDoc(doc(db, 'users', currentUser.uid), { nickname: nickname.trim() });
    await refreshProfile();
    setEditing(false);
    setSaving(false);
    toast.success('Nickname updated!');
  };

  const pinItem = async (id: string, type: 'prayer' | 'bible') => {
    if (!currentUser || !userProfile) return;
    const isPinned = userProfile.pinnedItemId === id;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      pinnedItemId: isPinned ? null : id,
      pinnedItemType: isPinned ? null : type,
    });
    await refreshProfile();
    toast.success(isPinned ? 'Unpinned' : 'Pinned! 📌');
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    try { return formatDistanceToNow(ts.toDate ? ts.toDate() : new Date(ts), { addSuffix: true }); } catch { return ''; }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="" className="w-16 h-16 rounded-2xl object-cover border-4 border-white/30" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">
                {userProfile?.nickname?.[0] || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 border border-white/30"
                    placeholder="Your nickname"
                  />
                  <button onClick={saveNickname} disabled={saving} className="p-1.5 bg-green-400 hover:bg-green-500 rounded-lg transition-colors"><CheckIcon className="w-4 h-4" /></button>
                  <button onClick={() => setEditing(false)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"><XMarkIcon className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black truncate">{userProfile?.nickname || userProfile?.displayName}</h2>
                  <button onClick={() => { setEditing(true); setNickname(userProfile?.nickname || ''); }} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><PencilIcon className="w-4 h-4" /></button>
                </div>
              )}
              <p className="text-white/70 text-sm mt-0.5">{userProfile?.email}</p>
              {isMasterAdmin && <span className="text-xs bg-yellow-400/30 text-yellow-100 px-2 py-0.5 rounded-full mt-1 inline-block">👑 Master Admin</span>}
              {!isMasterAdmin && userProfile?.role === 'admin' && <span className="text-xs bg-purple-400/30 text-purple-100 px-2 py-0.5 rounded-full mt-1 inline-block">🛡️ Admin</span>}
            </div>
          </div>

          {/* Teams */}
          {userProfile?.teams && userProfile.teams.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {userProfile.teams.map(t => (
                <span key={t} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-700">
          <div className="bg-white dark:bg-gray-800 py-3 text-center">
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{prayers.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Prayer Requests</p>
          </div>
          <div className="bg-white dark:bg-gray-800 py-3 text-center">
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{bibles.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Bible Passages</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button onClick={() => setActiveTab('prayers')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'prayers' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
            🙏 Prayers
          </button>
          <button onClick={() => setActiveTab('bible')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'bible' ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
            📖 Bible
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'prayers' && (
            prayers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No prayers yet</div>
            ) : (
              prayers.map(p => (
                <div key={p.id} className={`rounded-xl p-4 border-2 transition-all ${userProfile?.pinnedItemId === p.id ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'}`}>
                  {userProfile?.pinnedItemId === p.id && <p className="text-xs text-amber-500 font-bold mb-1">📌 Pinned</p>}
                  <p className="text-sm text-gray-700 dark:text-gray-200">{p.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{formatTime(p.createdAt)}</span>
                    <button
                      onClick={() => pinItem(p.id, 'prayer')}
                      className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${userProfile?.pinnedItemId === p.id ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/40' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                      📌 {userProfile?.pinnedItemId === p.id ? 'Unpin' : 'Pin'}
                    </button>
                  </div>
                </div>
              ))
            )
          )}
          {activeTab === 'bible' && (
            bibles.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No passages yet</div>
            ) : (
              bibles.map(b => (
                <div key={b.id} className={`rounded-xl p-4 border-2 transition-all ${userProfile?.pinnedItemId === b.id ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'}`}>
                  {userProfile?.pinnedItemId === b.id && <p className="text-xs text-amber-500 font-bold mb-1">📌 Pinned</p>}
                  <p className="font-bold text-purple-600 dark:text-purple-400 text-sm">{b.reference}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-1 line-clamp-2">"{b.text}"</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{formatTime(b.createdAt)}</span>
                    <button
                      onClick={() => pinItem(b.id, 'bible')}
                      className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${userProfile?.pinnedItemId === b.id ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/40' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                      📌 {userProfile?.pinnedItemId === b.id ? 'Unpin' : 'Pin'}
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
