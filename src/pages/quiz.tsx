import React, { useState } from 'react';
import { 
  User, 
  Shield, 
  Monitor, 
  Bell, 
  Sliders, 
  AlertTriangle, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Download, 
  Moon, 
  Sun, 
  Wifi, 
  Home, 
  FileSpreadsheet, 
  Send, 
  Users, 
  Settings,
  Menu,
  Phone
} from 'lucide-react';

export default function ProfileSettingsPage() {
  // Navigation & Tab States
  const [activeTab, setActiveTab] = useState('My Profile');
  const [activeNav, setActiveNav] = useState('Settings');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    fullName: 'Admin User',
    phone: '+92 300 1234567',
    role: 'Administrator',
    businessName: 'WhatsApp Engine',
    businessEmail: 'hello@engine.com',
    businessPhone: '+92 300 1234567',
    timezone: '(GMT+05:00) Asia/Karachi',
  });

  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setProfileImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const tabs = [
    { name: 'My Profile', icon: User },
    { name: 'Security', icon: Shield },
    { name: 'Sessions', icon: Monitor },
    { name: 'Notifications', icon: Bell },
    { name: 'Preferences', icon: Sliders },
    { name: 'Danger Zone', icon: AlertTriangle },
  ];

  const bottomNavItems = [
    { name: 'Home', icon: Home, key: 'Home' },
    { name: 'Import Excel', icon: FileSpreadsheet, key: 'Import Excel' },
    { name: 'Composer', icon: Send, key: 'Composer' },
    { name: 'Clients', icon: Users, key: 'Clients' },
    { name: 'Settings', icon: Settings, key: 'Settings' },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-[#0a0f1d] text-slate-100' : 'bg-[#f8fafc] text-slate-900'} transition-colors duration-300 pb-32`}>
      
      {/* TOP HEADER SECTION */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-2xl">
            <User className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Profile Settings</h1>
            <p className="text-xs font-semibold text-slate-400">Manage your account, security and preferences.</p>
          </div>
        </div>

        {/* TOP RIGHT UTILITY ACTION BUTTONS */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button className="p-2 rounded-full bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all">
            <Download className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>
          <button className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-orange-500"></span>
          </button>
          <button className="p-2 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
            <Wifi className="h-4 w-4" />
          </button>

          <button className="ml-3 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
            Save Changes
          </button>
        </div>
      </header>

      {/* HORIZONTAL CATEGORY TABS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-6">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800/80 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT GRID LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* CARD 1: PERSONAL INFORMATION */}
          <div className="lg:col-span-3 bg-white dark:bg-[#111827] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-orange-500 font-extrabold text-xs tracking-wide">
              <User className="h-4 w-4" />
              <span>Personal Information</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Email Address</label>
                <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden px-2">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-2 py-2.5 bg-transparent text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Manager">Manager</option>
                  <option value="Agent">Agent</option>
                </select>
              </div>
            </div>
          </div>

          {/* CARD 2: WORKSPACE PROFILE */}
          <div className="lg:col-span-3 bg-white dark:bg-[#111827] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-orange-500 font-extrabold text-xs tracking-wide">
              <User className="h-4 w-4" />
              <span>Workspace Profile</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Business Name</label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Business Email</label>
                  <input
                    type="email"
                    name="businessEmail"
                    value={formData.businessEmail}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Business Phone</label>
                <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden px-2">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="text"
                    name="businessPhone"
                    value={formData.businessPhone}
                    onChange={handleInputChange}
                    className="w-full px-2 py-2.5 bg-transparent text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Timezone</label>
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="(GMT+05:00) Asia/Karachi">(GMT+05:00) Asia/Karachi</option>
                  <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                </select>
              </div>
            </div>
          </div>

          {/* CARD 3: PROFILE PHOTO */}
          <div className="lg:col-span-3 bg-white dark:bg-[#111827] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col items-center justify-between gap-4">
            <div className="w-full flex items-center gap-2 text-orange-500 font-extrabold text-xs tracking-wide">
              <User className="h-4 w-4" />
              <span>Profile Photo</span>
            </div>

            <div className="relative group my-auto">
              <div className="h-28 w-28 rounded-full border-2 border-orange-500/20 p-1 flex items-center justify-center bg-gradient-to-br from-amber-100 to-emerald-100 dark:from-slate-800 dark:to-slate-900 overflow-hidden shadow-inner">
                {profileImage ? (
                  <img src={profileImage} alt="Profile Avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User className="h-14 w-14 text-orange-500/80" />
                )}
              </div>
            </div>

            <div className="w-full flex items-center gap-2">
              <label className="flex-1 py-2 px-3 rounded-2xl border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                <Upload className="h-3.5 w-3.5" />
                <span>Change Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>

              <button 
                onClick={() => setProfileImage(null)} 
                className="py-2 px-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs flex items-center justify-center gap-1 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* CARD 4: PROFILE COMPLETION */}
          <div className="lg:col-span-3 bg-white dark:bg-[#111827] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-500 font-extrabold text-xs tracking-wide">
                <Sliders className="h-4 w-4" />
                <span>Profile Completion</span>
              </div>
              <span className="text-sm font-black text-emerald-500">85%</span>
            </div>

            {/* PROGRESS BAR */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[85%] rounded-full transition-all duration-500"></div>
            </div>

            {/* CHECKLIST STEPS */}
            <div className="space-y-2.5 pt-1">
              {[
                { label: 'Basic Information', completed: true },
                { label: 'Email Verified', completed: true },
                { label: 'Phone Verified', completed: true },
                { label: 'Profile Photo', completed: true },
                { label: 'Workspace Profile', completed: false },
              ].map((step, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-bold">
                  <span className={step.completed ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>
                    {step.label}
                  </span>
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 dark:border-slate-700"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* BOTTOM PANEL: API SETTINGS */}
        <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl">
              <Menu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">API Settings</h2>
              <p className="text-xs font-semibold text-slate-400">Manage WhatsApp API connection, credentials and webhooks.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-xl border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 font-bold text-xs transition-all">
              Test Connection
            </button>
            <button className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md transition-all">
              Save Changes
            </button>
          </div>
        </div>
      </main>

      {/* FLOATING BOTTOM NAVIGATION BAR (MATCHING SECOND IMAGE EXACTLY) */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4">
        <nav className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-full shadow-2xl px-6 py-2 flex items-center gap-6 sm:gap-10">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveNav(item.key)}
                className="flex flex-col items-center justify-center transition-all group"
              >
                {isActive ? (
                  <div className="h-11 w-11 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/40 mb-1">
                    <Icon className="h-5 w-5 stroke-[2.2]" />
                  </div>
                ) : (
                  <div className="h-9 w-9 flex items-center justify-center text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">
                    <Icon className="h-5 w-5 stroke-[1.8]" />
                  </div>
                )}
                <span className={`text-[10px] font-extrabold tracking-tight ${
                  isActive ? 'text-orange-500' : 'text-slate-400'
                }`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
