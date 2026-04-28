import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { School, CheckCircle2, Zap, WifiOff, LayoutDashboard, Download, ArrowRight, ShieldCheck, ChevronRight, X, Clock, Activity, Timer, AlertTriangle, TrendingUp } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);

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

  const handleAndroidInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("Installation is not supported by your browser or the app is already installed.");
    }
  };

  const handleProCheckout = () => {
    setIsProcessing(true);
    // Simulate Stripe Redirect
    setTimeout(() => {
      alert("Simulated Stripe Checkout! Redirecting back to Auth...");
      setIsProcessing(false);
      navigate('/auth?plan=pro');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-brand-50 font-sans selection:bg-brand-900 selection:text-white">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-brand-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-900 rounded-lg flex items-center justify-center shadow-md">
                <School className="text-brand-50 w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-brand-900 font-serif">EduAttend</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth" className="text-sm font-bold text-brand-900/70 hover:text-brand-900 transition-colors hidden sm:block">
                Sign In
              </Link>
              <Link to="/auth" className="px-4 py-2 bg-brand-900 text-brand-50 rounded-xl font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-brand-900/20">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-200/50 text-brand-900 font-bold text-xs uppercase tracking-widest mb-8 border border-brand-200">
            <Zap size={14} className="text-brand-500" />
            <span className="opacity-80">Next-Gen Attendance PWA</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-brand-900 mb-8 leading-[1.1]">
            Take Attendance Anywhere — <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-900 to-brand-500">
              Even Without Internet.
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-brand-900/60 font-medium mb-12">
            Most school apps stop working when Wi-Fi drops. Yours doesn’t. Teachers can record attendance offline, and the system automatically syncs when connection returns.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth" className="w-full sm:w-auto px-8 py-4 bg-brand-900 text-brand-50 rounded-2xl font-bold hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-900/20 transition-all flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight size={20} />
            </Link>
            <a href="#how-to-install" className="w-full sm:w-auto px-8 py-4 bg-white border border-brand-200 text-brand-900 rounded-2xl font-bold hover:bg-brand-100 transition-all flex items-center justify-center gap-2 shadow-sm">
              <Download size={20} /> Install App
            </a>
          </div>
        </div>
      </section>

      {/* Features Bento */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight text-brand-900 mb-4">Why Schools Choose EduAttend</h2>
            <p className="text-brand-900/60 font-medium text-lg">Focus on students, not on software. Everything you need to manage attendance efficiently.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2 bg-brand-50 rounded-3xl p-8 md:p-12 border border-brand-100">
              <Clock className="w-12 h-12 text-brand-900 mb-6" />
              <h3 className="text-3xl font-bold text-brand-900 mb-4">Set Up in Under 30 Seconds</h3>
              <p className="text-brand-900/60 text-lg font-medium leading-relaxed">
                No installation. No technical setup. No complicated systems. Admins create a school, share an invite code, and teachers join instantly.
              </p>
            </div>
            <div className="col-span-1 bg-brand-900 text-brand-50 rounded-3xl p-8 border border-brand-800">
              <Activity className="w-12 h-12 text-brand-400 mb-6" />
              <h3 className="text-xl font-bold mb-4">See Updates Instantly</h3>
              <p className="text-brand-50/70 font-medium leading-relaxed text-sm">
                When a teacher marks a student absent, the admin dashboard updates immediately. Know what's happening in every classroom.
              </p>
            </div>
            <div className="col-span-1 bg-white border border-brand-200 rounded-3xl p-8 shadow-sm">
              <Timer className="w-10 h-10 text-brand-600 mb-6" />
              <h3 className="text-xl font-bold text-brand-900 mb-3">Save Hours of Work</h3>
              <p className="text-brand-900/60 font-medium text-sm">
                No paper registers. No spreadsheets. Turn 30 minutes of paperwork into 30 seconds.
              </p>
            </div>
            <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-brand-100 to-white border border-brand-200 rounded-3xl p-8 shadow-sm flex items-center justify-between overflow-hidden relative">
              <div className="relative z-10 w-full md:w-3/4">
                <AlertTriangle className="w-10 h-10 text-orange-500 mb-6" />
                <h3 className="text-2xl font-bold text-brand-900 mb-3">Detect Problems Early</h3>
                <p className="text-brand-900/60 font-medium">Automatic analytics highlight frequent absences, attendance trends, and at-risk students before they become serious.</p>
              </div>
            </div>
            <div className="col-span-1 md:col-span-2 bg-white border border-brand-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
               <ShieldCheck className="w-10 h-10 text-green-600 mb-6" />
               <h3 className="text-2xl font-bold text-brand-900 mb-3">Secure & Organized Records</h3>
               <p className="text-brand-900/60 font-medium">All attendance records are stored securely in the cloud and backed up automatically. No lost registers. No damaged data.</p>
            </div>
            <div className="col-span-1 bg-brand-200/50 border border-brand-200 rounded-3xl p-8 shadow-sm text-center flex flex-col items-center justify-center">
              <TrendingUp className="w-12 h-12 text-brand-900 mb-6" />
              <h3 className="text-xl font-bold text-brand-900 mb-3">Scales With You</h3>
              <p className="text-brand-900/60 font-medium text-sm">
                Built for one classroom — ready for an entire district.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Installation Guide */}
      <section id="how-to-install" className="py-24 bg-brand-900 text-brand-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-8">Install Like an App — Without the App Store</h2>
          <p className="text-brand-50/70 font-medium text-lg mb-16 max-w-2xl mx-auto">
            Teachers install directly from their browser to their phone's home screen. No downloads. No updates. No delays. Works on any device.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <button 
              onClick={handleAndroidInstall}
              className="w-full sm:w-auto px-8 py-4 bg-[#3DDC84] text-brand-900 rounded-2xl font-bold hover:-translate-y-1 hover:shadow-xl hover:shadow-[#3DDC84]/20 transition-all flex items-center justify-center gap-3"
            >
              <svg viewBox="0 0 448 512" fill="currentColor" className="w-6 h-6"><path d="M211.3 207h39.7c3.9 0 7.4-4 7.4-9.3v-48.4c0-5.3-3.4-9.3-7.4-9.3h-39.7c-3.9 0-7.4 4-7.4 9.3v48.4c0 5.3 3.4 9.3 7.4 9.3zm-79.6 123.6h94.9l46.2-80.4c2.5-4.4 2-10-1.4-13.8l-12.8-14.8c-3.4-3.9-9.1-4.8-13.5-2.2l-37 21.4V147c0-5.3-4-9.5-9-9.5h-29.3c-5 0-9 4.3-9 9.5v93.8l-37-21.4c-4.4-2.6-10.1-1.7-13.5 2.2l-12.8 14.8c-3.4 3.8-3.9 9.4-1.4 13.8l46.2 80.4zm164.6-21.9c0 5-4.3 9-9.6 9h-25.2c-5.3 0-9.6-4-9.6-9v-69.5l34.2 19.8c4.6 2.6 10.4 1.7 13.8-2l13.1-14.4c3.4-3.7 3.9-9.3 1.3-13.7L259 133h26.7c5.3 0 9.6-4 9.6-9V75.6c0-5-4.3-9-9.6-9H89.5c-5.3 0-9.6 4-9.6 9V124c0 5 4.3 9 9.6 9H116l-51.5 90.1c-2.6 4.4-2.1 10 1.3 13.7l13.1 14.4c3.4 3.7 9.2 4.6 13.8 2l34.2-19.8v69.5c0 5-4.3 9-9.6 9H92.2c-5.3 0-9.6-4-9.6-9V181.7l-41.5 23.6C36.6 208.1 34 213 36.6 217.4l28 48.6c2.6 4.4 8.5 5.9 13.1 3.3L120 245v75.1c0 23.3 19 42.1 42.4 42.1h123.3c23.4 0 42.4-18.9 42.4-42.1V245l42.4 24.3c4.6 2.6 10.5 1.1 13.1-3.3l28-48.6c2.6-4.4 0-9.3-4.5-12.1l-41.5-23.6v127zm-52.6 63.6H107V283h185.8v65.4zm-147-38.3h108V310h-108v24zM315.6 26.5L343.3 0l34.2 18.2-27.7 26.5zm-225.5 0L62.5 0l-34.2 18.2 27.7 26.5zM224 40.5c-30.9 0-59.5 8.3-84 22.4l15.6 23.9c20.3-11.4 43.6-18 68.4-18s48.1 6.6 68.4 18l15.6-23.9c-24.5-14.1-53.1-22.4-84-22.4z"/></svg>
              Install on Android / PC
            </button>
            <button 
              onClick={() => setShowIosGuide(true)}
              className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-2xl font-bold hover:bg-brand-50 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 shadow-[0_0_15px_-3px_rgba(255,255,255,0.4)]"
            >
              <svg viewBox="0 0 384 512" fill="currentColor" className="w-6 h-6"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 24 184.8 8 277.3c-19 111.4 39 216 79.4 216 28 0 45.4-19 79.4-19 33.3 0 49 18.7 79.6 18.7 41.5 0 65.6-59.5 83.4-105.7-41-16.7-59.5-62.7-59.5-103.6zM187 132c25.4 0 54.4-23.7 60-64.1-23.7 3.3-64.4 25.1-79 64.1z"/></svg>
              Install on iOS
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-brand-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight text-brand-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-brand-900/60 font-medium text-lg">Choose the perfect plan for your school's size. Start free, upgrade when you need to.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-[2rem] p-8 md:p-10 border-2 border-transparent shadow-xl shadow-brand-900/5 flex flex-col relative overflow-hidden transition-all hover:-translate-y-1">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-brand-900 mb-2">Starter</h3>
                <p className="text-brand-900/60 font-medium text-sm">Perfect for small classes and solo teachers testing the waters.</p>
              </div>
              <div className="mb-8 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-brand-900">$0</span>
                <span className="text-brand-900/50 font-bold">/forever</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  "Up to 5 Teachers",
                  "Basic Attendance Tracking",
                  "Offline Mode Sync",
                  "Standard Admin View"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 font-medium text-brand-900/80">
                    <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/auth?plan=free" className="w-full py-4 px-6 rounded-xl font-bold bg-brand-100 text-brand-900 text-center hover:bg-brand-200 transition-colors">
                Get Started Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-brand-900 rounded-[2rem] p-8 md:p-10 shadow-2xl relative flex flex-col transition-all hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 bg-brand-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl">
                MOST POPULAR
              </div>
              <div className="mb-8 relative z-10">
                <h3 className="text-2xl font-bold text-white mb-2">Pro School</h3>
                <p className="text-brand-100/70 font-medium text-sm">For growing institutions that need advanced features and scale.</p>
              </div>
              <div className="mb-8 flex items-baseline gap-2 relative z-10">
                <span className="text-5xl font-extrabold text-white">$49</span>
                <span className="text-brand-100/50 font-bold">/mo per school</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1 relative z-10">
                {[
                  "Unlimited Teachers & Students",
                  "Advanced Export (CSV/PDF)",
                  "Historical Analytics & Charts",
                  "Priority Email Support",
                  "Custom Branding Configurations"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 font-medium text-brand-50/90">
                    <CheckCircle2 className="text-brand-400 w-5 h-5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={handleProCheckout}
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-xl font-bold bg-white text-brand-900 text-center hover:bg-brand-50 transition-colors disabled:opacity-70 disabled:cursor-wait relative z-10 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-brand-900/30 border-t-brand-900 rounded-full animate-spin"></div>
                ) : (
                  <>Upgrade to Pro <ChevronRight size={18} /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-brand-100 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <School className="text-brand-900 w-6 h-6" />
          <span className="font-bold text-xl tracking-tight text-brand-900 font-serif">EduAttend</span>
        </div>
        <p className="text-brand-900/40 font-medium text-sm">© {new Date().getFullYear()} EduAttend. Built as an offline-first PWA.</p>
      </footer>

      {/* iOS Install Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative shadow-2xl animate-fade-in">
            <button 
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 text-brand-900/40 hover:text-brand-900 transition-colors bg-brand-100/50 p-2 rounded-full"
            >
              <X size={20} />
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-100">
                <svg viewBox="0 0 384 512" fill="currentColor" className="w-8 h-8 text-black"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 24 184.8 8 277.3c-19 111.4 39 216 79.4 216 28 0 45.4-19 79.4-19 33.3 0 49 18.7 79.6 18.7 41.5 0 65.6-59.5 83.4-105.7-41-16.7-59.5-62.7-59.5-103.6zM187 132c25.4 0 54.4-23.7 60-64.1-23.7 3.3-64.4 25.1-79 64.1z"/></svg>
              </div>
              <h3 className="text-2xl font-bold text-brand-900">Install on iOS</h3>
              <p className="text-brand-900/60 font-medium mt-2 text-sm">Add EduAttend to your home screen for the full offline experience.</p>
            </div>
            
            <ol className="space-y-4 font-medium text-brand-900/80 mb-8">
              <li className="flex items-center gap-4 bg-brand-50 p-3 rounded-xl border border-brand-100">
                <span className="bg-brand-900 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold shadow-md">1</span> 
                <span>Open this site in <strong>Safari</strong></span>
              </li>
              <li className="flex items-center gap-4 bg-brand-50 p-3 rounded-xl border border-brand-100">
                <span className="bg-brand-900 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold shadow-md">2</span> 
                <span>Tap the <strong>Share</strong> icon at the bottom</span>
              </li>
              <li className="flex items-center gap-4 bg-brand-50 p-3 rounded-xl border border-brand-100">
                <span className="bg-brand-900 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold shadow-md">3</span> 
                <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
              </li>
            </ol>
            
            <button 
              onClick={() => setShowIosGuide(false)}
              className="w-full py-4 text-center font-bold text-white bg-brand-900 rounded-xl hover:bg-brand-800 transition-colors shadow-lg shadow-brand-900/20"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
