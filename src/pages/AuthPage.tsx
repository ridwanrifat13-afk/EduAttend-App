import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { School, UserRole } from '../types';
import { School as SchoolIcon, User, Lock, Mail, Phone, Hash, ArrowRight, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('teacher');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolPassword, setSchoolPassword] = useState(''); // Shared school secret

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallHelp(true);
      setTimeout(() => setShowInstallHelp(false), 8000);
    }
  };

  const generateSchoolCode = () => {
    return 'SCH-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // --- Sign Up Logic ---
        let targetSchoolId = '';
        let generatedCode = '';

        // 1. Pre-validation for Teachers
        if (role === 'teacher') {
          if (!schoolPassword) throw new Error('Please enter the School Code provided by your Admin.');
          const q = query(collection(db, 'schools'), where('code', '==', schoolPassword.trim()));
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
            throw new Error('Invalid School Code. Please check with your Admin.');
          }
          targetSchoolId = querySnapshot.docs[0].id;
        }

        // 2. Create User in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // 3. User Profile Data
        const userData: any = {
          uid: userId,
          name,
          email,
          phone,
          role,
          schoolId: targetSchoolId,
          createdAt: serverTimestamp(),
          status: 'active'
        };

        if (role === 'admin') {
          // Create School first
          const newCode = 'SCH-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          const schoolRef = doc(collection(db, 'schools'));
          targetSchoolId = schoolRef.id;
          generatedCode = newCode;
          userData.schoolId = targetSchoolId; // Update userData with the new schoolId
          
          await setDoc(schoolRef, {
            id: targetSchoolId,
            name: schoolName,
            code: generatedCode,
            adminId: userId,
            createdAt: serverTimestamp(),
            status: 'active'
          });
        }

        // Create User Profile - This will trigger the onSnapshot in App.tsx
        await setDoc(doc(db, 'users', userId), userData);

        if (role === 'admin') {
          alert(`Success! Your School Code is: ${generatedCode}. Give this to your teachers so they can join your school.`);
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email already exists. Try signing in.');
      } else {
        setError(err.message || 'Signup failed.');
      }
      setLoading(false); // Make sure to reset loading on error
    }
    // We don't necessarily need to setLoading(false) here on success 
    // because the page will redirect
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userId = result.user.uid;
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        if (isLogin) {
          setError('No account found. Please sign up first.');
          await auth.signOut();
        } else {
          let targetSchoolId = '';
          let generatedCode = '';

          if (role === 'teacher') {
            if (!schoolPassword) {
              const e = new Error('Please enter School Code before signing up with Google.');
              throw e;
            }
            const q = query(collection(db, 'schools'), where('code', '==', schoolPassword.trim()));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
              throw new Error('Invalid School Code.');
            }
            targetSchoolId = querySnapshot.docs[0].id;
          }

          const userData: any = {
            uid: userId,
            name: result.user.displayName || name || 'Unknown User',
            email: result.user.email,
            phone: phone || '',
            role,
            schoolId: targetSchoolId,
            createdAt: serverTimestamp(),
            status: 'active'
          };

          if (role === 'admin') {
            if (!schoolName) {
              const e = new Error('Please enter School Name before signing up with Google.');
              throw e;
            }
            const newCode = 'SCH-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const schoolRef = doc(collection(db, 'schools'));
            targetSchoolId = schoolRef.id;
            generatedCode = newCode;
            userData.schoolId = targetSchoolId;
            
            await setDoc(schoolRef, {
              id: targetSchoolId,
              name: schoolName,
              code: generatedCode,
              adminId: userId,
              createdAt: serverTimestamp(),
              status: 'active'
            });
          }

          await setDoc(doc(db, 'users', userId), userData);

          if (role === 'admin') {
            alert(`Success! Your School Code is: ${generatedCode}. Give this to your teachers so they can join your school.`);
          }
        }
      }
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError(err.message || 'Google Auth failed.');
      await auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-900 rounded-2xl mb-4 text-brand-50 shadow-xl shadow-brand-900/10">
            <SchoolIcon size={32} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">EduAttend</h1>
          <p className="text-brand-900/60 font-medium font-serif italic text-lg line-height-tight">Smart Attendance for Modern Schools</p>
        </div>

        <div className="glass-card p-8 shadow-2xl shadow-brand-900/5">
          <div className="flex gap-1 mb-8 bg-brand-50 p-1.5 rounded-2xl border border-brand-200">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-900/40 hover:text-brand-900/60'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-900/40 hover:text-brand-900/60'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-2 mb-4 bg-brand-50 p-1 rounded-xl border border-brand-200">
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${role === 'teacher' ? 'bg-white shadow-sm text-brand-900' : 'text-brand-900/40'}`}
                >
                  <User size={14} /> Teacher
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${role === 'admin' ? 'bg-white shadow-sm text-brand-900' : 'text-brand-900/40'}`}
                >
                  <Lock size={14} /> Admin
                </button>
              </div>
            )}

            {!isLogin && (
              <div className="relative">
                <User className="absolute left-0 top-3.5 text-brand-500" size={18} />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  className="input-field pl-5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-0 top-3.5 text-brand-500" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                required
                className="input-field pl-5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {!isLogin && (
              <div className="relative">
                <Phone className="absolute left-0 top-3.5 text-brand-500" size={18} />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  required
                  className="input-field pl-5"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            {!isLogin && role === 'admin' && (
              <div className="relative">
                <SchoolIcon className="absolute left-0 top-3.5 text-brand-500" size={18} />
                <input
                  type="text"
                  placeholder="School Name * (Required)"
                  required
                  className="input-field pl-5 font-bold"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </div>
            )}

            {!isLogin && role === 'teacher' && (
              <div className="relative">
                <Hash className="absolute left-0 top-3.5 text-brand-500" size={18} />
                <input
                  type="text"
                  placeholder="Invite Code * (e.g. SCH-XXXXXX)"
                  required
                  className="input-field pl-5 font-bold"
                  value={schoolPassword}
                  onChange={(e) => setSchoolPassword(e.target.value)}
                />
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-0 top-3.5 text-brand-500" size={18} />
              <input
                type="password"
                placeholder="Login Password"
                required
                className="input-field pl-5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg">{error}</p>}

            <button
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isLogin ? 'Sign In' : 'Create Account')}
              <ArrowRight size={18} />
            </button>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-brand-200"></div>
              <span className="flex-shrink-0 mx-4 text-brand-900/40 text-xs font-medium uppercase tracking-widest">Or</span>
              <div className="flex-grow border-t border-brand-200"></div>
            </div>
            
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleAuth}
              className="w-full bg-white border border-brand-200 text-brand-900 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-50 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Continue with Google
            </button>
          </form>
        </div>

        {isLogin && (
          <p className="text-center mt-8 text-brand-900/60 text-sm font-medium">
            Don't have an account?{' '}
            <button onClick={() => setIsLogin(false)} className="text-brand-900 font-bold hover:underline">Sign up as Teacher or Admin</button>
          </p>
        )}

        {!isInstalled && (
          <div className="mt-8 flex flex-col items-center justify-center gap-3">
            <button 
              onClick={handleInstallClick} 
              className="flex items-center gap-2 bg-brand-900 text-brand-50 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-brand-900/10 transition-all hover:-translate-y-0.5 hover:shadow-brand-900/20"
            >
              <Download size={18} />
              Install EduAttend App
            </button>
            {showInstallHelp && (
              <div className="bg-white/80 backdrop-blur border border-brand-200 p-3 rounded-lg text-xs text-brand-900 text-center max-w-[280px] shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <p>To install this app:</p>
                <ul className="mt-1 space-y-1 text-left list-disc list-inside">
                  <li><strong>iOS:</strong> Tap <span className="inline-block px-1 border border-brand-200 rounded text-[10px] bg-brand-50">Share</span> then <strong>Add to Home Screen</strong></li>
                  <li><strong>Android/Desktop:</strong> Look for the install icon in your address bar or browser menu.</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
