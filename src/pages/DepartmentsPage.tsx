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
  PieChart,
  PackagePlus,
  FileSpreadsheet,
  AlertCircle,
  FileCheck,
  Zap,
  ShieldCheck,
  Layers,
  Printer
} from 'lucide-react';

// Firebase Imports
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc,
  increment
} from 'firebase/firestore';

interface CategoryItem {
  id: string;
  name: string;
  code: string;
  products: any[];
}

interface ParsedRow {
  category: string;
  productName: string;
  quantity: number;
  costPrice: number;
  salePrice?: number;
  isValid: boolean;
  errorReason?: string;
}

export default function ImportExcel() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // User & Auth
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // UI Theme & Nav
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState('import_excel');
  const [searchQuery, setSearchQuery] = useState('');

  // Firestore Data
  const [categoryList, setCategoryList] = useState<CategoryItem[]>([]);

  // Excel State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Toast / Notification State
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

  const getCurrentMonthKey = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const getUserDocId = (user: User | null): string => {
    if (!user) return 'test_user';
    return user.email ? user.email.toLowerCase().trim() : user.uid;
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Firestore Categories
  useEffect(() => {
    if (!currentUser) return;
    const userDocId = getUserDocId(currentUser);
    const userCategoriesRef = collection(db, 'users', userDocId, 'inventory_categories');

    const unsub = onSnapshot(userCategoriesRef, (snapshot) => {
      const fetched: CategoryItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name || '',
        code: docSnap.data().code || '',
        products: docSnap.data().products || []
      }));
      setCategoryList(fetched);
    });

    return () => unsub();
  }, [currentUser]);

  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ isOpen: true, type, title, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isOpen: false }));
    }, 3000);
  };

  // Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Process Excel File
  const processFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      showToast('error', 'Invalid File', 'Please upload a valid Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setSelectedFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const rows: ParsedRow[] = rawData.map((row) => {
          // Normalize column headers
          const category = String(row['Category'] || row['category'] || row['Card'] || 'General').trim();
          const productName = String(row['Product Name'] || row['Product'] || row['Name'] || row['name'] || '').trim();
          const quantity = Number(row['Quantity'] || row['Qty'] || row['quantity'] || 0);
          const costPrice = Number(row['Cost Price'] || row['Cost'] || row['Price'] || row['costPrice'] || 0);
          const salePrice = Number(row['Sale Price'] || row['Sale'] || row['salePrice'] || costPrice);

          let isValid = true;
          let errorReason = '';

          if (!productName) {
            isValid = false;
            errorReason = 'Missing product name';
          } else if (isNaN(quantity) || quantity < 0) {
            isValid = false;
            errorReason = 'Invalid quantity';
          } else if (isNaN(costPrice) || costPrice < 0) {
            isValid = false;
            errorReason = 'Invalid cost price';
          }

          return { category, productName, quantity, costPrice, salePrice, isValid, errorReason };
        });

        setParsedRows(rows);
        setIsProcessing(false);
      } catch (err) {
        console.error('Error reading Excel:', err);
        showToast('error', 'Parse Error', 'Failed to read the Excel file structure.');
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Metrics
  const validRows = useMemo(() => parsedRows.filter((r) => r.isValid), [parsedRows]);
  const invalidRows = useMemo(() => parsedRows.filter((r) => !r.isValid), [parsedRows]);

  const filteredPreviewRows = useMemo(() => {
    if (!searchQuery.trim()) return parsedRows;
    const q = searchQuery.toLowerCase();
    return parsedRows.filter(
      (r) => r.productName.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
    );
  }, [parsedRows, searchQuery]);

  // Bulk Import Execution
  const handleExecuteImport = async () => {
    if (!currentUser || validRows.length === 0) return;

    setIsUploading(true);
    const userDocId = getUserDocId(currentUser);
    const monthKey = getCurrentMonthKey();

    try {
      // Group valid items by Category
      const categoryGroup: Record<string, ParsedRow[]> = {};
      validRows.forEach((row) => {
        const catKey = row.category || 'General';
        if (!categoryGroup[catKey]) categoryGroup[catKey] = [];
        categoryGroup[catKey].push(row);
      });

      const defaultAvatar =
        'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=200&auto=format&fit=crop&q=80';

      for (const [catName, items] of Object.entries(categoryGroup)) {
        // Find existing category or derive ID
        let targetCategory = categoryList.find(
          (c) => c.name.toLowerCase() === catName.toLowerCase()
        );
        let categoryId = targetCategory
          ? targetCategory.id
          : catName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();

        const categoryDocRef = doc(db, 'users', userDocId, 'inventory_categories', categoryId);

        let existingProducts = targetCategory ? [...targetCategory.products] : [];

        for (const item of items) {
          const newProductId = Date.now() + Math.floor(Math.random() * 1000);
          const newProdObj = {
            id: newProductId,
            name: item.productName,
            quantity: String(item.quantity),
            costPrice: String(item.costPrice),
            salePrice: String(item.salePrice || item.costPrice),
            avatar: defaultAvatar,
            createdAt: new Date().toISOString()
          };

          existingProducts.unshift(newProdObj);

          // Update Monthly Record
          if (item.quantity > 0) {
            const monthlyDocRef = doc(db, 'users', userDocId, 'monthly_inventories', monthKey);
            const monthlySnap = await getDoc(monthlyDocRef);

            if (!monthlySnap.exists()) {
              await setDoc(monthlyDocRef, {
                month: monthKey,
                items: {
                  [newProductId]: {
                    productId: newProductId,
                    name: item.productName,
                    addedInMonth: item.quantity,
                    costPrice: item.costPrice,
                    lastUpdated: new Date().toISOString()
                  }
                }
              });
            } else {
              await updateDoc(monthlyDocRef, {
                [`items.${newProductId}.productId`]: newProductId,
                [`items.${newProductId}.name`]: item.productName,
                [`items.${newProductId}.costPrice`]: item.costPrice,
                [`items.${newProductId}.lastUpdated`]: new Date().toISOString(),
                [`items.${newProductId}.addedInMonth`]: increment(item.quantity)
              });
            }
          }
        }

        // Save/Update Category
        if (targetCategory) {
          await updateDoc(categoryDocRef, { products: existingProducts });
        } else {
          await setDoc(categoryDocRef, {
            name: catName,
            code: catName.substring(0, 3).toUpperCase(),
            createdAt: new Date().toISOString(),
            products: existingProducts
          });
        }
      }

      setIsUploading(false);
      showToast('success', 'Import Successful!', `${validRows.length} items imported to database.`);

      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Import execution error:', error);
      setIsUploading(false);
      showToast('error', 'Import Failed', 'Failed to upload inventory items. Try again.');
    }
  };

  const navigationTabs = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'import_excel', label: 'Import Excel', icon: FileSpreadsheet, href: '/import-excel' },
    { id: 'sell', label: 'Sell Product', icon: ShoppingCart, href: '/sell' },
    { id: 'analytics', label: 'Analytics', icon: PieChart, href: '/analytics' },
    { id: 'notification', label: 'Notification', icon: Bell, href: '/alerts' }
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#070b13]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f8fafc] dark:bg-[#070b13] text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-28 ${isDark ? 'dark' : ''}`}>

      {/* TOP NAVBAR */}
      <div className="w-full bg-white/60 dark:bg-[#070b13]/60 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80 sticky top-0 z-40 shadow-sm transition-all">
        <div className="mx-auto max-w-7xl flex h-14 items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
          
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center h-9 w-9 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white transition-all shadow-[0_0_12px_rgba(249,115,22,0.25)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] active:scale-95 shrink-0"
              title="Go Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {/* SEARCH INPUT */}
            <div className="relative w-full max-w-[200px] sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search parsed items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-[#0c1222]/80 py-1.5 pl-9 pr-3 text-xs font-bold outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/30 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDark(!isDark)}
              className="flex h-7 w-12 items-center rounded-full bg-slate-200/80 p-0.5 transition-all dark:bg-slate-800 border border-slate-300/40 dark:border-slate-700/50 hover:shadow-[0_0_12px_rgba(249,115,22,0.2)]"
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-white text-orange-500 shadow-md transition-all ${isDark ? 'translate-x-5 bg-slate-950 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : ''}`}>
                {isDark ? <Moon className="h-3 w-3 fill-current" /> : <Sun className="h-3 w-3 fill-current" />}
              </div>
            </button>

            <Link
              to="/alerts"
              className="relative rounded-xl p-2 text-slate-500 hover:bg-orange-500/10 dark:text-slate-400 dark:hover:bg-[#0c1222] transition-all hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] active:scale-95 flex items-center justify-center"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#070b13] animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]">
                2
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-white via-orange-50/40 to-amber-50/20 dark:from-[#0c1222] dark:via-[#0c1222]/90 dark:to-[#070b13] p-6 sm:p-8 border-2 border-orange-500/40 dark:border-orange-500/50 shadow-[0_0_35px_rgba(249,115,22,0.25)] hover:shadow-[0_0_55px_rgba(249,115,22,0.45)] transition-all duration-500 group">
          <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-orange-500/25 blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-amber-500/20 blur-3xl animate-pulse pointer-events-none delay-700" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)] backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider">Excel Engine</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-extrabold text-xs shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-spin" />
                <span>Bulk Sync Active</span>
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white drop-shadow-sm flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-orange-500" /> Import Excel Inventory
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Upload your `.xlsx`, `.xls`, or `.csv` sheets to instantly sync stock products directly into your categories.
              </p>
            </div>
          </div>
        </div>

        {/* UPLOAD & DROPZONE CARD */}
        <div className="bg-white/90 dark:bg-[#0c1222]/90 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm backdrop-blur-sm space-y-4">
          
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
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center space-y-3 ${
              dragActive
                ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.3)] scale-[1.01]'
                : 'border-slate-300 dark:border-slate-800 hover:border-orange-500/50 hover:bg-orange-500/5'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              {isProcessing ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : selectedFileName ? (
                <FileCheck className="h-8 w-8 text-emerald-500" />
              ) : (
                <Upload className="h-8 w-8" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {selectedFileName ? selectedFileName : 'Drag & Drop Excel File Here'}
              </h3>
              <p className="text-xs font-bold text-slate-400">
                Supports `.xlsx`, `.xls`, and `.csv` formatted inventory files
              </p>
            </div>

            <Button
              type="button"
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs px-6 py-2.5 shadow-[0_0_15px_rgba(249,115,22,0.35)] transition-all active:scale-95 pointer-events-none"
            >
              Browse Computer File
            </Button>
          </div>

          {/* EXPECTED FORMAT INSTRUCTIONS */}
          <div className="bg-slate-50 dark:bg-[#070b13] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 text-xs space-y-1.5">
            <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-orange-500" /> Expected Excel Column Headers:
            </span>
            <div className="text-slate-500 dark:text-slate-400 font-semibold flex flex-wrap gap-2">
              <span className="bg-slate-200 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-800 font-mono text-[11px]">
                Category
              </span>
              <span className="bg-slate-200 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-800 font-mono text-[11px]">
                Product Name
              </span>
              <span className="bg-slate-200 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-800 font-mono text-[11px]">
                Quantity
              </span>
              <span className="bg-slate-200 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-800 font-mono text-[11px]">
                Cost Price
              </span>
            </div>
          </div>
        </div>

        {/* PARSED DATA PREVIEW & CONFIRMATION */}
        {parsedRows.length > 0 && (
          <div className="bg-white dark:bg-[#0c1222] border border-slate-200/70 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm space-y-4">
            
            {/* STATS OVERVIEW */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-[#070b13] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Total Rows</span>
                <span className="text-base font-black text-slate-900 dark:text-white">{parsedRows.length}</span>
              </div>

              <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20">
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">Valid Items</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{validRows.length}</span>
              </div>

              <div className="bg-rose-500/10 p-3.5 rounded-2xl border border-rose-500/20 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 block">Errors / Invalid</span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400">{invalidRows.length}</span>
              </div>
            </div>

            {/* PREVIEW TABLE */}
            <div className="space-y-2 overflow-x-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Sheet Preview</h3>
                <span className="text-xs font-bold text-orange-500">{filteredPreviewRows.length} rows showing</span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden min-w-[500px]">
                <div className="bg-slate-100 dark:bg-slate-900 flex text-[10px] font-black uppercase text-slate-400 px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="w-1/4">Category</div>
                  <div className="w-1/3">Product Name</div>
                  <div className="w-1/6 text-center">Qty</div>
                  <div className="w-1/6 text-right">Cost (PKR)</div>
                  <div className="w-12 text-center">Status</div>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredPreviewRows.map((row, idx) => (
                    <div key={idx} className="flex items-center text-xs font-bold px-3 py-2 text-slate-800 dark:text-slate-200 hover:bg-orange-500/5">
                      <div className="w-1/4 truncate font-extrabold text-orange-500">{row.category}</div>
                      <div className="w-1/3 truncate">{row.productName}</div>
                      <div className="w-1/6 text-center">{row.quantity}</div>
                      <div className="w-1/6 text-right">PKR {row.costPrice.toLocaleString()}</div>
                      <div className="w-12 flex justify-center">
                        {row.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-rose-500" title={row.errorReason} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* IMPORT ACTION BUTTON */}
            <Button
              disabled={isUploading || validRows.length === 0}
              onClick={handleExecuteImport}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-xs shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading & Syncing Database...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Import {validRows.length} Valid Products Now
                </>
              )}
            </Button>
          </div>
        )}

      </main>

      {/* TOAST NOTIFICATION */}
      {toast.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in zoom-in-90 duration-200">
          <div className={`bg-white dark:bg-[#0c1222] border rounded-3xl p-6 max-w-xs w-full text-center space-y-3 relative shadow-2xl transition-all duration-300 ${
            toast.type === 'success'
              ? 'border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.4)]'
              : 'border-rose-500/50 shadow-[0_0_50px_rgba(244,63,94,0.4)]'
          }`}>
            <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center animate-bounce ${
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

      {/* FLOATING BOTTOM NAVBAR */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto bg-white dark:bg-[#0c1222] border border-slate-100 dark:border-slate-800 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] px-5 py-2.5 flex items-center gap-4 sm:gap-8">
          {navigationTabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                to={tab.href}
                onClick={() => setActiveTab(tab.id)}
                className="outline-none"
              >
                <div className="flex flex-col items-center justify-center relative group cursor-pointer">
                  <div
                    className={`flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? 'h-10 w-10 rounded-full bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                        : 'h-8 w-8 text-slate-400 hover:text-orange-500'
                    }`}
                  >
                    <IconComponent className={isActive ? 'h-5 w-5' : 'h-4 w-4'} />
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-1 transition-colors ${
                      isActive ? 'text-orange-500 font-extrabold' : 'text-slate-400'
                    }`}
                  >
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
