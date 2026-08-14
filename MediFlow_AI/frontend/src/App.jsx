import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useThemeStore } from './store/useThemeStore';

// Components
import AppShell from './components/AppShell';

// Pages
import Dashboard from './pages/Dashboard';
import Registration from './pages/Registration';
import Doctors from './pages/Doctors';
import Beds from './pages/Beds';
import Diagnostics from './pages/Diagnostics';
import Billing from './pages/Billing';
import Coordinator from './pages/Coordinator';

function App() {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <Router>
      <Routes>
        {/* AppShell is now the permanent layout wrapper */}
        <Route element={<AppShell />}>
          {/* Automatically redirect the base URL to the dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/registration" element={<Registration />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/beds" element={<Beds />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/coordinator" element={<Coordinator />} />
        </Route>

        {/* Fallback - Catch any unknown URLs and send them to the dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;