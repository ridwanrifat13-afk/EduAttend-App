import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserProfile } from './types';
import { LogOut, LayoutDashboard, UserCheck, Users, History as HistoryIcon, Settings, Menu, X, School } from 'lucide-react';
import AuthPage from './pages/AuthPage';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AttendancePage from './pages/AttendancePage';
import StudentPage from './pages/StudentPage';
import HistoryPage from './pages/HistoryPage';

// Context
interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

// Layout Component
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/auth');
  };

  const navItems = [
    { 
      path: '/teacher-dashboard', 
      icon: LayoutDashboard, 
      label: 'Teacher Dashboard',
      roles: ['teacher']
    },
    { 
      path: '/admin-dashboard', 
      icon: LayoutDashboard, 
      label: 'Admin Dashboard',
      roles: ['admin']
    },
    { path: '/attendance', icon: UserCheck, label: 'Attendance', roles: ['teacher'] },
    { path: '/students', icon: Users, label: 'Students' },
    { path: '/history', icon: HistoryIcon, label: 'History' },
  ].filter(item => !item.roles || (user?.role && item.roles.includes(user.role)));

  const dashboardPath = user?.role === 'admin' ? '/admin-dashboard' : '/teacher-dashboard';

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white/90 backdrop-blur-sm border-b border-brand-200 sticky top-0 z-50">
        <Link to={dashboardPath} className="flex items-center gap-2 active:opacity-70 transition-opacity">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-brand-900/20 overflow-hidden">
            <img src="/IMG_20260424_030116.png" alt="EduAttend Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <span className="font-bold text-xl tracking-tight font-serif text-brand-900">EduAttend</span>
        </Link>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-brand-900">
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar / Mobile Menu */}
      <aside className={`
        fixed inset-0 z-40 bg-brand-50/95 backdrop-blur-md md:bg-white border-r border-brand-200 transition-transform md:translate-x-0 md:static md:w-72 md:h-screen
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6">
          <Link to={dashboardPath} onClick={() => setIsMenuOpen(false)} className="hidden md:flex items-center gap-3 mb-10 active:opacity-70 transition-opacity">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-900/20 overflow-hidden">
              <img src="/IMG_20260424_030116.png" alt="EduAttend Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h1 className="font-bold text-2xl tracking-tight leading-tight text-brand-900">EduAttend</h1>
              <p className="text-[10px] text-brand-900/40 font-bold uppercase tracking-[0.2em]">{user?.role} Portal</p>
            </div>
          </Link>

          <nav className="space-y-1.5 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all
                    ${isActive 
                      ? 'bg-brand-900 text-brand-50 shadow-xl shadow-brand-900/20' 
                      : 'text-brand-900/50 hover:bg-white/50 hover:text-brand-900'}
                  `}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-brand-200/50">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 bg-brand-200/50 rounded-full flex items-center justify-center text-brand-900 font-bold border border-brand-200">
                {user?.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate leading-tight text-brand-900">{user?.name}</p>
                <p className="text-xs text-brand-900/50 truncate font-medium">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-4 md:p-10 relative">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-brand-50">
      <div className="animate-spin w-8 h-8 border-4 border-brand-900 border-t-transparent rounded-full font-serif"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/auth" />;
  
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin-dashboard' : '/teacher-dashboard'} />;
  }
  
  return <AppLayout>{children}</AppLayout>;
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Listen to profile changes in real-time
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUser({ uid: firebaseUser.uid, ...docSnap.data() } as UserProfile);
            setLoading(false);
          } else {
            // User authenticated but profile not yet created in Firestore
            // We keep loading true while we wait for the doc to be created
            // by the AuthPage logic
            setUser(null);
            setLoading(false);
          }
        }, (error) => {
          console.error("Profile listen error:", error);
          setLoading(false);
        });
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to={user.role === 'admin' ? '/admin-dashboard' : '/teacher-dashboard'} />} />
          
          <Route path="/teacher-dashboard" element={
            <ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>
          } />
          
          <Route path="/admin-dashboard" element={
            <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
          
          <Route path="/attendance" element={
            <ProtectedRoute roles={['teacher']}><AttendancePage /></ProtectedRoute>
          } />
          
          <Route path="/students" element={
            <ProtectedRoute><StudentPage /></ProtectedRoute>
          } />
          
          <Route path="/history" element={
            <ProtectedRoute><HistoryPage /></ProtectedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/auth" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
