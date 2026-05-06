import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ChatLayout } from './pages/ChatLayout'
import { Profile } from './pages/profile'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import useAuthStore from './store/authStore'
import { Loader2 } from 'lucide-react'

// Protected route wrapper — redirects to /login if not authenticated
function ProtectedRoute({ children }) {
  const { authUser } = useAuthStore();
  if (!authUser) return <Navigate to="/login" replace />;
  return children;
}

// Guest route wrapper — redirects to / if already authenticated
function GuestRoute({ children }) {
  const { authUser } = useAuthStore();
  if (authUser) return <Navigate to="/" replace />;
  return children;
}

export default function AppRoutes() {
  const { checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show a loading spinner while we verify the session cookie with the backend
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><ChatLayout /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
