import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SimpleAuthProvider, useSimpleAuth } from './contexts/SimpleAuthContext';
import Layout from './components/Layout/Layout';
import SimpleAuth from './components/SimpleAuth';
import Home from './components/Home/Home';
import NicheFinder from './components/NicheFinder/NicheFinder';
import AzureTTS from './components/AzureTTS/AzureTTS';
import YouTube from './components/YouTube/YouTube';
import Settings from './components/Settings/Settings';
import ChannelVideos from './components/ChannelVideos/ChannelVideos';

// Auth Protected Route Component
const AuthProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useSimpleAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="loading mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Main App Routes
const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<SimpleAuth />} />
        <Route path="/admin" element={<SimpleAuth />} />

        {/* Main App Routes - Only protected by user authentication */}
        <Route
          path="/"
          element={
            <AuthProtectedRoute>
              <Layout />
            </AuthProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="niche-finder" element={<NicheFinder />} />
          <Route path="azure-tts" element={<AzureTTS />} />
          <Route path="youtube" element={<YouTube />} />
          <Route path="settings" element={<Settings />} />
          <Route path="channel/:channelId/videos" element={<ChannelVideos />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <SimpleAuthProvider>
      <AppRoutes />
    </SimpleAuthProvider>
  );
};

export default App;
