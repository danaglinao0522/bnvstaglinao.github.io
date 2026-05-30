import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: Replace these with your own Firebase project credentials
// Go to https://console.firebase.google.com/ to create a project
const firebaseConfig = {
  apiKey: "AIzaSyDvvtWDPYUSHPy9F8NZSInrGXDTurbs1Wc",
  authDomain: "rccm-reminder-9e99d.firebaseapp.com",
  projectId: "rccm-reminder-9e99d",
  storageBucket: "rccm-reminder-9e99d.firebasestorage.app",
  messagingSenderId: "734457158810",
  appId: "1:734457158810:web:5b36f822df32f9c7751323"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const MASTER_ADMIN_EMAIL = 'buenavistaaglinaodanny@gmail.com';
