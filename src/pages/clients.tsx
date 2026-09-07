import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  Search,
  Sun,
  Moon,
  Users,
  Settings,
  ChevronRight,
  UserCheck,
  UserX,
  UserPlus,
  CheckSquare,
  Square,
  ArrowLeft,
  Bell,
  Check,
  X,
  Home,
  FileSpreadsheet,
  Send,
  ChevronLeft,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Filter
} from 'lucide-react';

// Environment Variable Firebase Configuration
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

interface Client {
  id: string;
  clientId?: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: 'Valid' | 'Opted Out' | 'Pending' | string;
  tags?: string[];
  lastContact?: string;
  source?: 'Excel' | 'Manual' | string;
  dateAdded?: string;
  avatarColor?: string;
}

interface NotificationState {
  show: boolean;
  title: string;
  message: string;
  type: 'success' | 'delete';
}

export default function ClientsManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Track authenticated user ID and Email
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Single Toggle State for Cards and Navbar Dark Theme
  const [isCardDark, setIsCardDark] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  // Form State for Add / Edit
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Notification State
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Clients Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selection State
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  // Trigger Center Popup Notification
  const triggerNotification = (title: string, message: string, type: 'success' | 'delete' = 'success') => {
    setNotification({ show: true, title, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Auth Listener: capture user credentials directly
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserUid(user.uid);
        setCurrentUserEmail(user.email || 'alitahir243715@gmail.com');
      } else {
        setCurrentUserUid('rcNb6A4ANTEa8s1apeHyL6ijyU2');
        setCurrentUserEmail('alitahir243715@gmail.com');
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Firestore Records directly under `users/{currentUserEmail}/clients`
  useEffect(() => {
    setLoading(true);
    const targetPathKey = currentUserEmail || 'alitahir243715@gmail.com';

    const clientsRef = collection(db, 'users', targetPathKey, 'clients');
    const q = query(clientsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedClients: Client[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              clientId: data.clientId || `CL-${docSnap.id.substring(0, 6)}`,
              name: data.name || data.clientName || 'Client Name',
              email: data.email || `${(data.name || data.clientName || 'client').toLowerCase().replace(/\s+/g, '')}@example.com`,
              phone: data.phone || data.phoneNumber || docSnap.id || '+923000000000',
              status: data.status || 'Valid',
              tags: data.tags || ['Customer'],
              lastContact: data.lastContact || 'Recently',
              source: data.source ? data.source : 'Excel',
              dateAdded: data.dateAdded || 'Today',
              avatarColor: data.avatarColor || 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            };
          });
          setClients(fetchedClients);
          setLoading(false);
        } else {
          // Fallback check UID path
          const fallbackRef = collection(db, 'users', currentUserUid || 'rcNb6A4ANTEa8s1apeHyL6ijyU2', 'clients');
          onSnapshot(fallbackRef, (fallbackSnap) => {
            if (!fallbackSnap.empty) {
              const fetched = fallbackSnap.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                  id: docSnap.id,
                  clientId: data.clientId || `CL-${docSnap.id.substring(0, 6)}`,
                  name: data.name || data.clientName || 'Client Name',
                  email: data.email || `${(data.name || data.clientName || 'client').toLowerCase().replace(/\s+/g, '')}@example.com`,
                  phone: data.phone || data.phoneNumber || docSnap.id || '+923000000000',
                  status: data.status || 'Valid',
                  tags: data.tags || ['Customer'],
                  lastContact: data.lastContact || 'Recently',
                  source: data.source ? data.source : 'Excel',
                  dateAdded: data.dateAdded || 'Today',
                  avatarColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                };
              });
              setClients(fetched);
            } else {
              setClients([]);
            }
            setLoading(false);
          });
        }
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserUid, currentUserEmail]);

  // Dynamic Statistics
  const stats = useMemo(() => {
    const total = clients.length;
    const valid = clients.filter(c => c.status === 'Valid').length;
    const optedOut = clients.filter(c => c.status === 'Opted Out').length;
    const active = clients.filter(c => c.status !== 'Opted Out').length;
    const newThisMonth = clients.length;

    return { total, valid, optedOut, active, newThisMonth };
  }, [clients]);

  // Dynamic Filter Engine
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const name = client.name || '';
      const email = client.email || '';
      const phone = client.phone || '';
      const source = client.source || 'Excel';
      const status = client.status || 'Valid';

      const matchesSearch = 
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery);

      const matchesSource = selectedSource === 'All' || source.toLowerCase() === selectedSource.toLowerCase();
      const matchesStatus = selectedStatus === 'All' || status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesSource && matchesStatus;
    });
  }, [clients, searchQuery, selectedSource, selectedStatus]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const toggleSelectAll = () => {
    if (selectedClients.length === paginatedClients.length && paginatedClients.length > 0) {
      setSelectedClients([]);
    } else {
      setSelectedClients(paginatedClients.map(c => c.id));
    }
  };

  const toggleSelectClient = (id: string) => {
    setSelectedClients(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Open Modal to Add Manual Client
  const handleOpenAddModal = () => {
    setEditingClient(null);
    setClientName('');
    setClientPhone('');
    setIsModalOpen(true);
  };

  // Open Modal to Edit Existing Client
  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setClientName(client.name || '');
    setClientPhone(client.phone || '');
    setIsModalOpen(true);
  };

  // Save/Update Handler: Direct Write into `users/{currentUserEmail}/clients/{docId}`
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone) return;

    const targetEmailPath = currentUserEmail || 'alitahir243715@gmail.com';
    const cleanPhone = clientPhone.replace(/[^0-9+]/g, '');
    const docId = editingClient ? editingClient.id : (cleanPhone.replace(/[^0-9]/g, '') || Date.now().toString());

    try {
      const docRef = doc(db, 'users', targetEmailPath, 'clients', docId);
      
      await setDoc(docRef, {
        clientName: clientName,
        name: clientName,
        phoneNumber: clientPhone,
        phone: clientPhone,
        status: editingClient?.status || 'Valid',
        source: editingClient ? (editingClient.source || 'Manual') : 'Manual',
        dateAdded: editingClient?.dateAdded || new Date().toISOString()
      }, { merge: true });

      setIsModalOpen(false);

      if (editingClient) {
        triggerNotification('Client Updated!', 'Client details saved successfully.', 'success');
      } else {
        triggerNotification('Client Added!', 'Manual client added under current email tree.', 'success');
      }

      setClientName('');
      setClientPhone('');
      setEditingClient(null);
    } catch (err) {
      console.error("Failed to save client document:", err);
    }
  };

  // Delete Action Handler
  const confirmDeleteClient = async () => {
    if (!deletingClient) return;
    const targetEmailPath = currentUserEmail || 'alitahir243715@gmail.com';

    try {
      await deleteDoc(doc(db, 'users', targetEmailPath, 'clients', deletingClient.id));
      setDeletingClient(null);
      triggerNotification('Client Deleted!', 'The client record was removed.', 'delete');
    } catch (err) {
      console.error("Failed to delete client:", err);
    }
  };

  return (
    <div className="min-h-screen pb-28 bg-[#fafafb] text-slate-900 transition-colors duration-300">

      {/* TOPBAR / GLOBAL HEADER */}
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 transition-colors duration-300 ${
        isCardDark ? 'bg-[#0b0f19] border-slate-800' : 'bg-white/80 border-slate-200/80'
      }`}>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
          </button>

          <div className="relative w-full max-w-md hidden sm:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search parsed record..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full border rounded-full py-2.5 pl-11 pr-4 text-xs font-bold outline-none focus:border-orange-500 transition-all shadow-sm ${
                isCardDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            />
          </div>
        </div>

        {/* SINGLE TOGGLE FOR CARDS & NAVBAR */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCardDark(!isCardDark)}
            title="Toggle Cards & Navbar Dark Theme"
            className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-300 flex items-center relative ${
              isCardDark ? 'bg-slate-800 border border-slate-600' : 'bg-slate-200'
            }`}
          >
            <div className={`h-5 w-5 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300 ${
              isCardDark ? 'translate-x-5 bg-slate-900 text-white' : 'translate-x-0 text-slate-600'
            }`}>
              {isCardDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
            </div>
          </button>

          <div className="relative">
            <button className={`p-2 rounded-full transition-colors ${
              isCardDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            }`}>
              <Bell className="h-5 w-5" />
            </button>
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
              2
            </span>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* HERO CARD */}
        <div className={`relative rounded-[2.5rem] border-2 border-orange-500/80 p-6 sm:p-8 shadow-xl transition-colors duration-300 ${
          isCardDark ? 'bg-[#0c1222] text-white' : 'bg-white text-slate-900'
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                WhatsApp Engine
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-400 leading-relaxed">
                Personalized bulk messaging via official Meta WhatsApp Business API
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={handleOpenAddModal}
                className="flex-1 md:flex-initial px-6 py-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-all active:scale-95 cursor-pointer"
              >
                <span>Add Client</span>
                <ChevronRight className="h-4 w-4 stroke-[3]" />
              </button>

              <button 
                onClick={() => navigate('/import')}
                className={`flex-1 md:flex-initial px-6 py-3.5 rounded-full font-black text-xs sm:text-sm transition-all text-center cursor-pointer active:scale-95 ${
                  isCardDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Import Excel
              </button>
            </div>
          </div>
        </div>

        {/* METRICS STATS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className={`p-4 sm:p-5 rounded-[1.8rem] border border-slate-200/80 shadow-sm flex items-center justify-between transition-colors duration-300 ${
            isCardDark ? 'bg-[#0c1222] text-white border-slate-800' : 'bg-white text-slate-900'
          }`}>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Clients</span>
              <p className="text-xl sm:text-2xl font-black mt-1">{stats.total.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-[1.8rem] border border-slate-200/80 shadow-sm flex items-center justify-between transition-colors duration-300 ${
            isCardDark ? 'bg-[#0c1222] text-white border-slate-800' : 'bg-white text-slate-900'
          }`}>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Valid Numbers</span>
              <p className="text-xl sm:text-2xl font-black mt-1">{stats.valid.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-[1.8rem] border border-slate-200/80 shadow-sm flex items-center justify-between transition-colors duration-300 ${
            isCardDark ? 'bg-[#0c1222] text-white border-slate-800' : 'bg-white text-slate-900'
          }`}>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Opted Out</span>
              <p className="text-xl sm:text-2xl font-black mt-1">{stats.optedOut}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
              <UserX className="h-5 w-5" />
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-[1.8rem] border border-slate-200/80 shadow-sm flex items-center justify-between transition-colors duration-300 ${
            isCardDark ? 'bg-[#0c1222] text-white border-slate-800' : 'bg-white text-slate-900'
          }`}>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Active Clients</span>
              <p className="text-xl sm:text-2xl font-black mt-1">{stats.active.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-[1.8rem] border border-slate-200/80 shadow-sm flex items-center justify-between col-span-2 lg:col-span-1 transition-colors duration-300 ${
            isCardDark ? 'bg-[#0c1222] text-white border-slate-800' : 'bg-white text-slate-900'
          }`}>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">New This Month</span>
              <p className="text-xl sm:text-2xl font-black mt-1">{stats.newThisMonth}</p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className={`rounded-[2rem] border border-slate-200/80 shadow-sm overflow-hidden transition-colors duration-300 ${
          isCardDark ? 'bg-[#0c1222] text-white border-slate-800' : 'bg-white text-slate-900'
        }`}>
          
          {/* FILTER CONTROLS */}
          <div className={`p-4 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            isCardDark ? 'bg-[#070b13]/50 border-slate-800/60' : 'bg-slate-50/50 border-slate-100'
          }`}>
            <button 
              onClick={toggleSelectAll}
              className="flex items-center gap-2 focus:outline-none"
            >
              {selectedClients.length === paginatedClients.length && paginatedClients.length > 0 ? (
                <CheckSquare className="h-5 w-5 text-orange-500" />
              ) : (
                <Square className="h-5 w-5 text-slate-400" />
              )}
              <span className="text-xs font-extrabold text-slate-400">
                Select All
              </span>
            </button>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              
              {/* SOURCE FILTER */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/60 dark:border-slate-700">
                <span className="text-[10px] font-black uppercase text-slate-400 pl-2 flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Source:
                </span>
                {['All', 'Excel', 'Manual'].map((src) => (
                  <button
                    key={src}
                    onClick={() => {
                      setSelectedSource(src);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${
                      selectedSource.toLowerCase() === src.toLowerCase()
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>

              {/* STATUS FILTER */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/60 dark:border-slate-700">
                <span className="text-[10px] font-black uppercase text-slate-400 pl-2">Status:</span>
                {['All', 'Valid', 'Opted Out'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setSelectedStatus(st);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${
                      selectedStatus.toLowerCase() === st.toLowerCase()
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <span className="text-xs font-bold text-slate-400 ml-auto md:ml-0">
                {filteredClients.length} Records
              </span>
            </div>
          </div>

          {/* TABLE AREA */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/60 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="p-4 pl-6 w-10"></th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Source</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/20 text-xs font-bold">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      Fetching clients under current user context...
                    </td>
                  </tr>
                ) : paginatedClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No matching client records found.
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((client) => {
                    const isSelected = selectedClients.includes(client.id);

                    return (
                      <tr key={client.id} className={`transition-colors ${
                        isCardDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'
                      }`}>
                        <td className="p-4 pl-6">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectClient(client.id)}
                            className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-xs ${client.avatarColor}`}>
                              {client.name ? client.name.charAt(0) : 'C'}
                            </div>
                            <div>
                              <p className="font-black">{client.name}</p>
                              <span className="text-[10px] text-slate-400 font-bold block">{client.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-black tracking-wide text-orange-500">{client.phone}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                            client.status === 'Valid' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                            client.source === 'Manual'
                              ? 'bg-orange-500/10 text-orange-600 border border-orange-500/30'
                              : 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                          }`}>
                            {client.source === 'Manual' ? 'Manual' : 'Excel'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleOpenEditModal(client)}
                              title="Edit Client"
                              className="p-2 rounded-xl text-slate-400 hover:text-orange-500 hover:bg-orange-500/10 transition-all cursor-pointer"
                            >
                              <Pencil className="h-4 w-4 stroke-[2.2]" />
                            </button>

                            <button 
                              onClick={() => setDeletingClient(client)}
                              title="Delete Client"
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 stroke-[2.2]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          <div className={`p-4 border-t flex items-center justify-between ${
            isCardDark ? 'border-slate-800 bg-[#070b13]/30' : 'border-slate-100 bg-slate-50/30'
          }`}>
            <span className="text-xs font-black text-slate-500">
              Pg <span className="text-orange-500">{currentPage}</span>/{totalPages} ({filteredClients.length})
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-1 transition-all ${
                  currentPage === 1 
                    ? 'opacity-40 cursor-not-allowed text-slate-400' 
                    : 'hover:bg-orange-500/10 text-orange-500 cursor-pointer'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-1 transition-all ${
                  currentPage === totalPages 
                    ? 'opacity-40 cursor-not-allowed text-slate-400' 
                    : 'hover:bg-orange-500/10 text-orange-500 cursor-pointer'
                }`}
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* BOTTOM NAV BAR */}
      <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm backdrop-blur-md rounded-full border shadow-2xl px-3 py-2 flex items-center justify-between transition-colors duration-300 ${
        isCardDark ? 'bg-[#0c1222] border-slate-800 text-white' : 'bg-white/90 border-slate-200/80 text-slate-700'
      }`}>
        <button 
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 group cursor-pointer ${
            location.pathname === '/' ? 'text-orange-500' : 'text-slate-400'
          }`}
        >
          <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
            location.pathname === '/' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : ''
          }`}>
            <Home className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black">Home</span>
        </button>

        <button 
          onClick={() => navigate('/import')}
          className={`flex flex-col items-center gap-1 group cursor-pointer ${
            location.pathname === '/import' ? 'text-orange-500' : 'text-slate-400'
          }`}
        >
          <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
            location.pathname === '/import' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : ''
          }`}>
            <FileSpreadsheet className="h-5 w-5 stroke-[2]" />
          </div>
          <span className="text-[10px] font-bold">Import</span>
        </button>

        <button 
          onClick={() => navigate('/composer')}
          className={`flex flex-col items-center gap-1 group cursor-pointer ${
            location.pathname === '/composer' ? 'text-orange-500' : 'text-slate-400'
          }`}
        >
          <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
            location.pathname === '/composer' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : ''
          }`}>
            <Send className="h-5 w-5 stroke-[2]" />
          </div>
          <span className="text-[10px] font-bold">Composer</span>
        </button>

        <button 
          onClick={() => navigate('/clients')}
          className={`flex flex-col items-center gap-1 group cursor-pointer ${
            location.pathname === '/clients' || location.pathname === '/' ? 'text-orange-500' : 'text-slate-400'
          }`}
        >
          <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
            location.pathname === '/clients' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : ''
          }`}>
            <Users className="h-5 w-5 stroke-[2]" />
          </div>
          <span className="text-[10px] font-bold">Clients</span>
        </button>

        <button 
          onClick={() => navigate('/quiz')}
          className={`flex flex-col items-center gap-1 group cursor-pointer ${
            location.pathname === '/settings' ? 'text-orange-500' : 'text-slate-400'
          }`}
        >
          <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
            location.pathname === '/settings' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : ''
          }`}>
            <Settings className="h-5 w-5 stroke-[2]" />
          </div>
          <span className="text-[10px] font-bold">Settings</span>
        </button>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-all">
          <div className={`rounded-[2.5rem] border-2 border-orange-500 p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200 ${
            isCardDark ? 'bg-[#0c1222] text-white' : 'bg-white text-slate-900'
          }`}>
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-500/10 text-slate-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-xl font-black">
                {editingClient ? 'Edit Client Details' : 'Add New Client'}
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-1">
                {editingClient ? 'Update name and phone number' : 'Save document directly under current logged-in email path'}
              </p>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-black tracking-wide block">
                  Client Name
                </label>
                <input
                  type="text"
                  placeholder="Enter client full name e.g. John Doe"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className={`w-full border rounded-2xl py-3.5 px-5 text-sm font-black outline-none focus:border-orange-500 transition-all shadow-inner ${
                    isCardDark ? 'bg-[#070b13] border-slate-800 text-white placeholder-slate-600' : 'bg-slate-100/80 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black tracking-wide block">
                  WhatsApp / Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="Enter number e.g. +923001234567"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className={`w-full border rounded-2xl py-3.5 px-5 text-sm font-black outline-none focus:border-orange-500 transition-all shadow-inner ${
                    isCardDark ? 'bg-[#070b13] border-slate-800 text-white placeholder-slate-600' : 'bg-slate-100/80 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-black hover:bg-slate-500/10 transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-orange-500/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>{editingClient ? 'Save Changes' : 'Save Client'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-all">
          <div className={`rounded-[2.5rem] border-2 border-rose-500/80 p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200 ${
            isCardDark ? 'bg-[#0c1222] text-white' : 'bg-white text-slate-900'
          }`}>
            <div className="h-16 w-16 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 stroke-[2.2]" />
            </div>

            <h3 className="text-xl font-black">Delete Client?</h3>
            <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed">
              Are you sure you want to delete <span className="text-rose-500 font-black">{deletingClient.name}</span> ({deletingClient.phone})?
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setDeletingClient(null)}
                className="flex-1 py-3.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-black hover:bg-slate-500/10 transition-all"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteClient}
                className="flex-1 py-3.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-black shadow-lg shadow-rose-500/30 transition-all active:scale-95 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP NOTIFICATION */}
      {notification.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className={`rounded-[2.5rem] border-2 ${
            notification.type === 'success' ? 'border-emerald-500/60' : 'border-rose-500/60'
          } p-8 max-w-xs w-full text-center shadow-2xl pointer-events-auto transition-all animate-in fade-in zoom-in-90 duration-300 ${
            isCardDark ? 'bg-[#0c1222] text-white' : 'bg-white text-slate-900'
          }`}>
            <div className={`h-16 w-16 rounded-full mx-auto flex items-center justify-center mb-4 ${
              notification.type === 'success' ? 'bg-emerald-100 text-emerald-500 dark:bg-emerald-950/60' : 'bg-rose-100 text-rose-500 dark:bg-rose-950/60'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-9 w-9 stroke-[2.2]" />
              ) : (
                <Trash2 className="h-8 w-8 stroke-[2.2]" />
              )}
            </div>

            <h3 className="text-xl font-black tracking-tight">{notification.title}</h3>
            <p className="text-xs text-slate-400 font-extrabold mt-1.5">{notification.message}</p>
          </div>
        </div>
      )}

    </div>
  );
}
