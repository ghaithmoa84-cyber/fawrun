import { Navigate, Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { AvailablePage } from './pages/AvailablePage';
import { ActiveOrderPage } from './pages/ActiveOrderPage';
import { SettlementsPage } from './pages/SettlementsPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/available"
        element={
          <RequireAuth>
            <AvailablePage />
          </RequireAuth>
        }
      />
      <Route
        path="/active-order"
        element={
          <RequireAuth>
            <ActiveOrderPage />
          </RequireAuth>
        }
      />
      <Route
        path="/settlements"
        element={
          <RequireAuth>
            <SettlementsPage />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/available" replace />} />
    </Routes>
  );
}

export default App;
