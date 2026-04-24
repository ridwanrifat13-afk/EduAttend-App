import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
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

  useEffect(() => {
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
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
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
                  placeholder="School Name"
                  required
                  className="input-field pl-5"
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
                  placeholder="Invite Code (e.g. SCH-XXXXXX)"
                  required
                  className="input-field pl-5"
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
          </form>
        </div>

        {isLogin && (
          <p className="text-center mt-8 text-brand-900/60 text-sm font-medium">
            Don't have an account?{' '}
            <button onClick={() => setIsLogin(false)} className="text-brand-900 font-bold hover:underline">Sign up as Teacher or Admin</button>
          </p>
        )}

        {deferredPrompt && (
          <div className="mt-8 flex justify-center">
            <button 
              onClick={handleInstallClick} 
              className="flex items-center gap-2 bg-brand-900 text-brand-50 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-brand-900/10 transition-all hover:-translate-y-0.5 hover:shadow-brand-900/20"
            >
              <Download size={18} />
              Install EduAttend App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
