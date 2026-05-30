import React from 'react';

const FirebaseSetupGuide: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 to-orange-900 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔥</div>
          <h1 className="text-2xl font-black text-gray-900">Firebase Setup Required</h1>
          <p className="text-gray-500 text-sm mt-2">Please configure your Firebase project to use this app</p>
        </div>
        
        <div className="space-y-4 text-sm">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="font-bold text-orange-800 mb-2">📋 Steps to set up:</p>
            <ol className="space-y-2 text-orange-700 list-decimal list-inside">
              <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">console.firebase.google.com</a></li>
              <li>Create a new project</li>
              <li>Enable Authentication → Google Sign-In</li>
              <li>Create Firestore Database</li>
              <li>Register a Web App and copy the config</li>
              <li>Paste config into <code className="bg-orange-100 px-1 rounded">src/firebase/config.ts</code></li>
            </ol>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="font-bold text-blue-800 mb-2">🛡️ Firestore Security Rules:</p>
            <pre className="text-xs bg-blue-100 p-3 rounded-lg overflow-x-auto text-blue-800 leading-relaxed">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirebaseSetupGuide;
