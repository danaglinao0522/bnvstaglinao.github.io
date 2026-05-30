import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { ImportantMessage } from '../types';
import { XMarkIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const ImportantMessageBanner: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState<ImportantMessage[]>([]);
  const [current, setCurrent] = useState<ImportantMessage | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'importantMessages'), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ImportantMessage));
      setMessages(msgs);
      const unread = msgs.find(m => !m.isRead?.[currentUser?.uid || '']);
      setCurrent(unread || null);
    });
    return unsub;
  }, [currentUser]);

  const dismiss = async () => {
    if (!current || !currentUser) return;
    const ref = doc(db, 'importantMessages', current.id);
    await updateDoc(ref, { [`isRead.${currentUser.uid}`]: true });
    const next = messages.find(m => m.id !== current.id && !m.isRead?.[currentUser.uid]);
    setCurrent(next || null);
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    try { return formatDistanceToNow(ts.toDate ? ts.toDate() : new Date(ts), { addSuffix: true }); } catch { return ''; }
  };

  if (!current) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 relative shadow-md">
      <div className="max-w-6xl mx-auto flex items-start gap-3 pr-8">
        <SpeakerWaveIcon className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="flex-1 min-w-0">
          <span className="font-bold text-sm">{current.authorName}: </span>
          <span className="text-sm text-white/90">{current.content}</span>
          <span className="text-xs text-white/60 ml-2">{formatTime(current.createdAt)}</span>
        </div>
      </div>
      <button onClick={dismiss} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-lg transition-colors">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ImportantMessageBanner;
