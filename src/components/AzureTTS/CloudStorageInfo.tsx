import React from 'react';
import { Cloud, AlertTriangle, Info, ExternalLink } from 'lucide-react';

const CloudStorageInfo: React.FC = () => {
  return (
    <div className="card p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Cloud size={24} className="text-blue-400" />
        <h2 className="text-xl font-semibold text-text-primary">Cloud Storage Information</h2>
      </div>

      <div className="space-y-4">
        {/* Current Status */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle size={20} className="text-yellow-400 mt-0.5" />
            <div>
              <h3 className="text-yellow-300 font-medium mb-2">Current Limitation</h3>
              <p className="text-yellow-200 text-sm mb-2">
                The current implementation uses localStorage, which is device-specific. 
                This means audio files generated on your phone won't appear on your PC.
              </p>
              <p className="text-yellow-200 text-sm">
                <strong>What works:</strong> Files sync between browser tabs on the same device<br/>
                <strong>What doesn't work:</strong> Cross-device sync (phone ↔ PC)
              </p>
            </div>
          </div>
        </div>

        {/* Solution */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info size={20} className="text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-blue-300 font-medium mb-2">Solution: Real Cloud Storage</h3>
              <p className="text-blue-200 text-sm mb-3">
                To enable true cross-device sync, we need to integrate with a cloud storage service:
              </p>
              <ul className="text-blue-200 text-sm space-y-1 ml-4">
                <li>• <strong>Firebase Storage</strong> + Firestore (Google)</li>
                <li>• <strong>AWS S3</strong> + DynamoDB (Amazon)</li>
                <li>• <strong>Google Cloud Storage</strong> + Firestore</li>
                <li>• <strong>Azure Blob Storage</strong> + Cosmos DB (Microsoft)</li>
                <li>• <strong>Supabase Storage</strong> + Database (Open Source)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Implementation Steps */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Cloud size={20} className="text-green-400 mt-0.5" />
            <div>
              <h3 className="text-green-300 font-medium mb-2">Implementation Steps</h3>
              <ol className="text-green-200 text-sm space-y-1 ml-4">
                <li>1. Choose a cloud storage provider</li>
                <li>2. Set up authentication and API keys</li>
                <li>3. Implement file upload/download endpoints</li>
                <li>4. Add real-time sync with WebSockets or Server-Sent Events</li>
                <li>5. Update the CloudStorageService to use real cloud APIs</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Current Workaround */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info size={20} className="text-purple-400 mt-0.5" />
            <div>
              <h3 className="text-purple-300 font-medium mb-2">Current Workaround</h3>
              <p className="text-purple-200 text-sm mb-2">
                Until real cloud storage is implemented, you can:
              </p>
              <ul className="text-purple-200 text-sm space-y-1 ml-4">
                <li>• Use the same device for generating and accessing audio</li>
                <li>• Export/import audio files manually between devices</li>
                <li>• Use browser sync features (if available)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-2 pt-2">
          <a
            href="https://firebase.google.com/docs/storage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
          >
            <ExternalLink size={14} />
            <span>Firebase Storage</span>
          </a>
          <a
            href="https://aws.amazon.com/s3/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
          >
            <ExternalLink size={14} />
            <span>AWS S3</span>
          </a>
          <a
            href="https://supabase.com/docs/guides/storage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
          >
            <ExternalLink size={14} />
            <span>Supabase Storage</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default CloudStorageInfo;
