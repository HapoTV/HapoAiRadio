import React from 'react'; // Ensure React import is present
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { AudioProvider } from './contexts/AudioContext';
import AppRoutes from './AppRoutes';
import GlobalPlayer from './components/AudioPlayer/GlobalPlayer';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <Router>
      <AuthProvider>
        <AudioProvider>
          <ErrorBoundary>
            <Toaster position="top-right" />
            <AppRoutes />
            <GlobalPlayer />
          </ErrorBoundary>
        </AudioProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;