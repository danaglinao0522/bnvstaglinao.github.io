import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { BellIcon, SunIcon, MoonIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
  notifications: any[];
  onProfileClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, notifications, onProfileClick }) => {
  const { userProfile, logout, isAdmin, isMasterAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useAppSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.isRead?.[userProfile?.uid || '']).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const tabs = [
    { id: 'prayers', label: '🙏 Prayers' },
    { id: 'bible', label: '📖 Bible' },
    { id: 'photos', label: '📸 Photos' },
    { id: 'users', label: '👥 Users' },
    ...(isAdmin ? [{ id: 'admin', label: '⚙️ Admin' }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{settings.appIcon}</span>
            <span className="font-black text-gray-900 dark:text-white text-sm md:text-base hidden sm:block">
              {settings.appName}
            </span>
          </div>

          {/* Tabs - Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === t.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            >
              {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors relative"
              >
                <BellIcon className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 text-sm">No notifications</p>
                    ) : (
                      notifications.slice(0, 10).map(n => (
                        <div key={n.id} className={`p-4 border-b border-gray-50 dark:border-gray-700 last:border-0 ${!n.isRead?.[userProfile?.uid || ''] ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{n.authorName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="" className="w-8 h-8 rounded-full border-2 border-indigo-500 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                    {userProfile?.nickname?.[0] || '?'}
                  </div>
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{userProfile?.nickname}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userProfile?.email}</p>
                    {(isMasterAdmin || userProfile?.role === 'admin') && (
                      <span className={`mt-1 inline-block text-xs font-bold px-2 py-0.5 rounded-full ${isMasterAdmin ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>
                        {isMasterAdmin ? '👑 Master Admin' : '🛡️ Admin'}
                      </span>
                    )}
                  </div>
                  <button onClick={() => { onProfileClick(); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <UserCircleIcon className="w-4 h-4" /> My Profile
                  </button>
                  <button onClick={() => { setActiveTab('prayers'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Cog6ToothIcon className="w-4 h-4" /> Settings
                  </button>
                  <button onClick={() => { logout(); toast.success('Signed out'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <ArrowRightOnRectangleIcon className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
