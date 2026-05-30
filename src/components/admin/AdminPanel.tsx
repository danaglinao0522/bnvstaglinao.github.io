import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import { db } from '../../firebase/config';
import {
  collection, query, onSnapshot, doc, updateDoc, orderBy, getDocs, where, addDoc, serverTimestamp
} from 'firebase/firestore';
import { UserProfile, DeletedRecord, Privilege } from '../../types';
import toast from 'react-hot-toast';

const PRIVILEGES: { key: Privilege; label: string }[] = [
  { key: 'delete_post', label: 'Delete Post' },
  { key: 'delete_comment', label: 'Delete Comment' },
  { key: 'approve_photos', label: 'Approve Posted Photos' },
];

const AdminPanel: React.FC = () => {
  const { userProfile: me, isMasterAdmin } = useAuth();
  const { settings, updateSettings } = useAppSettings();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'deleted' | 'settings' | 'appearance'>('users');
  const [appForm, setAppForm] = useState({ appName: settings.appName, appIcon: settings.appIcon });
  const [colorForm, setColorForm] = useState({
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    accentColor: settings.accentColor,
  });
  const [newTeam, setNewTeam] = useState('');
  const [savingApp, setSavingApp] = useState(false);
  const [importantMsg, setImportantMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    setAppForm({ appName: settings.appName, appIcon: settings.appIcon });
    setColorForm({ primaryColor: settings.primaryColor, secondaryColor: settings.secondaryColor, accentColor: settings.accentColor });
  }, [settings]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => setUsers(snap.docs.map(d => d.data() as UserProfile)));
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'deletedRecords'), orderBy('deletedAt', 'desc'));
    const unsub = onSnapshot(q, snap => setDeletedRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as DeletedRecord))));
    return unsub;
  }, []);

  const deleteAccount = async (u: UserProfile) => {
    if (!isMasterAdmin && u.role !== 'member') { toast.error('Cannot delete this account'); return; }
    if (u.uid === me?.uid) { toast.error("You can't delete your own account"); return; }
    if (!window.confirm(`Delete ${u.nickname}'s account?`)) return;
    await updateDoc(doc(db, 'users', u.uid), { isDeleted: true, deletedAt: serverTimestamp() });
    await addDoc(collection(db, 'deletedRecords'), { type: 'account', originalData: u, deletedAt: serverTimestamp(), deletedBy: me?.uid, deletedByName: me?.nickname });
    toast.success('Account deleted');
  };

  const toggleAdmin = async (u: UserProfile) => {
    if (!isMasterAdmin) return;
    if (u.role === 'master_admin') { toast.error("Cannot change master admin role"); return; }
    const newRole = u.role === 'admin' ? 'member' : 'admin';
    await updateDoc(doc(db, 'users', u.uid), { role: newRole });
    toast.success(`${u.nickname} is now ${newRole}`);
  };

  const togglePrivilege = async (u: UserProfile, priv: Privilege) => {
    const current = u.privileges || [];
    const newPrivs = current.includes(priv) ? current.filter(p => p !== priv) : [...current, priv];
    await updateDoc(doc(db, 'users', u.uid), { privileges: newPrivs });
    toast.success('Privileges updated!');
  };

  const assignTeam = async (u: UserProfile, team: string) => {
    const current = u.teams || [];
    const newTeams = current.includes(team) ? current.filter(t => t !== team) : [...current, team];
    await updateDoc(doc(db, 'users', u.uid), { teams: newTeams });
  };

  const addTeam = async () => {
    if (!newTeam.trim()) return;
    const teams = [...(settings.teams || []), newTeam.trim()];
    await updateSettings({ teams });
    setNewTeam('');
    toast.success('Team created!');
  };

  const removeTeam = async (team: string) => {
    const teams = (settings.teams || []).filter(t => t !== team);
    await updateSettings({ teams });
  };

  const saveAppSettings = async () => {
    setSavingApp(true);
    await updateSettings(appForm);
    setSavingApp(false);
    toast.success('App settings saved!');
  };

  const saveColors = async () => {
    setSavingApp(true);
    await updateSettings(colorForm);
    setSavingApp(false);
    toast.success('Colors saved!');
  };

  const sendImportantMessage = async () => {
    if (!importantMsg.trim() || !me) return;
    setSendingMsg(true);
    await addDoc(collection(db, 'importantMessages'), {
      authorId: me.uid,
      authorName: me.nickname || me.displayName,
      authorPhoto: me.photoURL,
      content: importantMsg.trim(),
      createdAt: serverTimestamp(),
      isRead: {},
    });
    setImportantMsg('');
    toast.success('Important message sent to everyone! 📢');
    setSendingMsg(false);
  };

  const activeUsers = users.filter(u => !u.isDeleted);
  const deletedUsers = users.filter(u => u.isDeleted);

  const tabs = [
    { id: 'users', label: '👥 Users' },
    { id: 'deleted', label: '🗑️ Deleted' },
    { id: 'settings', label: '⚙️ Settings' },
    { id: 'appearance', label: '🎨 Appearance' },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <h2 className="text-2xl font-black">Admin Panel</h2>
          <p className="text-white/70 text-sm mt-1">{isMasterAdmin ? '👑 Master Admin Access' : '🛡️ Admin Access'}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === t.id ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Important message */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4">
                <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">📢 Send Important Message</h3>
                <textarea
                  value={importantMsg}
                  onChange={e => setImportantMsg(e.target.value)}
                  placeholder="Type an important message to notify everyone..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button onClick={sendImportantMessage} disabled={sendingMsg || !importantMsg.trim()} className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                  {sendingMsg ? 'Sending...' : 'Send to Everyone 📢'}
                </button>
              </div>

              {/* User list */}
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Active Users ({activeUsers.length})</h3>
                <div className="space-y-3">
                  {activeUsers.map(u => (
                    <div key={u.uid} className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        {u.photoURL ? <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-full bg-indigo-400 flex items-center justify-center text-white font-bold flex-shrink-0">{u.nickname?.[0]}</div>}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 dark:text-white text-sm">{u.nickname || u.displayName}</p>
                            {u.role === 'master_admin' && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded-full font-bold">👑 Master</span>}
                            {u.role === 'admin' && <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-bold">🛡️ Admin</span>}
                            {u.uid === me?.uid && <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">You</span>}
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{u.email}</p>

                          {/* Teams */}
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Teams:</p>
                            <div className="flex flex-wrap gap-1">
                              {(settings.teams || []).map(team => (
                                <button
                                  key={team}
                                  onClick={() => assignTeam(u, team)}
                                  disabled={u.uid === me?.uid || u.role === 'master_admin'}
                                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${u.teams?.includes(team) ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  {team}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Privileges (not for master admin or admin) */}
                          {u.role === 'member' && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Privileges:</p>
                              <div className="flex flex-wrap gap-1">
                                {PRIVILEGES.map(priv => (
                                  <button
                                    key={priv.key}
                                    onClick={() => togglePrivilege(u, priv.key)}
                                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${u.privileges?.includes(priv.key) ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30'}`}
                                  >
                                    {priv.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1">
                          {isMasterAdmin && u.uid !== me?.uid && u.role !== 'master_admin' && (
                            <button onClick={() => toggleAdmin(u)} className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${u.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/30'}`}>
                              {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                            </button>
                          )}
                          {u.uid !== me?.uid && u.role !== 'master_admin' && (isMasterAdmin || u.role === 'member') && (
                            <button onClick={() => deleteAccount(u)} className="text-xs px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 font-medium transition-colors">
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DELETED TAB */}
          {activeTab === 'deleted' && (
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Deleted Records ({deletedRecords.length})</h3>
              {deletedRecords.length === 0 && <p className="text-gray-400 text-center py-8">No deleted records</p>}
              <div className="space-y-3">
                {deletedRecords.map(r => (
                  <div key={r.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        r.type === 'account' ? 'bg-red-100 text-red-700' :
                        r.type === 'post' ? 'bg-orange-100 text-orange-700' :
                        r.type === 'comment' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{r.type.toUpperCase()}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Deleted by {r.deletedByName}</span>
                    </div>
                    {r.type === 'account' && <p className="text-sm text-gray-700 dark:text-gray-200">{r.originalData?.nickname || r.originalData?.displayName} ({r.originalData?.email})</p>}
                    {r.type === 'post' && <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">{r.originalData?.content || r.originalData?.reference}</p>}
                    {r.type === 'comment' && <p className="text-sm text-gray-700 dark:text-gray-200">{r.originalData?.content}</p>}
                    {r.type === 'photo' && <p className="text-sm text-gray-700 dark:text-gray-200">{r.originalData?.caption || 'Photo'} by {r.originalData?.authorName}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && isMasterAdmin && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">App Identity</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">App Icon (Emoji)</label>
                    <input value={appForm.appIcon} onChange={e => setAppForm({ ...appForm, appIcon: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">App Name</label>
                    <input value={appForm.appName} onChange={e => setAppForm({ ...appForm, appName: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <button onClick={saveAppSettings} disabled={savingApp} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                    Save App Settings
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Manage Teams</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(settings.teams || []).map(team => (
                    <div key={team} className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1 rounded-full">
                      <span className="text-sm text-indigo-700 dark:text-indigo-300">{team}</span>
                      <button onClick={() => removeTeam(team)} className="text-indigo-400 hover:text-red-500 ml-1 text-xs font-bold">✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newTeam} onChange={e => setNewTeam(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTeam()} placeholder="New team name..." className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button onClick={addTeam} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">Add</button>
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && isMasterAdmin && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">UI Colors</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'primaryColor', label: 'Primary Color' },
                  { key: 'secondaryColor', label: 'Secondary Color' },
                  { key: 'accentColor', label: 'Accent Color' },
                ].map(c => (
                  <div key={c.key}>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{c.label}</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={(colorForm as any)[c.key]}
                        onChange={e => setColorForm({ ...colorForm, [c.key]: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer"
                      />
                      <input
                        value={(colorForm as any)[c.key]}
                        onChange={e => setColorForm({ ...colorForm, [c.key]: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="rounded-2xl p-4 mt-4" style={{ background: `linear-gradient(135deg, ${colorForm.primaryColor}, ${colorForm.secondaryColor})` }}>
                <p className="text-white font-bold text-sm mb-2">Preview</p>
                <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white border-2 border-white/40 hover:bg-white/20 transition-colors mr-2" style={{ background: colorForm.accentColor }}>
                  Accent Button
                </button>
                <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white border-2 border-white/40 hover:bg-white/20 transition-colors">
                  Primary Button
                </button>
              </div>

              <button onClick={saveColors} disabled={savingApp} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                Save Colors
              </button>
              <p className="text-xs text-gray-400 mt-2">Note: Color changes will apply on next page reload for some elements.</p>
            </div>
          )}

          {!isMasterAdmin && (activeTab === 'settings' || activeTab === 'appearance') && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🔒</div>
              <p className="font-medium">Master Admin only</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
