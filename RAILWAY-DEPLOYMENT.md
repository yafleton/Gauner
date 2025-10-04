# 🚀 Railway Deployment Guide

## Schritt 1: Railway Account erstellen

1. **Gehe zu Railway:**
   - 🌐 **https://railway.app**
   - 🔗 **"Login with GitHub"** klicken

2. **Account Setup:**
   - ✅ GitHub Account verbinden
   - ✅ Railway Dashboard öffnen

## Schritt 2: Projekt deployen

1. **New Project:**
   - ➕ **"New Project"** klicken
   - 📁 **"Deploy from GitHub repo"** wählen
   - 🔍 **Repository suchen:** `yafleton/Gauner`
   - ✅ **Repository auswählen**

2. **Automatisches Deployment:**
   - ✅ Railway erkennt automatisch Python
   - ✅ Installiert `requirements.txt`
   - ✅ Startet FastAPI Server
   - ⏱️ **Dauer:** 2-5 Minuten

## Schritt 3: URL erhalten

1. **Nach Deployment:**
   - 🌐 **Deployment URL** anzeigen
   - 📋 **URL kopieren** → z.B. `https://youtube-transcript-api-production.up.railway.app`

2. **Test URLs:**
   - 🏥 **Health Check:** `https://your-app.railway.app/health`
   - 📄 **API Docs:** `https://your-app.railway.app/docs`
   - 🧪 **Test:** `https://your-app.railway.app/transcript/_Q3RluSaobc`

## Schritt 4: Frontend aktualisieren

1. **API URL ändern:**
   - 📁 **Öffne:** `src/services/youtubeTranscriptServiceV3.ts`
   - 🔍 **Suche:** Zeile 97
   - ✏️ **Ändere:** `const apiUrl = 'https://YOUR-RAILWAY-URL.railway.app';`

2. **Build & Deploy:**
   - 💻 **Lokal:** `npm run build`
   - 🚀 **Git:** `git add . && git commit -m "Update Railway API URL" && git push`

## Schritt 5: Testen

1. **API Test:**
   - 🌐 **Öffne:** `https://your-app.railway.app/health`
   - ✅ **Sollte zeigen:** `{"status": "healthy"}`

2. **Transcript Test:**
   - 🧪 **Test URL:** `https://your-app.railway.app/transcript/_Q3RluSaobc`
   - ✅ **Sollte zeigen:** JSON mit transcript data

3. **Frontend Test:**
   - 🌐 **Öffne deine App**
   - 📹 **YouTube URL eingeben**
   - ✅ **Sollte Transcript extrahieren**

## 🎯 Troubleshooting

### Problem: "No such app" / 404
- ✅ **Warten:** Erste 30 Sekunden (Cold Start)
- ✅ **Refresh:** Browser aktualisieren
- ✅ **Logs:** Railway Dashboard → Logs anschauen

### Problem: CORS Error
- ✅ **CORS ist konfiguriert** in `api.py`
- ✅ **Alle Origins erlaubt** → `allow_origins=["*"]`

### Problem: "No transcript found"
- ✅ **Video hat Auto-Subs** → Nicht alle Videos haben Transcripts
- ✅ **Anderes Video testen** → Mit bekannten Auto-Subs

## 💰 Kosten

- ✅ **Free Tier:** 500 Stunden/Monat
- ✅ **Automatisches Pausieren** → Nach 15 Min Inaktivität
- ✅ **Kostenlos** → Keine Kreditkarte nötig

## 🔧 Management

- 📊 **Dashboard:** https://railway.app/dashboard
- 📋 **Logs:** Real-time Logs im Dashboard
- ⏸️ **Pausieren:** Manuell im Dashboard möglich
- 🔄 **Restart:** Bei Problemen

---

**Deployment sollte 5-10 Minuten dauern!** 🚀
