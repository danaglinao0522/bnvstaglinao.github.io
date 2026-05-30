import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Photo } from '../../types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon, PhotoIcon } from '@heroicons/react/24/outline';

// Convert image to base64 for storage in Firestore (no Firebase Storage needed)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

const compressImage = async (file: File, maxSizeKB = 200): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = (height * maxDim) / width; width = maxDim; }
          else { width = (width * maxDim) / height; height = maxDim; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > maxSizeKB * 1024 && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

const PhotosFeed: React.FC<{ filterUserId?: string }> = ({ filterUserId }) => {
  const { currentUser, userProfile, isAdmin, hasPrivilege } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let q;
    if (filterUserId) {
      q = query(collection(db, 'photos'), where('authorId', '==', filterUserId), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'desc'));
    } else if (isAdmin || hasPrivilege('approve_photos')) {
      q = query(collection(db, 'photos'), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'photos'), where('approved', '==', true), where('isDeleted', '!=', true), orderBy('isDeleted'), orderBy('createdAt', 'desc'));
    }
    const unsub = onSnapshot(q, snap => setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Photo))));
    return unsub;
  }, [filterUserId, isAdmin]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const submitPhoto = async () => {
    if (!selectedFile || !currentUser || !userProfile) return;
    setUploading(true);
    try {
      const imageUrl = await compressImage(selectedFile, 200);
      await addDoc(collection(db, 'photos'), {
        authorId: currentUser.uid,
        authorName: userProfile.nickname || userProfile.displayName,
        authorPhoto: userProfile.photoURL,
        imageUrl,
        caption: caption.trim(),
        createdAt: serverTimestamp(),
        approved: isAdmin,
        isDeleted: false,
      });
      setCaption('');
      setPreviewUrl('');
      setSelectedFile(null);
      setShowForm(false);
      toast.success(isAdmin ? 'Photo posted!' : 'Photo submitted for approval! 🎉');
    } catch (e) { toast.error('Failed to upload'); }
    setUploading(false);
  };

  const approvePhoto = async (photo: Photo) => {
    await updateDoc(doc(db, 'photos', photo.id), { approved: true, approvedBy: currentUser?.uid, approvedAt: serverTimestamp() });
    toast.success('Photo approved! ✅');
  };

  const deletePhoto = async (photo: Photo) => {
    if (!window.confirm('Delete this photo?')) return;
    await updateDoc(doc(db, 'photos', photo.id), { isDeleted: true, deletedAt: serverTimestamp(), deletedBy: currentUser?.uid });
    await addDoc(collection(db, 'deletedRecords'), { type: 'photo', originalData: { ...photo, imageUrl: '[compressed_base64]' }, deletedAt: serverTimestamp(), deletedBy: currentUser?.uid, deletedByName: userProfile?.nickname });
    toast.success('Photo deleted');
    if (lightbox?.id === photo.id) setLightbox(null);
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    try { return formatDistanceToNow(ts.toDate ? ts.toDate() : new Date(ts), { addSuffix: true }); } catch { return ''; }
  };

  const pendingPhotos = photos.filter(p => !p.approved);
  const approvedPhotos = photos.filter(p => p.approved);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Upload button */}
      <button onClick={() => setShowForm(!showForm)} className="w-full flex items-center gap-3 bg-white dark:bg-gray-800 border-2 border-dashed border-cyan-300 dark:border-cyan-700 rounded-2xl p-4 text-cyan-500 dark:text-cyan-400 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all mb-6 font-medium">
        <PlusIcon className="w-5 h-5" />
        Share a photo...
      </button>

      {/* Upload form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">📸 Share a Photo</h3>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center cursor-pointer hover:border-cyan-400 transition-colors mb-4"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="" className="max-h-48 mx-auto rounded-xl object-cover" />
            ) : (
              <div className="text-gray-400">
                <PhotoIcon className="w-12 h-12 mx-auto mb-2" />
                <p className="font-medium">Click to select photo</p>
                <p className="text-sm mt-1">Max 5MB</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4" />
          {!isAdmin && <p className="text-xs text-amber-500 mb-3 flex items-center gap-1">⚠️ Photos require admin approval before being visible to others.</p>}
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowForm(false); setPreviewUrl(''); setSelectedFile(null); setCaption(''); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
            <button onClick={submitPhoto} disabled={uploading || !selectedFile} className="px-6 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Submit Photo'}
            </button>
          </div>
        </div>
      )}

      {/* Pending approval (admin only) */}
      {(isAdmin || hasPrivilege('approve_photos')) && pendingPhotos.length > 0 && (
        <div className="mb-8">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Pending Approval ({pendingPhotos.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {pendingPhotos.map(photo => (
              <div key={photo.id} className="relative group rounded-2xl overflow-hidden border-2 border-amber-300 dark:border-amber-600">
                <img src={photo.imageUrl} alt="" className="w-full h-40 object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => approvePhoto(photo)} className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"><CheckCircleIcon className="w-5 h-5" /></button>
                  <button onClick={() => deletePhoto(photo)} className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"><XCircleIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{photo.authorName}</p>
                  {photo.caption && <p className="text-xs text-amber-600 dark:text-amber-400 truncate">{photo.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {approvedPhotos.length === 0 && pendingPhotos.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">📸</div>
            <p className="font-medium">No photos yet</p>
          </div>
        )}
        {approvedPhotos.map(photo => (
          <div key={photo.id} className="relative group rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-shadow" onClick={() => setLightbox(photo)}>
            <img src={photo.imageUrl} alt="" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white text-xs font-medium">{photo.authorName}</p>
                {photo.caption && <p className="text-white/80 text-xs truncate">{photo.caption}</p>}
                <p className="text-white/60 text-xs">{formatTime(photo.createdAt)}</p>
              </div>
              {(photo.authorId === currentUser?.uid || isAdmin || hasPrivilege('approve_photos')) && (
                <button onClick={e => { e.stopPropagation(); deletePhoto(photo); }} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"><TrashIcon className="w-3.5 h-3.5" /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.imageUrl} alt="" className="w-full max-h-[70vh] object-contain rounded-2xl" />
            <div className="mt-4 text-center">
              <p className="text-white font-medium">{lightbox.authorName}</p>
              {lightbox.caption && <p className="text-white/70 text-sm mt-1">{lightbox.caption}</p>}
              <p className="text-white/50 text-xs mt-1">{formatTime(lightbox.createdAt)}</p>
            </div>
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl">✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotosFeed;
