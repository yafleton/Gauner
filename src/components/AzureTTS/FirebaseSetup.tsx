import React, { useState } from 'react';
import { Cloud, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';

const FirebaseSetup: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
  };

  const setupSteps = [
    {
      title: "1. Create Firebase Project",
      description: "Go to Firebase Console and create a new project",
      link: "https://console.firebase.google.com/",
      code: null
    },
    {
      title: "2. Enable Storage",
      description: "In your Firebase project, go to Storage and enable it",
      link: null,
      code: null
    },
    {
      title: "3. Get Web App Config",
      description: "Add a web app to your project and copy the config",
      link: null,
      code: JSON.stringify(firebaseConfig, null, 2)
    },
    {
      title: "4. Install Firebase",
      description: "Install Firebase SDK in your project",
      link: null,
      code: "npm install firebase"
    },
    {
      title: "5. Update Config",
      description: "Replace the config in firebaseStorage.ts with your actual values",
      link: null,
      code: null
    }
  ];

  const storageRules = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow users to upload their own audio files
    match /audio-files/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

  const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own audio files
    match /audioFiles/{fileId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}`;

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Cloud size={24} className="text-blue-400" />
        <h2 className="text-xl font-semibold text-text-primary">Firebase Storage Setup</h2>
      </div>

      <div className="space-y-6">
        {/* Benefits */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle size={20} className="text-green-400 mt-0.5" />
            <div>
              <h3 className="text-green-300 font-medium mb-2">Why Firebase Storage?</h3>
              <ul className="text-green-200 text-sm space-y-1">
                <li>• <strong>5 GB free storage</strong> - Perfect for audio files</li>
                <li>• <strong>Real-time sync</strong> - Files appear instantly on all devices</li>
                <li>• <strong>Easy integration</strong> - Simple JavaScript SDK</li>
                <li>• <strong>Secure</strong> - Built-in authentication and security rules</li>
                <li>• <strong>Scalable</strong> - Grows with your needs</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Setup Steps</h3>
          {setupSteps.map((step, index) => (
            <div key={index} className="bg-bg-secondary/30 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-text-primary font-medium mb-1">{step.title}</h4>
                  <p className="text-text-secondary text-sm mb-2">{step.description}</p>
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      <ExternalLink size={14} />
                      <span>Open Link</span>
                    </a>
                  )}
                </div>
                {step.code && (
                  <button
                    onClick={() => copyToClipboard(step.code, `step-${index}`)}
                    className="ml-4 p-2 text-text-secondary hover:text-text-primary transition-colors"
                    title="Copy code"
                  >
                    {copied === `step-${index}` ? (
                      <CheckCircle size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                )}
              </div>
              {step.code && (
                <pre className="mt-3 p-3 bg-dark-bg rounded text-xs text-text-primary overflow-x-auto">
                  <code>{step.code}</code>
                </pre>
              )}
            </div>
          ))}
        </div>

        {/* Security Rules */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Security Rules</h3>
          
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle size={20} className="text-yellow-400 mt-0.5" />
              <div>
                <h4 className="text-yellow-300 font-medium mb-2">Storage Rules</h4>
                <p className="text-yellow-200 text-sm mb-3">
                  Add these rules to your Firebase Storage to ensure users can only access their own files.
                </p>
                <button
                  onClick={() => copyToClipboard(storageRules, 'storage-rules')}
                  className="inline-flex items-center space-x-1 text-yellow-400 hover:text-yellow-300 text-sm"
                >
                  {copied === 'storage-rules' ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                  <span>Copy Storage Rules</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle size={20} className="text-yellow-400 mt-0.5" />
              <div>
                <h4 className="text-yellow-300 font-medium mb-2">Firestore Rules</h4>
                <p className="text-yellow-200 text-sm mb-3">
                  Add these rules to your Firestore database for metadata security.
                </p>
                <button
                  onClick={() => copyToClipboard(firestoreRules, 'firestore-rules')}
                  className="inline-flex items-center space-x-1 text-yellow-400 hover:text-yellow-300 text-sm"
                >
                  {copied === 'firestore-rules' ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                  <span>Copy Firestore Rules</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Cloud size={20} className="text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-blue-300 font-medium mb-2">After Setup</h4>
              <ul className="text-blue-200 text-sm space-y-1">
                <li>• Replace the config in <code>src/services/firebaseStorage.ts</code></li>
                <li>• Update <code>CloudStorageService</code> to use <code>FirebaseStorageService</code></li>
                <li>• Test by generating audio on one device and checking another</li>
                <li>• Files will sync in real-time across all devices</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="https://console.firebase.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
          >
            <ExternalLink size={14} />
            <span>Firebase Console</span>
          </a>
          <a
            href="https://firebase.google.com/docs/storage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
          >
            <ExternalLink size={14} />
            <span>Firebase Storage Docs</span>
          </a>
          <a
            href="https://firebase.google.com/docs/firestore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
          >
            <ExternalLink size={14} />
            <span>Firestore Docs</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default FirebaseSetup;
