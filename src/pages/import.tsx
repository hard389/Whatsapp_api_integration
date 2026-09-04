import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Home,
  Upload,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ShoppingCart,
  FileSpreadsheet,
  AlertCircle,
  Users,
  Download,
  Edit2,
  Undo2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Info,
  Globe,
  Trash2
} from 'lucide-react';

import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  deleteDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';

interface ParsedRawRow {
  rowIndex: number;
  data: Record<string, any>;
}

interface ProcessedRecord {
  id: string;
  name: string;
  originalPhone: string;
  normalizedPhone: string;
  status: 'valid' | 'invalid' | 'duplicate';
  errorReason?: string;
  isDbDuplicate?: boolean;
}

interface ImportBatch {
  id: string;
  fileName: string;
  totalRecords: number;
  importedCount: number;
  skippedCount: number;
  timestamp: any;
  importedClientIds: string[];
}

export default function ImportClients() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState('import_clients');
  const [searchQuery, setSearchQuery] = useState('');

  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<ParsedRawRow[]>([]);
  const [columnMap, setColumnMap] = useState<{ name: string; phone: string }>({
    name: '',
    phone: ''
  });

  // Dropdown open states
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);

  const [existingPhoneNumbers, setExistingPhoneNumbers] = useState<Set<string>>(new Set());
  const [processedRecords, setProcessedRecords] = useState<ProcessedRecord[]>([]);
  const [importHistory, setImportHistory] = useState<ImportBatch[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [dupOption, setDupOption] = useState<'skip' | 'update'>('skip');
  const [importOptions, setImportOptions] = useState({
    importValid: true,
    skipInvalid: true,
    skipDuplicates: true
  });

  const [editingRecord, setEditingRecord] = useState<ProcessedRecord | null>(null);
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);

  // Custom Modal State for Undo Confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    batch: ImportBatch | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    batch: null
  });

  // State for Editing Batch Modal
  const [editingBatch, setEditingBatch] = useState<ImportBatch | null>(null);
  const [batchRecords, setBatchRecords] = useState<ProcessedRecord[]>([]);
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  // Notification Toast State
  const [toast, setToast] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // User Dynamic Identifier - User ke Email / UID sa Document Path Generate Karne Ke Liye
  const getUserDocId = (user: User | null): string => {
    if (!user) return 'guest';
    return user.email || user.uid;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const userDocId = getUserDocId(currentUser);

    // Dynamic Tree Path: users -> {userEmail/uid} -> clients
    const clientsRef = collection(db, 'users', userDocId, 'clients');
    const unsubClients = onSnapshot(
      clientsRef,
      (snapshot) => {
        const phones = new Set<string>();
        snapshot.docs.forEach((d) => {
          const p = d.data().phone;
          if (p) phones.add(p);
        });
        setExistingPhoneNumbers(phones);
      },
      (error) => {
        console.error('Firestore Client Fetch Error:', error);
      }
    );

    // Dynamic Tree Path: users -> {userEmail/uid} -> import_history
    const historyRef = collection(db, 'users', userDocId, 'import_history');
    const historyQuery = query(historyRef, orderBy('timestamp', 'desc'), limit(10));
    const unsubHistory = onSnapshot(
      historyQuery,
      (snapshot) => {
        const historyData: ImportBatch[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        })) as ImportBatch[];
        setImportHistory(historyData);
      },
      (error) => {
        console.error('Firestore History Fetch Error:', error);
      }
    );

    return () => {
      unsubClients();
      unsubHistory();
    };
  }, [currentUser]);

  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ isOpen: true, type, title, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isOpen: false }));
    }, 3500);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { 'Customer Name': 'John Doe', 'Mobile Number': '+14155552671' },
      { 'Customer Name': 'Ali Khan', 'Mobile Number': '+923001234567' },
      { 'Customer Name': 'Akira Sato', 'Mobile Number': '+819012345678' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients Template');
    XLSX.writeFile(workbook, 'Global_Clients_Template.xlsx');
  };

  const normalizePhoneNumber = (
    rawPhone: string
  ): { normalized: string; isValid: boolean; suggestion?: string } => {
    if (!rawPhone) {
      return {
        normalized: '',
        isValid: false,
        suggestion: 'Phone number is completely empty.'
      };
    }

    let cleaned = String(rawPhone).trim().replace(/[^\d+]/g, '');

    if (/^03\d{9}$/.test(cleaned)) {
      cleaned = '+92' + cleaned.slice(1);
    } else if (/^923\d{9}$/.test(cleaned)) {
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+') && cleaned.length >= 7 && cleaned.length <= 15) {
      cleaned = '+' + cleaned;
    }

    if (cleaned.startsWith('+92')) {
      const digitsAfterCode = cleaned.replace('+92', '');
      if (digitsAfterCode.length === 10 && /^\d+$/.test(digitsAfterCode)) {
        return { normalized: cleaned, isValid: true };
      } else {
        return {
          normalized: cleaned,
          isValid: false,
          suggestion: `Pakistan (+92) requires exactly 10 digits after +92. You provided ${digitsAfterCode.length} digits.`
        };
      }
    }

    const isValid = /^\+[1-9]\d{6,14}$/.test(cleaned);
    let suggestion = '';
    if (!isValid) {
      if (!cleaned.startsWith('+')) {
        suggestion = 'Missing country code. Example: +92 for PK or +1 for US.';
      } else if (cleaned.length < 8) {
        suggestion = 'Number is too short for international standard E.164.';
      } else if (cleaned.length > 15) {
        suggestion = 'Number exceeds maximum 15 digits limit.';
      } else {
        suggestion = 'Invalid formatting. Use format: +[CountryCode][Number]';
      }
    }

    return { normalized: cleaned, isValid, suggestion };
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const processFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      showToast('error', 'Invalid Format', 'Please upload an Excel (.xlsx, .xls) or .csv file.');
      return;
    }

    setSelectedFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (jsonRows.length === 0) {
          showToast('error', 'Empty File', 'The sheet contains no data.');
          setIsProcessing(false);
          return;
        }

        const headers = Object.keys(jsonRows[0]);
        setExcelHeaders(headers);

        const rawData: ParsedRawRow[] = jsonRows.map((data, index) => ({
          rowIndex: index + 1,
          data
        }));
        setRawRows(rawData);

        let nameCol = '';
        let phoneCol = '';

        headers.forEach((h) => {
          const lower = h.toLowerCase().trim();
          if (!nameCol && (lower.includes('name') || lower.includes('client') || lower.includes('customer'))) nameCol = h;
          if (!phoneCol && (lower.includes('whatsapp') || lower.includes('mobile') || lower.includes('phone') || lower.includes('contact') || lower.includes('number'))) phoneCol = h;
        });

        const initialMap = {
          name: nameCol || headers[0] || '',
          phone: phoneCol || headers[1] || ''
        };
        setColumnMap(initialMap);

        runDataProcessing(rawData, initialMap);
        setCurrentPage(1);
        setIsProcessing(false);
      } catch (err) {
        console.error('File Read Error:', err);
        showToast('error', 'Parse Error', 'Failed to parse file contents.');
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMappingChange = (field: keyof typeof columnMap, selectedHeader: string) => {
    const updatedMap = { ...columnMap, [field]: selectedHeader };
    setColumnMap(updatedMap);
    if (rawRows.length > 0) {
      runDataProcessing(rawRows, updatedMap);
    }
  };

  const runDataProcessing = (rows: ParsedRawRow[], map: typeof columnMap) => {
    const internalPhonesSeen = new Set<string>();
    const processed: ProcessedRecord[] = [];

    rows.forEach((r, idx) => {
      const name = String(r.data[map.name] || '').trim();
      const rawPhone = String(r.data[map.phone] || '').trim();

      const { normalized, isValid, suggestion } = normalizePhoneNumber(rawPhone);

      let status: 'valid' | 'invalid' | 'duplicate' = 'valid';
      let errorReason = '';
      let isDbDup = false;

      if (!name) {
        status = 'invalid';
        errorReason = 'Missing Name';
      } else if (!isValid) {
        status = 'invalid';
        errorReason = suggestion || 'Invalid Country Code / Number Format';
      } else if (internalPhonesSeen.has(normalized)) {
        status = 'duplicate';
        errorReason = 'In-file Duplicate';
      } else if (existingPhoneNumbers.has(normalized)) {
        status = 'duplicate';
        isDbDup = true;
        errorReason = 'Database Duplicate';
      }

      if (isValid && status !== 'invalid') {
        internalPhonesSeen.add(normalized);
      }

      processed.push({
        id: `row_${idx}_${Date.now()}`,
        name: name || 'Unnamed',
        originalPhone: rawPhone,
        normalizedPhone: normalized,
        status,
        errorReason,
        isDbDuplicate: isDbDup
      });
    });

    setProcessedRecords(processed);
  };

  const stats = useMemo(() => {
    const total = processedRecords.length;
    const valid = processedRecords.filter((r) => r.status === 'valid').length;
    const invalid = processedRecords.filter((r) => r.status === 'invalid').length;
    const duplicate = processedRecords.filter((r) => r.status === 'duplicate').length;
    return { total, valid, invalid, duplicate };
  }, [processedRecords]);

  const filteredRecords = useMemo(() => {
    let records = processedRecords;
    if (showInvalidOnly) {
      records = records.filter((r) => r.status === 'invalid');
    }
    if (!searchQuery.trim()) return records;

    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.normalizedPhone.toLowerCase().includes(q) ||
        r.originalPhone.toLowerCase().includes(q)
    );
  }, [processedRecords, searchQuery, showInvalidOnly]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleSaveEdit = () => {
    if (!editingRecord) return;

    const { normalized, isValid, suggestion } = normalizePhoneNumber(editingRecord.originalPhone);
    let newStatus: 'valid' | 'invalid' | 'duplicate' = 'valid';
    let newReason = '';

    if (!editingRecord.name.trim()) {
      newStatus = 'invalid';
      newReason = 'Missing Name';
    } else if (!isValid) {
      newStatus = 'invalid';
      newReason = suggestion || 'Invalid Country Code / Number Format';
    } else if (existingPhoneNumbers.has(normalized)) {
      newStatus = 'duplicate';
      newReason = 'Database Duplicate';
    }

    const updatedRecord: ProcessedRecord = {
      ...editingRecord,
      normalizedPhone: normalized,
      status: newStatus,
      errorReason: newReason
    };

    setProcessedRecords((prev) =>
      prev.map((r) => (r.id === editingRecord.id ? updatedRecord : r))
    );

    if (editingBatch) {
      setBatchRecords((prev) =>
        prev.map((r) => (r.id === editingRecord.id ? updatedRecord : r))
      );
    }

    setEditingRecord(null);
    showToast('success', 'Record Saved', 'Data updated & re-validated successfully!');
  };

  const handleExecuteImport = async () => {
    if (!currentUser) {
      showToast('error', 'Auth Error', 'You must be logged in to import data.');
      return;
    }

    const userDocId = getUserDocId(currentUser);

    const targetRecords = processedRecords.filter((r) => {
      if (r.status === 'valid') return true;
      if (r.status === 'duplicate') return dupOption === 'update';
      return false;
    });

    if (targetRecords.length === 0) {
      showToast('error', 'No Records', 'There are no valid records available to import.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const batchId = `import_${Date.now()}`;
      const importedIds: string[] = [];
      const chunkSize = 200;
      const totalSteps = Math.ceil(targetRecords.length / chunkSize);

      for (let i = 0; i < totalSteps; i++) {
        const batch = writeBatch(db);
        const chunk = targetRecords.slice(i * chunkSize, (i + 1) * chunkSize);

        chunk.forEach((rec) => {
          const docId = rec.normalizedPhone.replace('+', '').trim();
          if (docId) {
            // Dynamic Path: users / {userEmail/uid} / clients / {docId}
            const clientRef = doc(db, 'users', userDocId, 'clients', docId);

            batch.set(
              clientRef,
              {
                id: docId,
                name: rec.name,
                phone: rec.normalizedPhone,
                importBatchId: batchId,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
              },
              { merge: true }
            );

            importedIds.push(docId);
          }
        });

        await batch.commit();
        setUploadProgress(Math.round(((i + 1) / totalSteps) * 100));
      }

      // Dynamic Path: users / {userEmail/uid} / import_history / {batchId}
      const historyDocRef = doc(db, 'users', userDocId, 'import_history', batchId);
      await setDoc(historyDocRef, {
        fileName: selectedFileName || 'imported_clients.xlsx',
        totalRecords: stats.total,
        importedCount: targetRecords.length,
        skippedCount: stats.total - targetRecords.length,
        timestamp: serverTimestamp(),
        importedClientIds: importedIds
      });

      setIsUploading(false);
      showToast('success', 'Import Complete', `${targetRecords.length} clients stored in Firestore successfully!`);

      setTimeout(() => {
        setRawRows([]);
        setProcessedRecords([]);
        setSelectedFileName(null);
      }, 1000);
    } catch (err: any) {
      console.error('Firestore Import Failure:', err);
      setIsUploading(false);
      showToast('error', 'Import Failed', err?.message || 'Failed to store client records into Firestore.');
    }
  };

  const triggerRollbackModal = (batch: ImportBatch) => {
    setConfirmModal({
      isOpen: true,
      title: 'Undo Import',
      message: `Undo import "${batch.fileName}"? This will delete ${batch.importedClientIds.length} records.`,
      batch
    });
  };

  const handleConfirmRollback = async () => {
    const batch = confirmModal.batch;
    if (!batch || !currentUser) return;

    setConfirmModal({ isOpen: false, title: '', message: '', batch: null });
    const userDocId = getUserDocId(currentUser);
    setIsProcessing(true);

    try {
      const chunkSize = 200;
      const totalChunks = Math.ceil(batch.importedClientIds.length / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        const chunk = batch.importedClientIds.slice(i * chunkSize, (i + 1) * chunkSize);
        const writeOp = writeBatch(db);

        chunk.forEach((clientId) => {
          const clientRef = doc(db, 'users', userDocId, 'clients', clientId);
          writeOp.delete(clientRef);
        });

        await writeOp.commit();
      }

      await deleteDoc(doc(db, 'users', userDocId, 'import_history', batch.id));

      setIsProcessing(false);
      showToast('success', 'Rollback Successful', 'Import batch safely reverted.');
    } catch (err) {
      console.error('Rollback Error:', err);
      setIsProcessing(false);
      showToast('error', 'Rollback Failed', 'Could not rollback import batch.');
    }
  };

  const handleOpenBatchEdit = async (batch: ImportBatch) => {
    if (!currentUser) return;
    setEditingBatch(batch);
    setIsBatchLoading(true);

    try {
      const userDocId = getUserDocId(currentUser);
      const clientsRef = collection(db, 'users', userDocId, 'clients');
      const querySnapshot = await getDocs(clientsRef);

      const records: ProcessedRecord[] = [];
      querySnapshot.docs.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.importBatchId === batch.id || batch.importedClientIds.includes(d.id)) {
          records.push({
            id: d.id,
            name: d.name || 'Unnamed',
            originalPhone: d.phone || '',
            normalizedPhone: d.phone || '',
            status: 'valid'
          });
        }
      });

      setBatchRecords(records);
      setIsBatchLoading(false);
    } catch (err) {
      console.error('Fetch batch records failed:', err);
      setIsBatchLoading(false);
      showToast('error', 'Load Failed', 'Could not fetch records for this batch.');
    }
  };

  const navigationTabs = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'import_clients', label: 'Import Clients', icon: FileSpreadsheet, href: '/import-clients' },
    { id: 'sell', label: 'Composer', icon: ShoppingCart, href: '/composer' },
    { id: 'analytics', label: 'Clients', icon: Users, href: '/clients' },
    { id: 'notification', label: 'Settings', icon: Bell, href: '/quiz' }
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#070b13]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f8fafc] dark:bg-[#070b13] text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-28 ${isDark ? 'dark' : ''}`}>

      {/* NAVBAR */}
      <div className="w-full bg-white/60 dark:bg-[#070b13]/60 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80 sticky top-0 z-40 shadow-sm">
        <div className="mx-auto max-w-7xl flex h-14 items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center h-9 w-9 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="relative w-full max-w-[200px] sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search parsed records..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-[#0c1222]/80 py-1.5 pl-9 pr-3 text-xs font-bold outline-none transition-all focus:border-orange-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDark(!isDark)}
              className="flex h-7 w-12 items-center rounded-full bg-slate-200/80 p-0.5 transition-all dark:bg-slate-800 border border-slate-300/40 dark:border-slate-700/50"
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-white text-orange-500 shadow-md transition-all ${isDark ? 'translate-x-5 bg-slate-950 text-yellow-400' : ''}`}>
                {isDark ? <Moon className="h-3 w-3 fill-current" /> : <Sun className="h-3 w-3 fill-current" />}
              </div>
            </button>

            <Link
              to="/alerts"
              className="relative rounded-xl p-2 text-slate-500 hover:bg-orange-500/10 dark:text-slate-400 dark:hover:bg-[#0c1222] transition-all flex items-center justify-center"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#070b13]">
                2
              </span>
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8 space-y-6">

        {/* HERO */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-white via-orange-50/40 to-amber-50/20 dark:from-[#0c1222] dark:via-[#0c1222]/90 dark:to-[#070b13] p-6 sm:p-8 border-2 border-orange-500/40 shadow-sm">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider">Whatsapp Engine</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-extrabold text-xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-spin" />
                <span>Global Country Validation Active</span>
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
                <Users className="h-8 w-8 text-orange-500" /> Import Clients
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 max-w-xl">
                Import client contacts worldwide directly from Excel or CSV files with auto column mapping and international standard verification.
              </p>
            </div>
          </div>
        </div>

        {/* DROPZONE */}
        <div className="bg-white/90 dark:bg-[#0c1222]/90 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
              dragActive
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-slate-300 dark:border-slate-800 hover:border-orange-500/50 hover:bg-orange-500/5'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
              {isProcessing ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : selectedFileName ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              ) : (
                <Upload className="h-8 w-8" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {selectedFileName ? selectedFileName : 'Drag & Drop your Excel file here'}
              </h3>
              <p className="text-xs font-bold text-slate-400">
                Supports .xlsx, .xls, and .csv formats
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2 justify-center">
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs px-6 py-2.5 active:scale-95"
              >
                Browse Files
              </Button>

              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadTemplate();
                }}
                variant="outline"
                className="border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-2xl font-black text-xs px-5 py-2.5"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download Template
              </Button>
            </div>
          </div>
        </div>

        {/* REDESIGNED DROPDOWNS MATCHING CARD UI */}
        {excelHeaders.length > 0 && (
          <div className="bg-white/90 dark:bg-[#0c1222]/90 border border-slate-200/80 dark:border-slate-800/80 rounded-[2.5rem] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Auto Column Mapping
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">Match headers to fields</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* NAME FIELD DROPDOWN */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-orange-500" /> Name Field
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNameDropdownOpen(!isNameDropdownOpen);
                      setIsPhoneDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-full bg-[#f4f7f9] dark:bg-[#070b13] border-2 ${
                      isNameDropdownOpen ? 'border-orange-500' : 'border-orange-500/80'
                    } py-3.5 px-6 text-sm font-black text-slate-900 dark:text-white shadow-sm hover:border-orange-500 transition-all text-left`}
                  >
                    <span>{columnMap.name || 'Select Name Column'}</span>
                    <ChevronDown className={`h-4 w-4 text-orange-500 transition-transform ${isNameDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isNameDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white dark:bg-[#0c1222] border-2 border-orange-500/40 rounded-3xl shadow-xl overflow-hidden py-2 max-h-48 overflow-y-auto">
                      {excelHeaders.map((header) => (
                        <button
                          key={header}
                          type="button"
                          onClick={() => {
                            handleMappingChange('name', header);
                            setIsNameDropdownOpen(false);
                          }}
                          className={`w-full text-left px-6 py-2.5 text-xs font-black transition-colors flex items-center justify-between ${
                            columnMap.name === header
                              ? 'bg-orange-500/10 text-orange-500'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{header}</span>
                          {columnMap.name === header && <Check className="h-3.5 w-3.5 text-orange-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* WHATSAPP / PHONE FIELD DROPDOWN */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-orange-500" /> WhatsApp / Phone Field
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPhoneDropdownOpen(!isPhoneDropdownOpen);
                      setIsNameDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-full bg-[#f4f7f9] dark:bg-[#070b13] border-2 ${
                      isPhoneDropdownOpen ? 'border-orange-500' : 'border-slate-200 dark:border-slate-800'
                    } py-3.5 px-6 text-sm font-black text-slate-900 dark:text-white shadow-sm hover:border-orange-500 transition-all text-left`}
                  >
                    <span>{columnMap.phone || 'Select Phone Column'}</span>
                    <ChevronDown className={`h-4 w-4 text-orange-500 transition-transform ${isPhoneDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isPhoneDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white dark:bg-[#0c1222] border-2 border-orange-500/40 rounded-3xl shadow-xl overflow-hidden py-2 max-h-48 overflow-y-auto">
                      {excelHeaders.map((header) => (
                        <button
                          key={header}
                          type="button"
                          onClick={() => {
                            handleMappingChange('phone', header);
                            setIsPhoneDropdownOpen(false);
                          }}
                          className={`w-full text-left px-6 py-2.5 text-xs font-black transition-colors flex items-center justify-between ${
                            columnMap.phone === header
                              ? 'bg-orange-500/10 text-orange-500'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{header}</span>
                          {columnMap.phone === header && <Check className="h-3.5 w-3.5 text-orange-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW & STATS & PAGINATED TABLE */}
        {processedRecords.length > 0 && (
          <div className="bg-white dark:bg-[#0c1222] border border-slate-200/70 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">IMPORT PREVIEW</h2>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setShowInvalidOnly(!showInvalidOnly);
                    setCurrentPage(1);
                  }}
                  variant="outline"
                  size="sm"
                  className={`rounded-xl text-xs font-bold ${
                    showInvalidOnly
                      ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {showInvalidOnly ? 'Showing Invalid Records' : `View Invalid Records (${stats.invalid})`}
                </Button>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-[#070b13] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Total</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</span>
              </div>

              <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20 text-center">
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">Valid</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.valid}</span>
              </div>

              <div className="bg-rose-500/10 p-3.5 rounded-2xl border border-rose-500/20 text-center">
                <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 block">Invalid</span>
                <span className="text-xl font-black text-rose-600 dark:text-rose-400">{stats.invalid}</span>
              </div>

              <div className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20 text-center">
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 block">Duplicate</span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.duplicate}</span>
              </div>
            </div>

            {/* CONFIGURATION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-[#070b13] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-900 dark:text-white block">
                  Existing Clients Handling
                </span>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="dupOption"
                      checked={dupOption === 'skip'}
                      onChange={() => setDupOption('skip')}
                      className="accent-orange-500"
                    />
                    Skip existing clients
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="dupOption"
                      checked={dupOption === 'update'}
                      onChange={() => setDupOption('update')}
                      className="accent-orange-500"
                    />
                    Update existing clients
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black text-slate-900 dark:text-white block">
                  Import Options
                </span>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.importValid}
                      onChange={(e) => setImportOptions({ ...importOptions, importValid: e.target.checked })}
                      className="accent-orange-500 rounded"
                    />
                    Valid records
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.skipInvalid}
                      onChange={(e) => setImportOptions({ ...importOptions, skipInvalid: e.target.checked })}
                      className="accent-orange-500 rounded"
                    />
                    Skip invalid
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.skipDuplicates}
                      onChange={(e) => setImportOptions({ ...importOptions, skipDuplicates: e.target.checked })}
                      className="accent-orange-500 rounded"
                    />
                    Skip duplicates
                  </label>
                </div>
              </div>
            </div>

            {/* PREVIEW TABLE WITH 10 CLIENTS PAGINATION */}
            <div className="space-y-3">
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden overflow-x-auto">
                <div className="bg-slate-100 dark:bg-slate-900 flex text-[10px] font-black uppercase text-slate-400 px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 min-w-[500px]">
                  <div className="w-12">#</div>
                  <div className="w-1/3">Name</div>
                  <div className="w-1/3">Original Number</div>
                  <div className="w-1/3">Normalized Number</div>
                  <div className="w-28 text-center">Status</div>
                  <div className="w-16 text-center">Action</div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 min-w-[500px]">
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((row, idx) => (
                      <div key={row.id} className="flex items-center text-xs font-bold px-3 py-2.5 text-slate-800 dark:text-slate-200 hover:bg-orange-500/5">
                        <div className="w-12 text-slate-400 font-mono text-[11px]">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </div>
                        <div className="w-1/3 truncate font-extrabold">{row.name}</div>
                        <div className="w-1/3 truncate font-mono text-slate-400">{row.originalPhone}</div>
                        <div className="w-1/3 truncate font-mono text-orange-500">{row.normalizedPhone || '—'}</div>
                        <div className="w-28 flex justify-center">
                          {row.status === 'valid' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-black flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Valid
                            </span>
                          )}
                          {row.status === 'invalid' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[11px] font-black flex items-center gap-1" title={row.errorReason}>
                              <AlertCircle className="h-3 w-3" /> Invalid
                            </span>
                          )}
                          {row.status === 'duplicate' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[11px] font-black flex items-center gap-1" title={row.errorReason}>
                              <AlertCircle className="h-3 w-3" /> Duplicate
                            </span>
                          )}
                        </div>
                        <div className="w-16 flex justify-center">
                          <button
                            onClick={() => {
                              setEditingBatch(null);
                              setEditingRecord({ ...row });
                            }}
                            className="p-1.5 rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all"
                            title="Edit row & View Suggestion"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs font-bold text-slate-400">No client records found.</div>
                  )}
                </div>
              </div>

              {/* PAGINATION CONTROL BAR */}
              <div className="flex items-center justify-between pt-2 px-1">
                <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  Pg {currentPage}/{totalPages} <span className="text-slate-400 font-bold">({filteredRecords.length})</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="rounded-full px-3 text-xs font-bold border-slate-200 dark:border-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Prev
                  </Button>

                  <Button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="rounded-full px-3 text-xs font-extrabold border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* PROGRESS & ACTION BUTTONS */}
            {isUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Importing Clients to Firestore...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setProcessedRecords([]);
                  setSelectedFileName(null);
                }}
                className="rounded-2xl text-xs font-bold border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>

              <Button
                disabled={isUploading || stats.valid === 0}
                onClick={handleExecuteImport}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-xs px-6 shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Storing Clients...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Import {dupOption === 'update' ? stats.valid + stats.duplicate : stats.valid} Clients
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* RECENT HISTORY */}
        {importHistory.length > 0 && (
          <div className="bg-white/90 dark:bg-[#0c1222]/90 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Recent Imports & Rollback</h3>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden overflow-x-auto">
              <div className="bg-slate-100 dark:bg-slate-900 flex text-[10px] font-black uppercase text-slate-400 px-3 py-2 border-b border-slate-200 dark:border-slate-800 min-w-[500px]">
                <div className="w-1/3">File Name</div>
                <div className="w-1/6 text-center">Imported</div>
                <div className="w-1/6 text-center">Skipped</div>
                <div className="w-1/4 text-center">Date</div>
                <div className="w-24 text-center">Actions</div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 min-w-[500px]">
                {importHistory.map((batch) => (
                  <div key={batch.id} className="flex items-center text-xs font-bold px-3 py-2 text-slate-800 dark:text-slate-200">
                    <div className="w-1/3 truncate text-orange-500 font-extrabold">{batch.fileName}</div>
                    <div className="w-1/6 text-center text-emerald-500">{batch.importedCount}</div>
                    <div className="w-1/6 text-center text-slate-400">{batch.skippedCount}</div>
                    <div className="w-1/4 text-center text-slate-400 text-[11px]">
                      {batch.timestamp?.toDate ? batch.timestamp.toDate().toLocaleDateString() : 'Recently'}
                    </div>
                    <div className="w-24 flex justify-center gap-2">
                      <button
                        onClick={() => handleOpenBatchEdit(batch)}
                        className="p-1.5 rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all"
                        title="Edit Batch Records"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => triggerRollbackModal(batch)}
                        className="p-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                        title="Rollback Import"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* BATCH EDIT MODAL */}
      {editingBatch && !editingRecord && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-[#0c1222] border-2 border-orange-500/40 rounded-[2.5rem] p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Batch Details: {editingBatch.fileName}
                </h3>
                <span className="text-xs font-bold text-slate-400">Edit individual imported records</span>
              </div>
              <button
                onClick={() => setEditingBatch(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isBatchLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-900 flex text-[10px] font-black uppercase text-slate-400 px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="w-1/2">Name</div>
                    <div className="w-1/2">Phone Number</div>
                    <div className="w-12 text-center">Edit</div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {batchRecords.map((rec) => (
                      <div key={rec.id} className="flex items-center text-xs font-bold px-3 py-2 text-slate-800 dark:text-slate-200">
                        <div className="w-1/2 truncate font-extrabold">{rec.name}</div>
                        <div className="w-1/2 font-mono text-orange-500">{rec.normalizedPhone}</div>
                        <div className="w-12 flex justify-center">
                          <button
                            onClick={() => setEditingRecord({ ...rec })}
                            className="p-1.5 rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HIGHER Z-INDEX EDIT RECORD MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1222] border-2 border-orange-500/50 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-orange-500/10 text-orange-500">
                  <Edit2 className="h-5 w-5" />
                </div>
                Edit Record Details
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 block mb-1.5">
                  Client Name
                </label>
                <input
                  type="text"
                  value={editingRecord.name}
                  onChange={(e) => setEditingRecord({ ...editingRecord, name: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-[#f4f7f9] dark:bg-[#070b13] p-3.5 text-sm font-black outline-none focus:border-orange-500 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 block mb-1.5">
                  WhatsApp / Mobile Number
                </label>
                <input
                  type="text"
                  value={editingRecord.originalPhone}
                  onChange={(e) => setEditingRecord({ ...editingRecord, originalPhone: e.target.value })}
                  placeholder="e.g. +923001234567"
                  className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-[#f4f7f9] dark:bg-[#070b13] p-3.5 text-sm font-black outline-none focus:border-orange-500 text-slate-900 dark:text-white transition-all"
                />
              </div>

              {editingRecord.errorReason && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <Info className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Smart Format Suggestion</span>
                  </div>
                  <p className="text-[11px] font-bold leading-relaxed">{editingRecord.errorReason}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingRecord(null)}
                className="rounded-2xl text-xs font-black border-slate-200 dark:border-slate-800 px-5 py-2.5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black px-6 py-2.5 shadow-md shadow-orange-500/20 active:scale-95"
              >
                <Check className="h-4 w-4 mr-1.5" /> Save & Re-Validate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BEAUTIFUL ANIMATED GLOWING UNDO NOTIFICATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="relative bg-[#0c1222] text-white rounded-[2.5rem] p-8 max-w-sm w-full space-y-6 text-center border-2 border-orange-500/60 shadow-[0_0_50px_rgba(249,115,22,0.3)] animate-pulse-glow">
            
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/40">
              <Undo2 className="h-8 w-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                Rollback Request
              </span>
              <h3 className="text-xl font-black tracking-tight text-white">{confirmModal.title}</h3>
              <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', batch: null })}
                variant="outline"
                className="bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700 rounded-2xl font-black text-xs px-6 py-3"
              >
                Cancel
              </Button>

              <Button
                onClick={handleConfirmRollback}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-xs px-6 py-3 shadow-lg shadow-orange-500/30 active:scale-95 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" /> Confirm Undo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className={`bg-white dark:bg-[#0c1222] border-2 rounded-[2rem] p-6 max-w-xs w-full text-center space-y-3 relative shadow-2xl transition-all pointer-events-auto ${
            toast.type === 'success'
              ? 'border-emerald-500/60 shadow-emerald-500/10'
              : 'border-rose-500/60 shadow-rose-500/10'
          }`}>
            <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${
              toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">{toast.title}</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-snug">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto bg-white dark:bg-[#0c1222] border border-slate-100 dark:border-slate-800 rounded-full shadow-lg px-5 py-2.5 flex items-center gap-4 sm:gap-8">
          {navigationTabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Link key={tab.id} to={tab.href} onClick={() => setActiveTab(tab.id)}>
                <div className="flex flex-col items-center justify-center relative group cursor-pointer">
                  <div className={`flex items-center justify-center transition-all ${
                    isActive ? 'h-10 w-10 rounded-full bg-orange-500 text-white' : 'h-8 w-8 text-slate-400 hover:text-orange-500'
                  }`}>
                    <IconComponent className={isActive ? 'h-5 w-5' : 'h-4 w-4'} />
                  </div>
                  <span className={`text-[10px] font-bold mt-1 ${isActive ? 'text-orange-500 font-extrabold' : 'text-slate-400'}`}>
                    {tab.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
