import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { School, CheckCircle2, Zap, WifiOff, LayoutDashboard, Download, ArrowRight, ShieldCheck, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

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
            Track Attendance. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-900 to-brand-500">
              Offline or Online.
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-brand-900/60 font-medium mb-12">
            The high-end progressive web app built for modern schools. Take attendance instantly, 
            sync seamlessly when connected, and monitor from a powerful admin dashboard.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2 bg-brand-50 rounded-3xl p-8 md:p-12 border border-brand-100">
              <WifiOff className="w-12 h-12 text-brand-900 mb-6" />
              <h3 className="text-2xl font-bold text-brand-900 mb-4">True Offline First</h3>
              <p className="text-brand-900/60 font-medium leading-relaxed">
                Take attendance even if the school WiFi goes down. EduAttend stores the state locally on your device using advanced persistent cache, and synchronizes to the cloud the moment you regain connection.
              </p>
            </div>
            <div className="col-span-1 bg-brand-900 text-brand-50 rounded-3xl p-8 border border-brand-800">
              <ShieldCheck className="w-12 h-12 text-brand-400 mb-6" />
              <h3 className="text-xl font-bold mb-4">Secure Sync</h3>
              <p className="text-brand-50/70 font-medium leading-relaxed text-sm">
                Enterprise-grade security rules over your data. Students can only be seen by their assigned teachers and admins.
              </p>
            </div>
            <div className="col-span-1 bg-white border border-brand-200 rounded-3xl p-8 shadow-sm">
              <LayoutDashboard className="w-10 h-10 text-brand-600 mb-6" />
              <h3 className="text-xl font-bold text-brand-900 mb-3">Admin Overviews</h3>
              <p className="text-brand-900/60 font-medium text-sm">
                Centralized monitoring. Admins see who is present or absent school-wide in real time.
              </p>
            </div>
            <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-brand-100 to-white border border-brand-200 rounded-3xl p-8 shadow-sm flex items-center justify-between overflow-hidden relative">
              <div className="relative z-10 w-full md:w-2/3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-xs font-bold shadow-sm mb-4">
                  <CheckCircle2 size={14} className="text-green-500" /> Multi-Platform
                </div>
                <h3 className="text-2xl font-bold text-brand-900 mb-3">Works Everywhere</h3>
                <p className="text-brand-900/60 font-medium">No App Store needed. Install directly to your Home Screen from Safari or Chrome for a native-like experience.</p>
              </div>
              <Download className="absolute -right-10 -bottom-10 w-64 h-64 text-brand-900/5 z-0" />
            </div>
          </div>
        </div>
      </section>

      {/* Installation Guide */}
      <section id="how-to-install" className="py-24 bg-brand-900 text-brand-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-8">Install Like a Pro</h2>
          <p className="text-brand-50/70 font-medium text-lg mb-16 max-w-2xl mx-auto">
            Experience lightning-fast speeds, offline loading, and automatic updates by installing EduAttend to your home screen.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
            <div className="bg-brand-800/50 rounded-3xl p-8 border border-white/10">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">🍎</div> iOS (Safari)</h3>
              <ol className="space-y-4 font-medium text-brand-50/80">
                <li className="flex items-start gap-3"><span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">1</span> Open this site in Safari</li>
                <li className="flex items-start gap-3"><span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">2</span> Tap the 'Share' icon at the bottom</li>
                <li className="flex items-start gap-3"><span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">3</span> Scroll down and tap 'Add to Home Screen'</li>
              </ol>
            </div>
            
            <div className="bg-brand-800/50 rounded-3xl p-8 border border-white/10">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">🤖</div> Android / Desktop</h3>
              <ol className="space-y-4 font-medium text-brand-50/80">
                <li className="flex items-start gap-3"><span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">1</span> Open in Chrome</li>
                <li className="flex items-start gap-3"><span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">2</span> Look for the install badge in the URL bar</li>
                <li className="flex items-start gap-3"><span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">3</span> Or tap menu and "Install App..."</li>
              </ol>
            </div>
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
    </div>
  );
}
