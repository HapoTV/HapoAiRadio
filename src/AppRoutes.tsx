import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stores from './pages/Stores';
import Analytics from './pages/Analytics';
import MusicLibrary from './pages/MusicLibrary';
import MusicLibraryPage from './pages/MusicLibraryPage';
import MusicRadio from './pages/MusicRadio';
import Scheduling from './pages/Scheduling';
import SubscriberDashboard from './pages/SubscriberDashboard';
import MusicPlayerDemo from './pages/MusicPlayerDemo';
import CommercialLibrary from './pages/CommercialLibrary';
import RadioControl from './pages/RadioControl';
import UserManagement from './pages/UserManagement';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/library" element={<MusicLibrary />} />
        <Route path="/library/new" element={<MusicLibraryPage />} />
        <Route path="/commercials" element={<CommercialLibrary />} />
        <Route path="/radio" element={<MusicRadio />} />
        <Route path="/scheduling" element={<Scheduling />} />
        <Route path="/subscriber" element={<SubscriberDashboard />} />
        <Route path="/player" element={<MusicPlayerDemo />} />
        <Route path="/control" element={<RadioControl />} />
        <Route path="/users" element={<UserManagement />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;