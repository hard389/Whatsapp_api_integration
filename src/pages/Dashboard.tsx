import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  Sun,
  Moon,
  Bell,
  Home,
  FileSpreadsheet,
  Send,
  Users,
  Settings,
  Download,
  Menu,
  LogOut,
  X,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ArrowRight,
  Zap,
  Smartphone,
  DollarSign,
  TrendingUp,
  Briefcase,
  Info,
  HelpCircle
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

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [, setUserName] = useState<string>('Admin');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastType, setToastType] = useState<'info' | 'error' | 'success'>('info');

  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [installModalMsg, setInstallModalMsg] = useState<string>('');

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const triggerToast = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        triggerToast("App installation initiated!", "success");
      }
    } else {
      setInstallModalMsg("App installation prompt is not active or app is already installed on your device.");
      setShowInstallModal(true);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setCurrentUserEmail(user.email);
        setUserName(user.displayName || user.email.split('@')[0] || 'Admin');
      } else {
        const savedEmail = localStorage.getItem('userEmail') || 'admin@domain.com';
        setCurrentUserEmail(savedEmail);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserEmail) return;
    setLoading(true);

    const campaignRef = collection(db, "users", currentUserEmail, "campaigns");
    const unsubscribeCampaigns = onSnapshot(campaignRef, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setCampaigns(data);
      setLoading(false);
    }, () => triggerToast("Failed to sync campaigns", "error"));

    const clientRef = collection(db, "users", currentUserEmail, "clients");
    const unsubscribeClients = onSnapshot(clientRef, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setClients(data);
    }, () => triggerToast("Failed to sync clients", "error"));

    const notifRef = collection(db, "users", currentUserEmail, "notifications");
    const unsubscribeNotifs = onSnapshot(notifRef, (snapshot) => {
      setNotificationCount(snapshot.size);
    });

    const activityRef = collection(db, "users", currentUserEmail, "activity_logs");
    const activityQuery = query(activityRef, orderBy("timestamp", "desc"), limit(5));
    const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
      const logs: any[] = [];
      snapshot.forEach((doc) => logs.push({ id: doc.id, ...doc.data() }));
      setRecentActivities(logs);
    });

    return () => {
      unsubscribeCampaigns();
      unsubscribeClients();
      unsubscribeNotifs();
      unsubscribeActivity();
    };
  }, [currentUserEmail]);

  const confirmLogout = async () => {
    try {
      setShowLogoutModal(false);
      localStorage.clear();
      await signOut(auth);
      navigate('/login');
    } catch {
      triggerToast("Logout failed", "error");
    }
  };

  const metrics = useMemo(() => {
    let sent = 0;
    let delivered = 0;
    let read = 0;
    let failed = 0;
    let pending = 0;

    campaigns.forEach((c) => {
      sent += Number(c.sentCount || c.processed || 0);
      delivered += Number(c.deliveredCount || 0);
      read += Number(c.readCount || 0);
      failed += Number(c.failedCount || 0);
      pending += Number(c.pendingCount || 0);
    });

    const totalClients = clients.length;
    const validClients = clients.filter(c => c.isValid !== false && !c.isInvalid).length;
    const invalidClients = clients.filter(c => c.isValid === false || c.isInvalid).length;
    const optedOutClients = clients.filter(c => c.optedOut).length;

    const delPerc = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : '0.0';
    const readPerc = sent > 0 ? ((read / sent) * 100).toFixed(1) : '0.0';
    const failPerc = sent > 0 ? ((failed / sent) * 100).toFixed(1) : '0.0';

    return {
      totalClients,
      totalCampaigns: campaigns.length,
      sent,
      delivered,
      read,
      failed,
      pending,
      delPerc,
      readPerc,
      failPerc,
      validClients,
      invalidClients,
      optedOutClients
    };
  }, [campaigns, clients]);

  const activeCampaign = useMemo(() => {
    return campaigns.find(c => c.status === 'RUNNING' || c.status === 'IN_PROGRESS' || c.isProcessing);
  }, [campaigns]);

  const attentionItems = useMemo(() => {
    const list = [];
    if (metrics.invalidClients > 0) {
      list.push({ title: `${metrics.invalidClients} clients have invalid WhatsApp numbers`, actionText: 'Review', href: '/clients?filter=invalid' });
    }
    if (metrics.optedOutClients > 0) {
      list.push({ title: `${metrics.optedOutClients} clients are opted out`, actionText: 'View', href: '/clients?filter=opted_out' });
    }
    const failedCampCount = campaigns.filter(c => (c.failedCount || 0) > 0 || c.status === 'FAILED').length;
    if (failedCampCount > 0) {
      list.push({ title: `${failedCampCount} campaign(s) have failed messages`, actionText: 'View', href: '/campaigns?filter=failed' });
    }
    return list;
  }, [metrics, campaigns]);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const quickAccessGrid = [
    { label: 'Import Excel', href: '/import', icon: FileSpreadsheet, bg: 'bg-[#eafaf1] dark:bg-emerald-950/30', border: 'border-emerald-200/60 dark:border-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400', iconBg: 'text-emerald-600' },
    { label: 'New Campaign', href: '/composer', icon: Send, bg: 'bg-[#fff5ec] dark:bg-orange-950/30', border: 'border-orange-200/60 dark:border-orange-900/40', text: 'text-orange-700 dark:text-orange-400', iconBg: 'text-orange-600' },
    { label: 'Manage Clients', href: '/clients', icon: Users, bg: 'bg-[#f0f3ff] dark:bg-indigo-950/30', border: 'border-indigo-200/60 dark:border-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-400', iconBg: 'text-indigo-600' }
  ];

  const verticalCards = [
    {
      title: 'TOTAL CLIENTS',
      value: loading ? '...' : metrics.totalClients.toLocaleString(),
      caption: 'Registered Database',
      icon: DollarSign,
      borderColor: 'border-emerald-400 dark:border-emerald-600',
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600',
      captionColor: 'text-emerald-600'
    },
    {
      title: 'DELIVERED MESSAGES',
      value: loading ? '...' : metrics.delivered.toLocaleString(),
      caption: `${metrics.delPerc}% Delivery Rate`,
      icon: TrendingUp,
      borderColor: 'border-indigo-300 dark:border-indigo-600',
      iconBg: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600',
      captionColor: 'text-indigo-600'
    },
    {
      title: 'READ MESSAGES',
      value: loading ? '...' : metrics.read.toLocaleString(),
      caption: `${metrics.readPerc}% Open/Read Rate`,
      icon: Eye,
      borderColor: 'border-rose-300 dark:border-rose-600',
      iconBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-600',
      captionColor: 'text-rose-600'
    },
    {
      title: 'TOTAL CAMPAIGNS',
      value: loading ? '...' : metrics.totalCampaigns.toLocaleString(),
      caption: 'Active Marketing Runs',
      icon: TrendingUp,
      borderColor: 'border-purple-300 dark:border-purple-600',
      iconBg: 'bg-purple-100 dark:bg-purple-950/80 text-purple-600',
      captionColor: 'text-purple-600'
    },
    {
      title: 'PENDING / FAILED',
      value: loading ? '...' : metrics.failed.toLocaleString(),
      caption: `${metrics.failPerc}% Delivery Issues`,
      icon: Briefcase,
      borderColor: 'border-amber-400 dark:border-amber-600',
      iconBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-600',
      captionColor: 'text-emerald-600'
    }
  ];

  return (
    <div className={`min-h-screen bg-[#fbf9f5] dark:bg-[#070b13] text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-28 font-sans ${isDark ? 'dark' : ''}`}>
      
      {showToast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[120] font-black text-xs px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md transition-all animate-bounce ${
          toastType === 'error' ? 'bg-rose-600 text-white' : toastType === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
        }`}>
          {toastType === 'error' ? <AlertTriangle className="h-5 w-5" /> : toastType === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <Info className="h-5 w-5" />}
          <span>{toastMessage}</span>
          <button onClick={() => setShowToast(false)} className="ml-2 hover:opacity-75"><X className="h-4 w-4" /></button>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all">
          <div className="bg-white dark:bg-[#0c1222] rounded-[2.5rem] p-6 w-full max-w-sm text-center shadow-2xl space-y-6 border border-slate-100 dark:border-slate-800">
            <div className="space-y-2 pt-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Confirm Logout</h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                Are you sure you want to log out of WhatsApp Marketing Engine?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 px-4 rounded-full border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmLogout}
                className="flex-1 py-3 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md shadow-red-600/30 active:scale-95 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {showInstallModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all">
          <div className="bg-white dark:bg-[#0c1222] rounded-[2.5rem] p-6 w-full max-w-sm text-center shadow-2xl space-y-5 border border-slate-100 dark:border-slate-800">
            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-500 flex items-center justify-center mx-auto">
              <Smartphone className="h-6 w-6 stroke-[2.2]" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">App Installation</h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                {installModalMsg}
              </p>
            </div>

            <button 
              onClick={() => setShowInstallModal(false)}
              className="w-full py-3 px-4 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
            >
              OK, Got It
            </button>
          </div>
        </div>
      )}

      <header className="w-full bg-white/90 dark:bg-[#0c1222]/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button className="text-slate-700 dark:text-slate-300 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
            <Menu className="h-6 w-6 stroke-[2]" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleInstallPWA} className="p-2 rounded-full bg-amber-500 text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 transition-all">
            <Download className="h-4 w-4" />
          </button>

          <button 
            onClick={() => setIsDark(!isDark)}
            className="flex items-center justify-center p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>

          <Link to="/alerts" className="relative p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </Link>

          <button onClick={() => setShowLogoutModal(true)} className="p-2 rounded-full bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-700">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-6">

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-orange-600 dark:text-orange-500 tracking-tight">
            WhatsApp Engine
          </h2>
        </div>

        {/* HERO CARD WITH DIRECT NAVIGATE */}
        <div className="relative bg-white dark:bg-[#0c1222] p-6 rounded-[2.5rem] border-2 border-orange-500 shadow-xl shadow-orange-500/5 space-y-4">
          <button 
            onClick={handleInstallPWA}
            className="absolute top-5 right-5 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-extrabold shadow-md shadow-orange-500/20 transition-all active:scale-95"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Install App</span>
          </button>

          <div className="space-y-1.5 pt-2 max-w-[80%]">
            <h1 className="text-2xl font-black leading-tight text-slate-900 dark:text-white">
              WhatsApp Engine
            </h1>
            <p className="text-xs font-semibold text-slate-400 leading-snug">
              Personalized bulk messaging via official Meta WhatsApp Business API
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleNavigation('/composer')}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Create Campaign</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => handleNavigation('/import')}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs active:scale-95 transition-all text-center cursor-pointer"
            >
              Import Excel
            </button>
          </div>
        </div>

        {/* QUICK ACCESS And Profile Setting*/}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Quick Access
            </span>
            <button onClick={() => handleNavigation('/campaigns')} className="text-xs font-black text-orange-500 hover:underline">
              View Tools
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {quickAccessGrid.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleNavigation(item.href)}
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border ${item.bg} ${item.border} transition-all active:scale-95 h-28 space-y-2 text-center cursor-pointer`}
                >
                  <IconComp className={`h-6 w-6 ${item.iconBg}`} />
                  <span className={`text-[11px] font-black leading-tight ${item.text}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* REDIRECT TO QUIZ CARD */}
          <div 
            onClick={() => handleNavigation('/quiz')}
            className="w-full bg-[#f3e8ff] dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-full p-2.5 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-200/80 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                <HelpCircle className="h-6 w-6 stroke-[2]" />
              </div>
              <div className="text-left leading-tight">
                <h4 className="text-sm font-black text-purple-900 dark:text-purple-200">
                  Quiz Section 
                </h4>
                <p className="text-[11px] font-bold text-purple-600/90 dark:text-purple-400">
                  Start your Quiz assessment
                </p>
              </div>
            </div>

            <button
              type="button"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-200/60 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200 font-extrabold text-xs hover:bg-purple-300/60 transition-all shrink-0 mr-1"
            >
              <span>View</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Campaign Metrics Overview
            </span>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold px-2 py-1 rounded-xl text-slate-600 dark:text-slate-300"
            />
          </div>

          <div className="space-y-4">
            {verticalCards.map((card, idx) => {
              const IconComponent = card.icon;
              return (
                <div 
                  key={idx} 
                  className={`bg-white dark:bg-[#0c1222] p-5 rounded-[2rem] border-2 ${card.borderColor} shadow-sm flex items-center justify-between transition-all hover:shadow-md`}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {card.title}
                    </span>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      {card.value}
                    </p>
                    <p className={`text-[11px] font-bold ${card.captionColor}`}>
                      {card.caption}
                    </p>
                  </div>

                  <div className={`h-12 w-12 rounded-full ${card.iconBg} flex items-center justify-center shrink-0`}>
                    <IconComponent className="h-6 w-6 stroke-[2.2]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIVE RUNNING CAMPAIGN */}
        {activeCampaign && (
          <div className="bg-white dark:bg-[#0c1222] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                <Zap className="h-4 w-4 fill-current" />
                Active Running Campaign
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">{activeCampaign.name || 'Processing...'}</h4>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                  {Math.round(((activeCampaign.processed || 0) / (activeCampaign.total || 1)) * 100)}%
                </span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-orange-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round(((activeCampaign.processed || 0) / (activeCampaign.total || 1)) * 100))}%` }}
                />
              </div>

              <button 
                type="button"
                onClick={() => handleNavigation(`/campaigns/${activeCampaign.id}`)}
                className="w-full py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs cursor-pointer"
              >
                Monitor Progress
              </button>
            </div>
          </div>
        )}

        {/* ATTENTION ITEMS */}
        {attentionItems.length > 0 && (
          <div className="bg-amber-50/60 dark:bg-amber-950/10 p-5 rounded-3xl border border-amber-200 dark:border-amber-900/30 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-sm">
              <AlertTriangle className="h-4 w-4" />
              <h3>Attention Required</h3>
            </div>

            <div className="space-y-2">
              {attentionItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#0c1222] border border-amber-100 dark:border-amber-900/20 shadow-sm">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</span>
                  <button 
                    type="button"
                    onClick={() => handleNavigation(item.href)}
                    className="px-3 py-1 rounded-xl bg-amber-500 text-white font-black text-[11px] shrink-0 cursor-pointer"
                  >
                    {item.actionText}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECENT ACTIVITY */}
        <div className="bg-white dark:bg-[#0c1222] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Recent Activity</h3>
            <button type="button" onClick={() => handleNavigation('/audit-logs')} className="text-xs font-bold text-orange-500 hover:underline">
              View All →
            </button>
          </div>

          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((act, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 last:border-none">
                  <span className="h-2 w-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{act.message || 'System operation'}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{act.timeAgo || 'Recently'}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs font-bold text-slate-400 py-2 text-center">No recent activity logs recorded.</p>
            )}
          </div>
        </div>

      </main>

      {/* FLOATING BOTTOM BAR WITH DIRECT LINK INTEGRATION */}
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4">
        <nav className="w-full max-w-sm bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-full shadow-2xl px-3 py-2 flex items-center justify-between">
          {[
            { label: 'Home', icon: Home, href: '/dashboard' },
            { label: 'Import Excel', icon: FileSpreadsheet, href: '/import' },
            { label: 'Composer', icon: Send, href: '/composer' },
            { label: 'Clients', icon: Users, href: '/clients' },
            { label: 'Settings', icon: Settings, href: '/api-settings' },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isActive = location.pathname === tab.href || (tab.href === '/dashboard' && location.pathname === '/');

            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => handleNavigation(tab.href)}
                className="flex flex-col items-center justify-center flex-1 cursor-pointer bg-transparent border-none p-0"
              >
                {isActive ? (
                  <div className="h-10 w-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 mb-0.5">
                    <IconComponent className="h-5 w-5 stroke-[2.2]" />
                  </div>
                ) : (
                  <div className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <IconComponent className="h-4 w-4 stroke-[1.8]" />
                  </div>
                )}
                <span className={`text-[9px] font-bold ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
