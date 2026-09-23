import { type ReactNode } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PendingVerificationPage } from './pages/PendingVerificationPage';
import { SuspendedPage } from './pages/SuspendedPage';
import { HomeScreen } from './pages/HomeScreen';
import { CreateOrderScreen } from './pages/CreateOrderScreen';
import { OrdersListScreen } from './pages/OrdersListScreen';
import { OrderDetailScreen } from './pages/OrderDetailScreen';
import { RatingScreen } from './pages/RatingScreen';
import { AccountScreen } from './pages/AccountScreen';
import { Layout } from './components/Layout';

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>جاري التحقق من الجلسة...</p>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (user?.status === 'SUSPENDED') {
    return <Navigate to="/suspended" replace />;
  }

  if (user?.status === 'PENDING_VERIFICATION') {
    return <Navigate to="/pending-verification" replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (isAuthenticated()) {
    if (user?.status === 'SUSPENDED') {
      return <Navigate to="/suspended" replace />;
    }
    return <Navigate to={user?.status === 'PENDING_VERIFICATION' ? '/pending-verification' : '/home'} replace />;
  }

  return <Navigate to="/login" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pending-verification" element={<PendingVerificationPage />} />
      <Route path="/suspended" element={<SuspendedPage />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/create-order" element={<CreateOrderScreen />} />
        <Route path="/orders" element={<OrdersListScreen />} />
        <Route path="/orders/:id" element={<OrderDetailScreen />} />
        <Route path="/orders/:id/rating" element={<RatingScreen />} />
        <Route path="/account" element={<AccountScreen />} />
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
