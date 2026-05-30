import React, { useEffect, useState } from 'react';
import { UserProfile, PrayerRequest, BiblePassage } from '../../types';
import { XMarkIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  user: UserProfile;
  onClose: () => void;
}

const UserProfileModal: React.FC<Props> = ({ user, onClose }) => {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [bibles, setBibles] = useState<BiblePassage[]>([]);
  const [activeTab, setActiveTab] = useState<'prayers' | 'bible'>('prayers');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const pq = query(collection(db, 'prayers'), where('authorId', '==', user.uid), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'desc'));
      const bq = query(collection(db, 'biblePassages'), where('authorId', '==', user.uid), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'desc'));
      const [ps, bs] = await Promise.all([getDocs(pq), getDocs(bq)]);
      setPrayers(ps.docs.map(d => ({ id: d.id, ...d.data() } as PrayerRequest)));
      setBibles(bs.docs.map(d => ({ id: d.id, ...d.data() } as BiblePassage)));
      setLoading(false);
    };
    load();
  }, [user.uid]);

  const formatTime = (ts: any) => {
    if (!ts) return '';
    try { return formatDistanceToNow(ts.toDate ? ts.toDate() : new Date(ts), { addSuffix: true }); } catch { return ''; }
  };

  const getRoleBadge = () => {
    if (user.role === 'master_admin') return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">👑 Master Admin</span>;
    if (user.role === 'admin') return <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">🛡️ Admin</span>;
    return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Member</span>;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-16 h-16 rounded-2xl object-cover border-4 border-white/30" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">
                {user.nickname?.[0] || user.displayName?.[0]}
              </div>
            )}
            <div>
              <h2 className="text-xl font-black">{user.nickname || user.displayName}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {getRoleBadge()}
                {user.teams?.map(t => (
                  <span key={t} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
              <p className="text-white/70 text-xs mt-1">{prayers.length} prayers · {bibles.length} passages</p>
            </div>
          </div>
        </div>

        {/* Pinned item */}
        {user.pinnedItemId && (
          <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1">📌 Pinned</p>
            {user.pinnedItemType === 'prayer' && prayers.find(p => p.id === user.pinnedItemId) && (
              <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">🙏 {prayers.find(p => p.id === user.pinnedItemId)?.content}</p>
            )}
            {user.pinnedItemType === 'bible' && bibles.find(b => b.id === user.pinnedItemId) && (
              <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">📖 {bibles.find(b => b.id === user.pinnedItemId)?.reference}</p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button onClick={() => setActiveTab('prayers')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'prayers' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
            🙏 Prayers ({prayers.length})
          </button>
          <button onClick={() => setActiveTab('bible')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'bible' ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
            📖 Bible ({bibles.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}
          {!loading && activeTab === 'prayers' && (
            prayers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No prayers yet</div>
            ) : (
              prayers.map(p => (
                <div key={p.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  {user.pinnedItemId === p.id && <span className="text-xs text-amber-500 font-bold">📌 Pinned · </span>}
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{p.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">{formatTime(p.createdAt)}</span>
                    <span className="text-xs text-gray-400">💬 {p.commentCount || 0}</span>
                    <span className="text-xs text-gray-400">🙏 {Object.keys(p.reactions || {}).length}</span>
                  </div>
                </div>
              ))
            )
          )}
          {!loading && activeTab === 'bible' && (
            bibles.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No passages shared yet</div>
            ) : (
              bibles.map(b => (
                <div key={b.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  {user.pinnedItemId === b.id && <span className="text-xs text-amber-500 font-bold">📌 Pinned · </span>}
                  <p className="font-bold text-purple-600 dark:text-purple-400 text-sm">{b.reference}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-1 line-clamp-2">"{b.text}"</p>
                  {b.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{b.notes}</p>}
                  <span className="text-xs text-gray-400">{formatTime(b.createdAt)}</span>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
