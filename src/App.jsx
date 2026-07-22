import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ParentDashboard from './pages/ParentDashboard';
import PaymentPage from './pages/PaymentPage';
import PaymentCallback from './pages/PaymentCallback';
import AdminDashboard from './pages/AdminDashboard';
import SetPassword from './pages/SetPassword';

function ProtectedRoute({ role, children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && profile && profile.role !== role) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  return children;
}

function FullPageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="spinner dark" />
    </div>
  );
}

function HomeRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to={profile?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return <Landing />;
}

export default function App() {
  return (
    <div className="page">
      <Navbar />
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="parent">
                <ParentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/pay/:studentId"
            element={
              <ProtectedRoute role="parent">
                <PaymentPage />
              </ProtectedRoute>
            }
          />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
