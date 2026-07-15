import React, { useState } from 'react';
import { UserRole } from '../types';
import { 
  LogOut, Bell, Settings, User, LayoutDashboard, Home, Users, 
  CreditCard, Wrench, FileText, ChevronLeft, ChevronRight, Search, ChevronDown, 
  MoreHorizontal, Droplets, MessageSquare, BarChart3, Layers, HelpCircle, 
  Sparkles, Calendar, BookOpen
} from 'lucide-react';

interface LayoutProps {
  role: UserRole;
  onLogout: () => void;
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: any) => void;
  isManagingFullProperty?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ role, onLogout, children, activeView, onViewChange, isManagingFullProperty }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    roles: UserRole[];
    badge?: string;
  }

  // We map the menu items to exactly match the requested list:
  // Overview, Properties, Units, Tenants, Billing & Invoices, Payments, Expenses, Maintenance, Reports, Messages, Settings
  const menuItems: MenuItem[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} />, roles: [UserRole.LANDLORD] },
    { id: 'properties', label: 'Properties', icon: <Home size={20} />, roles: [UserRole.CARETAKER, UserRole.LANDLORD] },
    { id: 'units', label: 'Units', icon: <Layers size={20} />, roles: [UserRole.LANDLORD] },
    { id: 'tenants', label: 'Tenants', icon: <Users size={20} />, roles: [UserRole.CARETAKER, UserRole.LANDLORD] },
    { id: 'billing', label: 'Billing & Invoices', icon: <FileText size={20} />, roles: [UserRole.LANDLORD] },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={20} />, roles: [UserRole.CARETAKER, UserRole.LANDLORD, UserRole.TENANT] },
    { id: 'expenses', label: 'Expenses', icon: <FileText size={20} />, roles: [UserRole.LANDLORD] },
    { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={20} />, roles: [UserRole.CARETAKER, UserRole.LANDLORD] },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={20} />, roles: [UserRole.LANDLORD] },
    { id: 'water-meters', label: 'Water Meters', icon: <Droplets size={20} />, roles: [UserRole.LANDLORD, UserRole.CARETAKER] },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} />, roles: [UserRole.LANDLORD] },
    
    // Caretaker legacy routes
    { id: 'more', label: 'More Ops', icon: <MoreHorizontal size={20} />, roles: [UserRole.CARETAKER] },
    
    // Tenant legacy routes
    { id: 'profile', label: 'My Profile', icon: <User size={20} />, roles: [UserRole.TENANT] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(role));
  const isCaretaker = role === UserRole.CARETAKER;
  const showNav = !isCaretaker || !!isManagingFullProperty;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row overflow-hidden font-sans selection:bg-royal-500/30 selection:text-royal-900 h-[100dvh]">
      {/* Sidebar - Desktop Only */}
      {showNav && (
        <aside className={`${sidebarOpen ? 'w-80' : 'w-24'} bg-white text-slate-800 transition-all duration-500 ease-in-out hidden md:flex flex-col relative z-45 shadow-sm border-r border-slate-200/60`}>
          {/* Logo / Header Brand */}
          <div className="p-8 flex items-center gap-4 h-24 border-b border-slate-100">
            <div className="bg-royal-500 text-white min-w-[44px] h-11 rounded-xl font-display text-2xl flex items-center justify-center shadow-lg shadow-royal-500/20 active:scale-95 transition-all">
              <Home size={22} className="text-white" />
            </div>
            {sidebarOpen && (
              <div className="animate-fadeIn">
                <h1 className="font-sans text-lg font-black tracking-tight text-slate-900 uppercase">Properties</h1>
                <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-[-2px] uppercase">Operations Portal</p>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex-1 mt-6 px-4 space-y-1.5 overflow-y-auto scrollbar-hide">
            {filteredMenu.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative ${
                  activeView === item.id 
                    ? 'bg-royal-500 text-white shadow-lg shadow-royal-500/20 font-semibold' 
                    : 'text-slate-500 hover:text-royal-500 hover:bg-royal-50/50'
                }`}
              >
                <span className={`shrink-0 transition-transform duration-300 ${activeView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <span className="text-[13px] font-medium tracking-tight flex-1 text-left">{item.label}</span>
                )}
                {sidebarOpen && item.badge && (
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-royal-100 text-royal-500 rounded-md animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sidebar Footer Cards */}
          {sidebarOpen && (
            <div className="p-5 space-y-4 border-t border-slate-100 bg-slate-50/40">
              {/* Plan Card */}
              <div className="bg-gradient-to-br from-royal-500 to-royal-600 p-5 rounded-2xl text-white shadow-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Sparkles size={80} />
                </div>
                <p className="text-[9px] font-bold text-royal-100 uppercase tracking-widest">Current Plan</p>
                <h4 className="text-lg font-extrabold mt-0.5">Professional</h4>
                <p className="text-xs text-royal-50 mt-1 opacity-80">Up to 100 units</p>
                <button className="w-full mt-4 py-2 bg-white text-royal-600 rounded-xl text-xs font-bold hover:bg-royal-50 active:scale-95 transition-all shadow-sm">
                  Upgrade Plan
                </button>
              </div>

              {/* Support Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
                <div className="p-2.5 bg-royal-50 rounded-xl text-royal-500">
                  <HelpCircle size={18} />
                </div>
                <div className="flex-1">
                  <h5 className="text-xs font-bold text-slate-800">Need Help?</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">We're here to help you.</p>
                  <button className="mt-2 text-[10px] font-bold text-royal-500 hover:text-royal-600 border-b border-royal-100 pb-0.5 transition-colors">
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sign Out Section */}
          <div className="p-4 border-t border-slate-100">
            <button onClick={onLogout} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-50/50 transition-all duration-300 group">
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              {sidebarOpen && <span className="text-[13px] font-medium tracking-tight">Sign Out</span>}
            </button>
          </div>
          
          {/* Collapse Button */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="absolute top-10 -right-4 bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700 p-1 rounded-full shadow-md z-50 hover:scale-105 active:scale-95 transition-all"
          >
            {sidebarOpen ? <ChevronLeft size={14}/> : <ChevronRight size={14}/>}
          </button>
        </aside>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        {showNav && activeView !== 'water-meters' && (
          <header className="bg-white border-b border-slate-200/60 px-6 md:px-10 h-20 flex items-center justify-between shrink-0 z-30 shadow-sm">
            {/* Left: Global Search bar with Stripe look */}
            <div className="relative hidden md:block w-72 lg:w-96">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200/60 pl-11 pr-20 py-2 rounded-xl text-xs font-semibold focus:bg-white focus:border-royal-500 focus:ring-1 focus:ring-royal-500 outline-none transition-all" 
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200/60 rounded text-[9px] font-mono font-bold text-slate-500 shadow-sm border border-slate-300/40">
                <span>⌘</span><span>K</span>
              </div>
            </div>

            {/* Right: Date Range, Notifications & Profile */}
            <div className="flex items-center gap-4 ml-auto">
              {/* Date Range Picker */}
              <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
                <Calendar size={14} className="text-slate-400" />
                <span>May 1 - May 31, 2025</span>
                <ChevronDown size={14} className="text-slate-400 ml-1" />
              </button>

              {/* Bell notifications */}
              <button className="relative p-2 text-slate-400 hover:text-royal-500 hover:bg-royal-50 rounded-xl transition-all group border border-transparent hover:border-slate-100">
                <Bell size={20} className="group-hover:rotate-12 transition-all duration-300" />
                <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-rose-500 text-white font-black text-[9px] rounded-full border-2 border-white shadow-sm flex items-center justify-center animate-bounce">
                  6
                </span>
              </button>

              {/* User Avatar with Profile details */}
              <div className="flex items-center gap-3.5 pl-6 border-l border-slate-200/80">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-800">John Kamau</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Admin</p>
                </div>
                <div 
                  onClick={onLogout} 
                  title="Sign Out - Click to Exit" 
                  className="w-10 h-10 rounded-xl overflow-hidden cursor-pointer border border-slate-200 shadow-sm hover:border-royal-500 transition-all hover:scale-105 active:scale-95 relative group"
                >
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=150&h=150" 
                    referrerPolicy="no-referrer"
                    alt="John Kamau Avatar" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <LogOut size={14} className="text-white" />
                  </div>
                </div>
                <ChevronDown size={14} className="text-slate-400 cursor-pointer hover:text-slate-600" />
              </div>
            </div>
          </header>
        )}

        {/* Dynamic page description bar (only shown if not main overview/dashboard) */}
        {showNav && activeView !== 'overview' && activeView !== 'dashboard' && activeView !== 'water-meters' && (
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <span className="text-royal-500 font-bold uppercase tracking-wider text-[10px]">{activeView.replace('-', ' ')}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400 text-[11px]">
                {activeView === 'properties' && 'Manage unit inventory, building levels, and active assets.'}
                {activeView === 'units' && 'Total real estate structure list & unit yield analysis.'}
                {activeView === 'water-meters' && 'Record and analyze water utility meter readings.'}
                {activeView === 'tenants' && 'Resident directory, contact details, and lease signages.'}
                {activeView === 'payments' && 'Revenue collection ledgers and ledger settlement details.'}
                {activeView === 'expenses' && 'Capital outflows, operational overheads, and vendor audits.'}
                {activeView === 'reports' && 'Compliance documents and monthly system executive summaries.'}
                {activeView === 'settings' && 'M-Pesa API gateways and local Kenyan bank config setups.'}
              </span>
            </div>
          </div>
        )}

        {/* Main Workspace Frame */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10 scrollbar-hide pb-28 md:pb-12">
          <div className="max-w-[1600px] mx-auto animate-fadeIn">
            {children}
          </div>
        </main>

        {/* Bottom Navigation Menu - Mobile Only */}
        {showNav && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-200/60 px-4 pt-3 pb-[calc(10px+env(safe-area-inset-bottom))] flex items-center justify-between z-50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            {filteredMenu.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                  activeView === item.id ? 'text-royal-500' : 'text-slate-400'
                }`}
              >
                <div className={`p-2 rounded-2xl transition-all duration-300 ${activeView === item.id ? 'bg-royal-50 scale-105 shadow-sm' : ''}`}>
                  {React.cloneElement(item.icon as React.ReactElement, { size: 18 })}
                </div>
                <span className="text-[9px] font-semibold tracking-tight">{item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
};