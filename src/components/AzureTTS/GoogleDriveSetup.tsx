import React, { useState } from 'react';
import { Cloud, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';

const GoogleDriveSetup: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const setupSteps = [
    {
      title: "1. Google Cloud Console öffnen",
      description: "Gehen Sie zur Google Cloud Console und erstellen Sie ein neues Projekt",
      link: "https://console.cloud.google.com/",
      code: null
    },
    {
      title: "2. Drive API aktivieren",
      description: "Aktivieren Sie die Google Drive API in Ihrem Projekt",
      link: "https://console.cloud.google.com/apis/library/drive.googleapis.com",
      code: null
    },
    {
      title: "3. OAuth 2.0 Credentials erstellen",
      description: "Erstellen Sie OAuth 2.0 Client ID für Web-Anwendung",
      link: "https://console.cloud.google.com/apis/credentials",
      code: null
    },
    {
      title: "4. API Key erstellen",
      description: "Erstellen Sie einen API Key für die Google Drive API",
      link: "https://console.cloud.google.com/apis/credentials",
      code: null
    },
    {
      title: "5. Konfiguration aktualisieren",
      description: "Die Konfiguration wurde bereits mit Ihren Werten aktualisiert",
      link: null,
      code: `const CLIENT_ID = '679494238214-lnnselboo16bsogbtmrp3bl52r6gikeu.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBVeNrc3QeryTV8npFerdD0P9tRbxpCNpc';`
    }
  ];

  const oauthConfig = `{
  "web": {
    "client_id": "679494238214-lnnselboo16bsogbtmrp3bl52r6gikeu.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost:3000"]
  }
}`;

  const htmlExample = `<!DOCTYPE html>
<html>
<head>
  <script src="https://apis.google.com/js/api.js"></script>
</head>
<body>
  <script>
    // Initialize Google API
    gapi.load('client', () => {
      gapi.client.init({
        apiKey: 'AIzaSyBVeNrc3QeryTV8npFerdD0P9tRbxpCNpc',
        clientId: '679494238214-lnnselboo16bsogbtmrp3bl52r6gikeu.apps.googleusercontent.com',
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.file'
      });
    });
  </script>
</body>
</html>`;

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Cloud size={24} className="text-blue-400" />
        <h2 className="text-xl font-semibold text-text-primary">Google Drive API Einrichtung</h2>
      </div>

      <div className="space-y-6">
        {/* Benefits */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle size={20} className="text-green-400 mt-0.5" />
            <div>
              <h3 className="text-green-300 font-medium mb-2">Warum Google Drive API?</h3>
              <ul className="text-green-200 text-sm space-y-1">
                <li>• <strong>15 GB kostenloser Speicher</strong> - Mehr als Firebase!</li>
                <li>• <strong>Keine Kreditkarte erforderlich</strong> - Nur Google-Konto</li>
                <li>• <strong>Vertraute Umgebung</strong> - Google Drive Interface</li>
                <li>• <strong>Einfache Integration</strong> - JavaScript SDK verfügbar</li>
                <li>• <strong>Sicher</strong> - OAuth 2.0 Authentifizierung</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Configuration Complete */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle size={20} className="text-green-400 mt-0.5" />
            <div>
              <h3 className="text-green-300 font-medium mb-2">✅ Konfiguration abgeschlossen</h3>
              <p className="text-green-200 text-sm mb-2">
                Ihre Google Drive API Credentials wurden erfolgreich konfiguriert:
              </p>
              <ul className="text-green-200 text-sm space-y-1 ml-4">
                <li>• Client ID: 679494238214-lnnselboo16bsogbtmrp3bl52r6gikeu.apps.googleusercontent.com</li>
                <li>• API Key: AIzaSyBVeNrc3QeryTV8npFerdD0P9tRbxpCNpc</li>
                <li>• Bereit für Cross-Device Audio-Synchronisation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Einrichtungsschritte</h3>
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
                      <span>Link öffnen</span>
                    </a>
                  )}
                </div>
                {step.code && (
                  <button
                    onClick={() => copyToClipboard(step.code, `step-${index}`)}
                    className="ml-4 p-2 text-text-secondary hover:text-text-primary transition-colors"
                    title="Code kopieren"
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

        {/* OAuth Configuration */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle size={20} className="text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-yellow-300 font-medium mb-2">OAuth 2.0 Konfiguration</h4>
              <p className="text-yellow-200 text-sm mb-3">
                Beispiel-Konfiguration für OAuth 2.0 Credentials:
              </p>
              <button
                onClick={() => copyToClipboard(oauthConfig, 'oauth-config')}
                className="inline-flex items-center space-x-1 text-yellow-400 hover:text-yellow-300 text-sm mb-3"
              >
                {copied === 'oauth-config' ? (
                  <CheckCircle size={14} className="text-green-400" />
                ) : (
                  <Copy size={14} />
                )}
                <span>OAuth-Konfiguration kopieren</span>
              </button>
              <pre className="p-3 bg-dark-bg rounded text-xs text-text-primary overflow-x-auto">
                <code>{oauthConfig}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* HTML Example */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Cloud size={20} className="text-purple-400 mt-0.5" />
            <div>
              <h4 className="text-purple-300 font-medium mb-2">HTML-Beispiel</h4>
              <p className="text-purple-200 text-sm mb-3">
                Beispiel-HTML für die Google Drive API Integration:
              </p>
              <button
                onClick={() => copyToClipboard(htmlExample, 'html-example')}
                className="inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 text-sm mb-3"
              >
                {copied === 'html-example' ? (
                  <CheckCircle size={14} className="text-green-400" />
                ) : (
                  <Copy size={14} />
                )}
                <span>HTML-Beispiel kopieren</span>
              </button>
              <pre className="p-3 bg-dark-bg rounded text-xs text-text-primary overflow-x-auto">
                <code>{htmlExample}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Cloud size={20} className="text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-blue-300 font-medium mb-2">Bereit für die Nutzung</h4>
              <ul className="text-blue-200 text-sm space-y-1">
                <li>• ✅ Konfiguration in <code>src/services/googleDriveStorage.ts</code> aktualisiert</li>
                <li>• 🔄 Aktualisieren Sie <code>CloudStorageService</code> um <code>GoogleDriveStorageService</code> zu verwenden</li>
                <li>• 🧪 Testen Sie, indem Sie Audio auf einem Gerät generieren und auf einem anderen überprüfen</li>
                <li>• ☁️ Dateien werden in Ihrem Google Drive gespeichert und synchronisiert</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Advantages */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle size={20} className="text-green-400 mt-0.5" />
            <div>
              <h4 className="text-green-300 font-medium mb-2">Vorteile gegenüber Firebase</h4>
              <ul className="text-green-200 text-sm space-y-1">
                <li>• <strong>15 GB vs 5 GB</strong> - Dreimal mehr kostenloser Speicher</li>
                <li>• <strong>Keine Kreditkarte</strong> - Nur Google-Konto erforderlich</li>
                <li>• <strong>Vertraute Umgebung</strong> - Google Drive Interface</li>
                <li>• <strong>Einfache Verwaltung</strong> - Dateien direkt in Google Drive sichtbar</li>
                <li>• <strong>Backup inklusive</strong> - Google Drive Backup-Funktionen</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="https://console.cloud.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
          >
            <ExternalLink size={14} />
            <span>Google Cloud Console</span>
          </a>
          <a
            href="https://developers.google.com/drive/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
          >
            <ExternalLink size={14} />
            <span>Google Drive API Docs</span>
          </a>
          <a
            href="https://developers.google.com/identity/protocols/oauth2"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
          >
            <ExternalLink size={14} />
            <span>OAuth 2.0 Dokumentation</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default GoogleDriveSetup;
