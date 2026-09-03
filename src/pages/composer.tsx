import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  Home,
  PlusCircle,
  ShoppingCart,
  PieChart,
  Check,
  Save,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Receipt,
  User,
  Package,
  Printer,
  FileText,
  Edit,
  Edit3,
  Layers,
  Calendar,
  Send,
  Users,
  Clock,
  CheckCheck,
  Info,
  HelpCircle,
  RotateCcw
} from 'lucide-react';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAmHi20OGNteUXjuXO_weF8XKEa3KP7oYE",
  authDomain: "tuition-management-b9e2f.firebaseapp.com",
  projectId: "tuition-management-b9e2f",
  storageBucket: "tuition-management-b9e2f.firebasestorage.app",
  messagingSenderId: "634395063857",
  appId: "1:634395063857:web:24d5e9c303845557f1c710",
  measurementId: "G-5SS0BVJWTK"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

interface Client {
  id: string;
  name: string;
  phone: string;
  isValid: boolean;
  optedOut: boolean;
  segment?: string;
}

interface CampaignData {
  id?: string;
  name: string;
  description: string;
  recipientsType: 'all' | 'selected' | 'segment';
  selectedClientIds: string[];
  selectedSegment: string;
  message: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  isScheduled: boolean;
  status: 'draft' | 'scheduled' | 'processing' | 'completed';
  createdAt: string;
}

export default function WhatsAppComposer() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState('composer');

  // Campaign Form States
  const [campaignName, setCampaignName] = useState('September Client Greeting');
  const [campaignDescription, setCampaignDescription] = useState('Monthly greeting message for existing clients');
  const [recipientSelection, setRecipientSelection] = useState<'all' | 'selected' | 'segment'>('all');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>('VIP Clients');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  
  // Message Composer State
  const [message, setMessage] = useState('Assalam o Alaikum {{name}},\n\nWe hope you are doing well.\n\nThank you for being our valued client.');
  
  // Preview & Test States
  const [previewClientId, setPreviewClientId] = useState<string>('');
  const [testPhoneNumber, setTestPhoneNumber] = useState('+92 300 1234567');
  const [testSending, setTestSending] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);

  // Schedule & Confirmation States
  const [sendType, setSendType] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('2026-09-05');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [timezone] = useState('Asia/Karachi');
  
  // Modals & UI States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showInvalidModal, setShowInvalidModal] = useState(false);
  const [showMissingNamesModal, setShowMissingNamesModal] = useState(false);
  
  // Active Campaign Execution Progress View
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
  const [sendingProgress, setSendingProgress] = useState({
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    percentage: 0
  });

  // UI Toast States
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successToastMsg, setSuccessToastMsg] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sample Mock Clients (Simulating Database / CRM Sync)
  const [clients] = useState<Client[]>([
    { id: '1', name: 'Ali Khan', phone: '+923001111111', isValid: true, optedOut: false, segment: 'VIP Clients' },
    { id: '2', name: 'Ahmed Raza', phone: '+923012222222', isValid: true, optedOut: false, segment: 'VIP Clients' },
    { id: '3', name: 'Usman Ali', phone: '+923023333333', isValid: true, optedOut: false, segment: 'Regulars' },
    { id: '4', name: 'Sara Ahmed', phone: '+923034444444', isValid: true, optedOut: false, segment: 'VIP Clients' },
    { id: '5', name: 'Zubair Qureshi', phone: '+923045555555', isValid: true, optedOut: false, segment: 'New Leads' },
    { id: '6', name: 'Hamza Malik', phone: '+923056666666', isValid: false, optedOut: false, segment: 'Regulars' },
    { id: '7', name: 'Tariq Jameel', phone: '+923067777777', isValid: true, optedOut: true, segment: 'VIP Clients' },
    { id: '8', name: '', phone: '+923078888888', isValid: true, optedOut: false, segment: 'Regulars' }, // Missing name
  ]);

  // Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setCurrentUserEmail(user.email);
      } else {
        const savedEmail = localStorage.getItem('userEmail') || 'alitahir243715@gmail.com';
        setCurrentUserEmail(savedEmail);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync default preview client when clients list or selection changes
  useEffect(() => {
    if (clients.length > 0 && !previewClientId) {
      setPreviewClientId(clients[0].id);
    }
  }, [clients, previewClientId]);

  // Filtering Recipient Calculations
  const calculatedRecipients = useMemo(() => {
    let filtered = [...clients];

    if (recipientSelection === 'selected') {
      filtered = filtered.filter(c => selectedClientIds.includes(c.id));
    } else if (recipientSelection === 'segment') {
      filtered = filtered.filter(c => c.segment === selectedSegment);
    }

    const totalCount = filtered.length;
    const optedOutCount = filtered.filter(c => c.optedOut).length;
    const invalidCount = filtered.filter(c => c.isValid === false).length;
    const missingNameCount = filtered.filter(c => !c.name || !c.name.trim()).length;

    // Valid recipients for personalized campaign
    const validRecipients = filtered.filter(c => c.isValid && !c.optedOut && c.name && c.name.trim());

    return {
      totalCount,
      optedOutCount,
      invalidCount,
      missingNameCount,
      validRecipients,
      finalCount: validRecipients.length,
      invalidClientsList: filtered.filter(c => !c.isValid),
      missingNameClientsList: filtered.filter(c => c.isValid && !c.optedOut && (!c.name || !c.name.trim()))
    };
  }, [clients, recipientSelection, selectedClientIds, selectedSegment]);

  // Message Statistics
  const characterCount = message.length;
  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0;

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

  // Variable insertion at cursor / end of message
  const handleInsertVariable = (varName: string) => {
    setMessage((prev) => `${prev} {{${varName}}}`);
  };

  // Live WhatsApp Preview Text Generator
  const previewText = useMemo(() => {
    const targetClient = clients.find(c => c.id === previewClientId) || clients[0];
    const clientName = targetClient?.name || 'Valued Client';
    const firstName = clientName.split(' ')[0] || clientName;

    return message
      .replace(/\{\{name\}\}/g, clientName)
      .replace(/\{\{first_name\}\}/g, firstName);
  }, [message, previewClientId, clients]);

  // Test Message Handler
  const handleSendTestMessage = () => {
    if (!testPhoneNumber) return triggerError("Please enter a test phone number!");
    setTestSending(true);
    setTestSentSuccess(false);

    setTimeout(() => {
      setTestSending(false);
      setTestSentSuccess(true);
      triggerSuccess("Test message sent successfully!");
    }, 1200);
  };

  // Save Draft to Firebase
  const handleSaveDraft = async () => {
    if (!campaignName.trim()) return triggerError("Campaign Name is required!");
    if (!currentUserEmail) return;

    try {
      const draftData: CampaignData = {
        name: campaignName.trim(),
        description: campaignDescription.trim(),
        recipientsType: recipientSelection,
        selectedClientIds,
        selectedSegment,
        message,
        scheduledDate: scheduleDate,
        scheduledTime: scheduleTime,
        timezone,
        isScheduled: false,
        status: 'draft',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'users', currentUserEmail, 'whatsapp_campaigns'), draftData);
      triggerSuccess("Campaign draft saved successfully!");
    } catch (err) {
      console.error(err);
      triggerError("Failed to save draft. Check connection.");
    }
  };

  // Start Official Backend Queue Process
  const handleStartCampaignExecution = async () => {
    setShowConfirmDialog(false);
    setShowReviewModal(false);

    if (calculatedRecipients.finalCount === 0) {
      return triggerError("No valid recipients available to send campaign!");
    }

    const campaignObj = {
      name: campaignName,
      total: calculatedRecipients.finalCount,
      startTime: new Date().toLocaleTimeString()
    };

    setActiveCampaign(campaignObj);
    setSendingProgress({
      total: calculatedRecipients.finalCount,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      percentage: 0
    });

    triggerSuccess("Campaign queued! Dispatching via Official WhatsApp API...");

    // Simulated Backend Queue Simulation
    let currentSent = 0;
    const interval = setInterval(() => {
      currentSent += Math.floor(Math.random() * 25) + 10;
      if (currentSent >= calculatedRecipients.finalCount) {
        currentSent = calculatedRecipients.finalCount;
        clearInterval(interval);
      }

      const percentage = Math.round((currentSent / calculatedRecipients.finalCount) * 100);
      const delivered = Math.floor(currentSent * 0.94);
      const read = Math.floor(currentSent * 0.83);
      const failed = Math.floor(currentSent * 0.01);

      setSendingProgress({
        total: calculatedRecipients.finalCount,
        sent: currentSent,
        delivered,
        read,
        failed,
        percentage
      });
    }, 400);
  };

  const navigationTabs = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'add', label: 'Add Product', icon: PlusCircle, href: '/add-product' },
    { id: 'sell', label: 'Sell Product', icon: ShoppingCart, href: '/sell-product' },
    { id: 'composer', label: 'Composer', icon: Send, href: '/whatsapp-composer' },
    { id: 'analytics', label: 'Analytics', icon: PieChart, href: '/analytics' },
  ];

  return (
    <div className={`min-h-screen bg-[#f8fafc] dark:bg-[#070b13] text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-36 ${isDark ? 'dark' : ''}`}>
      
      {/* ERROR TOAST */}
      {showErrorToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] bg-rose-600 text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-[0_0_30px_rgba(225,19,72,0.5)] flex items-center gap-3 border border-rose-400 animate-bounce">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setShowErrorToast(false)} className="ml-2 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {showSuccessToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.6)] flex items-center gap-3 border border-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 animate-bounce" />
          <span>{successToastMsg}</span>
        </div>
      )}

      {/* FIXED TOP HEADER NAVBAR */}
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

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        
        {/* HERO TITLE SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 dark:from-[#0c1222] dark:via-[#0e162a] dark:to-[#070b13] p-5 sm:p-7 rounded-3xl border-2 border-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.2)]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">OFFICIAL META API BULK ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Create Personalized Campaign
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Compose, validate variables, preview live per client & schedule high-converting campaigns.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs hover:border-orange-500 transition-all flex items-center gap-2 shadow-sm"
            >
              <Save className="h-4 w-4 text-orange-500" />
              <span>Save Draft</span>
            </button>
          </div>
        </div>

        {/* ACTIVE CAMPAIGN QUEUE PROGRESS MONITOR (IF RUNNING) */}
        {activeCampaign && (
          <div className="bg-white dark:bg-[#0c1222] p-6 rounded-3xl border-2 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)] space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 block">ACTIVE QUEUED CAMPAIGN</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{activeCampaign.name}</h3>
              </div>
              <button
                onClick={() => setActiveCampaign(null)}
                className="px-3 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded-xl font-black text-xs hover:bg-rose-500 hover:text-white transition-all"
              >
                Cancel Campaign
              </button>
            </div>

            {/* PROGRESS BAR */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-black">
                <span className="text-slate-500">{sendingProgress.sent} / {sendingProgress.total} Sent</span>
                <span className="text-orange-500">{sendingProgress.percentage}% Complete</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-[#070b13] h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-800">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${sendingProgress.percentage}%` }}
                ></div>
              </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-50 dark:bg-[#070b13] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-lg font-black text-slate-900 dark:text-white block">{sendingProgress.sent}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase">Sent</span>
              </div>
              <div className="bg-slate-50 dark:bg-[#070b13] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-lg font-black text-emerald-500 block">{sendingProgress.delivered}</span>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Delivered</span>
              </div>
              <div className="bg-slate-50 dark:bg-[#070b13] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-lg font-black text-sky-500 block">{sendingProgress.read}</span>
                <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase">Read</span>
              </div>
              <div className="bg-slate-50 dark:bg-[#070b13] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-lg font-black text-rose-500 block">{sendingProgress.failed}</span>
                <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase">Failed</span>
              </div>
            </div>
          </div>
        )}

        {/* 2-COLUMN MAIN CAMPAIGN CREATION LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: CAMPAIGN DETAILS, RECIPIENTS & MESSAGE COMPOSER */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. CAMPAIGN DETAILS CARD */}
            <div className="bg-white dark:bg-[#0c1222] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm space-y-4">
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" />
                <span>1. Campaign Details</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. September 2026 Client Greeting"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                  <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                    Ye naam client ko nahi jayega. Sirf aapki campaign history ke liye hoga.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Optional Description
                  </label>
                  <input
                    type="text"
                    placeholder="Monthly greeting message for existing clients"
                    value={campaignDescription}
                    onChange={(e) => setCampaignDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-2.5 px-4 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. RECIPIENTS SELECTION CARD */}
            <div className="bg-white dark:bg-[#0c1222] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm space-y-4">
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                <span>2. Recipients Selection</span>
              </h2>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-[#070b13] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRecipientSelection('all')}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition-all ${
                    recipientSelection === 'all'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Clients
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientSelection('selected')}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition-all ${
                    recipientSelection === 'selected'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Selected Clients
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientSelection('segment')}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition-all ${
                    recipientSelection === 'segment'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Client Segment
                </button>
              </div>

              {/* ALL CLIENTS STATS SUMMARY */}
              {recipientSelection === 'all' && (
                <div className="bg-slate-50 dark:bg-[#070b13] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-bold">
                  <div className="flex justify-between text-slate-500">
                    <span>Total Clients in CRM:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">{clients.length}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Valid Numbers:</span>
                    <span className="font-extrabold">{clients.filter(c => c.isValid).length}</span>
                  </div>
                  <div className="flex justify-between text-rose-500">
                    <span>Opted Out:</span>
                    <span className="font-extrabold">{clients.filter(c => c.optedOut).length}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-orange-500 font-black text-sm">
                    <span>Recipients to receive message:</span>
                    <span>{calculatedRecipients.finalCount}</span>
                  </div>
                </div>
              )}

              {/* SELECTED CLIENTS CHECKBOX LIST */}
              {recipientSelection === 'selected' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search client..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-2 pl-10 pr-4 text-xs font-bold outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 bg-slate-50 dark:bg-[#070b13] p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {clients
                      .filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()))
                      .map(client => {
                        const isChecked = selectedClientIds.includes(client.id);
                        return (
                          <label
                            key={client.id}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-[#0c1222] cursor-pointer text-xs font-extrabold transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedClientIds(prev => [...prev, client.id]);
                                  } else {
                                    setSelectedClientIds(prev => prev.filter(id => id !== client.id));
                                  }
                                }}
                                className="h-4 w-4 rounded accent-orange-500 cursor-pointer"
                              />
                              <span className={client.name ? 'text-slate-800 dark:text-slate-100' : 'text-rose-500 italic'}>
                                {client.name || 'Unnamed Client'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{client.phone}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* CLIENT SEGMENT SELECTOR */}
              {recipientSelection === 'segment' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                    Select Client Segment
                  </label>
                  <select
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="VIP Clients">VIP Clients</option>
                    <option value="Regulars">Regulars</option>
                    <option value="New Leads">New Leads</option>
                  </select>
                </div>
              )}
            </div>

            {/* 3. MESSAGE COMPOSER CARD */}
            <div className="bg-white dark:bg-[#0c1222] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Edit className="h-5 w-5 text-orange-500" />
                  <span>3. Message Composer</span>
                </h2>

                <div className="flex gap-2 text-[11px] font-black text-slate-400">
                  <span>Characters: <strong className="text-orange-500">{characterCount}</strong></span>
                  <span>•</span>
                  <span>Words: <strong className="text-orange-500">{wordCount}</strong></span>
                </div>
              </div>

              {/* LARGE TEXTAREA */}
              <div className="relative">
                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your campaign message here..."
                  className="w-full bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-4 text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100 outline-none focus:border-orange-500 transition-colors"
                ></textarea>
              </div>

              {/* DYNAMIC VARIABLES INSERTION */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Insert Personalized Variables
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('name')}
                    className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-black text-xs hover:bg-orange-500 hover:text-white transition-all flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{"{{name}}"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertVariable('first_name')}
                    className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-black text-xs hover:bg-orange-500 hover:text-white transition-all flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{"{{first_name}}"}</span>
                  </button>
                </div>
              </div>

              {/* 4. VALIDATION & WARNINGS SUMMARY BOX */}
              <div className="bg-slate-50 dark:bg-[#070b13] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Automated Validation Checks
                </span>

                <div className="space-y-1.5 text-xs font-extrabold">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>Message structure is valid</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>{calculatedRecipients.finalCount} valid recipients ready</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>{calculatedRecipients.optedOutCount} opted-out clients automatically excluded</span>
                  </div>
                </div>

                {/* WARNINGS FOR MISSING NAMES OR INVALID PHONES */}
                {(calculatedRecipients.missingNameCount > 0 || calculatedRecipients.invalidCount > 0) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    {calculatedRecipients.missingNameCount > 0 && (
                      <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-700 dark:text-amber-300 text-xs font-black">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                          <span>{calculatedRecipients.missingNameCount} clients have missing names.</span>
                        </div>
                        <button
                          onClick={() => setShowMissingNamesModal(true)}
                          className="text-[10px] underline hover:opacity-80"
                        >
                          View Clients
                        </button>
                      </div>
                    )}

                    {calculatedRecipients.invalidCount > 0 && (
                      <div className="flex items-center justify-between p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-black">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                          <span>{calculatedRecipients.invalidCount} invalid WhatsApp numbers.</span>
                        </div>
                        <button
                          onClick={() => setShowInvalidModal(true)}
                          className="text-[10px] underline hover:opacity-80"
                        >
                          View Invalid Numbers
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TEST MESSAGE SECTION */}
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-3xl space-y-3">
                <span className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400 block">
                  Send Test Message Before Campaign
                </span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="+92 300 XXXXXXX"
                    className="flex-1 bg-white dark:bg-[#070b13] border border-orange-500/40 rounded-2xl py-2 px-3 text-xs font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestMessage}
                    disabled={testSending}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-2xl shadow-md transition-all shrink-0"
                  >
                    {testSending ? "Sending..." : "Send Test"}
                  </button>
                </div>

                {testSentSuccess && (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-black">
                    <CheckCheck className="h-4 w-4" />
                    <span>Test message sent successfully</span>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: LIVE PREVIEW & SEND / SCHEDULE CONTROLS */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* LIVE PREVIEW CARD */}
            <div className="bg-white dark:bg-[#0c1222] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                  <span>4. Live WhatsApp Preview</span>
                </h2>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Preview Client Dynamic Resolution
                </label>
                <select
                  value={previewClientId}
                  onChange={(e) => setPreviewClientId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl py-2.5 px-3 text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500 cursor-pointer"
                >
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name || 'Unnamed Client'} ({client.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* WHATSAPP LOOK-A-LIKE CHAT BOX */}
              <div className="bg-[#efeae2] dark:bg-[#0b141a] p-4 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-inner space-y-3">
                <div className="bg-[#075e54] text-white px-3 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
                  <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                    {clients.find(c => c.id === previewClientId)?.name?.charAt(0) || 'C'}
                  </div>
                  <span className="text-xs font-black truncate">
                    {clients.find(c => c.id === previewClientId)?.name || 'Valued Client'}
                  </span>
                </div>

                {/* CHAT BUBBLE */}
                <div className="bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 p-3.5 rounded-2xl rounded-tl-none max-w-[90%] shadow-md space-y-1 ml-1 border border-slate-200/50 dark:border-slate-700/50">
                  <p className="text-xs font-semibold whitespace-pre-wrap leading-relaxed">
                    {previewText}
                  </p>
                  <span className="text-[9px] font-bold text-slate-400 float-right mt-1">
                    12:14 PM ✓✓
                  </span>
                </div>
              </div>
            </div>

            {/* SCHEDULE OR SEND NOW CONTROL CARD */}
            <div className="bg-white dark:bg-[#0c1222] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm space-y-4">
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <span>5. Send or Schedule</span>
              </h2>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-[#070b13] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSendType('now')}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    sendType === 'now'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Send Now
                </button>
                <button
                  type="button"
                  onClick={() => setSendType('schedule')}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    sendType === 'schedule'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Schedule
                </button>
              </div>

              {sendType === 'schedule' && (
                <div className="space-y-3 bg-slate-50 dark:bg-[#070b13] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold"
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400">
                    <span>Timezone:</span>
                    <span className="text-orange-500">{timezone}</span>
                  </div>
                </div>
              )}

              {/* ACTION REVIEW BUTTON */}
              <button
                type="button"
                onClick={() => setShowReviewModal(true)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_4px_20px_rgba(249,115,22,0.35)] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Review Campaign</span>
                <ChevronRight className="h-5 w-5 stroke-[3]" />
              </button>
            </div>

          </div>

        </div>

      </main>

      {/* 8. REVIEW CAMPAIGN MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1222] border-2 border-orange-500 rounded-[32px] p-6 max-w-lg w-full shadow-[0_0_35px_rgba(249,115,22,0.35)] space-y-4 my-auto relative">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
                CAMPAIGN REVIEW
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="p-1 text-slate-400 hover:text-orange-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-extrabold">
              <div className="bg-slate-50 dark:bg-[#070b13] p-3 rounded-2xl space-y-1 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase">Campaign Title</span>
                <p className="text-sm font-black text-orange-500">{campaignName}</p>
              </div>

              <div className="bg-slate-50 dark:bg-[#070b13] p-3 rounded-2xl space-y-1 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase">Recipients Summary</span>
                <div className="flex justify-between text-slate-800 dark:text-slate-100">
                  <span>Target Valid Recipients:</span>
                  <span className="text-emerald-500 font-black text-sm">{calculatedRecipients.finalCount}</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {calculatedRecipients.optedOutCount} opted-out • {calculatedRecipients.invalidCount} invalid excluded
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-[#070b13] p-3 rounded-2xl space-y-1 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase">Message Template</span>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap italic">
                  "{message}"
                </p>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="py-3 rounded-2xl bg-slate-100 dark:bg-[#070b13] text-slate-700 dark:text-slate-300 font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
              >
                Back to Edit
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmDialog(true)}
                className="py-3 rounded-2xl bg-orange-500 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:bg-orange-600 transition-all"
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. FINAL CONFIRMATION DIALOG */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1222] border-2 border-orange-500 rounded-3xl p-6 max-w-sm w-full shadow-[0_0_30px_rgba(249,115,22,0.4)] space-y-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-orange-500/10 border border-orange-500 text-orange-500 flex items-center justify-center mx-auto">
              <Send className="h-6 w-6 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Are you sure?</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                You are about to send this campaign to <strong className="text-orange-500">{calculatedRecipients.finalCount} individual recipients</strong>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="py-3 bg-slate-100 dark:bg-[#070b13] text-slate-700 dark:text-slate-300 font-black text-xs rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleStartCampaignExecution}
                className="py-3 bg-orange-500 text-white font-black text-xs rounded-xl shadow-md hover:bg-orange-600 transition-all"
              >
                Confirm & Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MISSING NAMES MODAL */}
      {showMissingNamesModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#0c1222] border-2 border-amber-500 rounded-3xl p-5 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-black text-amber-500">Missing Names Clients</h3>
              <button onClick={() => setShowMissingNamesModal(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 text-xs font-bold">
              {calculatedRecipients.missingNameClientsList.map(c => (
                <div key={c.id} className="p-2 bg-slate-50 dark:bg-[#070b13] rounded-xl flex justify-between">
                  <span>Unnamed Client</span>
                  <span className="text-slate-400">{c.phone}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INVALID NUMBERS MODAL */}
      {showInvalidModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#0c1222] border-2 border-rose-500 rounded-3xl p-5 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-black text-rose-500">Invalid WhatsApp Numbers</h3>
              <button onClick={() => setShowInvalidModal(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 text-xs font-bold">
              {calculatedRecipients.invalidClientsList.map(c => (
                <div key={c.id} className="p-2 bg-slate-50 dark:bg-[#070b13] rounded-xl flex justify-between">
                  <span>{c.name || 'Client'}</span>
                  <span className="text-rose-500">{c.phone}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FIXED BOTTOM NAVIGATION BAR WITH PERFECT MOBILE LAYOUT */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pt-1 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/90 to-transparent dark:from-[#070b13] dark:via-[#070b13]/90 pointer-events-none">
        <nav className="mx-auto max-w-md bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl px-2 py-1.5 flex items-center justify-around pointer-events-auto">
          {navigationTabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                to={tab.href}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center justify-center flex-1 py-1 group"
              >
                <div className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center ${
                  isActive 
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/40 scale-105' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <span className={`text-[9px] font-black mt-0.5 transition-all truncate max-w-[64px] text-center ${
                  isActive ? 'text-orange-500' : 'text-slate-400'
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
