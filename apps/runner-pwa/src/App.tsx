import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { SuspendedPage } from './pages/SuspendedPage';
import { AvailablePage } from './pages/AvailablePage';
import { ActiveOrderPage } from './pages/ActiveOrderPage';
import { SettlementsPage } from './pages/SettlementsPage';
import { Layout } from './components/Layout';
import api from './api/client';
import type { ActiveOrderResponse } from '@fawrun/shared-types';

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.status === 'SUSPENDED') {
    return <Navigate to="/suspended" replace />;
  }
  return <>{children}</>;
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setTarget('/login');
      return;
    }
    if (user?.status === 'SUSPENDED') {
      setTarget('/suspended');
      return;
    }

    let isMounted = true;
    api
      .get<ActiveOrderResponse | null>('/runner/orders/active')
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setTarget('/active-order');
        } else {
          setTarget('/available');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setTarget('/available');
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.status]);

  if (!target) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return <Navigate to={target} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/suspended" element={<SuspendedPage />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/available" element={<AvailablePage />} />
        <Route path="/active-order" element={<ActiveOrderPage />} />
        <Route path="/settlements" element={<SettlementsPage />} />
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
