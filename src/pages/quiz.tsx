import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc,
  setDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  onAuthStateChanged, 
  updateProfile, 
  User as FirebaseUser 
} from 'firebase/auth';
import {
  Bell,
  Sun,
  Moon,
  Home,
  FileSpreadsheet,
  Send,
  Users,
  Settings,
  Check,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowLeft,
  Crown,
  Lock,
  Key,
  Smartphone,
  User,
  ShieldCheck,
  Save,
  Globe,
  Database,
  Radio,
  Eye,
  EyeOff,
  Copy
} from 'lucide-react';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

const FALLBACK_USER_EMAIL = "alitahir243715@gmail.com";

export default function ProfileSettingsPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(FALLBACK_USER_EMAIL);
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  // Profile Form States
  const [displayName, setDisplayName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [businessName, setBusinessName] = useState('My WhatsApp Agency');
  
  // WhatsApp API & Cloud Gateway Configuration States
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaWabaId, setMetaWabaId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('WA_ENGINE_SECRET_TOKEN_2026');
  const [apiEnvironment, setApiEnvironment] = useState<'production' | 'sandbox'>('production');
  const [dailyRateLimit, setDailyRateLimit] = useState('1000');

  // UI Helper States
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successToastMsg, setSuccessToastMsg] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Auth Observer & Data Loader
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        setCurrentUser(user);
        setCurrentUserEmail(user.email);
        setDisplayName(user.displayName || user.email.split('@')[0]);
        await loadUserSettings(user.email);
      } else {
        setCurrentUser(null);
        setCurrentUserEmail(FALLBACK_USER_EMAIL);
        setDisplayName('Ali Tahir');
        await loadUserSettings(FALLBACK_USER_EMAIL);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Existing Profile & Settings from Firestore
  const loadUserSettings = async (email: string) => {
    try {
      const userDocRef = doc(db, 'users', email, 'settings', 'config');
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.displayName) setDisplayName(data.displayName);
        if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
        if (data.businessName) setBusinessName(data.businessName);
        if (data.metaPhoneId) setMetaPhoneId(data.metaPhoneId);
        if (data.metaWabaId) setMetaWabaId(data.metaWabaId);
        if (data.metaAccessToken) setMetaAccessToken(data.metaAccessToken);
        if (data.webhookVerifyToken) setWebhookVerifyToken(data.webhookVerifyToken);
        if (data.apiEnvironment) setApiEnvironment(data.apiEnvironment);
        if (data.dailyRateLimit) setDailyRateLimit(data.dailyRateLimit);
      } else {
        // Fallback default placeholder data for immediate usage
        setWhatsappNumber('+92 300 1234567');
        setMetaPhoneId('109823948201948');
        setMetaWabaId('982103948120394');
        setMetaAccessToken('EAAG...meta_live_access_token');
      }
    } catch (err) {
      console.error("Firestore Settings Fetch Error:", err);
      triggerError("Failed to fetch settings data from Firestore.");
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessToastMsg(msg);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShowErrorToast(true);
    setTimeout(() => setShowErrorToast(false), 3500);
  };

  // 3. Save Updated Profile & API Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const targetEmail = currentUserEmail || FALLBACK_USER_EMAIL;

    try {
      // Update Auth Profile Display Name if logged in
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }

      // Save to Firestore User Document Configuration
      const userDocRef = doc(db, 'users', targetEmail, 'settings', 'config');
      await setDoc(userDocRef, {
        displayName,
        whatsappNumber,
        businessName,
        metaPhoneId,
        metaWabaId,
        metaAccessToken,
        webhookVerifyToken,
        apiEnvironment,
        dailyRateLimit,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      triggerSuccess("Settings & API Keys updated successfully!");
    } catch (err) {
      console.error("Save Settings Error:", err);
      triggerError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerSuccess(`${label} copied to clipboard!`);
  };

  const navigationTabs = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'import', label: 'Import Excel', icon: FileSpreadsheet, href: '/import-excel' },
    { id: 'composer', label: 'Composer', icon: Send, href: '/whatsapp-composer' },
    { id: 'clients', label: 'Clients', icon: Users, href: '/clients' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <div className={`min-h-screen bg-[#f8fafc] dark:bg-[#070b13] text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-36 ${isDark ? 'dark' : ''}`}>

      {/* Error Toast */}
      {showErrorToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] bg-rose-600 text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-[0_0_30px_rgba(225,19,72,0.5)] flex items-center gap-3 border border-rose-400 animate-bounce">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setShowErrorToast(false)} className="ml-2 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.6)] flex items-center gap-3 border border-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 animate-bounce" />
          <span>{successToastMsg}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="w-full bg-white/90 dark:bg-[#070b13]/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-500 text-white shadow-md hover:scale-105 transition-all shrink-0"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
            </Link>
            <div className="leading-none">
              <span className="font-black text-base sm:text-lg tracking-tight text-orange-500 block">
                WhatsApp Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className="flex h-8 w-14 items-center rounded-full bg-slate-200/80 p-1 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700/50 transition-colors"
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ${isDark ? 'translate-x-6 bg-slate-900 text-yellow-400' : 'text-orange-500'}`}>
                {isDark ? <Moon className="h-3.5 w-3.5 fill-current" /> : <Sun className="h-3.5 w-3.5 fill-current" />}
              </div>
            </button>

            <div className="relative rounded-2xl p-2 text-slate-500 hover:text-orange-500 dark:text-slate-400 transition-all cursor-pointer">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 space-y-6">

        {/* Hero Section Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 dark:from-[#0c1222] dark:via-[#0e162a] dark:to-[#070b13] p-5 sm:p-7 rounded-3xl border-2 border-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.2)]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30">
              <Crown className="h-3.5 w-3.5 animate-pulse text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-wider">PREMIUM ACCOUNT & META GATEWAY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Profile & API Settings
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Configure your profile details, default WhatsApp sending phone number & Meta API keys.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 dark:bg-[#070b13] border border-orange-500/40 p-3 rounded-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500 text-white font-black flex items-center justify-center text-sm shadow-md">
                {displayName ? displayName.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="text-left">
                <span className="text-xs font-black text-slate-900 dark:text-white block leading-tight">
                  {displayName || 'User Profile'}
                </span>
                <span className="text-[10px] font-extrabold text-orange-500 block truncate max-w-[140px]">
                  {currentUserEmail}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column - User & Business Identity */}
            <div className="lg:col-span-6 space-y-6">

              {/* Personal Information */}
              <div className="bg-white dark:bg-[#0c1222] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm space-y-4">
                <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <User className="h-5 w-5 text-orange-500" />
                  <span>1. User & Profile Details</span>
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Account Email (Primary Firestore Key)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentUserEmail}
                      className="w-full bg-slate-100 dark:bg-[#070b13]/60 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs font-extrabold text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ali Tahir"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Primary Business Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alpha Tech Digital"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp Sender Configuration */}
              <div className="bg-white dark:bg-[#0c1222] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm space-y-4">
                <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-orange-500" />
                  <span>2. WhatsApp Sender Phone Number</span>
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                      WhatsApp Business Number
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
                      <input
                        type="text"
                        required
                        placeholder="+92 300 1234567"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                      This number will be registered as your official outbound engine sender identity.
                    </span>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400 block tracking-wider flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Number Status & Verification</span>
                    </span>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                      Make sure your Meta Business Account has verified this phone number to prevent broadcast throttling or blockages.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Official Meta WhatsApp API Configuration */}
            <div className="lg:col-span-6 space-y-6">

              <div className="bg-white dark:bg-[#0c1222] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Key className="h-5 w-5 text-orange-500" />
                    <span>3. Official Meta API Keys & Gateway</span>
                  </h2>

                  <div className="flex gap-1.5 bg-slate-50 dark:bg-[#070b13] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setApiEnvironment('production')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                        apiEnvironment === 'production'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Production
                    </button>
                    <button
                      type="button"
                      onClick={() => setApiEnvironment('sandbox')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                        apiEnvironment === 'sandbox'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Sandbox
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Phone Number ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 109823948201948"
                      value={metaPhoneId}
                      onChange={(e) => setMetaPhoneId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                      WhatsApp Business Account ID (WABA ID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 982103948120394"
                      value={metaWabaId}
                      onChange={(e) => setMetaWabaId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Meta Permanent API Access Token
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        placeholder="EAAG..."
                        value={metaAccessToken}
                        onChange={(e) => setMetaAccessToken(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-4 pr-10 text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500"
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Webhook Verification Secret
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={webhookVerifyToken}
                        onChange={(e) => setWebhookVerifyToken(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookVerifyToken, "Webhook Token")}
                        className="px-4 bg-slate-100 dark:bg-slate-800 hover:bg-orange-500 hover:text-white rounded-2xl font-black text-xs transition-all flex items-center gap-1 shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Daily Automated Dispatch Limit
                    </label>
                    <select
                      value={dailyRateLimit}
                      onChange={(e) => setDailyRateLimit(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="1000">1,000 Messages / Day (Tier 1)</option>
                      <option value="10000">10,000 Messages / Day (Tier 2)</option>
                      <option value="100000">100,000 Messages / Day (Tier 3)</option>
                      <option value="unlimited">Unlimited Meta Tier</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit / Action Button */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-sm uppercase tracking-wider shadow-[0_4px_20px_rgba(249,115,22,0.35)] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-5 w-5" />
                <span>{isSaving ? 'Saving Configurations...' : 'Save Settings & API Config'}</span>
              </button>

            </div>

          </div>
        </form>

      </main>

      {/* Persistent Bottom Floating Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/80 to-transparent dark:from-[#070b13] dark:via-[#070b13]/80 pointer-events-none">
        <nav className="mx-auto max-w-lg bg-white dark:bg-[#0c1222] border border-slate-200/90 dark:border-slate-800 rounded-[35px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] px-3 py-2 flex items-center justify-between pointer-events-auto">
          {navigationTabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                to={tab.href}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center justify-center flex-1 transition-all group"
              >
                <div className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center ${
                  isActive 
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' 
                    : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`}>
                  <IconComponent className="h-5 w-5 stroke-[2.2]" />
                </div>
                <span className={`text-[10px] font-extrabold mt-1 transition-all text-center ${
                  isActive ? 'text-orange-500 font-black' : 'text-slate-400'
                }`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
