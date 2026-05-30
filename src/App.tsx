import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import PrayerFeed from './components/prayers/PrayerFeed';
import BibleFeed from './components/bible/BibleFeed';
import PhotosFeed from './components/photos/PhotosFeed';
import UsersList from './components/users/UsersList';
import AdminPanel from './components/admin/AdminPanel';
import MyProfile from './components/profile/MyProfile';
import ImportantMessageBanner from './components/ImportantMessageBanner';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from './firebase/config';

const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('prayers');
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'importantMessages'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🙏</div>
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/70 text-sm mt-4">Loading RCCM | Reminder...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <LoginPage />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <ImportantMessageBanner />
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onProfileClick={() => setShowProfile(true)}
      />

      <main className="pb-20">
        {activeTab === 'prayers' && <PrayerFeed />}
        {activeTab === 'bible' && <BibleFeed />}
        {activeTab === 'photos' && <PhotosFeed />}
        {activeTab === 'users' && <UsersList />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>

      {showProfile && <MyProfile onClose={() => setShowProfile(false)} />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppSettingsProvider>
      <AuthProvider>
        <ThemeWrapper />
      </AuthProvider>
    </AppSettingsProvider>
  );
};

const ThemeWrapper: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'dark:bg-gray-800 dark:text-white',
          style: { borderRadius: '12px', fontWeight: 600, fontSize: '14px' },
          duration: 3000,
        }}
      />
    </ThemeProvider>
  );
};

export default App;
