import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { UserProfile } from '../../types';
import UserProfileModal from './UserProfileModal';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const UsersList: React.FC = () => {
  const { userProfile: currentUserProfile, isAdmin, isMasterAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => d.data() as UserProfile));
    });
    return unsub;
  }, []);

  const filtered = users.filter(u =>
    u.nickname?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (u: UserProfile) => {
    if (u.role === 'master_admin') return <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full font-bold">👑 Master Admin</span>;
    if (u.role === 'admin') return <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">🛡️ Admin</span>;
    return null;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">👥</div>
            <p>No users found</p>
          </div>
        )}
        {filtered.map(u => (
          <button
            key={u.uid}
            onClick={() => setSelectedUser(u)}
            className="w-full flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all text-left"
          >
            <div className="relative">
              {u.photoURL ? (
                <img src={u.photoURL} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100 dark:border-indigo-800" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                  {u.nickname?.[0] || u.displayName?.[0] || '?'}
                </div>
              )}
              {u.uid === currentUserProfile?.uid && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-gray-900 dark:text-white truncate">{u.nickname || u.displayName}</p>
                {getRoleBadge(u)}
              </div>
              {u.teams && u.teams.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {u.teams.map(t => (
                    <span key={t} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        ))}
      </div>

      {selectedUser && (
        <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
};

export default UsersList;
