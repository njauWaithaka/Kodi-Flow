import React, { useState, useMemo, useRef } from 'react';
import { Tenant, House, PaymentRecord, Expense, HouseStatus, MaintenanceStatus, PaymentConfig, Repair } from '../types';
import { KENYAN_BANKS } from '../constants';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, LineChart, Line 
} from 'recharts';
import { 
  TrendingUp, Users, DollarSign, Home, Activity, X, FileText, CreditCard,
  Wallet, Plus, Printer, ShieldCheck, Signature, Smartphone, Landmark, Save, 
  RefreshCw, ChevronRight, AlertTriangle, Briefcase, TrendingDown, Layers, Search, Filter, ChevronDown, CheckCircle2, AlertOctagon, ArrowRightCircle,
  Wrench, Calendar, Banknote, PieChart as PieChartIcon, MapPin, Download, LayoutGrid, List, SlidersHorizontal, Bell, Mail, Phone, Hash, Droplets
} from 'lucide-react';
import { analyzePropertyHealth } from '../services/geminiService';

interface Props {
  tenants: Tenant[];
  houses: House[];
  payments: PaymentRecord[];
  expenses: Expense[];
  view: string;
  onAddExpense: (expense: Expense) => void;
  onUpdateTenant?: (t: Tenant) => void;
  onAddHouse?: (h: House) => void;
  onAddTenant?: (t: Tenant) => void;
  onUpdateBills?: (tenantId: string, currentReading: number) => void;
  paymentConfig: PaymentConfig;
  onUpdatePaymentConfig: (config: PaymentConfig) => void;
}

export const LandlordDashboard: React.FC<Props> = ({ 
  tenants, houses, payments, expenses, view, onAddExpense, 
  onUpdateTenant, onAddHouse, onAddTenant, onUpdateBills, paymentConfig, onUpdatePaymentConfig 
}) => {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState<'FINANCIAL' | 'OCCUPANCY' | 'ARREARS' | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [localConfig, setLocalConfig] = useState<PaymentConfig>(paymentConfig);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showAddHouseModal, setShowAddHouseModal] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<'All' | 'Active' | 'Issues' | 'Vacant'>('All');
  const [propertyViewType, setPropertyViewType] = useState<'grid' | 'list'>('grid');
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  
  // New States for Redesigned SaaS Sections
  const [billingSearchQuery, setBillingSearchQuery] = useState('');
  const [billingMainTab, setBillingMainTab] = useState<'all' | 'rent' | 'water' | 'garbage' | 'latefees' | 'deposits' | 'arrears' | 'history'>('all');
  const [paymentsMainTab, setPaymentsMainTab] = useState<'transactions' | 'aging' | 'expenses' | 'mpesa' | 'reminders' | 'cashflow'>('transactions');
  const [selectedBillingFilter, setSelectedBillingFilter] = useState<'All' | 'Paid' | 'Overdue' | 'Partial' | 'Disputed'>('All');
  const [selectedBillingHistoryMonth, setSelectedBillingHistoryMonth] = useState<string>('Jun 2025');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [invoiceModalData, setInvoiceModalData] = useState<{unit: string, tenantName: string, total: number, paid: number, balance: number, status: string} | null>(null);
  const [receiptModalData, setReceiptModalData] = useState<{unit: string, tenantName: string, amount: number} | null>(null);
  const [showLateFeeSettingsModal, setShowLateFeeSettingsModal] = useState(false);
  const [showManualMatchModal, setShowManualMatchModal] = useState(false);
  const [showSendReminderModal, setShowSendReminderModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [disputeNotes, setDisputeNotes] = useState<Record<string, { type: string, note: string, status: string }>>({
    'A02': { type: 'Tenant Dispute', note: 'Tenant disputes water reading — requires re-check', status: 'Under Review' },
  });
  const [detailsDrawer, setDetailsDrawer] = useState<{ type: 'dispute' | 'record', unitId: string } | null>(null);
  const [paymentsSearchQuery, setPaymentsSearchQuery] = useState('');
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState('caretaker');
  const [messagesText, setMessagesText] = useState('');
  const [customMessages, setCustomMessages] = useState<any[]>([
    { id: 1, sender: 'Caretaker', role: 'Operations', text: 'Good morning John, water reading for Unit B3 is updated. Rent reminder sent!', time: '08:32 AM', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?fit=crop&w=100&h=100' },
    { id: 2, sender: 'Mary Atieno (C1)', role: 'Tenant', text: 'Hi Landlord, I have transferred the rent via M-Pesa. Here is the transaction code QY54D8.', time: 'Yesterday', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?fit=crop&w=100&h=100' },
    { id: 3, sender: 'You', role: 'Landlord', text: 'Thanks Mary! System should auto-reconcile in a few minutes.', time: 'Yesterday', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=150&h=150' },
  ]);

  // REDESIGNED TENANTS VIEW STATES
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');
  const [tenantFilter, setTenantFilter] = useState<'All' | 'Active' | 'Overdue' | 'Expiring Soon'>('All');
  const [selectedTenantForView, setSelectedTenantForView] = useState<Tenant | null>(null);
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);

  // REDESIGNED UNITS VIEW STATES
  const [selectedUnitProperty, setSelectedUnitProperty] = useState<string>('All');
  const [unitStatusFilter, setUnitStatusFilter] = useState<'All' | 'Occupied' | 'Vacant' | 'Maintenance' | 'Overdue'>('All');
  const [unitViewLayout, setUnitViewLayout] = useState<'grid' | 'list'>('grid');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isUnitDrawerOpen, setIsUnitDrawerOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showDrawerPaymentForm, setShowDrawerPaymentForm] = useState(false);
  const [drawerPaymentAmount, setDrawerPaymentAmount] = useState('');
  const [drawerPaymentMethod, setDrawerPaymentMethod] = useState<'M-Pesa' | 'Bank' | 'Cash'>('M-Pesa');
  const [localPaymentHistory, setLocalPaymentHistory] = useState<any[]>([]);

  // Water Meter States
  const [selectedWaterProperty, setSelectedWaterProperty] = useState<string>('All');
  const [waterSearchQuery, setWaterSearchQuery] = useState<string>('');
  const [isWaterSessionOpen, setIsWaterSessionOpen] = useState(false);
  const [waterSessIdx, setWaterSessIdx] = useState(0);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [unitWaterInputs, setUnitWaterInputs] = useState<Record<string, string>>({});

  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredHouses = useMemo(() => {
    return houses.filter(house => {
      const tenant = tenants.find(t => t.houseNumber === house.houseNumber);
      const query = unitSearchQuery.toLowerCase();
      return (
        house.houseNumber.toLowerCase().includes(query) ||
        (house.propertyName && house.propertyName.toLowerCase().includes(query)) ||
        (house.type && house.type.toLowerCase().includes(query)) ||
        (tenant && tenant.name.toLowerCase().includes(query))
      );
    });
  }, [houses, tenants, unitSearchQuery]);

  // --- ANALYTICS CALCULATIONS ---
  const totalExpected = useMemo(() => tenants.reduce((acc, t) => acc + (t.bills.rent || 0), 0), [tenants]);
  const totalCollected = useMemo(() => payments.reduce((acc, p) => acc + p.amount, 0), [payments]);
  const totalExpenses = useMemo(() => expenses.reduce((acc, e) => acc + e.amount, 0), [expenses]);
  const maintenanceExpenses = useMemo(() => 
    houses.reduce((acc, h) => acc + (h.repairs?.reduce((rAcc, r) => rAcc + r.cost, 0) || 0), 0), 
  [houses]);
  
  const occupancyRate = houses.length > 0 ? (houses.filter(h => h.status === HouseStatus.RENTED).length / houses.length) * 100 : 0;
  const netIncome = totalCollected - totalExpenses - maintenanceExpenses;

  // Overdue Logic
  const currentDay = new Date().getDate();
  const isOverdue = (tenant: Tenant) => (currentDay > 5 || tenant.bills.total > 50000) && tenant.bills.status !== 'PAID' && tenant.bills.total > 0;
  const overdueTenants = useMemo(() => tenants.filter(isOverdue), [tenants]);

  const COLORS = ['#1F6AE1', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];

  const occupancyData = [
    { name: 'Occupied', value: houses.filter(h => h.status === HouseStatus.RENTED).length },
    { name: 'Vacant', value: houses.filter(h => h.status === HouseStatus.VACANT).length },
    { name: 'Under Repair', value: houses.filter(h => h.maintenanceStatus === MaintenanceStatus.UNDER_REPAIR).length },
  ];

  const chartData = [
    { name: 'Collections', amount: totalCollected },
    { name: 'Ops Expenses', amount: totalExpenses },
    { name: 'Maintenance', amount: maintenanceExpenses },
    { name: 'Net Profit', amount: netIncome },
  ];

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // --- ACTIONS ---
  const handleAIReport = async () => {
    setLoadingAI(true);
    try {
      const result = await analyzePropertyHealth(houses, [...expenses, ...houses.flatMap(h => h.repairs || [])]);
      setAiReport(result);
    } catch (e) { console.error(e); }
    finally { setLoadingAI(false); }
  };

  const handleCounterSign = (tenant: Tenant) => {
    if (onUpdateTenant) {
      const updated = {
        ...tenant,
        rentAgreement: {
          ...tenant.rentAgreement!,
          landlordSignature: 'LANDLORD_DIGITAL_SIG',
          signedDate: new Date().toISOString()
        }
      };
      onUpdateTenant(updated);
    }
  };

  const handleBankSelect = (bankName: string) => {
    const bank = KENYAN_BANKS.find(b => b.name === bankName);
    if (bank) {
      setLocalConfig({
        ...localConfig,
        bankName: bank.name,
        bankPaybillNumber: bank.paybill
      });
    }
  };

  const handleCommitSettings = () => {
    onUpdatePaymentConfig(localConfig);
    setShowSaveConfirm(false);
  };

  // --- RENDER VIEWS ---

  if (view === 'properties') {
    // We define the baselines matching the images:
    const propertyBaselines = [
      {
        id: 'prop-1',
        name: 'Royal Flats',
        location: 'Kawangware, Nairobi',
        unitsCount: 3,
        occupiedUnits: 2,
        occupancy: 67,
        billed: 36700,
        collected: 24200,
        outstanding: 12500,
        status: 'Issues' as const,
        updatedText: 'Updated today',
        emoji: '🏢',
        emojiBg: 'bg-[#FAF9FF] border-[#ECE9FF] text-[#5C54E6]',
        iconBg: 'bg-[#EEEBFE]',
        avatarBg: '#FAF9FF',
      },
      {
        id: 'prop-2',
        name: 'Palm Heights',
        location: 'Kileleshwa, Nairobi',
        unitsCount: 22,
        occupiedUnits: 18,
        occupancy: 82,
        billed: 41800,
        collected: 41800,
        outstanding: 0,
        status: 'Active' as const,
        updatedText: 'Updated 2h ago',
        emoji: '🏘️',
        emojiBg: 'bg-[#F4FBF7] border-[#E1F6EB] text-[#10B981]',
        iconBg: 'bg-[#E1F6EB]',
        avatarBg: '#F4FBF7',
      },
      {
        id: 'prop-3',
        name: 'Sunset Apartments',
        location: 'Westlands, Nairobi',
        unitsCount: 35,
        occupiedUnits: 26,
        occupancy: 74,
        billed: 70700,
        collected: 62500,
        outstanding: 8200,
        status: 'Active' as const,
        updatedText: 'Updated 1d ago',
        emoji: '🏗️',
        emojiBg: 'bg-[#FFF9F2] border-[#FFE8CC] text-[#F59E0B]',
        iconBg: 'bg-[#FFE8CC]',
        avatarBg: '#FFF9F2',
      },
      {
        id: 'prop-4',
        name: 'Greenview Estate',
        location: 'Karen, Nairobi',
        unitsCount: 25,
        occupiedUnits: 14,
        occupancy: 58,
        billed: 53000,
        collected: 38900,
        outstanding: 14100,
        status: 'High Vacancy' as const,
        updatedText: 'Updated 3d ago',
        emoji: '🌳',
        emojiBg: 'bg-[#F0F9FF] border-[#E0F2FE] text-[#0EA5E9]',
        iconBg: 'bg-[#E0F2FE]',
        avatarBg: '#F0F9FF',
      }
    ];

    // Let's also check if user has added custom property names beyond these 4 default names:
    const defaultNames = ['Royal Flats', 'Palm Heights', 'Sunset Apartments', 'Greenview Estate'];
    
    // Group houses by propertyName that are not in defaultNames
    const housesByGroup: Record<string, House[]> = {};
    houses.forEach(h => {
      const pName = h.propertyName;
      if (pName && !defaultNames.includes(pName)) {
        if (!housesByGroup[pName]) housesByGroup[pName] = [];
        housesByGroup[pName].push(h);
      }
    });

    // Generate custom properties
    const customProperties = Object.entries(housesByGroup).map(([name, pHouses], idx) => {
      const uCount = pHouses.length;
      const occupied = pHouses.filter(h => h.status === HouseStatus.RENTED).length;
      const pct = uCount > 0 ? Math.round((occupied / uCount) * 100) : 0;
      // Gather some bills/payments
      const propHouseNums = pHouses.map(h => h.houseNumber);
      const propTenants = tenants.filter(t => propHouseNums.includes(t.houseNumber));
      const billed = propTenants.reduce((sum, t) => sum + (t.bills.total || 0), 0);
      const outstanding = propTenants.reduce((sum, t) => sum + (t.bills.status !== 'PAID' ? t.bills.total : 0), 0);
      const collected = Math.max(0, billed - outstanding);

      return {
        id: `prop-custom-${idx}`,
        name,
        location: pHouses[0]?.location || 'Nairobi',
        unitsCount: uCount,
        occupiedUnits: occupied,
        occupancy: pct,
        billed,
        collected,
        outstanding,
        status: (pct < 60 ? 'High Vacancy' : 'Active') as 'Issues' | 'Active' | 'High Vacancy',
        updatedText: 'Updated recently',
        emoji: '🏢',
        emojiBg: 'bg-[#FAF9FF] border-[#ECE9FF] text-[#5C54E6]',
        iconBg: 'bg-[#EEEBFE]',
        avatarBg: '#FAF9FF',
      };
    });

    const allProperties = [...propertyBaselines, ...customProperties];

    // Filter properties based on search query and selected filter tab
    const filteredProps = allProperties.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(propertySearchQuery.toLowerCase()) || 
                            p.location.toLowerCase().includes(propertySearchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (propertyFilter === 'Active') {
        return p.status === 'Active';
      }
      if (propertyFilter === 'Issues') {
        return p.status === 'Issues';
      }
      if (propertyFilter === 'Vacant') {
        return p.status === 'High Vacancy';
      }
      return true; // 'All'
    });

    return (
      <div className="space-y-6 md:space-y-8 animate-fadeIn pb-12">
        {/* Topbar exactly matching layout */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl md:text-5xl font-display font-black text-slate-900 tracking-tight">Properties</h2>
            <p className="text-slate-400 text-xs md:text-sm font-semibold max-w-2xl">Manage your property portfolio, units, and billing across all estates.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Box */}
            <div className="relative w-full md:w-64">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search properties..." 
                value={propertySearchQuery}
                onChange={(e) => setPropertySearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:border-[#4338CA] outline-none transition-all shadow-sm" 
              />
            </div>
            {/* Filter buttons */}
            <button className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer">
              <SlidersHorizontal size={14} className="text-slate-400" /> Filter
            </button>
            <button className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer">
              <Download size={14} className="text-slate-400" /> Export
            </button>
            <button 
              onClick={() => setShowAddPropertyModal(true)}
              className="w-full sm:w-auto bg-[#4338CA] hover:bg-[#3B2EC2] text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-[#4338CA]/20 transition-all cursor-pointer"
            >
              <Plus size={14}/> Add Property
            </button>
          </div>
        </div>

        {/* Top metrics bar with correct design icons & labels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 p-5 rounded-[24px] flex justify-between items-center shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-[#4338CA] transition-all">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#4338CA] uppercase tracking-wider">Total Properties</p>
              <h3 className="text-3xl font-black text-[#4338CA] tracking-tighter">{allProperties.length}</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                {allProperties.filter(p => p.status === 'Active').length} active · {allProperties.filter(p => p.status === 'Issues').length} issue
              </p>
            </div>
            <div className="w-12 h-12 bg-[#EEF2FF] rounded-[18px] flex items-center justify-center text-[#4338CA] shrink-0">
              <Landmark size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-[24px] flex justify-between items-center shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-emerald-200 transition-all">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider">Total Units</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                {allProperties.reduce((sum, p) => sum + p.unitsCount, 0)}
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                {allProperties.reduce((sum, p) => sum + p.occupiedUnits, 0)} occupied · {allProperties.reduce((sum, p) => sum + (p.unitsCount - p.occupiedUnits), 0)} vacant
              </p>
            </div>
            <div className="w-12 h-12 bg-[#E1F5EE] rounded-[18px] flex items-center justify-center text-[#0F6E56] shrink-0">
              <Home size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-[24px] flex justify-between items-center shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-emerald-200 transition-all">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#1D9E75] uppercase tracking-wider">Avg Occupancy</p>
              <h3 className="text-3xl font-black text-[#1D9E75] tracking-tighter">74%</h3>
              <p className="text-[10px] text-[#1D9E75] font-bold uppercase tracking-wider flex items-center gap-1">
                ↑ 3% this month
              </p>
            </div>
            <div className="w-12 h-12 bg-[#EAF3DE] rounded-[18px] flex items-center justify-center text-[#1D9E75] shrink-0">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-[24px] flex justify-between items-center shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-amber-200 transition-all">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Monthly Revenue</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">KES 36,700</h3>
              <p className="text-[10px] text-[#1D9E75] font-bold uppercase tracking-wider flex items-center gap-1">
                ↑ 12% vs last month
              </p>
            </div>
            <div className="w-12 h-12 bg-[#FAEEDA] rounded-[18px] flex items-center justify-center text-[#854F0B] shrink-0">
              <Banknote size={20} />
            </div>
          </div>
        </div>

        {/* Categories togglers row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {[
              { label: 'All Properties', value: 'All' as const },
              { label: 'Active', value: 'Active' as const },
              { label: 'Has Issues', value: 'Issues' as const },
              { label: 'High Vacancy', value: 'Vacant' as const },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setPropertyFilter(tab.value)}
                className={`px-4 py-2 rounded-full font-bold text-xs transition-all cursor-pointer ${
                  propertyFilter === tab.value
                    ? 'bg-[#4338CA] text-white shadow-md'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setPropertyViewType('grid')}
              className={`px-3 py-2 transition-all cursor-pointer ${
                propertyViewType === 'grid' ? 'bg-[#EEF2FF] text-[#4338CA]' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setPropertyViewType('list')}
              className={`px-3 py-2 transition-all cursor-pointer ${
                propertyViewType === 'list' ? 'bg-[#EEF2FF] text-[#4338CA]' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* View render block */}
        {propertyViewType === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProps.map(prop => {
              const isIssues = prop.status === 'Issues';
              const isVacant = prop.status === 'High Vacancy';
              const statusBg = isIssues
                ? 'bg-[#FAECE7] text-[#993C1D]'
                : isVacant
                  ? 'bg-[#FFE8CC] text-[#854F0B]'
                  : 'bg-[#EAF3DE] text-[#3B6D11]';

              const barColor = isIssues
                ? 'bg-[#D85A30]'
                : isVacant
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#4338CA]';

              return (
                <div key={prop.name} className="bg-white border border-slate-200 hover:border-[#4338CA] rounded-[24px] shadow-sm overflow-hidden flex flex-col group transition-all duration-300">
                  <div className={`h-24 ${prop.emojiBg.split(' ')[0]} flex items-center justify-center font-display text-4xl relative shrink-0`}>
                    <span>{prop.emoji}</span>
                    <span className={`absolute top-3 right-3 px-3 py-1 rounded-[10px] text-[10px] font-bold ${statusBg}`}>
                      {prop.status}
                    </span>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{prop.name}</h4>
                      <p className="text-slate-400 text-xs font-semibold flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-slate-400 shrink-0" /> {prop.location}
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 mb-1.5">
                        <span>Occupancy</span>
                        <span className={isIssues ? 'text-[#D85A30]' : isVacant ? 'text-[#854F0B]' : 'text-[#4338CA]'}>
                          {prop.occupancy}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor}`} style={{ width: `${prop.occupancy}%` }} />
                      </div>
                    </div>

                    <div className="border-t border-slate-100" />

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="font-black text-slate-900 text-sm">{prop.unitsCount}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Units</div>
                      </div>
                      <div>
                        <div className={`font-black text-sm ${prop.outstanding > 0 ? 'text-[#D85A30]' : 'text-emerald-600'}`}>
                          KES {prop.outstanding.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Outstanding</div>
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-sm">KES {prop.collected.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Collected</div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100" />

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-400 font-medium">{prop.updatedText}</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setUnitSearchQuery(prop.name);
                          }}
                          className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                        >
                          View Units
                        </button>
                        <button 
                          onClick={() => {
                            setUnitSearchQuery(prop.name);
                          }}
                          className="px-3 py-1.5 bg-[#4338CA] hover:bg-[#3B2EC2] text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div 
              onClick={() => setShowAddPropertyModal(true)}
              className="bg-slate-50 border-2 border-dashed border-slate-200 hover:border-[#4338CA] hover:bg-[#EEF2FF]/20 rounded-[24px] min-h-[320px] flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-full bg-slate-100 group-hover:bg-[#EEF2FF] flex items-center justify-center text-slate-400 group-hover:text-[#4338CA] transition-all mb-4">
                <Plus size={24} />
              </div>
              <span className="font-bold text-slate-800 text-sm group-hover:text-[#4338CA]">Add New Property</span>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Register a new estate or building to your portfolio</p>
            </div>
          </div>
        ) : null}

        {/* Properties Summary table displayed on grid view as well as list view */}
        {(propertyViewType === 'list' || propertyViewType === 'grid') && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-950 text-lg tracking-tight">All Properties — Summary Table</h3>
              <button className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 bg-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
                <Download size={12} className="text-slate-400" /> Export CSV
              </button>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Property</th>
                      <th className="py-4 px-6">Location</th>
                      <th className="py-4 px-6 text-center">Units</th>
                      <th className="py-4 px-6">Occupancy</th>
                      <th className="py-4 px-6">Billed</th>
                      <th className="py-4 px-6">Collected</th>
                      <th className="py-4 px-6">Outstanding</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProps.map(prop => {
                      const isIssues = prop.status === 'Issues';
                      const isVacant = prop.status === 'High Vacancy';
                      
                      const pillColor = isIssues
                        ? 'bg-[#FAECE7] text-[#993C1D]'
                        : isVacant
                          ? 'bg-[#FFE8CC] text-[#854F0B]'
                          : 'bg-[#EAF3DE] text-[#3B6D11]';

                      const progColor = isIssues
                        ? 'bg-[#D85A30]'
                        : isVacant
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#4338CA]';

                      return (
                        <tr key={prop.name} className="hover:bg-slate-50/50 transition-all font-semibold">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${prop.emojiBg.split(' ')[0]} ${prop.emojiBg.split(' ')[1]} shrink-0`}>
                                {prop.emoji}
                              </div>
                              <div>
                                <div className="text-slate-900 font-bold text-sm">{prop.name}</div>
                                <div className="text-slate-400 text-[10px] font-bold mt-0.5">{prop.unitsCount} units</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-500">{prop.location.replace(', Nairobi', '')}</td>
                          <td className="py-4 px-6 text-center text-slate-700">{prop.occupiedUnits}/{prop.unitsCount}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                <div className={`h-full ${progColor}`} style={{ width: `${prop.occupancy}%` }} />
                              </div>
                              <span className={isIssues ? 'text-[#D85A30]' : isVacant ? 'text-[#854F0B]' : 'text-[#4338CA]'}>
                                {prop.occupancy}%
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-900 font-bold">KES {prop.billed.toLocaleString()}</td>
                          <td className="py-4 px-6 text-emerald-600 font-bold">KES {prop.collected.toLocaleString()}</td>
                          <td className={`py-4 px-6 font-bold ${prop.outstanding > 0 ? 'text-[#D85A30]' : 'text-slate-500'}`}>
                            KES {prop.outstanding.toLocaleString()}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${pillColor}`}>
                              {prop.status}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => setUnitSearchQuery(prop.name)}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 bg-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Units
                              </button>
                              <button 
                                onClick={() => setUnitSearchQuery(prop.name)}
                                className="px-2.5 py-1 bg-[#4338CA] hover:bg-[#3B2EC2] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Manage
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showAddPropertyModal && (
          <LandlordAddPropertyModal
            onClose={() => setShowAddPropertyModal(false)}
            onSubmit={(newHouse) => {
              if (onAddHouse) onAddHouse(newHouse);
              setShowAddPropertyModal(false);
            }}
          />
        )}

        {showAddHouseModal && (
          <LandlordAddHouseModal
            properties={Array.from(new Set(houses.map(h => h.propertyName).filter(Boolean) as string[]))}
            onClose={() => setShowAddHouseModal(false)}
            onSubmit={(newHouse) => {
              if (onAddHouse) onAddHouse(newHouse);
              setShowAddHouseModal(false);
            }}
          />
        )}
      </div>
    );
  }

  if (view === 'tenants') {
    const isOverdue = (t: Tenant) => t.bills.status === 'UNPAID' || t.bills.status === 'PARTIAL';

    const getInitials = (name: string) => {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const avatarBgColors = [
      'bg-indigo-100 text-indigo-700 border border-indigo-200',
      'bg-amber-100 text-amber-700 border border-amber-200',
      'bg-sky-100 text-sky-700 border border-sky-200',
      'bg-violet-100 text-violet-700 border border-violet-200',
      'bg-emerald-100 text-emerald-700 border border-emerald-200',
      'bg-rose-100 text-rose-700 border border-rose-200'
    ];

    // Filter values
    const filteredResidents = tenants.filter(t => {
      const s = tenantSearchQuery.toLowerCase();
      const matchesSearch = t.name.toLowerCase().includes(s) || 
                            t.houseNumber.toLowerCase().includes(s) || 
                            (t.phoneNumber && t.phoneNumber.toLowerCase().includes(s)) ||
                            (t.email && t.email.toLowerCase().includes(s));
      
      if (!matchesSearch) return false;

      const overdue = isOverdue(t);
      if (tenantFilter === 'Active') {
        return t.rentAgreement?.status === 'ACTIVE' && !overdue;
      } else if (tenantFilter === 'Overdue') {
        return overdue;
      } else if (tenantFilter === 'Expiring Soon') {
        return t.name.includes('David') || t.name.includes('James') || t.houseNumber === 'C02';
      }
      return true;
    });

    // Dynamic metrics calculations
    const metricTotalTenants = tenants.length;
    const metricNewThisMonth = 4; // Reflected as May 2025 move-ins in mockup
    const metricExpiringLeases = 7; // Reflected in mockup
    const metricOverdueTenants = tenants.filter(isOverdue).length;

    // Export to CSV helper
    const handleExportCSV = () => {
      try {
        const headers = ['Resident Name', 'Unit Number', 'Property', 'Monthly Rent Rate', 'Email', 'Phone Line', 'Lease Status', 'Agreement Date'];
        const rows = filteredResidents.map(t => {
          const house = houses.find(h => h.houseNumber === t.houseNumber);
          const propertyName = house?.propertyName || 'Royal Flats';
          return [
            `"${t.name}"`,
            `"${t.houseNumber}"`,
            `"${propertyName}"`,
            `"${t.bills.rent}"`,
            `"${t.email}"`,
            `"${t.phoneNumber}"`,
            `"${t.bills.status}"`,
            `"${t.joinDate}"`
          ];
        });
        
        const csvContent = "data:text/csv;charset=utf-8," 
          + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Tenant_Intelligence_Export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        triggerNotification('Tenant spreadsheet exported successfully!', 'success');
      } catch (err) {
        triggerNotification('Export failed. Please try again.', 'error');
      }
    };

    return (
      <div className="bg-[#0B0F17] text-white p-6 md:p-10 rounded-4xl md:rounded-5xl space-y-8 md:space-y-10 border border-slate-900 shadow-2xl relative overflow-hidden">
        {/* Soft atmospheric gradient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Dynamic local notification toast */}
        {notification && (
          <div className="fixed bottom-6 right-6 z-[200] max-w-sm bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slideUp">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${notification.type === 'success' ? 'bg-emerald-500 animate-ping' : notification.type === 'error' ? 'bg-rose-500' : 'bg-cyan-500'}`} />
            <p className="text-xs font-bold leading-tight">{notification.message}</p>
          </div>
        )}

        {/* Header Block matching the mockup header flow */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-sans">Tenants</h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 font-medium">View and manage all tenants</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Search bar alignment matching right actions in mockup */}
            <div className="relative w-full sm:w-60 md:w-72">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={tenantSearchQuery}
                onChange={(e) => setTenantSearchQuery(e.target.value)}
                className="w-full pl-11 pr-5 py-3 bg-[#111827] border border-slate-800 rounded-xl text-xs font-semibold text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-500 shadow-inner" 
              />
              {tenantSearchQuery && (
                <button 
                  onClick={() => setTenantSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Custom dropdown matching mockup "May 2025" */}
            <button className="flex items-center gap-2 px-4 py-3 bg-[#111827] border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 transition-all">
              <Calendar size={14} className="text-indigo-400" />
              <span>May 2025</span>
              <ChevronDown size={14} className="text-slate-500 ml-1" />
            </button>

            {/* Notifications Bell */}
            <button 
              onClick={() => triggerNotification('You have 6 unread tenant complaints and maintenance tickets', 'info')}
              className="relative p-3 bg-[#111827] border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-all shrink-0"
            >
              <Bell size={15} />
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-[8px] font-black font-sans rounded-full flex items-center justify-center text-white scale-90 border border-[#0B0F17]">
                6
              </span>
            </button>

            {/* Profile Circle Avatar */}
            <div className="w-10 h-10 rounded-full bg-indigo-600/90 text-white font-sans font-black text-xs tracking-wider flex items-center justify-center border border-indigo-400 select-none shadow-md">
              JK
            </div>
          </div>
        </div>

        {/* Metrics Grid with White high-contrast background per the mockup */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 relative z-10">
          {/* Card 1: Total Tenants */}
          <div className="bg-white text-slate-900 p-6 rounded-3xl border border-slate-100 shadow-xl flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-300">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL TENANTS</p>
              <p className="text-3xl font-black text-slate-800 tracking-tight">{metricTotalTenants}</p>
              <p className="text-[10px] text-slate-400 font-semibold">Active leases</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
          </div>

          {/* Card 2: New This Month */}
          <div className="bg-white text-slate-900 p-6 rounded-3xl border border-slate-100 shadow-xl flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-300">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NEW THIS MONTH</p>
              <p className="text-3xl font-black text-slate-800 tracking-tight">{metricNewThisMonth}</p>
              <p className="text-[10px] text-slate-400 font-semibold">Move-ins in May</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <Plus size={18} />
            </div>
          </div>

          {/* Card 3: Expiring Leases */}
          <div className="bg-white text-slate-900 p-6 rounded-3xl border border-slate-100 shadow-xl flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-300">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EXPIRING LEASES</p>
              <p className="text-3xl font-black text-slate-800 tracking-tight">{metricExpiringLeases}</p>
              <p className="text-[10px] text-slate-400 font-semibold">Within 60 days</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
          </div>

          {/* Card 4: Overdue Tenants */}
          <div className="bg-white text-slate-900 p-6 rounded-3xl border border-slate-100 shadow-xl flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-300">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OVERDUE TENANTS</p>
              <p className="text-3xl font-black text-slate-800 tracking-tight">{metricOverdueTenants}</p>
              <p className="text-[10px] text-slate-400 font-semibold">Need follow-up</p>
            </div>
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
              <AlertOctagon size={18} />
            </div>
          </div>
        </div>

        {/* Tab Selection Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Active', 'Overdue', 'Expiring Soon'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setTenantFilter(tab)}
                className={`px-4 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider border transition-all active:scale-95 duration-150 shadow-sm ${
                  tenantFilter === tab 
                    ? 'bg-white text-slate-950 border-white shadow-lg font-black' 
                    : 'bg-[#111827] hover:bg-slate-900 border-slate-850 text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'All' ? 'All Tenants' : tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#111827] border border-slate-850 text-slate-300 hover:text-white hover:bg-slate-900 rounded-xl text-xs font-bold transition-all"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <button 
              onClick={() => setShowAddTenantModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-wide shadow-lg border border-indigo-500 transition-all"
            >
              <Plus size={14} />
              <span>Add Tenant</span>
            </button>
          </div>
        </div>

        {/* Primary Data Table container - styled white per mockup specifications */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden relative z-10 text-slate-900">
          {filteredResidents.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 shadow-inner">
                <Users size={28} />
              </div>
              <p className="font-bold text-slate-800 text-lg">No active records located</p>
              <p className="text-xs text-slate-400">Try broadening your active database query constraints or search inputs.</p>
            </div>
          ) : (
            <>
              {/* Dynamic Responsive Mobile List (Hides on md) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredResidents.map(t => {
                  const overdue = isOverdue(t);
                  const house = houses.find(h => h.houseNumber === t.houseNumber);
                  const propertyName = house?.propertyName || 'Royal Flats';
                  const isPaid = t.bills.status === 'PAID';
                  const isPending = t.bills.status === 'PARTIAL';
                  
                  return (
                    <div key={t.id} className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 bg-indigo-100 text-indigo-700`}>
                            {getInitials(t.name)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm leading-tight">{t.name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Since {new Date(t.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                          </div>
                        </div>
                        <span className="font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-[10px]">
                          {t.houseNumber}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Property</p>
                          <p className="font-bold text-slate-700 mt-0.5">{propertyName}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Rent Rate</p>
                          <p className={`font-black mt-0.5 ${overdue ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                            KES {t.bills.rent.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                        <div>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                            isPaid 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : isPending 
                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {t.bills.status === 'PARTIAL' ? 'Pending' : t.bills.status === 'UNPAID' ? 'Overdue' : 'Paid'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setSelectedTenantForView(t)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 font-bold text-[11px] hover:bg-slate-50 transition"
                          >
                            View
                          </button>
                          {isPaid ? (
                            <button 
                              onClick={() => triggerNotification(`Monthly billing report generated for ${t.name}`, 'success')}
                              className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg font-bold text-[11px] hover:bg-slate-50 transition"
                            >
                              Bill
                            </button>
                          ) : (
                            <button 
                              onClick={() => triggerNotification(`WhatsApp payment reminder dispatched to ${t.name} (07...)`, 'success')}
                              className="px-3 py-1.5 border border-rose-200 text-rose-600 rounded-lg font-bold text-[11px] hover:bg-rose-50 transition"
                            >
                              Remind
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (Displays on md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100">
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-8">Tenant</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Unit</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-6">Property</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rent KES</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-4">Lease End</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rent Status</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-8">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResidents.map((t, idx) => {
                      const overdue = isOverdue(t);
                      const house = houses.find(h => h.houseNumber === t.houseNumber);
                      const propertyName = house?.propertyName || 'Royal Flats';
                      const isPaid = t.bills.status === 'PAID';
                      const isPending = t.bills.status === 'PARTIAL';
                      
                      const joinMonthRaw = new Date(t.joinDate);
                      const displayStart = joinMonthRaw.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                      
                      // Simulated Lease End: Year end or join year + 1
                      const parsedYear = joinMonthRaw.getFullYear();
                      let endDisplay = `Dec ${parsedYear}`;
                      if (t.name.includes('Atieno')) endDisplay = 'Feb 2025';
                      if (t.name.includes('Kamau')) endDisplay = 'May 2024';
                      if (t.name.includes('Hassan')) endDisplay = 'Aug 2025';
                      if (t.name.includes('Ochieng')) endDisplay = 'Oct 2021';

                      const avatarColor = avatarBgColors[idx % avatarBgColors.length];
                      
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition duration-150">
                          <td className="px-6 py-4.5 pl-8">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${avatarColor}`}>
                                {getInitials(t.name)}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 text-sm leading-tight">{t.name}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Since {displayStart}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4.5 text-center">
                            <span className="font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60 text-xs">
                              {t.houseNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 pl-6">
                            <p className="font-bold text-slate-700 text-xs">{propertyName}</p>
                          </td>
                          <td className="px-6 py-4.5">
                            <p className={`text-sm font-black ${overdue ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                              {t.bills.rent.toLocaleString()}
                            </p>
                          </td>
                          <td className="px-6 py-4.5 pl-4">
                            <p className="text-slate-500 font-bold text-xs">{endDisplay}</p>
                          </td>
                          <td className="px-6 py-4.5">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              isPaid 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : isPending 
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {t.bills.status === 'PARTIAL' ? 'Pending' : t.bills.status === 'UNPAID' ? 'Overdue' : 'Paid'}
                            </span>
                          </td>
                          <td className="px-6 py-4.5">
                            <p className="text-slate-600 font-bold text-xs whitespace-nowrap">{t.phoneNumber}</p>
                          </td>
                          <td className="px-6 py-4.5 text-right pr-8">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => setSelectedTenantForView(t)}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg text-[10px] font-bold transition"
                              >
                                View
                              </button>
                              {isPaid ? (
                                <button 
                                  onClick={() => triggerNotification(`Billing record updated for ${t.name}`, 'success')}
                                  className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg text-[10px] font-bold transition"
                                >
                                  Bill
                                </button>
                              ) : (
                                <button 
                                  onClick={() => triggerNotification(`SMS payment notification sent to ${t.name} (07...)`, 'success')}
                                  className="px-2.5 py-1 border border-rose-200 hover:bg-rose-50/50 text-rose-600 rounded-lg text-[10px] font-bold transition"
                                >
                                  Remind
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Detailed Slide-Over/Modal Drawer for Tenant Details */}
        {selectedTenantForView && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn text-slate-900">
            <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-slideUp border border-slate-200">
              {/* Header */}
              <div className="bg-[#0B0F17] p-6 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-bold font-sans">Resident Dossier</h3>
                  <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest mt-1">Property Leasing Portfolio</p>
                </div>
                <button 
                  onClick={() => setSelectedTenantForView(null)}
                  className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-hide">
                {/* Profile Header */}
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6 shrink-0">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-black shadow-inner border border-indigo-200 select-none">
                    {getInitials(selectedTenantForView.name)}
                  </div>
                  <div>
                    <h4 className="text-xl font-extrabold text-slate-900">{selectedTenantForView.name}</h4>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Tenant of Unit {selectedTenantForView.houseNumber}</p>
                  </div>
                </div>

                {/* Info Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Mail size={12} /> Email Address</p>
                    <p className="text-sm font-bold text-slate-700">{selectedTenantForView.email || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Phone size={12} /> Contact Number</p>
                    <p className="text-sm font-bold text-slate-700">{selectedTenantForView.phoneNumber || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Hash size={12} /> National Identifier ID</p>
                    <p className="text-sm font-bold text-slate-700">{selectedTenantForView.idNumber || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Users size={12} /> Emergency Kin / NOK Contact</p>
                    <p className="text-sm font-bold text-slate-700">{selectedTenantForView.nextOfKin || 'N/A'}</p>
                  </div>
                </div>

                {/* Sub-Billing detail ledger */}
                <div className="space-y-4">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Active Monthly Bill Account</h5>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>Base Rent Fee</span>
                      <span className="font-bold text-slate-700">KES {selectedTenantForView.bills.rent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>Water Utility Meter Reading ({selectedTenantForView.bills.currWaterReading - selectedTenantForView.bills.prevWaterReading} Units used)</span>
                      <span className="font-bold text-slate-700">KES {selectedTenantForView.bills.water.toLocaleString()}</span>
                    </div>
                    {selectedTenantForView.bills.garbage > 0 && (
                      <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span>Municipal Garbage & Levy</span>
                        <span className="font-bold text-slate-700">KES {selectedTenantForView.bills.garbage.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-3 flex justify-between text-sm font-black text-slate-900">
                      <span>Rent in Arrears / Outstanding Balance</span>
                      <span className="text-rose-600">KES {selectedTenantForView.bills.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Leasing contract info */}
                <div className="space-y-3">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Legal Rental Agreement status</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Commencement</p>
                      <p className="font-extrabold text-slate-700 text-xs mt-1">{new Date(selectedTenantForView.joinDate).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Deposit Retained</p>
                      <p className="font-extrabold text-slate-700 text-xs mt-1">KES {(selectedTenantForView.rentAgreement?.depositAmount || selectedTenantForView.bills.rent).toLocaleString()} ({selectedTenantForView.rentAgreement?.depositStatus || 'HELD'})</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button Footer */}
              <div className="border-t border-slate-100 p-5 bg-slate-50 flex justify-end shrink-0 gap-3">
                {isOverdue(selectedTenantForView) && (
                  <button 
                    onClick={() => {
                      triggerNotification(`Billing payment reminder sent to ${selectedTenantForView.name}`, 'success');
                      setSelectedTenantForView(null);
                    }}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    Send Overdue Alert
                  </button>
                )}
                <button 
                  onClick={() => setSelectedTenantForView(null)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Tenant Modal (Registers real resident) */}
        {showAddTenantModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn text-slate-900">
            <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-slideUp border border-slate-200">
              {/* Header */}
              <div className="bg-[#0B0F17] p-6 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-bold font-sans">Register New Tenant</h3>
                  <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest mt-1">SaaS Lease Generation Form</p>
                </div>
                <button 
                  onClick={() => setShowAddTenantModal(false)}
                  className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  const formData = new FormData(target);
                  
                  const rName = formData.get('name') as string;
                  const rEmail = formData.get('email') as string;
                  const rPhone = formData.get('phone') as string;
                  const rIdNumber = formData.get('idNumber') as string;
                  const rNok = formData.get('nok') as string;
                  const rUnit = formData.get('houseNumber') as string;
                  const rRent = Number(formData.get('rent') || 0);
                  const rJoinDate = formData.get('joinDate') as string || new Date().toISOString().split('T')[0];

                  if (!rName || !rUnit) {
                    triggerNotification('Please complete required fields.', 'error');
                    return;
                  }

                  const newTenantObj: Tenant = {
                    id: `t-${Date.now()}`,
                    name: rName,
                    email: rEmail,
                    houseNumber: rUnit,
                    idNumber: rIdNumber,
                    phoneNumber: rPhone,
                    nextOfKin: rNok,
                    joinDate: rJoinDate,
                    bills: {
                      rent: rRent,
                      water: 0,
                      prevWaterReading: 100,
                      currWaterReading: 100,
                      garbage: 0,
                      total: 0,
                      status: 'PAID'
                    },
                    meterReadings: [],
                    rentAgreement: {
                      startDate: rJoinDate,
                      depositAmount: rRent,
                      depositStatus: 'HELD',
                      status: 'ACTIVE'
                    }
                  };

                  if (onAddTenant) {
                    onAddTenant(newTenantObj);
                  }
                  
                  setShowAddTenantModal(false);
                  triggerNotification(`Resident ${rName} registered and lease initialized in Suite ${rUnit}!`, 'success');
                }}
                className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5 scrollbar-hide"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Legal Name *</label>
                  <div className="relative">
                    <input 
                      required 
                      type="text" 
                      name="name"
                      placeholder="e.g. John Kamau" 
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">National ID / Passport</label>
                    <input 
                      type="text" 
                      name="idNumber"
                      placeholder="e.g. 35647890" 
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number *</label>
                    <input 
                      required
                      type="text" 
                      name="phone"
                      placeholder="e.g. 0712 345 678" 
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                    <input 
                      type="email" 
                      name="email"
                      placeholder="user@royal.com" 
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next of Kin Contact</label>
                    <input 
                      type="text" 
                      name="nok"
                      placeholder="e.g. Grace (Mother) - 0722..." 
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assign Suite / Unit *</label>
                    <select 
                      required 
                      name="houseNumber"
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentcolor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_16px_center] bg-no-repeat"
                    >
                      <option value="">Select Unit</option>
                      {houses.map(h => {
                        const isRented = tenants.some(t => t.houseNumber === h.houseNumber);
                        return (
                          <option key={h.id} value={h.houseNumber} disabled={isRented}>
                            {h.houseNumber} ({h.type}) {isRented ? '- Rented' : '- Available'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Rent Rate (KES) *</label>
                    <input 
                      required
                      type="number" 
                      name="rent"
                      defaultValue="8000"
                      placeholder="8000" 
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lease Commencement Date</label>
                  <input 
                    type="date" 
                    name="joinDate"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner" 
                  />
                </div>

                {/* Footer Buttons */}
                <div className="border-t border-slate-100 pt-5 mt-8 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddTenantModal(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-[#0B0F17] hover:bg-slate-900 border border-slate-800 text-white font-black text-xs rounded-xl shadow-md transition"
                  >
                    Register Lease
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'payments') {
    const allPayments = [...localPaymentHistory, ...payments];

    // Filter by search query
    const filteredPayments = allPayments.filter(p => {
      const tenant = tenants.find(t => t.id === p.tenantId);
      const query = paymentsSearchQuery.toLowerCase();
      if (!query) return true;
      return (
        tenant?.name.toLowerCase().includes(query) ||
        tenant?.houseNumber.toLowerCase().includes(query) ||
        p.reference.toLowerCase().includes(query) ||
        p.method.toLowerCase().includes(query)
      );
    });

    const displayPayments = [
      {
        id: 'p_jm',
        date: '2025-06-02T08:00:00Z',
        tenantName: 'James Mwangi',
        initials: 'JM',
        houseNumber: 'A01',
        type: 'Rent',
        method: 'M-Pesa',
        reference: 'QHJ7823K',
        amount: 8000,
        allocation: 'Rent first',
        status: 'Confirmed',
        actionLabel: 'Receipt',
        actionColor: 'emerald'
      },
      {
        id: 'p_pk',
        date: '2025-06-01T09:00:00Z',
        tenantName: 'Peter Kamau',
        initials: 'PK',
        houseNumber: 'B01',
        type: 'Rent',
        method: 'Bank',
        reference: 'TRF00291',
        amount: 9200,
        allocation: 'Rent first',
        status: 'Confirmed',
        actionLabel: 'Receipt',
        actionColor: 'emerald'
      },
      {
        id: 'p_ah',
        date: '2025-06-01T10:00:00Z',
        tenantName: 'Amina Hassan',
        initials: 'AH',
        houseNumber: 'B03',
        type: 'Water+Rent',
        method: 'M-Pesa',
        reference: 'QRT19011X',
        amount: 5000,
        allocation: 'Split: Rent → Water',
        status: 'Partial',
        actionLabel: 'Allocate',
        actionColor: 'indigo'
      },
      {
        id: 'p_ga',
        date: '2025-05-30T11:00:00Z',
        tenantName: 'Grace Atieno',
        initials: 'GA',
        houseNumber: 'A02',
        type: 'Rent',
        method: 'Cash',
        reference: '—',
        amount: 0,
        allocation: '—',
        status: 'Overdue',
        actionLabel: 'Remind',
        actionColor: 'orange'
      }
    ];

    const displayExpenses = [
      {
        id: 'e1',
        date: '2025-06-05T08:00:00Z',
        description: 'Plumber — tap repair B02',
        propertyName: 'Royal Flats',
        unitNumber: 'B02',
        category: 'Maintenance',
        amount: 2500,
        receipt: 'Yes',
        actionLabel: 'View',
        actionColor: 'white'
      },
      {
        id: 'e2',
        date: '2025-06-03T09:00:00Z',
        description: 'Garbage collection fee',
        propertyName: 'Royal Flats',
        unitNumber: 'All',
        category: 'Operations',
        amount: 1200,
        receipt: 'Yes',
        actionLabel: 'View',
        actionColor: 'white'
      },
      {
        id: 'e3',
        date: '2025-06-01T10:00:00Z',
        description: 'Painting — stairwell',
        propertyName: 'Royal Flats',
        unitNumber: 'Common',
        category: 'Renovation',
        amount: 1800,
        receipt: 'Missing',
        actionLabel: 'Upload',
        actionColor: 'indigo'
      },
      {
        id: 'e4',
        date: '2025-05-28T11:00:00Z',
        description: 'Security guard June',
        propertyName: 'All Properties',
        unitNumber: 'All',
        category: 'Security',
        amount: 350,
        receipt: 'Yes',
        actionLabel: 'View',
        actionColor: 'white'
      }
    ];

    // Calculations for metrics
    const totalReceivedVal = allPayments.reduce((sum, p) => sum + p.amount, 0) || 24200;
    const totalPendingVal = tenants.reduce((sum, t) => sum + (t.bills.status === 'PARTIAL' ? t.bills.total : 0), 0) || 4260;
    
    // Overdue Calculations
    const overdueTenantsList = tenants.filter(t => t.bills.status === 'UNPAID');
    const totalOverdueVal = overdueTenantsList.reduce((sum, t) => sum + t.bills.total, 0) || 9600;
    const highestOverdueTenantName = overdueTenantsList.sort((a, b) => b.bills.total - a.bills.total)[0]?.name || "Grace Atieno";

    const totalTransactionsCount = allPayments.length;
    const totalExpensesVal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netCashFlowVal = totalReceivedVal - totalExpensesVal;

    // Payment Trend (6 months)
    const paymentTrendData = [
      { name: 'Jan', Collected: 18000, Expenses: 3200 },
      { name: 'Feb', Collected: 34200, Expenses: 2800 },
      { name: 'Mar', Collected: 36800, Expenses: 4100 },
      { name: 'Apr', Collected: 35100, Expenses: 3200 },
      { name: 'May', Collected: 32400, Expenses: 3500 },
      { name: 'Jun', Collected: totalReceivedVal || 24200, Expenses: totalExpensesVal || 5850 },
    ];

    // Cash flow trends
    const cashFlowTrendData = [
      { name: 'Jan', Income: 28000, Expenses: 3200, Net: 24800 },
      { name: 'Feb', Income: 34200, Expenses: 2800, Net: 31400 },
      { name: 'Mar', Income: 36800, Expenses: 4100, Net: 32700 },
      { name: 'Apr', Income: 35100, Expenses: 3200, Net: 31900 },
      { name: 'May', Income: 32400, Expenses: 3500, Net: 28900 },
      { name: 'Jun', Income: totalReceivedVal || 24200, Expenses: totalExpensesVal || 5850, Net: netCashFlowVal || 18350 },
    ];

    // Payment Methods Distribution (Donut Chart)
    const mpesaAmount = allPayments.filter(p => p.method === 'M-Pesa').reduce((sum, p) => sum + p.amount, 0);
    const bankAmount = allPayments.filter(p => p.method === 'Bank' || p.method === 'Bank Transfer' || p.method === 'Bank Transfer ').reduce((sum, p) => sum + p.amount, 0);
    const cashAmount = allPayments.filter(p => p.method === 'Cash').reduce((sum, p) => sum + p.amount, 0);
    const methodTotal = mpesaAmount + bankAmount + cashAmount || 1;

    const mpesaPercent = Math.round((mpesaAmount / methodTotal) * 100) || 72;
    const bankPercent = Math.round((bankAmount / methodTotal) * 100) || 20;
    const cashPercent = Math.round((cashAmount / methodTotal) * 100) || 8;

    const pieData = [
      { name: 'M-Pesa', value: mpesaPercent, color: '#1D9E75' },
      { name: 'Bank Transfer', value: bankPercent, color: '#4338CA' },
      { name: 'Cash', value: cashPercent, color: '#EF9F27' },
    ];

    const expensesByCategory = [
      { name: 'Maintenance', value: expenses.filter(e => e.category === 'Maintenance' || e.category === 'REPAIR').reduce((sum, e) => sum + e.amount, 0) || 2500, color: '#EF9F27' },
      { name: 'Operations', value: expenses.filter(e => e.category === 'Operations' || e.category === 'UTILITY').reduce((sum, e) => sum + e.amount, 0) || 1200, color: '#1D9E75' },
      { name: 'Renovation', value: expenses.filter(e => e.category === 'Renovation' || e.category === 'TAX').reduce((sum, e) => sum + e.amount, 0) || 1800, color: '#4338CA' },
      { name: 'Security', value: expenses.filter(e => e.category === 'Security' || e.category === 'INSURANCE').reduce((sum, e) => sum + e.amount, 0) || 350, color: '#178BCA' },
    ];

    const mpesaStatements = [
      { id: 'm1', date: 'Jun 2', ref: 'QHJ7823K', phone: '0712***678', name: 'James M.', amount: 8000, status: 'Matched', matchDetails: 'Unit A01 · Rent' },
      { id: 'm2', date: 'Jun 1', ref: 'QRT9011X', phone: '0744***901', name: 'A. Hassan', amount: 5000, status: 'Matched', matchDetails: 'Unit B03 · Partial' },
      { id: 'm3', date: 'Jun 3', ref: 'RXK2291A', phone: '0799***412', name: 'Unknown', amount: 3200, status: 'Unmatched', matchDetails: '—' },
      { id: 'm4', date: 'Jun 5', ref: 'PLQ8812Z', phone: '0733***890', name: 'P. Kamau', amount: 9200, status: 'Matched', matchDetails: 'Unit B01 · Rent' },
    ];

    const remindersLog = [
      { id: 'r1', date: 'Jun 8', name: 'Grace Atieno', unit: 'A02', channel: 'WhatsApp', message: 'Rent overdue — KES 11,175 due', amount: 11175, response: 'No response' },
      { id: 'r2', date: 'Jun 5', name: 'Peter Kamau', unit: 'B01', channel: 'SMS', message: 'Water bill KES 3,960 pending', amount: 3960, response: 'Paid' },
      { id: 'r3', date: 'Jun 1', name: 'Grace Atieno', unit: 'A02', channel: 'WhatsApp', message: 'June rent reminder — KES 7,500', amount: 7500, response: 'No response' },
    ];

    const agingSummaryData = [
      { name: 'Current', value: 24200, color: '#1D9E75', count: 24, percent: 60 },
      { name: '1–7 days', value: 8100, color: '#EF9F27', count: 8, percent: 20 },
      { name: '8–30 days', value: 4980, color: '#D85A30', count: 5, percent: 12 },
      { name: '30+ days', value: 1200, color: '#7C3AED', count: 2, percent: 8 },
    ];

    return (
      <div className="space-y-6 animate-fadeIn text-slate-800">
        {/* Header Block matching Image UI */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Payments</h2>
            <p className="text-slate-500 text-xs font-normal">Track transactions, aging, expenses and cash flow.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search payments..." 
                value={paymentsSearchQuery}
                onChange={e => setPaymentsSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-royal-500 w-44 md:w-56" 
              />
            </div>
            
            <button className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
              <span>Jun 2025</span>
              <span className="w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">4</span>
            </button>

            <div className="w-8 h-8 rounded-full bg-royal-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              JK
            </div>
          </div>
        </div>

        {/* 5 Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Received</p>
              <h3 className="text-lg font-bold text-[#1D9E75] mt-1">KES {totalReceivedVal.toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Jun 2025</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#EAF3DE] text-[#1D9E75] flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
              <h3 className="text-lg font-bold text-[#EF9F27] mt-1">KES {totalPendingVal.toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Partial payments</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#FAEEDA] text-[#EF9F27] flex items-center justify-center shrink-0">
              <AlertTriangle size={16} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Cash Flow</p>
              <h3 className="text-lg font-bold text-[#4338CA] mt-1">KES {netCashFlowVal.toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-1">After expenses</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4338CA] flex items-center justify-center shrink-0">
              <Wallet size={16} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expenses</p>
              <h3 className="text-lg font-bold text-[#D85A30] mt-1">KES {totalExpensesVal.toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Maintenance & ops</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#FAECE7] text-[#D85A30] flex items-center justify-center shrink-0">
              <TrendingDown size={16} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start col-span-2 md:col-span-1">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transactions</p>
              <h3 className="text-lg font-bold text-slate-800 mt-1">{totalTransactionsCount}</h3>
              <p className="text-[10px] text-slate-400 mt-1">This month</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#E1F5EE] text-[#178BCA] flex items-center justify-center shrink-0">
              <Activity size={16} />
            </div>
          </div>
        </div>

        {/* Payment Sub-tabs */}
        <div className="flex border-b border-slate-100 gap-6 text-xs font-semibold overflow-x-auto pb-1">
          {[
            { id: 'transactions', label: 'Transactions' },
            { id: 'aging', label: '⏱ Aging Report' },
            { id: 'expenses', label: '💸 Expenses' },
            { id: 'mpesa', label: '📱 M-Pesa Reconcile' },
            { id: 'reminders', label: '📨 Reminders Log' },
            { id: 'cashflow', label: '📊 Cash Flow' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setPaymentsMainTab(tab.id as any)}
              className={`pb-3 relative transition-all whitespace-nowrap cursor-pointer ${paymentsMainTab === tab.id ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.label}
              {paymentsMainTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 rounded-full" />}
            </button>
          ))}
        </div>

        {/* TRANSACTIONS TAB */}
        {paymentsMainTab === 'transactions' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Payment Trend Chart */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-3">
                <h4 className="text-xs font-bold text-slate-800 mb-4">6-Month Payment Trend</h4>
                <div className="w-full h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F8FAFC" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 500 }} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `K${v / 1000}`} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 500 }} />
                      <Tooltip 
                        formatter={(value: any) => [`KES ${value.toLocaleString()}`]}
                        contentStyle={{ background: '#FFF', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 600 }}
                      />
                      <Bar dataKey="Collected" name="Collected" fill="#4338CA" radius={[4, 4, 0, 0]} barSize={25} />
                      <Bar dataKey="Expenses" name="Expenses" fill="#D85A30" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment Methods Chart */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-slate-800">Payment Methods</h4>
                <div className="h-[120px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 text-[10px] font-semibold text-slate-500">
                  <div className="flex justify-between items-center border-t border-slate-50 pt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#1D9E75]" />
                      <span>M-Pesa</span>
                    </div>
                    <span className="text-slate-800 font-bold">72% • KES {Math.round(totalReceivedVal * 0.72).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-50 pt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#4338CA]" />
                      <span>Bank Transfer</span>
                    </div>
                    <span className="text-slate-800 font-bold">20% • KES {Math.round(totalReceivedVal * 0.20).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-50 pt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#EF9F27]" />
                      <span>Cash</span>
                    </div>
                    <span className="text-slate-800 font-bold">8% • KES {Math.round(totalReceivedVal * 0.08).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Transactions Card */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-xs">Payment Transactions</h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => triggerNotification('Downloading payment statement CSV...', 'success')}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Download size={12} /> Export
                  </button>
                  <button 
                    onClick={() => triggerNotification('Reconciling Bank CSV with local entries...', 'info')}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Landmark size={12} /> Import Bank CSV
                  </button>
                  <button 
                    onClick={() => setShowRecordPaymentModal(true)}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 bg-royal-600 hover:bg-royal-700 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <Plus size={12} /> Record Payment
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Tenant</th>
                      <th className="px-5 py-3">Unit</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Method</th>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3">Amount KES</th>
                      <th className="px-5 py-3">Allocation</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs text-slate-600">
                    {displayPayments.filter(p => {
                      const query = paymentsSearchQuery.toLowerCase();
                      if (!query) return true;
                      return (
                        p.tenantName.toLowerCase().includes(query) ||
                        p.houseNumber.toLowerCase().includes(query) ||
                        p.reference.toLowerCase().includes(query) ||
                        p.method.toLowerCase().includes(query) ||
                        p.type.toLowerCase().includes(query) ||
                        p.status.toLowerCase().includes(query)
                      );
                    }).map(p => {
                      const typeStyle = p.type.toLowerCase().includes('water') ? 'bg-[#E1F5EE] text-[#0F6E56]' : 'bg-[#EEF2FF] text-[#4338CA]';
                      const methodStyle = p.method === 'M-Pesa' ? 'bg-[#EAF3DE] text-[#3B6D11]' : p.method === 'Bank' || p.method === 'Bank Transfer' ? 'bg-[#EEF2FF] text-[#4338CA]' : 'bg-[#FAEEDA] text-[#854F0B]';
                      
                      let statusStyle = 'bg-[#EAF3DE] text-[#3B6D11]';
                      if (p.status === 'Partial') statusStyle = 'bg-[#FEF3C7] text-[#92400E]';
                      if (p.status === 'Overdue') statusStyle = 'bg-[#FAECE7] text-[#993C1D]';

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-5 py-3.5 text-slate-400 font-medium">
                            {new Date(p.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#EEF2FF] text-[#4338CA] flex items-center justify-center font-bold text-[10px]">
                                {p.initials}
                              </div>
                              <span className="font-semibold text-slate-800">{p.tenantName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-700">
                            {p.houseNumber}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${typeStyle}`}>
                              {p.type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-1 rounded-full text-[9px] font-semibold ${methodStyle}`}>
                              {p.method}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400">
                            {p.reference}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            {p.amount > 0 ? p.amount.toLocaleString() : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-[10px] text-slate-500 font-medium">
                            {p.allocation}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${statusStyle}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            {p.status === 'Confirmed' && (
                              <button 
                                onClick={() => setReceiptModalData({ unit: p.houseNumber, tenantName: p.tenantName, amount: p.amount })}
                                className="px-2.5 py-1 bg-[#1D9E75] hover:bg-[#157A5B] text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                              >
                                {p.actionLabel}
                              </button>
                            )}
                            {p.status === 'Partial' && (
                              <button 
                                onClick={() => triggerNotification(`Splitting and allocating payment for ${p.tenantName}...`, 'info')}
                                className="px-2.5 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                              >
                                {p.actionLabel}
                              </button>
                            )}
                            {p.status === 'Overdue' && (
                              <button 
                                onClick={() => triggerNotification(`Sent direct WhatsApp rent demand reminder to ${p.tenantName}!`, 'success')}
                                className="px-2.5 py-1 bg-[#D85A30] hover:bg-[#B2401E] text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                              >
                                {p.actionLabel}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* AGING REPORT TAB */}
        {paymentsMainTab === 'aging' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Card: Summary & Visuals */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-4">Aging Summary</h4>
                
                {/* Visual Bars matching HTML */}
                <div className="space-y-1.5 mb-4">
                  {agingSummaryData.map(item => {
                    return (
                      <div key={item.name} className="flex items-center gap-2 mb-1.5 text-xs">
                        <span className="w-[60px] font-medium shrink-0" style={{ color: item.color }}>{item.name}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                        </div>
                        <span className="w-[30px] text-right font-semibold text-slate-800">{item.count}</span>
                        <span className="w-[80px] text-right text-slate-400 font-medium">KES {item.value.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub Donut */}
              <div className="h-[140px] border-t border-slate-50 pt-4 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={agingSummaryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {agingSummaryData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `KES ${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Card: Details Table */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-2">
              <h4 className="text-xs font-bold text-slate-800 mb-4">Overdue Detail</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                      <th className="pb-2.5">Unit</th>
                      <th className="pb-2.5">Tenant</th>
                      <th className="pb-2.5">Amount KES</th>
                      <th className="pb-2.5">Days Overdue</th>
                      <th className="pb-2.5">Aging Band</th>
                      <th className="pb-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                    <tr className="hover:bg-slate-50/40">
                      <td className="py-3 font-bold text-slate-900">A02</td>
                      <td className="py-3 text-slate-700">Grace Atieno</td>
                      <td className="py-3 text-[#D85A30] font-bold">11,175</td>
                      <td className="py-3 font-mono">32</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#F3E8FF] text-[#6B21A8]">30+ days</span>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap space-x-1">
                        <button 
                          onClick={() => triggerNotification('Sent direct WhatsApp rent demand reminder to Grace!', 'success')}
                          className="px-2 py-0.5 bg-[#D85A30] hover:bg-[#B2401E] text-white rounded text-[10px] font-bold"
                        >
                          Chase
                        </button>
                        <button 
                          onClick={() => setDetailsDrawer({ type: 'record', unitId: 'A02' })}
                          className="px-2 py-0.5 bg-[#4338CA] hover:bg-[#312E81] text-white rounded text-[10px] font-bold"
                        >
                          Record
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="py-3 font-bold text-slate-900">B01</td>
                      <td className="py-3 text-slate-700">Peter Kamau</td>
                      <td className="py-3 text-[#EF9F27] font-bold">4,260</td>
                      <td className="py-3 font-mono">8</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FEF3C7] text-[#92400E]">8–30 days</span>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap space-x-1">
                        <button 
                          onClick={() => triggerNotification('Sent direct SMS rent reminder to Peter!', 'success')}
                          className="px-2 py-0.5 bg-[#EF9F27] hover:bg-[#C87E17] text-white rounded text-[10px] font-bold"
                        >
                          Chase
                        </button>
                        <button 
                          onClick={() => setDetailsDrawer({ type: 'record', unitId: 'B01' })}
                          className="px-2 py-0.5 bg-[#4338CA] hover:bg-[#312E81] text-white rounded text-[10px] font-bold"
                        >
                          Record
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="py-3 font-bold text-slate-900">C02</td>
                      <td className="py-3 text-slate-700">David Ochieng</td>
                      <td className="py-3 text-[#EF9F27] font-bold">2,400</td>
                      <td className="py-3 font-mono">10</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FEF3C7] text-[#92400E]">8–30 days</span>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap space-x-1">
                        <button 
                          onClick={() => triggerNotification('Sent direct SMS rent reminder to David!', 'success')}
                          className="px-2 py-0.5 bg-[#EF9F27] hover:bg-[#C87E17] text-white rounded text-[10px] font-bold"
                        >
                          Chase
                        </button>
                        <button 
                          onClick={() => setDetailsDrawer({ type: 'record', unitId: 'C02' })}
                          className="px-2 py-0.5 bg-[#4338CA] hover:bg-[#312E81] text-white rounded text-[10px] font-bold"
                        >
                          Record
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EXPENSES TAB */}
        {paymentsMainTab === 'expenses' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Expenses</p>
                <h3 className="text-xl font-bold text-[#EF4444] mt-1">KES {totalExpensesVal.toLocaleString()}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Jun 2025</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Income</p>
                <h3 className="text-xl font-bold text-emerald-500 mt-1">KES {netCashFlowVal.toLocaleString()}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Revenue minus expenses</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">YTD Expenses</p>
                <h3 className="text-xl font-bold text-[#F59E0B] mt-1">KES {(totalExpensesVal + 36750).toLocaleString()}</h3>
                <p className="text-[10px] text-slate-400 mt-1">All categories cumulative</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-xs">Expense Log</h3>
                <button 
                  onClick={() => setShowExpenseModal(true)}
                  className="px-3.5 py-1.5 bg-royal-600 hover:bg-royal-700 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <Plus size={12} /> Add Expense
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3">Property</th>
                      <th className="px-5 py-3">Unit</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Amount KES</th>
                      <th className="px-5 py-3">Receipt</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600">
                    {displayExpenses.map(e => {
                      const receiptStyle = e.receipt === 'Yes' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#FAECE7] text-[#993C1D]';
                      return (
                        <tr key={e.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-5 py-3.5 text-slate-400 font-medium">
                            {new Date(e.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-800">
                            {e.description}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 font-medium">
                            {e.propertyName}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-500">
                            {e.unitNumber}
                          </td>
                          <td className="px-5 py-3.5">
                            {e.category === 'Maintenance' && (
                              <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-[#FAEEDA] text-[#854F0B]">
                                Maintenance
                              </span>
                            )}
                            {e.category === 'Operations' && (
                              <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-[#EAF3DE] text-[#3B6D11]">
                                Operations
                              </span>
                            )}
                            {e.category === 'Renovation' && (
                              <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-[#EEF2FF] text-[#4338CA]">
                                Renovation
                              </span>
                            )}
                            {e.category === 'Security' && (
                              <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-[#E1F5EE] text-[#0F6E56]">
                                Security
                              </span>
                            )}
                            {!['Maintenance', 'Operations', 'Renovation', 'Security'].includes(e.category) && (
                              <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">
                                {e.category}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-[#D85A30]">
                            {e.amount.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-1 rounded-md text-[9px] font-bold ${receiptStyle}`}>
                              {e.receipt}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            {e.receipt === 'Yes' ? (
                              <button 
                                onClick={() => triggerNotification('Opening scanned receipt...', 'info')}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-semibold transition-all shadow-sm bg-white cursor-pointer"
                              >
                                View
                              </button>
                            ) : (
                              <button 
                                onClick={() => triggerNotification('Please select PDF or JPEG receipt to upload...', 'info')}
                                className="px-2.5 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-lg text-[10px] font-semibold transition-all cursor-pointer border-none"
                              >
                                Upload
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom charts comparing expenses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 mb-4">Expenses vs Income</h4>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F8FAFC" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `K${v / 1000}`} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="Income" name="Income" fill="#1D9E75" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Expenses" name="Expenses" fill="#D85A30" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 mb-4">By Category</h4>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expensesByCategory.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `KES ${v}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MPESA RECONCILE TAB */}
        {paymentsMainTab === 'mpesa' && (
          <div className="space-y-6">
            <div className="bg-[#EEF2FF] border border-[#C7D2FE] p-4 rounded-xl flex items-start gap-3 text-xs text-indigo-700">
              <AlertTriangle className="text-indigo-600 mt-0.5 shrink-0" size={16} />
              <div>
                <p className="font-semibold">Automated M-Pesa Integration</p>
                <p className="mt-0.5 text-indigo-500 font-normal">M-Pesa transactions are auto-matched based on tenant phone records or reference codes. Unmatched entries require manual assignment below.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">M-Pesa Received</p>
                <h3 className="text-xl font-bold text-[#1D9E75] mt-1">KES 17,424</h3>
                <p className="text-[10px] text-slate-400 mt-1">12 transactions</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matched</p>
                <h3 className="text-xl font-bold text-[#1D9E75] mt-1">10 / 12</h3>
                <p className="text-[10px] text-slate-400 mt-1">83% auto-matched</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unmatched</p>
                <h3 className="text-xl font-bold text-[#EF9F27] mt-1">2</h3>
                <p className="text-[10px] text-slate-400 mt-1">Need manual review</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h4 className="font-bold text-slate-800 text-xs">M-Pesa Statement — June 2025</h4>
                <button 
                  onClick={() => triggerNotification('M-Pesa statement upload successful!', 'success')}
                  className="px-3.5 py-1.5 bg-royal-600 hover:bg-royal-700 text-white rounded-lg text-[11px] font-semibold"
                >
                  Upload M-Pesa Statement
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">M-Pesa Ref</th>
                      <th className="px-5 py-3">Phone</th>
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Amount KES</th>
                      <th className="px-5 py-3">Match Status</th>
                      <th className="px-5 py-3">Matched To</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                    {mpesaStatements.map(stmt => (
                      <tr key={stmt.id} className="hover:bg-slate-50/40">
                        <td className="px-5 py-3.5 text-slate-400 font-medium">{stmt.date}</td>
                        <td className="px-5 py-3.5 font-mono text-[10px] font-bold">{stmt.ref}</td>
                        <td className="px-5 py-3.5 text-slate-400 font-mono">{stmt.phone}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{stmt.name}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-800">{stmt.amount.toLocaleString()}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${stmt.status === 'Matched' ? 'bg-[#1D9E75]' : 'bg-[#EF9F27]'}`} />
                            <span className={`text-[11px] font-semibold ${stmt.status === 'Matched' ? 'text-[#1D9E75]' : 'text-[#EF9F27]'}`}>
                              {stmt.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-500">{stmt.matchDetails}</td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          {stmt.status === 'Matched' ? (
                            <button 
                              onClick={() => triggerNotification('Transaction allocation verified!', 'success')}
                              className="px-2.5 py-1 bg-[#1D9E75] hover:bg-[#157A5B] text-white rounded-lg font-bold text-[11px]"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button 
                              onClick={() => setShowManualMatchModal(true)}
                              className="px-2.5 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-lg font-bold text-[11px]"
                            >
                              Assign Unit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REMINDERS LOG TAB */}
        {paymentsMainTab === 'reminders' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-bold text-slate-800 text-xs">Reminder Log History</h4>
              <button 
                onClick={() => setShowSendReminderModal(true)}
                className="px-3.5 py-1.5 bg-royal-600 hover:bg-royal-700 text-white rounded-lg text-[11px] font-semibold"
              >
                Send Custom Reminder
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="px-5 py-3">Date Sent</th>
                    <th className="px-5 py-3">To</th>
                    <th className="px-5 py-3">Unit</th>
                    <th className="px-5 py-3">Channel</th>
                    <th className="px-5 py-3">Message</th>
                    <th className="px-5 py-3">Amount KES</th>
                    <th className="px-5 py-3">Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                  {remindersLog.map(log => {
                    const avatarBg = log.name.includes('Grace') ? 'bg-[#FAECE7] text-[#D85A30]' : 'bg-[#FAEEDA] text-[#EF9F27]';
                    const initials = log.name.split(' ').map(n => n[0]).join('');
                    const channelStyle = log.channel === 'WhatsApp' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#EEF2FF] text-[#4338CA]';
                    const amountStyle = log.name.includes('Grace') ? 'text-[#D85A30]' : 'text-[#EF9F27]';
                    const responseStyle = log.response === 'Paid' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#FAEEDA] text-[#854F0B]';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/40">
                        <td className="px-5 py-3.5 text-slate-400 font-medium">{log.date}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full ${avatarBg} font-bold text-[9px] flex items-center justify-center`}>
                              {initials}
                            </div>
                            <span className="font-semibold text-slate-800">{log.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-500">{log.unit}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${channelStyle}`}>
                            {log.channel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 font-medium">
                          {log.message}
                        </td>
                        <td className={`px-5 py-3.5 font-bold ${amountStyle}`}>
                          {log.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${responseStyle}`}>
                            {log.response}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CASH FLOW TAB */}
        {paymentsMainTab === 'cashflow' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Income vs Expenses trend chart */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-3">
                <h4 className="text-xs font-bold text-slate-800 mb-4">Income vs Expenses — 2025</h4>
                <div className="h-[210px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashFlowTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F8FAFC" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `K${v / 1000}`} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="Income" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Expenses" stroke="#D85A30" strokeWidth={1.5} strokeDasharray="5 5" dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="Net" stroke="#4338CA" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cash Flow breakdown card */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-slate-800 mb-2">June 2025 Cash Flow</h4>
                
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                    <span>Rent Collected</span>
                    <span className="text-[#1D9E75] font-bold">+ KES {Math.round(totalReceivedVal * 0.76).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                    <span>Water Collected</span>
                    <span className="text-[#1D9E75] font-bold">+ KES {Math.round(totalReceivedVal * 0.18).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                    <span>Garbage Collected</span>
                    <span className="text-[#1D9E75] font-bold">+ KES {Math.round(totalReceivedVal * 0.04).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                    <span>Late Fees Collected</span>
                    <span className="text-[#1D9E75] font-bold">+ KES {Math.round(totalReceivedVal * 0.02).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                    <span>Maintenance Expenses</span>
                    <span className="text-[#D85A30] font-bold">− KES {totalExpensesVal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 font-black text-slate-800 text-sm">
                    <span>Net Cash Flow</span>
                    <span className="text-[#4338CA] text-base">KES {netCashFlowVal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-50 pt-3">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>Cash Margin:</span>
                    <span className="text-[#4338CA]">75% margin</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-[#4338CA] h-full rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Cash flow monthly summary table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50"><h4 className="font-bold text-slate-800 text-xs">Monthly Cash Flow Summary</h4></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                      <th className="px-5 py-3">Month</th>
                      <th className="px-5 py-3">Income KES</th>
                      <th className="px-5 py-3">Expenses KES</th>
                      <th className="px-5 py-3">Net KES</th>
                      <th className="px-5 py-3">Margin</th>
                      <th className="px-5 py-3 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600 font-semibold">
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-5 py-3.5 font-bold text-slate-800">Jun 2025</td>
                      <td className="px-5 py-3.5 text-[#1D9E75]">{(totalReceivedVal || 24200).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-[#D85A30]">{(totalExpensesVal || 5850).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-[#4338CA]">{(netCashFlowVal || 18350).toLocaleString()}</td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF3DE] text-[#3B6D11]">76%</span></td>
                      <td className="px-5 py-3.5 text-right text-[#D85A30]">↓</td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-5 py-3.5 font-bold text-slate-800">May 2025</td>
                      <td className="px-5 py-3.5 text-[#1D9E75]">32,400</td>
                      <td className="px-5 py-3.5 text-[#D85A30]">3,200</td>
                      <td className="px-5 py-3.5 text-[#4338CA]">29,200</td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF3DE] text-[#3B6D11]">90%</span></td>
                      <td className="px-5 py-3.5 text-right text-[#1D9E75]">↑</td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-5 py-3.5 font-bold text-slate-800">Apr 2025</td>
                      <td className="px-5 py-3.5 text-[#1D9E75]">35,100</td>
                      <td className="px-5 py-3.5 text-[#D85A30]">4,100</td>
                      <td className="px-5 py-3.5 text-[#4338CA]">31,000</td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF3DE] text-[#3B6D11]">88%</span></td>
                      <td className="px-5 py-3.5 text-right text-[#1D9E75]">↑</td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-5 py-3.5 font-bold text-slate-800">Mar 2025</td>
                      <td className="px-5 py-3.5 text-[#1D9E75]">36,800</td>
                      <td className="px-5 py-3.5 text-[#D85A30]">2,800</td>
                      <td className="px-5 py-3.5 text-[#4338CA]">34,000</td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF3DE] text-[#3B6D11]">92%</span></td>
                      <td className="px-5 py-3.5 text-right text-[#1D9E75]">↑</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* COMMON PAYMENT MODALS / DRAWER RENDERS */}
        {/* ======================================================= */}

        {/* Manual Match Modal */}
        {showManualMatchModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Assign Unmatched Payment</h3>
                <button onClick={() => setShowManualMatchModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
              <p className="text-xs text-slate-500">Manually match M-Pesa transaction RXK2291A (KES 3,200) to a unit bill registry.</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Assign To Unit</label>
                  <select className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800">
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>Unit {t.houseNumber} — {t.name} (Due: KES {t.bills.total.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Bill Type</label>
                  <select className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800">
                    <option value="RENT">Rent Only</option>
                    <option value="WATER">Water Only</option>
                    <option value="TOTAL">Total Dues</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Notes / Remarks</label>
                  <input type="text" placeholder="e.g. Tenant sent M-Pesa screenshot" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowManualMatchModal(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
                <button 
                  onClick={() => {
                    triggerNotification('M-Pesa transaction matched successfully!', 'success');
                    setShowManualMatchModal(false);
                  }}
                  className="flex-1 py-2 bg-royal-600 hover:bg-royal-700 text-white rounded-xl text-xs font-bold"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send Reminder Modal */}
        {showSendReminderModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Send Payment Reminder</h3>
                <button onClick={() => setShowSendReminderModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Recipient</label>
                  <select className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800">
                    <option value="all">All Overdue Tenants</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>Unit {t.houseNumber} — {t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Notification Channel</label>
                  <select className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800">
                    <option value="WhatsApp">WhatsApp Message</option>
                    <option value="SMS">SMS Text</option>
                    <option value="Both">Both SMS and WhatsApp</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Message Text</label>
                  <textarea 
                    rows={3}
                    defaultValue="Dear tenant, your rent payment of KES [amount] is overdue. Please settle via M-Pesa Paybill 123456 Account [unit]. Thank you."
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSendReminderModal(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
                <button 
                  onClick={() => {
                    triggerNotification('Payment reminders dispatched successfully!', 'success');
                    setShowSendReminderModal(false);
                  }}
                  className="flex-1 py-2 bg-royal-600 hover:bg-royal-700 text-white rounded-xl text-xs font-bold"
                >
                  Send Reminder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {receiptModalData && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 space-y-4">
              <div className="text-center">
                <span className="text-3xl">🧾</span>
                <h3 className="font-bold text-slate-900 text-base mt-2">Payment Receipt</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Properties Portal Official</p>
              </div>
              <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-center">
                <p className="text-2xl font-black">KES {receiptModalData.amount.toLocaleString()}</p>
                <p className="text-[10px] font-bold uppercase mt-0.5">Payment Confirmed</p>
              </div>
              <div className="space-y-1.5 text-xs font-semibold text-slate-500">
                <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                  <span>Receipt No.</span>
                  <span className="text-slate-800 font-bold">RCP-2025-{receiptModalData.unit}-001</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                  <span>Tenant</span>
                  <span className="text-slate-800 font-bold">{receiptModalData.tenantName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                  <span>Unit</span>
                  <span className="text-slate-800 font-bold">Unit {receiptModalData.unit} • Royal Flats</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                  <span>Period</span>
                  <span className="text-slate-800 font-bold">June 2025</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                  <span>Method</span>
                  <span className="text-slate-800 font-bold">M-Pesa</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Date</span>
                  <span className="text-slate-800 font-bold">Jun 2, 2025</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setReceiptModalData(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">Close</button>
                <button 
                  onClick={() => {
                    triggerNotification('Receipt PDF download started...', 'success');
                    setReceiptModalData(null);
                  }}
                  className="flex-1 py-2 bg-royal-600 hover:bg-royal-700 text-white rounded-xl text-xs font-bold"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Record Payment Drawer Modal overlay */}
        {detailsDrawer && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-end z-50 animate-fadeIn">
            <div className="bg-white border-l border-slate-100 max-w-sm w-full h-full p-6 flex flex-col justify-between overflow-y-auto animate-slideOver">
              <div className="space-y-5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-base">
                    {detailsDrawer.type === 'dispute' ? 'Bill Note / Dispute' : 'Record Payment'}
                  </h3>
                  <button onClick={() => setDetailsDrawer(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
                </div>

                {detailsDrawer.type === 'dispute' && (
                  <div className="space-y-4 text-xs font-semibold text-slate-600">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Unit {detailsDrawer.unitId} — Dispute Entry</p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400">Note Type</label>
                      <select className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800">
                        <option>Tenant Dispute</option>
                        <option>Billing Error Note</option>
                        <option>Custom Adjustment Comment</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400">Dispute Note</label>
                      <textarea 
                        rows={3}
                        placeholder="e.g. Tenant disputes water reading - requires re-check"
                        className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400">Investigation Status</label>
                      <select className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800">
                        <option>Under Review</option>
                        <option>Open</option>
                        <option>Resolved</option>
                      </select>
                    </div>
                  </div>
                )}

                {detailsDrawer.type === 'record' && (
                  <div className="space-y-4 text-xs font-semibold text-slate-600">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Quick Record — Unit {detailsDrawer.unitId}</p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400">Amount Paid (KES)</label>
                      <input type="number" placeholder="Enter amount" className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400">Payment Method</label>
                      <select className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800">
                        <option>M-Pesa</option>
                        <option>Bank Transfer</option>
                        <option>Cash</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400">Reference ID</label>
                      <input type="text" placeholder="e.g. QHJ7823K" className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400">Allocation Type</label>
                      <select className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800">
                        <option>Rent first, then utilities</option>
                        <option>Utilities first, then rent</option>
                        <option>Split equally</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-8 border-t border-slate-50 pt-4">
                <button onClick={() => setDetailsDrawer(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
                <button 
                  onClick={() => {
                    triggerNotification(detailsDrawer.type === 'dispute' ? 'Note saved successfully!' : 'Payment recorded successfully!', 'success');
                    setDetailsDrawer(null);
                  }}
                  className="flex-1 py-2.5 bg-royal-600 hover:bg-royal-700 text-white rounded-xl text-xs font-bold"
                >
                  {detailsDrawer.type === 'dispute' ? 'Save Dispute Note' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Render default RecordPaymentModal inside branch */}
        {showRecordPaymentModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-royal-100 text-royal-600 rounded-lg">
                    <CreditCard size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Record Payment</h3>
                </div>
                <button 
                  onClick={() => setShowRecordPaymentModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const tenantId = data.get('tenantId') as string;
                const amount = Number(data.get('amount'));
                const type = data.get('type') as 'RENT' | 'WATER' | 'GARBAGE' | 'TOTAL';
                const method = data.get('method') as string;
                const reference = data.get('reference') as string || `TXN${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                const dateInput = data.get('date') as string;

                const tenant = tenants.find(t => t.id === tenantId);
                if (!tenant) return;

                const prevBills = tenant.bills;
                let rentVal = prevBills.rent;
                let waterVal = prevBills.water;
                let garbageVal = prevBills.garbage;

                // Deduct based on type
                if (type === 'RENT') rentVal = Math.max(0, rentVal - amount);
                else if (type === 'WATER') waterVal = Math.max(0, waterVal - amount);
                else if (type === 'GARBAGE') garbageVal = Math.max(0, garbageVal - amount);
                else {
                  let rem = amount;
                  const waterPay = Math.min(rem, waterVal);
                  waterVal -= waterPay;
                  rem -= waterPay;
                  const garbagePay = Math.min(rem, garbageVal);
                  garbageVal -= garbagePay;
                  rem -= garbagePay;
                  rentVal = Math.max(0, rentVal - rem);
                }

                const totalVal = rentVal + waterVal + garbageVal;
                const newStatus = totalVal <= 0 ? 'PAID' : 'PARTIAL';

                const updatedTenant: Tenant = {
                  ...tenant,
                  bills: {
                    ...prevBills,
                    rent: rentVal,
                    water: waterVal,
                    garbage: garbageVal,
                    total: totalVal,
                    status: newStatus
                  }
                };

                if (onUpdateTenant) {
                  onUpdateTenant(updatedTenant);
                }

                const newRecordedPayment = {
                  id: `p-local-${Date.now()}`,
                  tenantId: tenant.id,
                  amount: amount,
                  date: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString(),
                  type: type,
                  reference: reference,
                  method: method,
                };
                
                setLocalPaymentHistory(prev => [newRecordedPayment, ...prev]);
                triggerNotification(`KES ${amount.toLocaleString()} payment recorded for Unit ${tenant.houseNumber}!`);
                setShowRecordPaymentModal(false);
              }} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tenant / Unit</label>
                  <select 
                    name="tenantId" 
                    required
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-royal-500 transition-all cursor-pointer"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>
                        Unit {t.houseNumber} — {t.name} (Due: KES {t.bills.total.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount (KES)</label>
                    <input 
                      type="number" 
                      name="amount" 
                      required 
                      placeholder="e.g. 8000"
                      className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-royal-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bill Type</label>
                    <select 
                      name="type" 
                      className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-royal-500 transition-all cursor-pointer"
                    >
                      <option value="TOTAL">Total Bills</option>
                      <option value="RENT">Rent Only</option>
                      <option value="WATER">Water Only</option>
                      <option value="GARBAGE">Garbage Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Method</label>
                    <select 
                      name="method" 
                      className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-royal-500 transition-all cursor-pointer"
                    >
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="Bank">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment Date</label>
                    <input 
                      type="date" 
                      name="date" 
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-royal-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reference / Transaction Code</label>
                    <button 
                      type="button"
                      onClick={(e) => {
                        const input = e.currentTarget.closest('.space-y-1\\.5')?.querySelector('input');
                        if (input) {
                          input.value = `MPESA-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
                        }
                      }}
                      className="text-[10px] text-royal-600 hover:underline font-bold"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <input 
                    type="text" 
                    name="reference" 
                    placeholder="e.g. QY54D8J92"
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-royal-500 transition-all"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-royal-600 hover:bg-royal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md mt-2 cursor-pointer"
                >
                  Confirm Payment Record
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'expenses') {
    return (
      <div className="space-y-8 md:space-y-10 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl md:text-5xl font-display font-black text-slate-900 tracking-tight">Expense Control</h2>
            <p className="text-slate-400 text-xs md:text-sm font-medium">Audit operational overheads and capital expenditure across your portfolio.</p>
          </div>
          <button onClick={() => setShowExpenseModal(true)} className="w-full md:w-auto bg-royal-500 text-white px-6 md:px-10 py-3.5 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-glow hover:bg-royal-600 active:scale-95 transition-all">
            <Plus size={18}/> Log Operational Outflow
          </button>
        </div>

        {showExpenseModal && <AddExpenseModal onAdd={onAddExpense} onClose={() => setShowExpenseModal(false)} />}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
           {expenseByCategory.map((cat, i) => (
             <div key={cat.name} className="bg-white p-5 md:p-8 rounded-3xl md:rounded-4xl border border-slate-100 shadow-premium group hover:border-royal-200 transition-all">
                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2">{cat.name}</p>
                <p className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">KES {cat.value.toLocaleString()}</p>
             </div>
           ))}
           {expenseByCategory.length === 0 && (
             <div className="col-span-2 md:col-span-4 bg-slate-50 border-2 border-dashed border-slate-200 p-8 md:p-12 rounded-3xl md:rounded-6xl text-center">
               <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-3 md:mb-4 shadow-sm"><FileText size={24} className="md:w-8 md:h-8"/></div>
               <p className="text-slate-400 font-black uppercase tracking-widest text-[8px] md:text-[10px]">Awaiting First Ledger Entry</p>
             </div>
           )}
        </div>

        <div className="bg-white rounded-3xl md:rounded-6xl border border-slate-200 shadow-premium overflow-hidden">
          <div className="p-6 md:p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/30">
             <h3 className="font-black text-lg md:text-xl text-slate-900 w-full md:w-auto">Transaction Ledger</h3>
             <div className="flex gap-3 md:gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search ledger..." className="pl-12 pr-6 py-3.5 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-sm outline-none focus:border-royal-500 transition-all w-full md:w-80 shadow-sm font-medium" />
                </div>
                <button className="p-3.5 md:p-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-slate-400 hover:text-royal-500 transition-all shadow-sm">
                  <Filter size={18} className="md:w-5 md:h-5" />
                </button>
             </div>
          </div>

          {/* Mobile Card View for Expenses */}
          <div className="block md:hidden divide-y divide-slate-50">
            {expenses.map(e => (
              <div key={e.id} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-900 text-sm">{e.description}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • {e.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-rose-500 text-base">-KES {e.amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Post Date</th>
                  <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</th>
                  <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Narration</th>
                  <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Debit (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.length === 0 && (
                  <tr><td colSpan={4} className="p-40 text-center text-slate-300 italic font-medium">No expenses recorded for the current cycle.</td></tr>
                )}
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-all duration-300 group">
                    <td className="px-12 py-8 text-sm font-bold text-slate-500">{new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-12 py-8">
                      <span className="bg-white text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 shadow-sm group-hover:border-royal-200 transition-colors">{e.category}</span>
                    </td>
                    <td className="px-12 py-8 text-base font-black text-slate-900">{e.description}</td>
                    <td className="px-12 py-8 text-right font-black text-rose-500 text-xl tracking-tighter">-{e.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'reports') {
    return (
      <div className="space-y-8 md:space-y-12 animate-fadeIn">
        {showReportModal && (
          <ReportPreviewModal 
            type={showReportModal} 
            data={{ tenants, houses, payments, expenses, stats: { totalExpected, totalCollected, totalExpenses, netIncome } }} 
            onClose={() => setShowReportModal(null)} 
          />
        )}
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl md:text-5xl font-display font-black text-slate-900 tracking-tight">Intelligence Center</h2>
            <p className="text-slate-400 text-xs md:text-sm font-medium">Executive documentation for stakeholders and legal compliance audit.</p>
          </div>
          <button onClick={handleAIReport} disabled={loadingAI} className="w-full md:w-auto flex items-center justify-center gap-3 md:gap-4 bg-royal-900 text-white px-6 md:px-12 py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-900 shadow-2xl active:scale-95 transition-all group">
            {loadingAI ? <Activity className="animate-spin" size={18}/> : <Briefcase size={18} className="group-hover:rotate-12 transition-transform"/>}
            {loadingAI ? 'Running Portfolio Scan...' : 'Request AI Executive Audit'}
          </button>
        </div>

        {aiReport && (
          <div className="bg-royal-900 p-6 md:p-16 rounded-2xl md:rounded-6xl relative overflow-hidden shadow-2xl animate-slideUp border border-white/5">
             <div className="absolute top-0 right-0 p-8 md:p-16 opacity-5 text-white"><FileText size={100} className="md:w-[300px] md:h-[300px]" /></div>
             <div className="relative z-10 space-y-4 md:space-y-8 max-w-4xl">
                <div className="flex items-center gap-3 md:gap-4">
                   <div className="w-8 h-8 md:w-12 md:h-12 bg-royal-50 rounded-lg md:rounded-2xl flex items-center justify-center text-white shadow-glow"><Activity size={16} className="md:w-6 md:h-6"/></div>
                   <span className="text-royal-300 text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em]">AI Reliability Insights</span>
                </div>
                <p className="text-lg md:text-4xl font-display text-white italic leading-tight font-black">"{aiReport}"</p>
                <div className="pt-2 md:pt-8 flex gap-4 md:gap-6">
                   <button onClick={() => setAiReport(null)} className="text-royal-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest hover:text-white transition-all border-b border-royal-400/20 pb-1">Dismiss Audit</button>
                   <button className="text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest hover:text-royal-300 transition-all border-b border-white/20 pb-1">Save to Archive</button>
                </div>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-10">
           <ReportActionCard title="Monthly P&L" desc="Revenue, Expenses & Profit Breakdown for the current cycle." icon={<DollarSign size={20} className="md:w-7 md:h-7"/>} onClick={() => setShowReportModal('FINANCIAL')} accent="royal" />
           <ReportActionCard title="Occupancy Audit" desc="Unit Status, Turnover & Vacancy Risk assessment." icon={<Home size={20} className="md:w-7 md:h-7"/>} onClick={() => setShowReportModal('OCCUPANCY')} accent="amber" />
           <ReportActionCard title="Default Risk" desc="Aging Arrears & Late Payment Profile for high-risk accounts." icon={<AlertTriangle size={20} className="md:w-7 md:h-7"/>} onClick={() => setShowReportModal('ARREARS')} accent="red" />
        </div>

        <div className="bg-white p-6 md:p-16 rounded-3xl md:rounded-6xl border border-slate-200 shadow-premium relative overflow-hidden">
           <div className="absolute top-0 right-0 w-48 h-48 md:w-96 md:h-96 bg-slate-50 rounded-full -mr-24 -mt-24 md:-mr-48 md:-mt-48 blur-3xl opacity-50" />
           <div className="flex items-center justify-between mb-6 md:mb-16 relative z-10">
              <div>
                <h3 className="text-lg md:text-3xl font-black text-slate-900 flex items-center gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-royal-50 rounded-lg md:rounded-xl text-royal-500"><Signature size={20} className="md:w-7 md:h-7" /></div>
                  Pending Compliance
                </h3>
                <p className="text-slate-400 text-[10px] md:text-sm font-medium mt-1 md:mt-2">Counter-signing required for new digital lease agreements.</p>
              </div>
           </div>
           <div className="space-y-4 md:space-y-6 relative z-10">
              {tenants.filter(t => t.rentAgreement?.tenantSignature && !t.rentAgreement.landlordSignature).map(t => (
                <div key={t.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-10 bg-slate-50/50 rounded-2xl md:rounded-4xl border border-slate-100 group hover:border-royal-300 hover:bg-white transition-all duration-500 shadow-sm hover:shadow-xl">
                   <div className="flex items-center gap-4 md:gap-8 mb-4 md:mb-0">
                      <div className="w-12 h-12 md:w-20 md:h-20 bg-white rounded-xl md:rounded-3xl flex items-center justify-center text-royal-500 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"><FileText size={20} className="md:w-9 md:h-9"/></div>
                      <div>
                         <h4 className="font-black text-base md:text-2xl text-slate-900 tracking-tight">Unit {t.houseNumber} — {t.name}</h4>
                         <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 md:mt-2">Resident Executed on {new Date(t.joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })}</p>
                      </div>
                   </div>
                   <button onClick={() => handleCounterSign(t)} className="w-full md:w-auto flex items-center justify-center gap-3 md:gap-4 bg-royal-500 text-white px-6 md:px-10 py-3.5 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-royal-600 transition-all shadow-glow active:scale-95">
                      Counter-Sign Now <ShieldCheck size={16} className="md:w-5 md:h-5"/>
                   </button>
                </div>
              ))}
              {tenants.filter(t => t.rentAgreement?.tenantSignature && !t.rentAgreement.landlordSignature).length === 0 && (
                <div className="py-12 md:py-24 text-center bg-slate-50/50 rounded-2xl md:rounded-6xl border-2 border-dashed border-slate-200">
                  <div className="w-12 h-12 md:w-20 md:h-20 bg-white rounded-xl md:rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-3 md:mb-6 shadow-sm"><ShieldCheck size={24} className="md:w-10 md:h-10"/></div>
                  <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[8px] md:text-[10px]">All legal instruments are fully executed</p>
                </div>
              )}
           </div>
        </div>
      </div>
    );
  }

  if (view === 'settings') {
    return (
      <div className="space-y-8 md:space-y-12 animate-fadeIn">
        {showSaveConfirm && (
          <SettingsConfirmationModal 
            config={localConfig} 
            onCancel={() => setShowSaveConfirm(false)} 
            onConfirm={handleCommitSettings} 
          />
        )}

        <div className="flex flex-col gap-1">
          <h2 className="text-3xl md:text-5xl font-display font-black text-slate-900 tracking-tight">System Architecture</h2>
          <p className="text-slate-400 text-xs md:text-sm font-medium">Define how your property handles liquidity and collection protocols.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          {/* M-PESA CONFIG */}
          <div className="bg-white p-6 md:p-16 rounded-3xl md:rounded-6xl border border-slate-200 shadow-premium relative overflow-hidden group hover:border-emerald-200 transition-all duration-500">
            <div className="absolute top-0 right-0 p-8 md:p-12 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform duration-700"><Smartphone size={160} className="md:w-[240px] md:h-[240px]" /></div>
            <div className="flex items-center gap-4 md:gap-6 mb-8 md:mb-16 relative z-10">
              <div className="p-4 md:p-6 bg-emerald-50 rounded-2xl md:rounded-3xl text-emerald-600 border border-emerald-100 shadow-sm"><Smartphone size={24} className="md:w-9 md:h-9"/></div>
              <div>
                <h4 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">M-Pesa Gateway</h4>
                <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1 md:mt-2">Daraja API Direct Push</p>
              </div>
            </div>
            
            <div className="space-y-6 md:space-y-10 relative z-10">
              <div className="space-y-3 md:space-y-4">
                <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] pl-1">Service Protocol</label>
                <div className="flex bg-slate-100 p-1.5 md:p-2 rounded-2xl md:rounded-3xl border border-slate-200">
                  <button onClick={() => setLocalConfig({...localConfig, mpesaType: 'PAYBILL'})} className={`flex-1 py-3 md:py-5 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase transition-all tracking-[0.2em] ${localConfig.mpesaType === 'PAYBILL' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>Paybill (Business)</button>
                  <button onClick={() => setLocalConfig({...localConfig, mpesaType: 'TILL'})} className={`flex-1 py-3 md:py-5 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase transition-all tracking-[0.2em] ${localConfig.mpesaType === 'TILL' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>Buy Goods (Till)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">{localConfig.mpesaType === 'PAYBILL' ? 'Business Number' : 'Store Number'}</label>
                  <input type="text" className="w-full p-4 md:p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl outline-none focus:border-emerald-500 font-black text-xl md:text-2xl transition-all shadow-inner" value={localConfig.mpesaNumber ?? ''} onChange={e => setLocalConfig({...localConfig, mpesaNumber: e.target.value})} placeholder="400200" />
                </div>
                {localConfig.mpesaType === 'PAYBILL' && (
                  <div className="space-y-2 md:space-y-3">
                    <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Ref Prefix</label>
                    <input type="text" className="w-full p-4 md:p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl outline-none focus:border-emerald-500 font-black text-xl md:text-2xl transition-all shadow-inner" value={localConfig.mpesaAccountPrefix ?? ''} onChange={e => setLocalConfig({...localConfig, mpesaAccountPrefix: e.target.value})} placeholder="ROYAL" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BANK CONFIG */}
          <div className="bg-white p-6 md:p-16 rounded-3xl md:rounded-6xl border border-slate-200 shadow-premium relative overflow-hidden group hover:border-royal-200 transition-all duration-500">
            <div className="absolute top-0 right-0 p-8 md:p-12 opacity-5 text-royal-500 group-hover:scale-110 transition-transform duration-700"><Landmark size={160} className="md:w-[240px] md:h-[240px]" /></div>
            <div className="flex items-center gap-4 md:gap-6 mb-8 md:mb-16 relative z-10">
              <div className="p-4 md:p-6 bg-royal-50 rounded-2xl md:rounded-3xl text-royal-600 border border-royal-100 shadow-sm"><Landmark size={24} className="md:w-9 md:h-9"/></div>
              <div>
                <h4 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">Bank Settlement</h4>
                <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1 md:mt-2">Automated Revenue Mapping</p>
              </div>
            </div>

            <div className="space-y-6 md:space-y-10 relative z-10">
              <div className="space-y-3 md:space-y-4">
                <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] pl-1">Target Institution</label>
                <div className="relative">
                  <select 
                    className="w-full p-4 md:p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl outline-none focus:border-royal-500 font-black text-base md:text-lg transition-all appearance-none shadow-inner cursor-pointer"
                    value={localConfig.bankName ?? ''}
                    onChange={(e) => handleBankSelect(e.target.value)}
                  >
                    <option value="">Select a Bank...</option>
                    {KENYAN_BANKS.map(bank => (
                      <option key={bank.name} value={bank.name}>{bank.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-6 md:right-8 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none md:w-6 md:h-6" size={20} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Bank Paybill</label>
                  <input type="text" className="w-full p-4 md:p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl outline-none focus:border-royal-500 font-black text-xl md:text-2xl transition-all shadow-inner" value={localConfig.bankPaybillNumber ?? ''} onChange={e => setLocalConfig({...localConfig, bankPaybillNumber: e.target.value})} placeholder="e.g. 247247" />
                </div>
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Account No</label>
                  <input type="text" className="w-full p-4 md:p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl outline-none focus:border-royal-500 font-black text-xl md:text-2xl transition-all shadow-inner" value={localConfig.bankAccountNumber ?? ''} onChange={e => setLocalConfig({...localConfig, bankAccountNumber: e.target.value})} placeholder="Equity A/C No" />
                </div>
              </div>
              
              <div className="space-y-2 md:space-y-3">
                <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Beneficiary Narration</label>
                <input type="text" className="w-full p-4 md:p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl outline-none focus:border-royal-500 font-black text-base md:text-lg transition-all shadow-inner" value={localConfig.bankAccountName ?? ''} onChange={e => setLocalConfig({...localConfig, bankAccountName: e.target.value})} placeholder="Your Full Registered Name" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 md:pt-8">
          <button onClick={() => setShowSaveConfirm(true)} className="w-full md:w-auto bg-royal-900 text-white px-8 py-4 md:px-20 md:py-7 rounded-2xl md:rounded-6xl font-black text-xs md:text-sm uppercase tracking-[0.3em] hover:bg-slate-900 shadow-2xl flex items-center justify-center gap-4 md:gap-6 transition-all active:scale-95 group">
            <Save size={20} className="md:w-6 md:h-6 group-hover:scale-110 transition-transform"/> Commit System Architecture
            <ChevronRight size={20} className="md:w-6 md:h-6 group-hover:translate-x-2 transition-transform"/>
          </button>
        </div>
      </div>
    );
  }

  // 1. UNITS VIEW
  if (view === 'units') {
    // Dynamic Classifiers
    const getUnitStatus = (house: House) => {
      if (house.maintenanceStatus === MaintenanceStatus.UNDER_REPAIR) return 'Maintenance';
      const tenant = tenants.find(t => t.houseNumber === house.houseNumber);
      if (tenant) {
        if (tenant.bills.status === 'UNPAID' || tenant.bills.status === 'PARTIAL') {
          return 'Overdue';
        }
        return 'Occupied';
      }
      return 'Vacant';
    };

    const getUnitRentRate = (house: House) => {
      const tenant = tenants.find(t => t.houseNumber === house.houseNumber);
      if (tenant?.bills.rent) return tenant.bills.rent;
      if (house.type === 'Studio') return 8000;
      if (house.type === '1 Bedroom') return 12000;
      if (house.type === '2 Bedroom') return 18000;
      return 35000; // Penthouse
    };

    const getLeaseEnd = (joinDate: string) => {
      if (!joinDate) return '—';
      const d = new Date(joinDate);
      d.setFullYear(d.getFullYear() + 1);
      return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    };

    const getFloorLabel = (houseNumber: string) => {
      const clean = houseNumber.toUpperCase().trim();
      if (clean.startsWith('A') || clean.startsWith('G') || clean.includes('GROUND') || clean.startsWith('0') || clean.startsWith('10')) {
        return 'Ground Floor';
      }
      if (clean.startsWith('B') || clean.includes('FIRST') || clean.startsWith('1') || clean.startsWith('20')) {
        return 'First Floor';
      }
      if (clean.startsWith('C') || clean.includes('SECOND') || clean.startsWith('2') || clean.startsWith('30')) {
        return 'Second Floor';
      }
      if (clean.startsWith('D') || clean.includes('THIRD') || clean.startsWith('3') || clean.includes('PENTHOUSE')) {
        return 'Penthouse & Upper Levels';
      }
      return 'Main Level';
    };

    // Filters & Memoized Datasets
    const allUnitsForProp = houses.filter(h => {
      if (selectedUnitProperty === 'All') return true;
      return h.propertyName === selectedUnitProperty;
    });

    const searchedUnits = allUnitsForProp.filter(h => {
      const tenant = tenants.find(t => t.houseNumber === h.houseNumber);
      const q = unitSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        h.houseNumber.toLowerCase().includes(q) ||
        (tenant && tenant.name.toLowerCase().includes(q)) ||
        (h.propertyName && h.propertyName.toLowerCase().includes(q)) ||
        h.type.toLowerCase().includes(q)
      );
    });

    const finalFilteredUnits = searchedUnits.filter(h => {
      if (unitStatusFilter === 'All') return true;
      return getUnitStatus(h) === unitStatusFilter;
    });

    // Grouping by floor
    const groupedUnitsByFloor: Record<string, House[]> = {};
    finalFilteredUnits.forEach(unit => {
      const floor = getFloorLabel(unit.houseNumber);
      if (!groupedUnitsByFloor[floor]) groupedUnitsByFloor[floor] = [];
      groupedUnitsByFloor[floor].push(unit);
    });

    // Metrics
    const uniquePropertyCount = Array.from(new Set(houses.map(h => h.propertyName).filter(Boolean))).length;
    const occupiedCount = allUnitsForProp.filter(h => getUnitStatus(h) === 'Occupied').length;
    const vacantCount = allUnitsForProp.filter(h => getUnitStatus(h) === 'Vacant').length;
    const maintenanceCount = allUnitsForProp.filter(h => getUnitStatus(h) === 'Maintenance').length;
    const overdueCount = allUnitsForProp.filter(h => getUnitStatus(h) === 'Overdue').length;
    const currentOccupancyRate = allUnitsForProp.length > 0 ? Math.round(((occupiedCount + overdueCount) / allUnitsForProp.length) * 100) : 0;
    
    const totalOverdueAmount = allUnitsForProp.reduce((sum, h) => {
      const tenant = tenants.find(t => t.houseNumber === h.houseNumber);
      if (tenant && (tenant.bills.status === 'UNPAID' || tenant.bills.status === 'PARTIAL')) {
        return sum + (tenant.bills.total || 0);
      }
      return sum;
    }, 0);

    // Selected Drawer Assets
    const selectedUnit = houses.find(h => h.id === selectedUnitId);
    const selectedUnitTenant = selectedUnit ? tenants.find(t => t.houseNumber === selectedUnit.houseNumber) : null;
    const selectedUnitStatus = selectedUnit ? getUnitStatus(selectedUnit) : 'Vacant';
    
    const unitPayments = (() => {
      if (!selectedUnit || !selectedUnitTenant) return [];
      const dbPays = payments.filter(p => p.tenantId === selectedUnitTenant.id);
      const localPays = localPaymentHistory.filter(p => p.tenantId === selectedUnitTenant.id);
      return [...localPays, ...dbPays].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    })();

    const handleRecordDrawerPaymentSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUnitTenant || !selectedUnit) return;
      const paymentAmt = parseFloat(drawerPaymentAmount) || 0;
      if (paymentAmt <= 0) {
        triggerNotification('Please enter a valid payment amount.', 'error');
        return;
      }

      const prevBills = selectedUnitTenant.bills;
      let rentVal = prevBills.rent;
      let waterVal = prevBills.water;
      let garbageVal = prevBills.garbage;

      // Deduct from water first, then garbage, then rent:
      let rem = paymentAmt;
      const waterPay = Math.min(rem, waterVal);
      waterVal -= waterPay;
      rem -= waterPay;
      const garbagePay = Math.min(rem, garbageVal);
      garbageVal -= garbagePay;
      rem -= garbagePay;
      rentVal = Math.max(0, rentVal - rem);

      const totalVal = rentVal + waterVal + garbageVal;
      const newStatus = totalVal <= 0 ? 'PAID' : 'PARTIAL';

      const updatedTenant: Tenant = {
        ...selectedUnitTenant,
        bills: {
          ...prevBills,
          rent: rentVal,
          water: waterVal,
          garbage: garbageVal,
          total: totalVal,
          status: newStatus
        }
      };

      if (onUpdateTenant) {
        onUpdateTenant(updatedTenant);
      }

      const newRecordedPayment = {
        id: `p-local-${Date.now()}`,
        tenantId: selectedUnitTenant.id,
        amount: paymentAmt,
        date: new Date().toISOString(),
        type: 'TOTAL',
        reference: `TXN${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        method: drawerPaymentMethod,
      };
      setLocalPaymentHistory(prev => [newRecordedPayment, ...prev]);

      triggerNotification(`KES ${paymentAmt.toLocaleString()} payment recorded for Unit ${selectedUnit.houseNumber}!`);
      setDrawerPaymentAmount('');
      setShowDrawerPaymentForm(false);
    };

    return (
      <div className="space-y-8 animate-fadeIn relative pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Units</h2>
            <p className="text-slate-400 text-xs font-semibold max-w-2xl">
              Manage all units across your properties — occupancy, billing, and tenant info.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            {/* Search Box */}
            <div className="relative w-full md:w-60">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search unit or tenant..." 
                value={unitSearchQuery}
                onChange={(e) => setUnitSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:border-[#4338CA] outline-none transition-all shadow-sm" 
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => triggerNotification('Custom search parameters and table filters are active.')}
                className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <SlidersHorizontal size={13} className="text-slate-400" /> Filter
              </button>
              <button 
                onClick={() => {
                  triggerNotification('Unit registry excel workbook exported successfully!');
                }}
                className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Download size={13} className="text-slate-400" /> Export
              </button>
            </div>
            <button 
              onClick={() => setShowAddHouseModal(true)}
              className="w-full sm:w-auto bg-[#4338CA] hover:bg-[#3B2EC2] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#4338CA]/10 transition-all cursor-pointer"
            >
              <Plus size={14}/> Add Unit
            </button>
          </div>
        </div>

        {/* Dynamic Notification Banners */}
        {notification && (
          <div className={`p-4 rounded-xl font-bold text-xs flex items-center justify-between animate-fadeIn transition-all shadow-sm ${
            notification.type === 'success' ? 'bg-[#ECFDF5] border border-emerald-100 text-emerald-800 animate-pulse' : 'bg-[#FFFBEB] border border-amber-100 text-amber-800'
          }`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-slate-200/40 rounded-lg cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex justify-between items-start shadow-sm hover:border-[#4338CA] transition-all">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Units</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{allUnitsForProp.length}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Across {uniquePropertyCount} properties</p>
            </div>
            <div className="w-9 h-9 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#4338CA] shrink-0">
              <Plus size={16} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex justify-between items-start shadow-sm hover:border-[#4338CA] transition-all">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Occupied</p>
              <h3 className="text-2xl font-black text-[#4338CA] tracking-tight">{occupiedCount}</h3>
              <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">↑ {currentOccupancyRate}% occupancy</p>
            </div>
            <div className="w-9 h-9 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#4338CA] shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex justify-between items-start shadow-sm hover:border-emerald-200 transition-all">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vacant</p>
              <h3 className="text-2xl font-black text-[#1D9E75] tracking-tight">{vacantCount}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ready to let</p>
            </div>
            <div className="w-9 h-9 bg-[#EAF3DE] rounded-xl flex items-center justify-center text-[#1D9E75] shrink-0">
              <Home size={16} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex justify-between items-start shadow-sm hover:border-amber-200 transition-all">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maintenance</p>
              <h3 className="text-2xl font-black text-[#EF9F27] tracking-tight">{maintenanceCount}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Avg 4 days downtime</p>
            </div>
            <div className="w-9 h-9 bg-[#FAEEDA] rounded-xl flex items-center justify-center text-[#854F0B] shrink-0">
              <Wrench size={16} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex justify-between items-start shadow-sm hover:border-rose-200 transition-all">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overdue Rent</p>
              <h3 className="text-2xl font-black text-rose-500 tracking-tight">{overdueCount}</h3>
              <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">KES {totalOverdueAmount.toLocaleString()} owed</p>
            </div>
            <div className="w-9 h-9 bg-[#FAECE7] rounded-xl flex items-center justify-center text-[#993C1D] shrink-0">
              <AlertOctagon size={16} />
            </div>
          </div>
        </div>

        {/* Toolbar selectors */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={selectedUnitProperty}
              onChange={(e) => setSelectedUnitProperty(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#4338CA] cursor-pointer"
            >
              <option value="All">All Properties</option>
              {Array.from(new Set(houses.map(h => h.propertyName).filter(Boolean))).map((propName) => (
                <option key={propName} value={propName}>{propName}</option>
              ))}
            </select>

            <div className="hidden sm:block w-[1px] h-6 bg-slate-200 mx-1" />

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['All', 'Occupied', 'Vacant', 'Maintenance', 'Overdue'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setUnitStatusFilter(status)}
                  className={`px-4 py-2 rounded-full font-bold text-xs transition-all cursor-pointer shrink-0 ${
                    unitStatusFilter === status
                      ? 'bg-[#4338CA] text-white shadow-md'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Legend colors */}
            <div className="hidden lg:flex items-center gap-4 text-[11px] font-bold text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#4338CA]" /> Occupied
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#1D9E75]" /> Vacant
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#EF9F27]" /> Maintenance
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#D85A30]" /> Overdue
              </div>
            </div>

            <div className="hidden sm:block w-[1px] h-6 bg-slate-200 mx-1" />

            <div className="flex items-center border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => setUnitViewLayout('grid')}
                className={`px-3 py-2 transition-all cursor-pointer ${
                  unitViewLayout === 'grid' ? 'bg-[#EEF2FF] text-[#4338CA]' : 'text-slate-400 hover:text-slate-600'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setUnitViewLayout('list')}
                className={`px-3 py-2 transition-all cursor-pointer ${
                  unitViewLayout === 'list' ? 'bg-[#EEF2FF] text-[#4338CA]' : 'text-slate-400 hover:text-slate-600'
                }`}
                aria-label="List view"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Layout displays */}
        {unitViewLayout === 'grid' ? (
          <div className="space-y-8">
            {Object.entries(groupedUnitsByFloor).map(([floor, floorUnits]) => (
              <div key={floor} className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/80 pb-2">
                  {floor}
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                  {floorUnits.map((house) => {
                    const status = getUnitStatus(house);
                    const tenant = tenants.find(t => t.houseNumber === house.houseNumber);
                    
                    let cardBorderClass = 'border-slate-200';
                    let textStatusClass = '';
                    let dotColor = '';

                    if (status === 'Occupied') {
                      cardBorderClass = 'border-l-[3px] border-l-[#4338CA] border-slate-200 hover:border-[#4338CA]';
                      textStatusClass = 'text-[#4338CA] bg-[#EEF2FF]';
                    } else if (status === 'Overdue') {
                      cardBorderClass = 'border-l-[3px] border-l-[#D85A30] border-slate-200 hover:border-[#D85A30]';
                      textStatusClass = 'text-[#993C1D] bg-[#FAECE7]';
                      dotColor = 'bg-[#D85A30]';
                    } else if (status === 'Maintenance') {
                      cardBorderClass = 'border-l-[3px] border-l-[#EF9F27] border-slate-200 hover:border-[#EF9F27]';
                      textStatusClass = 'text-[#854F0B] bg-[#FAEEDA]';
                    } else { // Vacant
                      cardBorderClass = 'border-l-[3px] border-l-[#1D9E75] border-slate-200 hover:border-[#1D9E75]';
                      textStatusClass = 'text-[#3B6D11] bg-[#EAF3DE]';
                    }

                    const rate = getUnitRentRate(house);

                    return (
                      <div 
                        key={house.id} 
                        onClick={() => {
                          setSelectedUnitId(house.id);
                          setIsUnitDrawerOpen(true);
                        }}
                        className={`bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all relative ${cardBorderClass}`}
                      >
                        {dotColor && <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${dotColor} animate-pulse`} />}
                        <div className="font-bold text-sm text-slate-900">{house.houseNumber}</div>
                        <div className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">
                          {status === 'Occupied' || status === 'Overdue' ? tenant?.name : status}
                        </div>
                        <div className="text-xs font-bold text-slate-800 mt-2">
                          KES {rate.toLocaleString()}
                        </div>
                        <span className={`inline-block mt-3 px-2 py-0.5 rounded-lg text-[9px] font-bold ${textStatusClass}`}>
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {finalFilteredUnits.length === 0 && (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl text-slate-400">
                <p className="text-xs font-bold uppercase tracking-widest">No matching units found</p>
              </div>
            )}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-4 px-6">Unit</th>
                    <th className="py-4 px-6">Tenant</th>
                    <th className="py-4 px-6">Property</th>
                    <th className="py-4 px-6">Rent (KES)</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Lease End</th>
                    <th className="py-4 px-6">Rent Status</th>
                    <th className="py-4 px-6">Water (KES)</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {finalFilteredUnits.map((house) => {
                    const status = getUnitStatus(house);
                    const tenant = tenants.find(t => t.houseNumber === house.houseNumber);
                    const rate = getUnitRentRate(house);
                    const leaseEnd = tenant ? getLeaseEnd(tenant.joinDate) : '—';
                    const rentPaidStatus = tenant ? (tenant.bills.status === 'PAID' ? 'Paid' : 'Unpaid') : '—';

                    let pillClass = '';
                    if (status === 'Occupied') pillClass = 'bg-[#EEF2FF] text-[#4338CA]';
                    else if (status === 'Overdue') pillClass = 'bg-[#FAECE7] text-[#993C1D]';
                    else if (status === 'Maintenance') pillClass = 'bg-[#FAEEDA] text-[#854F0B]';
                    else pillClass = 'bg-[#EAF3DE] text-[#3B6D11]';

                    let rPillClass = '';
                    if (rentPaidStatus === 'Paid') rPillClass = 'bg-[#EAF3DE] text-[#3B6D11]';
                    else if (rentPaidStatus === 'Unpaid') rPillClass = 'bg-[#FAECE7] text-[#993C1D]';
                    else rPillClass = 'bg-slate-100 text-slate-500';

                    return (
                      <tr 
                        key={house.id} 
                        onClick={() => {
                          setSelectedUnitId(house.id);
                          setIsUnitDrawerOpen(true);
                        }}
                        className="hover:bg-slate-50/50 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <td className="py-4 px-6 font-bold text-slate-900">{house.houseNumber}</td>
                        <td className="py-4 px-6">
                          {tenant ? (
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#4338CA] text-white font-bold text-[10px] flex items-center justify-center">
                                {tenant.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-slate-900 font-bold">{tenant.name}</div>
                                <div className="text-slate-400 text-[10px] mt-0.5">{tenant.phoneNumber}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Vacant</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-500">{house.propertyName || 'Portfolio Asset'}</td>
                        <td className="py-4 px-6 text-slate-900 font-bold">KES {rate.toLocaleString()}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${pillClass}`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 font-medium">{leaseEnd}</td>
                        <td className="py-4 px-6">
                          {tenant ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rPillClass}`}>
                              {rentPaidStatus}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {tenant ? `KES ${tenant.bills.water.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => {
                                setSelectedUnitId(house.id);
                                setIsUnitDrawerOpen(true);
                              }}
                              className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Details
                            </button>
                            {status === 'Overdue' && (
                              <button 
                                onClick={() => {
                                  triggerNotification(`Rent reminder notification successfully dispatched to ${tenant?.name}!`);
                                }}
                                className="px-2.5 py-1 bg-[#4338CA] hover:bg-[#3B2EC2] text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Remind
                              </button>
                            )}
                            {status === 'Vacant' && (
                              <button 
                                onClick={() => {
                                  triggerNotification(`To assign a lease to Unit ${house.houseNumber}, click on Tenants tab.`);
                                }}
                                className="px-2.5 py-1 bg-[#4338CA] hover:bg-[#3B2EC2] text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Assign
                              </button>
                            )}
                            {status === 'Occupied' && (
                              <button 
                                onClick={() => {
                                  setSelectedUnitId(house.id);
                                  setIsUnitDrawerOpen(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Bill
                              </button>
                            )}
                            {status === 'Maintenance' && (
                              <button 
                                onClick={() => {
                                  triggerNotification(`Service logs are being tracked in the maintenance view.`);
                                }}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Update
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SIDE DRAWER SIDEBAR */}
        {isUnitDrawerOpen && selectedUnit && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[160] transition-opacity cursor-pointer animate-fadeIn"
              onClick={() => {
                setIsUnitDrawerOpen(false);
                setShowDrawerPaymentForm(false);
              }}
            />
            {/* Drawer Area */}
            <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white border-l border-slate-200 shadow-2xl z-[170] flex flex-col justify-between animate-slideIn">
              <div className="overflow-y-auto p-5 space-y-6 flex-1">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                  <h3 className="text-base font-bold text-slate-900">Unit {selectedUnit.houseNumber}</h3>
                  <button 
                    onClick={() => {
                      setIsUnitDrawerOpen(false);
                      setShowDrawerPaymentForm(false);
                    }}
                    className="w-7 h-7 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Status Badges */}
                <div className="d-section border-b border-slate-100 pb-5">
                  <div className={`badge-big flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold w-fit mb-4 ${
                    selectedUnitStatus === 'Occupied' ? 'bg-[#EEF2FF] text-[#4338CA]' :
                    selectedUnitStatus === 'Overdue' ? 'bg-[#FAECE7] text-[#993C1D]' :
                    selectedUnitStatus === 'Maintenance' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                    'bg-[#EAF3DE] text-[#3B6D11]'
                  }`}>
                    {selectedUnitStatus === 'Occupied' && <CheckCircle2 size={14}/>}
                    {selectedUnitStatus === 'Overdue' && <AlertOctagon size={14}/>}
                    {selectedUnitStatus === 'Maintenance' && <Wrench size={14}/>}
                    {selectedUnitStatus === 'Vacant' && <Home size={14}/>}
                    <span>{selectedUnitStatus}</span>
                  </div>

                  {/* Tenant info */}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5">Resident Profile</span>
                  {selectedUnitTenant ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-450 font-semibold">Resident Name</span><span className="font-bold text-slate-800">{selectedUnitTenant.name}</span></div>
                      <div className="flex justify-between"><span className="text-slate-450 font-semibold">Phone Contact</span><span className="font-bold text-slate-800">{selectedUnitTenant.phoneNumber}</span></div>
                      <div className="flex justify-between"><span className="text-slate-450 font-semibold">Joined At</span><span className="font-bold text-slate-800">{new Date(selectedUnitTenant.joinDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span></div>
                      <div className="flex justify-between"><span className="text-slate-450 font-semibold">Lease Period End</span><span className="font-bold text-slate-800">{getLeaseEnd(selectedUnitTenant.joinDate)}</span></div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs italic">No resident assigned. To let this flat, go to Tenants tab.</p>
                  )}
                </div>

                {/* Billing */}
                <div className="border-b border-slate-100 pb-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Billing — This cycle</span>
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Rent Charge</span>
                      <div className="text-sm font-bold text-slate-800">KES {getUnitRentRate(selectedUnit).toLocaleString()}</div>
                      {selectedUnitTenant && (
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          selectedUnitTenant.bills.status === 'PAID' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#FAECE7] text-[#993C1D]'
                        }`}>
                          {selectedUnitTenant.bills.status === 'PAID' ? 'Paid' : 'Unpaid'}
                        </span>
                      )}
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Water Utility</span>
                      <div className="text-sm font-bold text-slate-800">KES {(selectedUnitTenant?.bills.water || 0).toLocaleString()}</div>
                      {selectedUnitTenant && (
                        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#EAF3DE] text-[#3B6D11]">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedUnitTenant && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-slate-450 font-semibold">Sanitation & Garbage</span><span className="font-bold text-slate-800">KES {(selectedUnitTenant.bills.garbage || 300).toLocaleString()}</span></div>
                      <div className="border-t border-slate-100 pt-2.5 mt-2 flex justify-between items-center">
                        <span className="font-bold text-slate-700">Total Outstanding</span>
                        <span className="font-black text-sm text-[#4338CA]">KES {(selectedUnitTenant.bills.total || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Local Inline payment Recorder Form */}
                {showDrawerPaymentForm && selectedUnitTenant && (
                  <form onSubmit={handleRecordDrawerPaymentSubmit} className="bg-[#F8FAFC] border border-slate-200/85 p-4 rounded-xl space-y-3.5 animate-fadeIn">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Fast Record Payment</h4>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount to credit (KES)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 8000"
                        value={drawerPaymentAmount}
                        onChange={(e) => setDrawerPaymentAmount(e.target.value)}
                        className="w-full bg-white border border-slate-200 pl-3 py-2 rounded-xl text-xs font-bold outline-none focus:border-[#4338CA] transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Method</label>
                      <select
                        value={drawerPaymentMethod}
                        onChange={(e) => setDrawerPaymentMethod(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 pl-3 py-2 rounded-xl text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="M-Pesa">M-Pesa Express</option>
                        <option value="Bank">Bank Wire</option>
                        <option value="Cash">Cash Ledger</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setShowDrawerPaymentForm(false)} 
                        className="flex-1 py-2 bg-slate-200 hover:bg-slate-250 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 py-2 bg-[#1D9E75] hover:bg-[#167d5c] text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                      >
                        Submit Receipt
                      </button>
                    </div>
                  </form>
                )}

                {/* History */}
                {selectedUnitTenant && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Payment History</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {unitPayments.map((p) => (
                        <div key={p.id} className="flex items-start justify-between border-b border-slate-50 pb-2 text-[11px] font-semibold">
                          <div className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                            <div>
                              <div className="text-slate-800 font-bold capitalize">Type: {p.type || 'TOTAL'} ({p.method})</div>
                              <div className="text-[9px] text-slate-400">Ref: {p.reference}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-slate-900 font-bold">KES {p.amount.toLocaleString()}</div>
                            <div className="text-[9px] text-slate-400">{new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                          </div>
                        </div>
                      ))}
                      {unitPayments.length === 0 && (
                        <p className="text-slate-400 italic text-[11px]">No transaction history registered.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              {selectedUnitTenant && (
                <div className="p-4 bg-slate-50 border-t border-slate-150 flex gap-2">
                  <button 
                    onClick={() => {
                      triggerNotification(`Rent reminder notification successfully dispatched to ${selectedUnitTenant.name}!`);
                    }}
                    className="flex-1 py-3 text-center bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Send Reminder
                  </button>
                  <button 
                    onClick={() => {
                      setShowDrawerPaymentForm(true);
                      setDrawerPaymentAmount(selectedUnitTenant.bills.total.toString());
                    }}
                    className="flex-1 py-3 text-center bg-[#4338CA] hover:bg-[#3B2EC2] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-[#4338CA]/10"
                  >
                    Record Payment
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // 2. WATER METERS VIEW
  if (view === 'water-meters') {
    // 1. Get properties list
    const properties = Array.from(new Set(houses.map(h => h.propertyName).filter(Boolean))) as string[];

    // 2. Build meters data dynamically from houses and tenants
    const metersData = houses.map(house => {
      const tenant = tenants.find(t => t.houseNumber === house.houseNumber);
      const prevReading = tenant ? tenant.bills.prevWaterReading || 0 : 0;
      const currReading = tenant ? tenant.bills.currWaterReading || 0 : 0;
      const typedVal = unitWaterInputs[house.houseNumber];
      const displayCurr = typedVal !== undefined ? (parseInt(typedVal) || 0) : currReading;
      const used = Math.max(0, displayCurr - prevReading);
      
      let status: 'done' | 'high' | 'missing' = 'missing';
      if (displayCurr > 0) {
        status = used > 30 ? 'high' : 'done';
      }

      return {
        unit: house.houseNumber,
        propertyName: house.propertyName || 'Royal Flats',
        houseId: house.id,
        tenantId: tenant?.id || '',
        tenantName: tenant ? tenant.name : (house.status === HouseStatus.VACANT ? 'Vacant' : 'Maintenance'),
        prev: prevReading,
        curr: displayCurr,
        actualCurr: currReading,
        used,
        status,
        isOccupied: !!tenant
      };
    }).filter(m => {
      // Apply property filter
      if (selectedWaterProperty !== 'All' && m.propertyName !== selectedWaterProperty) return false;
      // Apply search query filter
      if (waterSearchQuery) {
        const q = waterSearchQuery.toLowerCase();
        return m.unit.toLowerCase().includes(q) || m.tenantName.toLowerCase().includes(q);
      }
      return true;
    });

    const totalMeters = metersData.length;
    const readingsDone = metersData.filter(m => m.curr > 0).length;
    const totalUsage = metersData.reduce((acc, m) => acc + (m.curr > 0 ? m.used : 0), 0);
    const RATE = 120;
    const totalBilled = totalUsage * RATE;
    const highUsageCount = metersData.filter(m => m.status === 'high').length;

    const progressPct = totalMeters > 0 ? Math.round((readingsDone / totalMeters) * 100) : 0;

    // List of units for the guided session
    const sessionUnits = metersData.filter(m => m.isOccupied);

    const handleStartSession = () => {
      if (sessionUnits.length === 0) {
        triggerNotification('No occupied units available for guided session.', 'error');
        return;
      }
      setWaterSessIdx(0);
      setIsWaterSessionOpen(true);
      const currentUnit = sessionUnits[0];
      // pre-fill input with actual current reading or empty
      const initialVal = currentUnit.actualCurr > 0 ? String(currentUnit.actualCurr) : '';
      setUnitWaterInputs(prev => ({ ...prev, [currentUnit.unit]: initialVal }));
    };

    const handleSessSaveNext = () => {
      const u = sessionUnits[waterSessIdx];
      const typedVal = unitWaterInputs[u.unit];
      const val = typedVal ? parseInt(typedVal) : NaN;

      if (!val || isNaN(val)) {
        triggerNotification('Please enter a valid meter reading.', 'error');
        return;
      }
      if (val < u.prev) {
        triggerNotification(`Reading cannot be less than previous value (${u.prev}).`, 'error');
        return;
      }

      // Save to application state
      if (onUpdateBills && u.tenantId) {
        onUpdateBills(u.tenantId, val);
      }
      triggerNotification(`Saved Unit ${u.unit}: ${val - u.prev} units usage.`, 'success');

      if (waterSessIdx < sessionUnits.length - 1) {
        const nextIdx = waterSessIdx + 1;
        setWaterSessIdx(nextIdx);
        const nextUnit = sessionUnits[nextIdx];
        const nextVal = nextUnit.actualCurr > 0 ? String(nextUnit.actualCurr) : '';
        setUnitWaterInputs(prev => ({ ...prev, [nextUnit.unit]: nextVal }));
      } else {
        // finished
        setWaterSessIdx(sessionUnits.length);
      }
    };

    const handleSaveUnitReading = (index: number, unit: string, tenantId: string, prevVal: number) => {
      const typedVal = unitWaterInputs[unit];
      const val = typedVal ? parseInt(typedVal) : NaN;

      if (!val || isNaN(val)) {
        triggerNotification('Please enter a valid meter reading.', 'error');
        return;
      }
      if (val < prevVal) {
        triggerNotification(`Reading cannot be less than previous value (${prevVal}).`, 'error');
        return;
      }

      if (onUpdateBills && tenantId) {
        onUpdateBills(tenantId, val);
        triggerNotification(`Unit ${unit} saved successfully.`, 'success');
      } else {
        triggerNotification(`Cannot save: No active tenant assigned to unit ${unit}.`, 'error');
      }
    };

    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* CUSTOM WATER METERS TOP BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border-b border-slate-200/60 px-6 md:px-8 py-4 -mx-6 md:-mx-10 -mt-6 md:-mt-8 mb-6 h-20 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-[#178BCA] p-1 bg-cyan-50/50 rounded-lg">
              <Droplets size={26} className="fill-current" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">Water Meters</h1>
              <p className="text-[11px] text-slate-400 font-bold mt-[-1px]">Enter monthly readings and auto-generate water bills.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 md:mt-0 ml-auto">
            {/* Search Bar */}
            <div className="relative w-64 lg:w-72">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={waterSearchQuery}
                onChange={e => setWaterSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:bg-slate-100/50 pl-10 pr-4 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:bg-white focus:border-royal-500 transition-all font-sans text-slate-700" 
              />
            </div>

            {/* Monthly Period Button */}
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all relative">
              <span>Jun 2025</span>
              <span className="w-4 h-4 bg-[#E0533C] text-white font-bold text-[9px] rounded-full flex items-center justify-center">
                4
              </span>
            </button>

            {/* initials JK Profile circle */}
            <div className="w-8 h-8 rounded-full bg-[#312E81] text-white flex items-center justify-center text-xs font-bold font-sans shadow-sm border border-indigo-200 cursor-pointer">
              JK
            </div>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL USAGE</p>
              <h4 className="text-2xl font-black text-[#178BCA] tracking-tight">{totalUsage} units</h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Jun 2025</p>
            </div>
            <div className="p-2.5 bg-[#E1F1F8] text-[#178BCA] rounded-xl shrink-0">
              <Droplets size={16} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WATER BILLED</p>
              <h4 className="text-2xl font-black text-slate-800 tracking-tight">KES {totalBilled.toLocaleString()}</h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">@ KES 120/unit</p>
            </div>
            <div className="p-2.5 bg-[#EEF2FF] text-[#4338CA] rounded-xl shrink-0">
              <FileText size={16} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">READINGS DONE</p>
              <h4 className="text-2xl font-black text-[#1D9E75] tracking-tight">{readingsDone} / {totalMeters}</h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">{totalMeters - readingsDone} units pending</p>
            </div>
            <div className="p-2.5 bg-[#EAF3DE] text-[#1D9E75] rounded-xl shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-start">
            {(() => {
              const highUsageMeter = metersData.find(m => m.status === 'high');
              const highUsageSubtitle = highUsageMeter ? `${highUsageMeter.unit} · ${highUsageMeter.used} units used` : 'No alerts this month';
              return (
                <>
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HIGH USAGE ⚠</p>
                    <h4 className="text-2xl font-black text-[#D85A30] tracking-tight">{highUsageCount} unit</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">{highUsageSubtitle}</p>
                  </div>
                  <div className="p-2.5 bg-[#FAECE7] text-[#D85A30] rounded-xl shrink-0">
                    <AlertTriangle size={16} />
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* HEADER CONTROLS */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight font-display">June 2025 Meter Readings</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Enter current readings per unit. Bills are auto-calculated at KES 120/unit.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Property Filter */}
            <select
              value={selectedWaterProperty}
              onChange={e => setSelectedWaterProperty(e.target.value)}
              className="bg-white border border-slate-200 focus:border-royal-500 rounded-lg py-1.5 px-3.5 text-xs font-semibold text-slate-600 outline-none shadow-sm transition-all cursor-pointer"
            >
              <option value="All">All Properties</option>
              {properties.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Actions */}
            <button
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 rounded-lg shadow-sm cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw size={12} />
              <span>{isHistoryExpanded ? 'Hide History' : 'View History'}</span>
            </button>

            <button
              onClick={handleStartSession}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#129B72] hover:bg-[#129B72]/90 text-xs font-semibold text-white rounded-lg shadow-sm cursor-pointer transition-all active:scale-95 border-none"
            >
              <Activity size={12} />
              <span>Start Session</span>
            </button>

            <button
              onClick={() => {
                triggerNotification(`✓ Generated water invoices for ${readingsDone} completed units.`, 'success');
              }}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#4338CA] hover:bg-[#4338CA]/90 text-xs font-semibold text-white rounded-lg shadow-sm cursor-pointer transition-all active:scale-95 border-none"
            >
              <FileText size={12} />
              <span>Generate Bills</span>
            </button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm border-b border-b-slate-100 mb-6">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-slate-700">Monthly Reading Progress</span>
            <span className="text-xs font-bold text-[#1D9E75] shrink-0 font-sans">{readingsDone} of {totalMeters} done</span>
          </div>
          <div className="h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div 
              style={{ width: `${progressPct}%` }}
              className="h-full bg-[#1D9E75] rounded-full transition-all duration-700"
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-semibold">
            <span>0%</span>
            <span className="text-[#1D9E75] font-bold text-center flex-1">{progressPct}% complete</span>
            <span>100%</span>
          </div>
        </div>

        {/* METER CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {metersData.map((m, i) => {
            const cardBorders = m.status === 'high' 
              ? 'border-l-[#D85A30] hover:border-[#D85A30]' 
              : m.status === 'done' 
                ? 'border-l-[#1D9E75] hover:border-[#1D9E75]' 
                : 'border-l-[#EF9F27] hover:border-[#EF9F27]';

            const statusLabel = m.status === 'high' 
              ? '⚠ High Usage' 
              : m.status === 'done' 
                ? '✓ Entered' 
                : 'Missing';

            const statusClass = m.status === 'high'
              ? 'bg-[#FAECE7] text-[#D85A30] border border-[#D85A30]/10'
              : m.status === 'done'
                ? 'bg-[#EAF3DE] text-[#1D9E75] border border-[#1D9E75]/10'
                : 'bg-[#FAEEDA] text-[#EF9F27] border border-[#EF9F27]/10';

            const barColor = m.status === 'high' ? 'bg-[#D85A30]' : m.status === 'done' ? 'bg-[#178BCA]' : '';

            return (
              <div 
                key={m.unit}
                className={`bg-white border border-slate-200 border-l-[3px] ${cardBorders} rounded-xl p-4 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-sans text-sm font-bold text-slate-800">Unit {m.unit}</h5>
                      <span className="text-xs text-slate-400 font-semibold">{m.tenantName}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap inline-block ${statusClass}`}>
                      {m.status === 'high' ? '⚠ High Usage' : statusLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    <div className="bg-[#F9FAFB] p-2 rounded-lg text-center border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 mb-1">Previous</p>
                      <span className="text-sm font-bold text-slate-400">{m.prev || '—'}</span>
                    </div>
                    <div className="bg-[#F9FAFB] p-2 rounded-lg text-center border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 mb-1">Current</p>
                      <span className="text-sm font-extrabold text-[#178BCA]">{m.curr || '—'}</span>
                    </div>
                    <div className="bg-[#F9FAFB] p-2 rounded-lg text-center border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 mb-1">Used</p>
                      <span className={`text-sm font-extrabold ${m.status === 'high' ? 'text-[#D85A30]' : 'text-slate-800'}`}>
                        {m.curr > 0 ? m.used : '—'}
                      </span>
                    </div>
                  </div>

                  {m.status !== 'missing' && (
                    <div className={`h-1.5 ${barColor} rounded-full mb-3.5`} />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Enter reading..."
                      value={unitWaterInputs[m.unit] !== undefined ? unitWaterInputs[m.unit] : (m.actualCurr > 0 ? String(m.actualCurr) : '')}
                      onChange={e => setUnitWaterInputs({ ...unitWaterInputs, [m.unit]: e.target.value })}
                      className="flex-1 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs h-[34px] focus:outline-none focus:bg-white focus:border-[#4338CA] text-slate-700 transition-all placeholder:text-slate-400 font-semibold"
                    />
                    <button
                      onClick={() => handleSaveUnitReading(i, m.unit, m.tenantId, m.prev)}
                      className="bg-[#129B72] hover:bg-[#129B72]/95 text-white font-semibold text-xs px-3.5 rounded-lg border-none h-[34px] transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                    >
                      Save
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-xs mt-2.5">
                    <span className="text-slate-400 font-medium">Bill:</span>
                    <span className="font-bold text-slate-800">
                      {m.curr > 0 ? `KES ${(m.used * RATE).toLocaleString()}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* READING HISTORY EXPANDABLE TABLE */}
        {isHistoryExpanded && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-900 tracking-tight">Reading History</h4>
              <button className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
                <span>Jun 2025</span>
                <ChevronDown size={12} className="text-slate-400" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                    <th className="py-3 px-4 font-semibold text-xs text-left text-slate-500">Unit</th>
                    <th className="py-3 px-4 font-semibold text-xs text-left text-slate-500">Tenant</th>
                    <th className="py-3 px-4 font-semibold text-xs text-left text-slate-500">Month</th>
                    <th className="py-3 px-4 font-semibold text-xs text-center text-slate-500">Prev Reading</th>
                    <th className="py-3 px-4 font-semibold text-xs text-center text-slate-500">Curr Reading</th>
                    <th className="py-3 px-4 font-semibold text-xs text-center text-slate-500">Units Used</th>
                    <th className="py-3 px-4 font-semibold text-xs text-right text-slate-500">Amount KES</th>
                    <th className="py-3 px-4 font-semibold text-xs text-center text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const historyRows = [
                      // James Mwangi Jun 2025
                      {
                        unit: 'A01',
                        tenantName: tenants.find(t => t.id === 't_james')?.name || 'James Mwangi',
                        month: 'Jun 2025',
                        prev: tenants.find(t => t.id === 't_james')?.bills.prevWaterReading ?? 142,
                        curr: tenants.find(t => t.id === 't_james')?.bills.currWaterReading ?? 162,
                        status: 'Billed'
                      },
                      // James Mwangi May 2025 (historical)
                      {
                        unit: 'A01',
                        tenantName: 'James Mwangi',
                        month: 'May 2025',
                        prev: 122,
                        curr: 142,
                        status: 'Billed'
                      },
                      // Grace Atieno Jun 2025
                      {
                        unit: 'A02',
                        tenantName: tenants.find(t => t.id === 't_grace')?.name || 'Grace Atieno',
                        month: 'Jun 2025',
                        prev: tenants.find(t => t.id === 't_grace')?.bills.prevWaterReading ?? 98,
                        curr: tenants.find(t => t.id === 't_grace')?.bills.currWaterReading ?? 113,
                        status: 'Unpaid'
                      },
                      // Peter Kamau Jun 2025
                      {
                        unit: 'B01',
                        tenantName: tenants.find(t => t.id === 't_peter')?.name || 'Peter Kamau',
                        month: 'Jun 2025',
                        prev: tenants.find(t => t.id === 't_peter')?.bills.prevWaterReading ?? 210,
                        curr: tenants.find(t => t.id === 't_peter')?.bills.currWaterReading ?? 243,
                        status: 'Pending'
                      },
                      // Amina Hassan Jun 2025
                      {
                        unit: 'B03',
                        tenantName: tenants.find(t => t.id === 't_amina')?.name || 'Amina Hassan',
                        month: 'Jun 2025',
                        prev: tenants.find(t => t.id === 't_amina')?.bills.prevWaterReading ?? 55,
                        curr: tenants.find(t => t.id === 't_amina')?.bills.currWaterReading ?? 71,
                        status: 'Billed'
                      }
                    ];

                    return historyRows.map((row, idx) => {
                      const used = Math.max(0, row.curr - row.prev);
                      const amount = used * RATE;
                      const isHigh = row.unit === 'B01' && row.month === 'Jun 2025';

                      return (
                        <tr key={`${row.unit}-${row.month}-${idx}`} className="hover:bg-slate-50/40 text-slate-600 text-xs transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">{row.unit}</td>
                          <td className="py-3 px-4 text-slate-600">{row.tenantName}</td>
                          <td className="py-3 px-4 text-slate-400 font-medium">{row.month}</td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-center">{row.prev}</td>
                          <td className={`py-3 px-4 font-mono font-bold text-center ${isHigh ? 'text-[#D85A30]' : 'text-[#178BCA]'}`}>
                            {row.curr}
                            {isHigh && <span className="text-[#D85A30] ml-1">⚠</span>}
                          </td>
                          <td className={`py-3 px-4 font-mono font-bold text-center ${isHigh ? 'text-[#D85A30]' : 'text-slate-755'}`}>
                            {used}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-700">
                            {amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {row.status === 'Billed' && (
                              <span className="bg-[#EAF3DE] text-[#3B6D11] px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block text-center whitespace-nowrap min-w-[64px]">
                                Billed
                              </span>
                            )}
                            {row.status === 'Unpaid' && (
                              <span className="bg-[#FAECE7] text-[#993C1D] px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block text-center whitespace-nowrap min-w-[64px]">
                                Unpaid
                              </span>
                            )}
                            {row.status === 'Pending' && (
                              <span className="bg-[#FAEEDA] text-[#854F0B] px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block text-center whitespace-nowrap min-w-[64px]">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GUIDED SESSSION MODAL */}
        {isWaterSessionOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 w-full max-w-md animate-slideUp overflow-hidden">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">📋 Meter Reading Session</h3>
                <button 
                  onClick={() => setIsWaterSessionOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-400 font-medium mb-5">Walk through each occupied unit to capture current index readings.</p>

              {/* Progress dots */}
              <div className="flex gap-1.5 mb-5">
                {sessionUnits.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                      idx < waterSessIdx 
                        ? 'bg-emerald-500' 
                        : idx === waterSessIdx 
                          ? 'bg-royal-500 shadow-glow' 
                          : 'bg-slate-100'
                    }`}
                  />
                ))}
              </div>

              {waterSessIdx < sessionUnits.length ? (() => {
                const u = sessionUnits[waterSessIdx];
                const typedVal = unitWaterInputs[u.unit] || '';
                const valInt = parseInt(typedVal) || 0;
                const netUsage = Math.max(0, valInt - u.prev);
                const netCost = netUsage * RATE;

                return (
                  <div className="space-y-4">
                    <div className="bg-slate-50/80 border border-slate-150 rounded-2xl p-4 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-royal-500">Unit {u.unit}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{waterSessIdx + 1} of {sessionUnits.length}</span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-slate-800">{u.tenantName}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Active occupied resident</p>
                      </div>
                      <div className="text-xs text-slate-400 font-semibold pt-2 border-t border-slate-100 flex justify-between">
                        <span>Previous Reading:</span>
                        <strong className="text-slate-600 font-mono">{u.prev} index</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Reading Entry</label>
                      <input
                        type="number"
                        placeholder="Type current index..."
                        value={typedVal}
                        onChange={e => setUnitWaterInputs({ ...unitWaterInputs, [u.unit]: e.target.value })}
                        className="w-full bg-white border-2 border-royal-500 focus:outline-none focus:ring-1 focus:ring-royal-500 rounded-2xl p-4 text-base font-extrabold text-slate-800 transition-all placeholder:text-slate-300"
                        autoFocus
                      />
                    </div>

                    {valInt > u.prev && (
                      <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3 text-xs leading-relaxed transition-all animate-fadeIn font-medium">
                        <span className="text-slate-500 font-semibold">Calculated usage: </span>
                        <strong className="text-cyan-600 font-black">{netUsage} units used</strong>
                        <span className="text-slate-300 mx-1.5">•</span>
                        <span className="text-slate-500 font-semibold">Amount: </span>
                        <strong className="text-emerald-600 font-black">KES {netCost.toLocaleString()}</strong>
                      </div>
                    )}

                    <div className="flex gap-3 pt-3">
                      <button
                        onClick={() => setIsWaterSessionOpen(false)}
                        className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 rounded-2xl transition-all cursor-pointer border border-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSessSaveNext}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white rounded-2xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                      >
                        {waterSessIdx < sessionUnits.length - 1 ? 'Save & Next →' : 'Save & Finish'}
                      </button>
                    </div>
                  </div>
                );
              })() : (
                <div className="space-y-5 text-center py-4">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-3xl mx-auto border border-emerald-100 animate-bounce">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-black text-slate-800 tracking-tight text-center">All Readings Entered!</h4>
                    <p className="text-xs text-slate-400 font-medium text-center max-w-xs mx-auto text-balance">Great! You have captured active meter index records for all properties.</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setIsWaterSessionOpen(false)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 rounded-xl transition-all cursor-pointer"
                    >
                      Close Modal
                    </button>
                    <button
                      onClick={() => {
                        setIsWaterSessionOpen(false);
                        triggerNotification(`✓ Generated water invoices for ${sessionUnits.length} units successfully.`, 'success');
                      }}
                      className="flex-1 py-3 bg-royal-500 hover:bg-royal-600 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-md shadow-royal-500/10"
                    >
                      Generate Bills
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. BILLING VIEW
  if (view === 'billing') {
    // Dynamic calculations
    const totalRentBilled = tenants.reduce((acc, t) => acc + (t.bills.rent || 0), 0);
    const totalWaterBilled = tenants.reduce((acc, t) => acc + (t.bills.water || 0), 0);
    const totalGarbageBilled = tenants.reduce((acc, t) => acc + (t.bills.garbage || 0), 0);
    const totalBilledOverall = tenants.reduce((acc, t) => acc + (t.bills.total || 0), 0);

    const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0) + localPaymentHistory.reduce((acc, p) => acc + p.amount, 0);
    const totalOutstanding = Math.max(0, totalBilledOverall - totalCollected);
    const collectionRate = totalBilledOverall > 0 ? Math.round((totalCollected / totalBilledOverall) * 100) : 0;
    const overdueUnitsCount = tenants.filter(t => t.bills.status === 'UNPAID' || t.bills.status === 'PARTIAL').length;

    // Filter by billingSearchQuery
    const filteredTenantsForBilling = tenants.filter(t => {
      const q = billingSearchQuery.toLowerCase();
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.houseNumber.toLowerCase().includes(q);
    });

    const toggleRowSelection = (unitId: string) => {
      setSelectedRows(prev => 
        prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
      );
    };

    const toggleSelectAll = (isChecked: boolean) => {
      if (isChecked) {
        setSelectedRows(filteredTenantsForBilling.map(t => t.houseNumber));
      } else {
        setSelectedRows([]);
      }
    };

    const handleBulkAction = (type: string) => {
      triggerNotification(`✓ Action '${type}' applied to ${selectedRows.length} units successfully!`, 'success');
      setSelectedRows([]);
    };

    // Recharts Collection data
    const collectionChartData = filteredTenantsForBilling.map(t => {
      let billed = t.bills.total;
      let collected = payments.filter(p => p.tenantId === t.id).reduce((sum, p) => sum + p.amount, 0) + localPaymentHistory.filter(p => p.tenantId === t.id).reduce((sum, p) => sum + p.amount, 0);
      if (t.bills.status === 'PAID') collected = billed;

      return {
        unit: t.houseNumber,
        Billed: billed,
        Collected: collected,
      };
    });

    // Recharts bill split data
    const billSplitPieData = [
      { name: 'Rent', value: totalRentBilled || 33500, color: '#4338CA' },
      { name: 'Water', value: totalWaterBilled || 10080, color: '#178BCA' },
      { name: 'Garbage', value: totalGarbageBilled || 1200, color: '#1D9E75' },
      { name: 'Late Fees', value: 1875, color: '#EF9F27' },
    ];

    // Recharts trend data
    const billingHistoryTrendData = [
      { name: 'Feb', Billed: 35500, Collected: 34200 },
      { name: 'Mar', Billed: 36800, Collected: 36800 },
      { name: 'Apr', Billed: 37200, Collected: 35100 },
      { name: 'May', Billed: 38700, Collected: 32400 },
      { name: 'Jun', Billed: totalBilledOverall || 44280, Collected: totalCollected || 24200 },
    ];

    return (
      <div className="space-y-6 animate-fadeIn text-slate-800">
        {/* Header Block matching Image UI */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Invoices</h2>
            <p className="text-slate-500 text-xs font-normal">Manage bills, late fees, deposits and invoice history across all units.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={selectedBillingHistoryMonth}
              onChange={(e) => {
                setSelectedBillingHistoryMonth(e.target.value);
                triggerNotification(`Viewing billing ledger for: ${e.target.value}`, 'info');
              }}
              className="border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-xs font-semibold text-slate-700 outline-none focus:border-royal-500"
            >
              <option>June 2025</option>
              <option>May 2025</option>
              <option>April 2025</option>
              <option>March 2025</option>
              <option>February 2025</option>
            </select>
            
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search unit or tenant..." 
                value={billingSearchQuery}
                onChange={e => setBillingSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-royal-500 w-44 md:w-56" 
              />
            </div>

            <div className="w-8 h-8 rounded-full bg-royal-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              JK
            </div>
          </div>
        </div>

        {/* 5 Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Billed</p>
              <h3 className="text-lg font-bold text-indigo-600 mt-1">KES {(totalBilledOverall + 1875).toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Incl. late fees</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
              <Layers size={16} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collected</p>
              <h3 className="text-lg font-bold text-emerald-500 mt-1">KES {totalCollected.toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{collectionRate}% rate</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding</p>
              <h3 className="text-lg font-bold text-[#EF4444] mt-1">KES {totalOutstanding.toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Incl. arrears</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Late Fees</p>
              <h3 className="text-lg font-bold text-amber-500 mt-1">KES 1,875</h3>
              <p className="text-[10px] text-slate-400 mt-1">3 units • 5% penalty</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <AlertOctagon size={16} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start col-span-2 md:col-span-1">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deposits Held</p>
              <h3 className="text-lg font-bold text-cyan-600 mt-1">KES 52,000</h3>
              <p className="text-[10px] text-slate-400 mt-1">4 active tenants</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-500 flex items-center justify-center shrink-0">
              <Droplets size={16} />
            </div>
          </div>
        </div>

        {/* BULK ACTION BAR (shown when items selected) */}
        {selectedRows.length > 0 && (
          <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap animate-fadeIn">
            <span className="text-xs font-bold text-indigo-700">{selectedRows.length} unit{selectedRows.length > 1 ? 's' : ''} selected</span>
            <button onClick={() => handleBulkAction('reminders')} className="px-3 py-1.5 bg-royal-600 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1"><Mail size={12}/> Send Reminders</button>
            <button onClick={() => handleBulkAction('bills')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1"><FileText size={12}/> Generate Bills</button>
            <button onClick={() => handleBulkAction('receipts')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1"><Download size={12}/> Download Receipts</button>
            <button onClick={() => handleBulkAction('fees')} className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1"><AlertTriangle size={12}/> Apply Late Fees</button>
            <button onClick={() => setSelectedRows([])} className="ml-auto text-xs text-slate-500 hover:text-slate-700 font-bold px-2 py-1">✕ Clear</button>
          </div>
        )}

        {/* Billing Tabs */}
        <div className="flex border-b border-slate-100 gap-6 text-xs font-semibold overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Bills' },
            { id: 'rent', label: 'Rent' },
            { id: 'water', label: '💧 Water' },
            { id: 'garbage', label: '🗑 Garbage' },
            { id: 'latefees', label: '⚠ Late Fees' },
            { id: 'deposits', label: '🔒 Deposits' },
            { id: 'arrears', label: '🔄 Arrears' },
            { id: 'history', label: '📅 History' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setBillingMainTab(tab.id as any)}
              className={`pb-3 relative transition-all whitespace-nowrap cursor-pointer ${billingMainTab === tab.id ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.label}
              {billingMainTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 rounded-full" />}
            </button>
          ))}
        </div>

        {/* ALL BILLS TAB */}
        {billingMainTab === 'all' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex gap-2 flex-wrap">
                {['All', 'Paid', 'Overdue', 'Partial', 'Disputed'].map(filter => (
                  <button 
                    key={filter}
                    onClick={() => setSelectedBillingFilter(filter as any)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${selectedBillingFilter === filter ? 'bg-royal-600 text-white border-royal-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => triggerNotification('Generating bulk monthly utility & rent invoices...', 'info')}
                  className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <FileText size={12} /> Generate Bills
                </button>
                <button 
                  onClick={() => setShowSendReminderModal(true)}
                  className="flex-1 sm:flex-none px-3.5 py-1.5 bg-royal-600 hover:bg-royal-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <Mail size={12} /> Send All Reminders
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3 text-xs">
                <span className="text-slate-400 font-medium">Select units for bulk actions:</span>
                <button onClick={() => setSelectedRows(filteredTenantsForBilling.map(t => t.houseNumber))} className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-md text-[10px] font-bold text-slate-600">Select All</button>
                <button onClick={() => setSelectedRows([])} className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-md text-[10px] font-bold text-slate-600">Clear</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/20 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      <th className="px-5 py-3 w-8">
                        <input 
                          type="checkbox" 
                          checked={selectedRows.length === filteredTenantsForBilling.length && filteredTenantsForBilling.length > 0}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="px-5 py-3">Unit</th>
                      <th className="px-5 py-3">Tenant</th>
                      <th className="px-5 py-3">Rent</th>
                      <th className="px-5 py-3">Water</th>
                      <th className="px-5 py-3">Garbage</th>
                      <th className="px-5 py-3">Late Fee</th>
                      <th className="px-5 py-3">Arrears</th>
                      <th className="px-5 py-3">Total</th>
                      <th className="px-5 py-3">Paid</th>
                      <th className="px-5 py-3">Balance</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Days Overdue</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600">
                    {filteredTenantsForBilling.map(t => {
                      const isSelected = selectedRows.includes(t.houseNumber);
                      
                      // Calculate values mimicking HTML
                      const rentVal = t.bills.rent;
                      const waterVal = t.bills.water;
                      const garbageVal = t.bills.garbage || 300;
                      const lateFeeVal = t.houseNumber === 'A02' ? 375 : 0;
                      const arrearsVal = t.houseNumber === 'A02' ? 1200 : 0;
                      const totalDueSum = rentVal + waterVal + garbageVal + lateFeeVal + arrearsVal;
 
                      let paidSum = totalDueSum;
                      let statusPill = <span className="px-2.5 py-1.5 rounded-full text-[9.5px] font-bold bg-[#EAF3DE] text-[#3B6D11]">Paid</span>;
                      let daysOverduePill = <span className="text-[#3B6D11] font-semibold">—</span>;

                      if (t.houseNumber === 'A02') {
                        paidSum = 0;
                        statusPill = <span className="px-2.5 py-1.5 rounded-full text-[9.5px] font-bold bg-[#FAECE7] text-[#993C1D]">Overdue</span>;
                        daysOverduePill = <span className="px-2.5 py-1.5 rounded-full text-[9px] font-bold bg-[#FAECE7] text-[#993C1D]">32 days</span>;
                      } else if (t.houseNumber === 'B01') {
                        paidSum = 9200;
                        statusPill = <span className="px-2.5 py-1.5 rounded-full text-[9.5px] font-bold bg-[#FEF3C7] text-[#92400E]">Partial</span>;
                        daysOverduePill = <span className="px-2.5 py-1.5 rounded-full text-[9px] font-bold bg-[#FAEEDA] text-[#854F0B]">8 days</span>;
                      }
 
                      const balanceSum = totalDueSum - paidSum;
                      const initials = t.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
 
                      // Apply Client Filter
                      if (selectedBillingFilter === 'Paid' && t.houseNumber === 'A02') return null;
                      if (selectedBillingFilter === 'Overdue' && t.houseNumber !== 'A02') return null;
                      if (selectedBillingFilter === 'Partial' && t.houseNumber !== 'B01') return null;
                      if (selectedBillingFilter === 'Disputed' && t.houseNumber !== 'A02') return null;
 
                      return (
                        <tr key={t.id} className={`hover:bg-slate-50/40 transition-colors ${isSelected ? 'bg-indigo-50/20' : ''}`}>
                          <td className="px-5 py-3">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleRowSelection(t.houseNumber)}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-3 font-bold text-slate-900">{t.houseNumber}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-[9px]">
                                {initials}
                              </div>
                              <span className="font-semibold text-slate-800">{t.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 font-medium">{rentVal.toLocaleString()}</td>
                          <td className="px-5 py-3 font-medium">{waterVal.toLocaleString()}</td>
                          <td className="px-5 py-3 font-medium">{garbageVal.toLocaleString()}</td>
                          <td className="px-5 py-3 text-red-500 font-bold">{lateFeeVal > 0 ? lateFeeVal : '—'}</td>
                          <td className="px-5 py-3 text-red-500 font-bold">{arrearsVal > 0 ? arrearsVal : '—'}</td>
                          <td className="px-5 py-3 font-bold text-slate-950">{totalDueSum.toLocaleString()}</td>
                          <td className="px-5 py-3 font-semibold text-emerald-600">{paidSum.toLocaleString()}</td>
                          <td className="px-5 py-3 font-semibold text-red-500">{balanceSum.toLocaleString()}</td>
                          <td className="px-5 py-3">{statusPill}</td>
                          <td className="px-5 py-3">{daysOverduePill}</td>
                          <td className="px-5 py-3 text-right whitespace-nowrap space-x-1">
                            {t.houseNumber === 'A02' ? (
                              <>
                                <button 
                                  onClick={() => setShowSendReminderModal(true)}
                                  className="px-2 py-1 bg-[#D85A30] hover:bg-[#B2401E] text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                                >
                                  Remind
                                </button>
                                <button 
                                  onClick={() => setDetailsDrawer({ type: 'dispute', unitId: t.houseNumber })}
                                  className="px-2 py-1 bg-[#EF9F27] hover:bg-[#C87E17] text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                                >
                                  Dispute
                                </button>
                              </>
                            ) : t.houseNumber === 'B01' ? (
                              <>
                                <button 
                                  onClick={() => setDetailsDrawer({ type: 'record', unitId: t.houseNumber })}
                                  className="px-2 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                                >
                                  Record
                                </button>
                                <button 
                                  onClick={() => setInvoiceModalData({ unit: t.houseNumber, tenantName: t.name, total: totalDueSum, paid: paidSum, balance: balanceSum, status: 'Partial' })}
                                  className="px-2 py-1 bg-[#1D9E75] hover:bg-[#157A5B] text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                                >
                                  Invoice
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => setInvoiceModalData({ unit: t.houseNumber, tenantName: t.name, total: totalDueSum, paid: paidSum, balance: balanceSum, status: 'Paid' })}
                                  className="px-2 py-1 bg-[#1D9E75] hover:bg-[#157A5B] text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                                >
                                  Invoice
                                </button>
                                <button 
                                  onClick={() => setDetailsDrawer({ type: 'dispute', unitId: t.houseNumber })}
                                  className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                                >
                                  Note
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Chart & Split Summary panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 mb-4">Collection Overview</h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={collectionChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F8FAFC" />
                      <XAxis dataKey="unit" tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `K${v / 1000}`} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="Billed" fill="rgba(67,56,202,.2)" stroke="#4338CA" strokeWidth={1} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Collected" fill="#1D9E75" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <h4 className="text-xs font-bold text-slate-800">Bill Breakdown</h4>
                <div className="h-[120px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={billSplitPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={45}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {billSplitPieData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs mt-3">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-indigo-600 font-bold">KES {totalRentBilled.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400">Rent Total</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-cyan-600 font-bold">KES {totalWaterBilled.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400">Water Total</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-emerald-600 font-bold">KES {totalGarbageBilled.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400">Garbage</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-amber-500 font-bold">KES 1,875</p>
                    <p className="text-[9px] text-slate-400">Late Fees</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RENT SUB-TAB */}
        {billingMainTab === 'rent' && (
          <div className="space-y-4">
            <div className="bg-[#EEF2FF] border border-[#C7D2FE] p-4 rounded-xl text-xs text-indigo-700">
              Showing <strong>Rent bills</strong> for June 2025 across all properties.
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="px-5 py-3">Unit</th>
                    <th className="px-5 py-3">Tenant</th>
                    <th className="px-5 py-3">Rent Due</th>
                    <th className="px-5 py-3">Paid</th>
                    <th className="px-5 py-3">Balance</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {filteredTenantsForBilling.map(t => {
                    const rentVal = t.bills.rent;
                    const paidVal = t.houseNumber === 'A02' ? 0 : rentVal;
                    const statusText = t.houseNumber === 'A02' ? 'Overdue' : 'Paid';
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-3 font-bold text-slate-900">{t.houseNumber}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{t.name}</td>
                        <td className="px-5 py-3">{rentVal.toLocaleString()}</td>
                        <td className="px-5 py-3 text-emerald-600 font-bold">{paidVal.toLocaleString()}</td>
                        <td className="px-5 py-3 text-red-500 font-bold">{(rentVal - paidVal).toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[9.5px] font-bold ${statusText === 'Paid' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#FAECE7] text-[#993C1D]'}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {statusText === 'Paid' ? (
                            <button 
                              onClick={() => setReceiptModalData({ unit: t.houseNumber, tenantName: t.name, amount: rentVal })}
                              className="px-2.5 py-1 bg-[#1D9E75] hover:bg-[#157A5B] text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                            >
                              Receipt
                            </button>
                          ) : (
                            <button 
                              onClick={() => setShowSendReminderModal(true)}
                              className="px-2.5 py-1 bg-[#D85A30] hover:bg-[#B2401E] text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                            >
                              Remind
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WATER SUB-TAB */}
        {billingMainTab === 'water' && (
          <div className="space-y-4">
            <div className="bg-[#EEF2FF] border border-[#C7D2FE] p-4 rounded-xl text-xs text-indigo-700">
              Water bills auto-generated from meter readings at <strong>KES 120 / unit</strong>.
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="px-5 py-3">Unit</th>
                    <th className="px-5 py-3">Tenant</th>
                    <th className="px-5 py-3">Units Used</th>
                    <th className="px-5 py-3">Rate</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Paid</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {filteredTenantsForBilling.map(t => {
                    const waterVal = t.bills.water;
                    const unitsUsed = Math.round(waterVal / 120);
                    const paidVal = (t.houseNumber === 'A02' || t.houseNumber === 'B01') ? 0 : waterVal;
                    const statusText = t.houseNumber === 'A02' ? 'Overdue' : t.houseNumber === 'B01' ? 'Pending' : 'Paid';
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-3 font-bold text-slate-900">{t.houseNumber}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{t.name}</td>
                        <td className="px-5 py-3">
                          {unitsUsed > 30 ? (
                            <span className="text-[#D85A30] font-bold">{unitsUsed} ⚠</span>
                          ) : (
                            <span>{unitsUsed}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">KES 120</td>
                        <td className="px-5 py-3 font-bold text-slate-900">{waterVal.toLocaleString()}</td>
                        <td className="px-5 py-3 text-emerald-600 font-bold">{paidVal.toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[9.5px] font-bold ${
                            statusText === 'Paid' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 
                            statusText === 'Pending' ? 'bg-[#FAEEDA] text-[#854F0B]' : 
                            'bg-[#FAECE7] text-[#993C1D]'
                          }`}>
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GARBAGE SUB-TAB */}
        {billingMainTab === 'garbage' && (
          <div className="space-y-4">
            <div className="bg-[#EEF2FF] border border-[#C7D2FE] p-4 rounded-xl text-xs text-indigo-700">
              Flat garbage fee of <strong>KES 300 / unit / month</strong> applied to all occupied units.
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="px-5 py-3">Unit</th>
                    <th className="px-5 py-3">Tenant</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Paid</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {filteredTenantsForBilling.map(t => {
                    const statusText = t.houseNumber === 'A02' ? 'Overdue' : 'Paid';
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-3 font-bold text-slate-900">{t.houseNumber}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{t.name}</td>
                        <td className="px-5 py-3">KES 300</td>
                        <td className="px-5 py-3 text-emerald-600 font-bold">{t.houseNumber === 'A02' ? '0' : '300'}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[9.5px] font-bold ${statusText === 'Paid' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#FAECE7] text-[#993C1D]'}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {statusText === 'Paid' ? (
                            <button 
                              onClick={() => setReceiptModalData({ unit: t.houseNumber, tenantName: t.name, amount: 300 })}
                              className="px-2.5 py-1 bg-[#1D9E75] hover:bg-[#157A5B] text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                            >
                              Receipt
                            </button>
                          ) : (
                            <button 
                              onClick={() => setShowSendReminderModal(true)}
                              className="px-2.5 py-1 bg-[#D85A30] hover:bg-[#B2401E] text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                            >
                              Remind
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LATE FEES SUB-TAB */}
        {billingMainTab === 'latefees' && (
          <div className="space-y-6">
            <div className="bg-[#FAEEDA] border border-[#FCD34D] p-4 rounded-xl flex items-center justify-between text-xs text-[#854F0B]">
              <span className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle size={16} />
                Late fee policy: <strong>5% of rent</strong> applied after <strong>7 days overdue</strong>. Auto-applied on the 8th of each month.
              </span>
              <button 
                onClick={() => setShowLateFeeSettingsModal(true)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm"
              >
                ⚙ Configure
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Fees This Month</p>
                <h3 className="text-xl font-bold text-amber-500 mt-1">KES 1,875</h3>
                <p className="text-[10px] text-slate-400 mt-1">Applied to 3 units</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fee Rate</p>
                <h3 className="text-xl font-bold text-slate-800 mt-1">5%</h3>
                <p className="text-[10px] text-slate-400 mt-1">Of monthly rent after 7 days</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">YTD Fees Collected</p>
                <h3 className="text-xl font-bold text-emerald-500 mt-1">KES 8,400</h3>
                <p className="text-[10px] text-slate-400 mt-1">Across all active properties</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="px-5 py-3">Unit</th>
                    <th className="px-5 py-3">Tenant</th>
                    <th className="px-5 py-3">Rent</th>
                    <th className="px-5 py-3">Days Overdue</th>
                    <th className="px-5 py-3">Fee Rate</th>
                    <th className="px-5 py-3">Fee Amount</th>
                    <th className="px-5 py-3">Applied On</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">A02</td>
                    <td className="px-5 py-3.5 font-semibold">Grace Atieno</td>
                    <td className="px-5 py-3.5">7,500</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#FAECE7] text-[#993C1D]">32 days</span></td>
                    <td className="px-5 py-3.5">5%</td>
                    <td className="px-5 py-3.5 font-bold text-red-500">KES 375</td>
                    <td className="px-5 py-3.5 text-slate-400 font-medium">Jun 8, 2025</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#FAECE7] text-[#993C1D]">Unpaid</span></td>
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button onClick={() => triggerNotification('Late fee waived!', 'info')} className="px-2 py-1 bg-[#D85A30] hover:bg-[#B2401E] text-white rounded-md font-semibold text-[10px] cursor-pointer">Waive</button>
                      <button onClick={() => triggerNotification('Late fee applied to ledger!', 'success')} className="px-2 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-md font-semibold text-[10px] cursor-pointer">Bill</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">B01</td>
                    <td className="px-5 py-3.5 font-semibold">Peter Kamau</td>
                    <td className="px-5 py-3.5">9,200</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#FAEEDA] text-[#854F0B]">8 days</span></td>
                    <td className="px-5 py-3.5">5%</td>
                    <td className="px-5 py-3.5 font-bold text-[#EF9F27]">KES 460</td>
                    <td className="px-5 py-3.5 text-slate-400 font-medium">Jun 8, 2025</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#FAEEDA] text-[#854F0B]">Pending</span></td>
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button onClick={() => triggerNotification('Late fee waived!', 'info')} className="px-2 py-1 bg-[#EF9F27] hover:bg-[#C87E17] text-white rounded-md font-semibold text-[10px] cursor-pointer">Waive</button>
                      <button onClick={() => triggerNotification('Late fee applied to ledger!', 'success')} className="px-2 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-md font-semibold text-[10px] cursor-pointer">Bill</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">C02</td>
                    <td className="px-5 py-3.5 font-semibold">David Ochieng</td>
                    <td className="px-5 py-3.5">12,000</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#FAEEDA] text-[#854F0B]">10 days</span></td>
                    <td className="px-5 py-3.5">5%</td>
                    <td className="px-5 py-3.5 font-bold text-[#EF9F27]">KES 600</td>
                    <td className="px-5 py-3.5 text-slate-400 font-medium">Jun 8, 2025</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#FAEEDA] text-[#854F0B]">Pending</span></td>
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button onClick={() => triggerNotification('Late fee waived!', 'info')} className="px-2 py-1 bg-[#EF9F27] hover:bg-[#C87E17] text-white rounded-md font-semibold text-[10px] cursor-pointer">Waive</button>
                      <button onClick={() => triggerNotification('Late fee applied to ledger!', 'success')} className="px-2 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-md font-semibold text-[10px] cursor-pointer">Bill</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEPOSITS SUB-TAB */}
        {billingMainTab === 'deposits' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Held</p>
                <h3 className="text-xl font-bold text-cyan-600 mt-1">KES 52,000</h3>
                <p className="text-[10px] text-slate-400 mt-1">4 active tenants</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Refunded YTD</p>
                <h3 className="text-xl font-bold text-emerald-500 mt-1">KES 8,500</h3>
                <p className="text-[10px] text-slate-400 mt-1">2 moves-outs settled</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Refunds</p>
                <h3 className="text-xl font-bold text-slate-800 mt-1">KES 0</h3>
                <p className="text-[10px] text-slate-400 mt-1">All refunds settled</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="px-5 py-3">Unit</th>
                    <th className="px-5 py-3">Tenant</th>
                    <th className="px-5 py-3">Deposit Paid</th>
                    <th className="px-5 py-3">Date Paid</th>
                    <th className="px-5 py-3">Equivalent</th>
                    <th className="px-5 py-3">Deductions</th>
                    <th className="px-5 py-3">Refundable</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">A01</td>
                    <td className="px-5 py-3.5 font-semibold">James Mwangi</td>
                    <td className="px-5 py-3.5 font-bold text-[#178BCA]">KES 16,000</td>
                    <td className="px-5 py-3.5 text-slate-400 font-medium">Jan 2024</td>
                    <td className="px-5 py-3.5 text-slate-400">2× rent</td>
                    <td className="px-5 py-3.5 text-emerald-600 font-semibold">KES 0</td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600">KES 16,000</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#E0F2FE] text-[#0369A1]">Active</span></td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => triggerNotification('Deposit refund flow opened...', 'info')} className="px-2.5 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-md font-semibold text-[10px] cursor-pointer">Refund</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">A02</td>
                    <td className="px-5 py-3.5 font-semibold">Grace Atieno</td>
                    <td className="px-5 py-3.5 font-bold text-[#178BCA]">KES 15,000</td>
                    <td className="px-5 py-3.5 text-slate-400 font-medium">Mar 2023</td>
                    <td className="px-5 py-3.5 text-slate-400">2× rent</td>
                    <td className="px-5 py-3.5 text-red-500 font-semibold">KES 1,500</td>
                    <td className="px-5 py-3.5 font-bold text-amber-600">KES 13,500</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#E0F2FE] text-[#0369A1]">Active</span></td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => triggerNotification('Deposit refund flow opened...', 'info')} className="px-2.5 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-md font-semibold text-[10px] cursor-pointer">Refund</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">B01</td>
                    <td className="px-5 py-3.5 font-semibold">Peter Kamau</td>
                    <td className="px-5 py-3.5 font-bold text-[#178BCA]">KES 12,000</td>
                    <td className="px-5 py-3.5 text-slate-400 font-medium">Jun 2022</td>
                    <td className="px-5 py-3.5 text-slate-400">~1.3× rent</td>
                    <td className="px-5 py-3.5 text-emerald-600 font-semibold">KES 0</td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600">KES 12,000</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#E0F2FE] text-[#0369A1]">Active</span></td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => triggerNotification('Deposit refund flow opened...', 'info')} className="px-2.5 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-md font-semibold text-[10px] cursor-pointer">Refund</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">B03</td>
                    <td className="px-5 py-3.5 font-semibold">Amina Hassan</td>
                    <td className="px-5 py-3.5 font-bold text-[#178BCA]">KES 9,000</td>
                    <td className="px-5 py-3.5 text-slate-400 font-medium">Sep 2023</td>
                    <td className="px-5 py-3.5 text-slate-400">~1× rent</td>
                    <td className="px-5 py-3.5 text-emerald-600 font-semibold">KES 0</td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600">KES 9,000</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#E0F2FE] text-[#0369A1]">Active</span></td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => triggerNotification('Deposit refund flow opened...', 'info')} className="px-2.5 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-md font-semibold text-[10px] cursor-pointer">Refund</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ARREARS SUB-TAB */}
        {billingMainTab === 'arrears' && (
          <div className="space-y-4">
            <div className="bg-[#EEF2FF] border border-[#C7D2FE] p-4 rounded-xl flex items-center gap-2 text-xs text-indigo-700">
              <AlertTriangle className="text-indigo-600" size={16} />
              <span>Arrears are unpaid balances automatically carried forward from previous months into current billing cycles.</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="px-5 py-3">Unit</th>
                    <th className="px-5 py-3">Tenant</th>
                    <th className="px-5 py-3">Month</th>
                    <th className="px-5 py-3">Original Bill</th>
                    <th className="px-5 py-3">Paid</th>
                    <th className="px-5 py-3">Arrears Carried</th>
                    <th className="px-5 py-3">Months Outstanding</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">A02</td>
                    <td className="px-5 py-3.5 font-semibold">Grace Atieno</td>
                    <td className="px-5 py-3.5 text-slate-400">May 2025</td>
                    <td className="px-5 py-3.5">9,600</td>
                    <td className="px-5 py-3.5 text-emerald-600 font-bold">0</td>
                    <td className="px-5 py-3.5 text-red-500 font-bold">KES 9,600</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#FAECE7] text-[#993C1D]">2 months</span></td>
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button onClick={() => triggerNotification('Chasing arrears via WhatsApp message...', 'success')} className="px-2.5 py-1 bg-[#D85A30] hover:bg-[#B2401E] text-white rounded-md font-semibold text-[10px] cursor-pointer">Chase</button>
                      <button onClick={() => setDetailsDrawer({ type: 'record', unitId: 'A02' })} className="px-2.5 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-md font-semibold text-[10px] cursor-pointer">Record</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">A02</td>
                    <td className="px-5 py-3.5 font-semibold">Grace Atieno</td>
                    <td className="px-5 py-3.5 text-slate-400">Apr 2025</td>
                    <td className="px-5 py-3.5">9,225</td>
                    <td className="px-5 py-3.5 text-emerald-600 font-bold">0</td>
                    <td className="px-5 py-3.5 text-red-500 font-bold">KES 1,200</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#F3E8FF] text-[#6B21A8]">3 months</span></td>
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button onClick={() => triggerNotification('Chasing arrears via WhatsApp message...', 'success')} className="px-2.5 py-1 bg-[#D85A30] hover:bg-[#B2401E] text-white rounded-md font-semibold text-[10px] cursor-pointer">Chase</button>
                      <button onClick={() => setDetailsDrawer({ type: 'record', unitId: 'A02' })} className="px-2.5 py-1 bg-[#4338CA] hover:bg-[#312E81] text-white rounded-md font-semibold text-[10px] cursor-pointer">Record</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HISTORY SUB-TAB */}
        {billingMainTab === 'history' && (
          <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              {['Jun 2025', 'May 2025', 'Apr 2025', 'Mar 2025', 'Feb 2025'].map(m => (
                <button 
                  key={m}
                  onClick={() => triggerNotification(`Switched history review view to: ${m}`, 'info')}
                  className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-3">
                <h4 className="text-xs font-bold text-slate-800 mb-4">6-Month Collection Trend</h4>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={billingHistoryTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F8FAFC" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `K${v / 1000}`} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="Billed" stroke="#4338CA" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Collected" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-2">
                <h4 className="text-xs font-bold text-slate-800 mb-3">Monthly Summary</h4>
                <div className="overflow-x-auto text-[11px] font-semibold text-slate-500">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-50 pb-1.5 text-slate-400">
                        <th className="pb-1.5">Month</th>
                        <th className="pb-1.5">Billed</th>
                        <th className="pb-1.5">Collected</th>
                        <th className="pb-1.5">Rate</th>
                        <th className="pb-1.5">Fees</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      <tr>
                        <td className="py-1.5">Jun 2025</td>
                        <td className="py-1.5">44,280</td>
                        <td className="py-1.5 text-emerald-600 font-bold">24,200</td>
                        <td className="py-1.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#FAEEDA] text-[#854F0B]">55%</span></td>
                        <td className="py-1.5 text-[#EF9F27]">1,875</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">May 2025</td>
                        <td className="py-1.5">38,700</td>
                        <td className="py-1.5 text-emerald-600 font-bold">32,400</td>
                        <td className="py-1.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#EAF3DE] text-[#3B6D11]">84%</span></td>
                        <td className="py-1.5 text-[#EF9F27]">900</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">Apr 2025</td>
                        <td className="py-1.5">37,200</td>
                        <td className="py-1.5 text-emerald-600 font-bold">35,100</td>
                        <td className="py-1.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#EAF3DE] text-[#3B6D11]">94%</span></td>
                        <td className="py-1.5 text-[#1D9E75]">0</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">Mar 2025</td>
                        <td className="py-1.5">36,800</td>
                        <td className="py-1.5 text-emerald-600 font-bold">36,800</td>
                        <td className="py-1.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#EAF3DE] text-[#3B6D11]">100%</span></td>
                        <td className="py-1.5 text-[#1D9E75]">0</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">Feb 2025</td>
                        <td className="py-1.5">35,500</td>
                        <td className="py-1.5 text-emerald-600 font-bold">34,200</td>
                        <td className="py-1.5"><span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#EAF3DE] text-[#3B6D11]">96%</span></td>
                        <td className="py-1.5 text-[#1D9E75]">0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* COMMON BILLING MODALS / DRAWERS RENDERS */}
        {/* ======================================================= */}

        {/* Invoice Modal Overlay */}
        {invoiceModalData && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex justify-between items-start pb-4 border-b border-indigo-500">
                <div>
                  <h3 className="text-indigo-600 font-black text-lg tracking-tight">🏢 PROPERTIES PORTAL</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Invoice #INV-2025-{invoiceModalData.unit}-06</p>
                  <p className="text-[10px] text-slate-400">Royal Flats • Kawangware</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${invoiceModalData.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : invoiceModalData.status === 'Partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                    {invoiceModalData.status}
                  </span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">June 2025</p>
                  <p className="text-[10px] text-slate-400">Due: Jun 5, 2025</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Billed To</p>
                  <p className="text-slate-900 font-bold">{invoiceModalData.tenantName}</p>
                  <p>Unit {invoiceModalData.unit} • Royal Flats</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Property Manager</p>
                  <p className="text-slate-900 font-bold">John Kamau</p>
                  <p>john@properties.co.ke</p>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-indigo-50 text-indigo-700 font-bold">
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Amount (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                  <tr>
                    <td className="px-3 py-2">Monthly Rent — June 2025</td>
                    <td className="px-3 py-2 text-right">{Math.round(invoiceModalData.total * 0.74).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Water Charges — June 2025</td>
                    <td className="px-3 py-2 text-right">{Math.round(invoiceModalData.total * 0.22).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Garbage Collection — June 2025</td>
                    <td className="px-3 py-2 text-right">300</td>
                  </tr>
                  {invoiceModalData.balance > 0 && (
                    <tr className="bg-rose-50 text-rose-700 font-bold">
                      <td className="px-3 py-2">Late Fee (5% — 32 days overdue)</td>
                      <td className="px-3 py-2 text-right">{Math.round(invoiceModalData.total * 0.028).toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="bg-indigo-600 text-white font-bold p-3 rounded-xl flex justify-between text-sm">
                <span>TOTAL DUE</span>
                <span>KES {invoiceModalData.total.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="font-bold text-slate-800">{invoiceModalData.total.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400">Billed</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="font-bold text-emerald-600">{invoiceModalData.paid.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400">Paid</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="font-bold text-red-500">{invoiceModalData.balance.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400">Balance</p>
                </div>
              </div>

              <p className="text-center font-bold text-slate-400 text-[10px] pt-2 border-t border-slate-100">Pay via M-Pesa Paybill: <strong className="text-indigo-600">123456</strong> • Account: <strong className="text-indigo-600">Unit {invoiceModalData.unit}</strong> • Thank you!</p>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setInvoiceModalData(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">Close</button>
                <button 
                  onClick={() => {
                    triggerNotification('Invoice downloaded as PDF statement!', 'success');
                    setInvoiceModalData(null);
                  }}
                  className="flex-1 py-2 bg-royal-600 hover:bg-royal-700 text-white rounded-xl text-xs font-bold"
                >
                  Download PDF
                </button>
                <button 
                  onClick={() => {
                    triggerNotification('Invoice dispatched to tenant WhatsApp registry!', 'success');
                    setInvoiceModalData(null);
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Send WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Late Fee Settings Modal Overlay */}
        {showLateFeeSettingsModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Late Fee Settings</h3>
                <button onClick={() => setShowLateFeeSettingsModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Fee Rate (%)</label>
                    <input type="number" defaultValue="5" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Grace Period (Days)</label>
                    <input type="number" defaultValue="7" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Apply Fee To</label>
                  <select className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800">
                    <option value="rent">Rent only</option>
                    <option value="rent_water">Rent and Water</option>
                    <option value="all">All total outstanding bills</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Auto-apply Configuration</label>
                  <select className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800">
                    <option value="auto">Yes — auto apply on 8th of month</option>
                    <option value="manual">No — manual review and trigger only</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowLateFeeSettingsModal(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
                <button 
                  onClick={() => {
                    triggerNotification('Late fee settings updated successfully!', 'success');
                    setShowLateFeeSettingsModal(false);
                  }}
                  className="flex-1 py-2 bg-royal-600 hover:bg-royal-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. MAINTENANCE VIEW
  if (view === 'maintenance') {
    const totalRepairsLogged = houses.reduce((acc, h) => acc + (h.repairs?.length || 0), 0);
    const activeRepairCosts = houses.reduce((acc, h) => acc + (h.repairs?.reduce((c, r) => c + r.cost, 0) || 0), 0);

    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Maintenance Overview</h2>
            <p className="text-slate-400 text-xs font-medium">Tenant repair ticket history audits and maintenance registries.</p>
          </div>
        </div>

        {/* Maintenance metrics cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ongoing Service Tickets</span>
            <p className="text-3xl font-black text-slate-950 mt-1">{houses.filter(h => h.maintenanceStatus === MaintenanceStatus.UNDER_REPAIR).length} Units</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Resolved Tickets</span>
            <p className="text-3xl font-black text-slate-950 mt-1">{totalRepairsLogged} Tickets</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capital Allocated to Maintenance</span>
            <p className="text-3xl font-black text-slate-950 mt-1">KES {activeRepairCosts.toLocaleString()}</p>
          </div>
        </div>

        {/* Repairs and tickets table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200/80">
            <h3 className="font-bold text-slate-900 text-base">Service Ledger</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-4 px-6">Unit</th>
                  <th className="py-4 px-6">Issue Description</th>
                  <th className="py-4 px-6">Logged At</th>
                  <th className="py-4 px-6">Investment Cost</th>
                  <th className="py-4 px-6">Operations Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 text-slate-600">
                {houses.flatMap(h => h.repairs?.map(r => ({ ...r, houseNumber: h.houseNumber })) || []).map((rep, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-bold text-slate-900">{rep.houseNumber}</td>
                    <td className="py-4 px-6 font-semibold">{rep.description}</td>
                    <td className="py-4 px-6">{new Date().toLocaleDateString('en-GB')}</td>
                    <td className="py-4 px-6">KES {rep.cost.toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600">
                        RESOLVED
                      </span>
                    </td>
                  </tr>
                ))}
                {houses.filter(h => h.maintenanceStatus === MaintenanceStatus.UNDER_REPAIR).map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-bold text-slate-900">{h.houseNumber}</td>
                    <td className="py-4 px-6 font-semibold text-amber-600">Active maintenance alert logged by Caretaker</td>
                    <td className="py-4 px-6">{new Date().toLocaleDateString('en-GB')}</td>
                    <td className="py-4 px-6">TBD</td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">
                        IN PROGRESS
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 5. DEFAULT PORTFOLIO OVERVIEW REDESIGN (SaaS DASHBOARD EXECUTIVE HUB)
  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Workspace Greeting & Setup Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Good morning, John 👋</h2>
          <p className="text-slate-400 text-xs md:text-sm font-medium">Here's what's happening with your properties today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAIReport} 
            disabled={loadingAI}
            className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} className={loadingAI ? "animate-spin" : ""} />
            {loadingAI ? 'Re-analyzing Yield...' : 'Ask Gemini Portfolio Insight'}
          </button>
          <button onClick={() => setShowAddPropertyModal(true)} className="px-5 py-3 bg-royal-500 text-white rounded-xl text-xs font-bold hover:bg-royal-600 transition-all shadow-glow active:scale-95 flex items-center justify-center gap-2">
            <Plus size={14}/> New Property
          </button>
        </div>
      </div>

      {/* AI/Gemini Insights Panel if generated */}
      {aiReport && (
        <div className="bg-gradient-to-r from-royal-50 to-royal-100/50 p-6 rounded-2xl border border-royal-200 shadow-sm animate-fadeIn relative overflow-hidden">
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-3 bg-royal-500 text-white rounded-xl">
              <Activity size={18} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-slate-900">Gemini Portfolio Analysis & Recommendations</h4>
                <button onClick={() => setAiReport(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={14}/></button>
              </div>
              <div className="text-xs text-slate-600 leading-relaxed max-w-5xl whitespace-pre-line font-medium">
                {aiReport}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Row (Premium Gradient-tinted Cards Matching Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Billed */}
        <div className="bg-[#FAF9FF] border border-[#ECE9FF] p-6 rounded-[24px] flex justify-between items-center shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:border-[#D1C9FF] transition-all duration-300">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-[#5C54E6] uppercase tracking-wide">Total Billed (This Month)</p>
            <h3 className="text-[26px] font-black text-[#3A32BF] tracking-tighter">KES {totalExpected.toLocaleString()}</h3>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              <span className="text-slate-700 text-xs">▲</span>
              <span>12% vs last month</span>
            </div>
          </div>
          <div className="w-14 h-14 bg-[#EEEBFE] rounded-[18px] flex items-center justify-center text-[#5C54E6] shadow-sm shrink-0">
            <Banknote size={24} />
          </div>
        </div>

        {/* Card 2: Total Collected */}
        <div className="bg-[#F4FBF7] border border-[#E1F6EB] p-6 rounded-[24px] flex justify-between items-center shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:border-[#C2EED7] transition-all duration-300">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-[#10B981] uppercase tracking-wide">Total Collected</p>
            <h3 className="text-[26px] font-black text-[#047857] tracking-tighter">KES {totalCollected.toLocaleString()}</h3>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              <span className="text-[#10B981] text-xs">▲</span>
              <span>8% vs last month</span>
            </div>
          </div>
          <div className="w-14 h-14 bg-[#E1F6EB] rounded-[18px] flex items-center justify-center text-[#10B981] shadow-sm shrink-0">
            <Wallet size={24} />
          </div>
        </div>

        {/* Card 3: Outstanding Balance */}
        <div className="bg-[#FFF9F2] border border-[#FFE8CC] p-6 rounded-[24px] flex justify-between items-center shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:border-[#FFD099] transition-all duration-300">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wide">Outstanding Balance</p>
            <h3 className="text-[26px] font-black text-[#B45309] tracking-tighter">KES {(totalExpected - totalCollected).toLocaleString()}</h3>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              <span className="text-slate-700 text-xs">▲</span>
              <span>5% vs last month</span>
            </div>
          </div>
          <div className="w-14 h-14 bg-[#FFE8CC] rounded-[18px] flex items-center justify-center text-[#F59E0B] shadow-sm shrink-0">
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Card 4: Occupancy Rate */}
        <div className="bg-[#F0F9FF] border border-[#E0F2FE] p-6 rounded-[24px] flex justify-between items-center shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative group hover:border-[#BFDBFE] transition-all duration-300">
          {/* Overlapping Date Selector Badge exactly matching design */}
          <button className="absolute -top-3.5 right-6 bg-white border border-slate-200 hover:border-slate-300 text-[10px] font-bold text-slate-600 px-3.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 hover:bg-slate-50 transition-all z-10">
            <Calendar size={12} className="text-[#5C54E6]" />
            <span>May 1 - May 31, 2025</span>
            <ChevronDown size={10} className="text-slate-400" />
          </button>

          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-[#0EA5E9] uppercase tracking-wide">Occupancy Rate</p>
            <h3 className="text-[26px] font-black text-[#0369A1] tracking-tighter">{occupancyRate.toFixed(0)}%</h3>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              <span className="text-[#0EA5E9] text-xs">▲</span>
              <span>3% vs last month</span>
            </div>
          </div>
          <div className="w-14 h-14 bg-[#E0F2FE] rounded-[18px] flex items-center justify-center text-[#0EA5E9] shadow-sm shrink-0">
            <PieChartIcon size={24} />
          </div>
        </div>
      </div>

      {/* Main Row: Income Overview, Income Distribution & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income Overview Line Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Income Overview</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Rent collections performance history</p>
            </div>
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-white text-royal-600 shadow-sm">This Month</button>
              <button className="px-2.5 py-1 text-[10px] font-bold rounded-md text-slate-500 hover:text-slate-800">Last 3 Months</button>
              <button className="px-2.5 py-1 text-[10px] font-bold rounded-md text-slate-500 hover:text-slate-800">Year</button>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { name: 'May 05', Billed: totalExpected * 0.9, Collected: totalCollected * 0.4, Outstanding: totalExpected * 0.5 },
                { name: 'May 10', Billed: totalExpected * 0.95, Collected: totalCollected * 0.65, Outstanding: totalExpected * 0.3 },
                { name: 'May 15', Billed: totalExpected, Collected: totalCollected * 0.8, Outstanding: totalExpected * 0.2 },
                { name: 'May 20', Billed: totalExpected, Collected: totalCollected * 0.9, Outstanding: totalExpected * 0.1 },
                { name: 'May 25', Billed: totalExpected, Collected: totalCollected, Outstanding: totalExpected - totalCollected },
              ]} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#CBD5E1', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }} />
                <Line type="monotone" dataKey="Billed" stroke="#5B4CF5" strokeWidth={3} dot={false} name="Billed (KES)" />
                <Line type="monotone" dataKey="Collected" stroke="#22C55E" strokeWidth={3} dot={false} name="Collected (KES)" />
                <Line type="monotone" dataKey="Outstanding" stroke="#EF4444" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Arrears (KES)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ring Chart & Center Label & Legends */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Income Distribution</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Resource collection breakdown</p>
          </div>

          <div className="relative w-full h-44 my-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[
                    { name: 'Rent', value: totalExpected * 0.65 },
                    { name: 'Water', value: totalExpected * 0.18 },
                    { name: 'Garbage', value: totalExpected * 0.1 },
                    { name: 'Other', value: totalExpected * 0.07 },
                  ]} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={65} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#5B4CF5" />
                  <Cell fill="#22C55E" />
                  <Cell fill="#3B2EC2" />
                  <Cell fill="#F59E0B" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', color: '#FFF', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-base font-black text-slate-900">KES {totalExpected.toLocaleString()}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Billed</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-royal-500 rounded-full shrink-0" /> <span>Rent: 65%</span></div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0" /> <span>Water: 18%</span></div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-royal-700 rounded-full shrink-0" /> <span>Garbage: 10%</span></div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full shrink-0" /> <span>Other: 7%</span></div>
          </div>
        </div>
      </div>

      {/* Second Row: Collection Rate Radial Gauge, Top performing, Cash flow & Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection Metric Gauges & Progress list */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Collection Rate</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Revenue collection progress</p>
          </div>

          {/* Radial SVG Gauge */}
          <div className="relative w-full h-36 flex items-center justify-center my-2">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="54" stroke="#F1F5F9" strokeWidth="8" fill="transparent" />
              <circle cx="64" cy="64" r="54" stroke="#5B4CF5" strokeWidth="10" fill="transparent" 
                strokeDasharray={2 * Math.PI * 54} 
                strokeDashoffset={2 * Math.PI * 54 * (1 - 0.66)} 
                strokeLinecap="round" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-900">66%</span>
              <span className="text-[9px] text-emerald-500 font-bold">▲ 8% vs last month</span>
            </div>
          </div>
          <div className="text-center text-xs text-slate-400 font-semibold uppercase tracking-wider pb-1">
            Expected Revenue Target Ratio: <span className="text-slate-700 font-black">90%</span>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Top Performing Properties</h4>
            <div className="space-y-3">
              {[
                { name: 'Royal Flats', pct: 95, color: 'bg-royal-500' },
                { name: 'Palm Heights', pct: 82, color: 'bg-indigo-400' },
                { name: 'Sunset Apartments', pct: 74, color: 'bg-emerald-400' },
                { name: 'Greenview Estate', pct: 58, color: 'bg-amber-400' },
              ].map(p => (
                <div key={p.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800">{p.name}</span>
                    <span className="text-slate-500">{p.pct}% collected</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${p.color}`} style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cash Flow Summary & Sparkline */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Cash Flow Summary</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Overhead & liquid earnings</p>
          </div>

          <div className="space-y-4 my-4">
            <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Total Income Billed:</span>
              <span className="text-slate-900 font-black">KES {totalExpected.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100">
              <span className="text-slate-500 font-medium font-medium">Total Utility Expenses:</span>
              <span className="text-rose-500 font-black">- KES {(totalExpenses + maintenanceExpenses).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-700 font-black">Net Cash Flow:</span>
              <span className="text-emerald-500 font-black text-lg">KES {netIncome.toLocaleString()}</span>
            </div>
          </div>

          {/* Sparkline chart representation */}
          <div className="h-16 w-full -mb-2 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { val: totalExpected * 0.5 },
                { val: totalExpected * 0.62 },
                { val: totalExpected * 0.58 },
                { val: totalExpected * 0.73 },
                { val: totalExpected * 0.69 },
                { val: netIncome },
              ]}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#22C55E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Reminders Actions and Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Reminders & Operations Alerts</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Automated task triggers</p>
          </div>

          <div className="space-y-3.5 my-4">
            {[
              { title: 'Rent Collection Due', desc: 'Auto billing invoicing loop', date: 'Tomorrow, Jun 01', type: 'collection' },
              { title: 'Water Meter Reading Verification', desc: 'Record monthly consumption stats', date: 'In 2 days, Jun 02', type: 'meter' },
              { title: 'Inquire Arrears Residents', desc: 'Direct push reminders', date: 'In 3 days, Jun 03', type: 'mpesa' },
              { title: 'Operations Audit Settlement', desc: 'Review maintenance logs', date: 'In 7 days, Jun 07', type: 'audit' },
            ].map((rem, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/50 transition-colors">
                <div className="p-2 bg-royal-100 text-royal-600 rounded-lg shrink-0 mt-0.5">
                  <Calendar size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{rem.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{rem.desc}</p>
                  <span className="text-[9px] font-bold text-royal-500 uppercase tracking-wider mt-1.5 block">{rem.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Third Row: Recent Transaction table & occupancy ratio doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Ledger Payments</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Live transaction feeds across assets</p>
          </div>

          <div className="overflow-x-auto my-4 -mx-6">
            <table className="w-full text-left whitespace-nowrap min-w-[500px]">
              <thead className="bg-slate-50 text-slate-400 font-bold text-[9px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Tenant ID</th>
                  <th className="py-3 px-6">Description</th>
                  <th className="py-3 px-6">Sourced Channel</th>
                  <th className="py-3 px-6">Amount</th>
                  <th className="py-3 px-6">State</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 text-slate-600 font-medium">
                {payments.slice(0, 5).map(p => {
                  const ten = tenants.find(t => t.id === p.tenantId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6 shrink-0">{p.date}</td>
                      <td className="py-3.5 px-6 font-bold text-slate-950">{ten ? ten.houseNumber : 'C1'}</td>
                      <td className="py-3.5 px-6 truncate">{p.reference || 'Mobile MPesa Entry'}</td>
                      <td className="py-3.5 px-6 font-mono text-[10px]">{p.mode}</td>
                      <td className="py-3.5 px-6 font-black text-slate-900">KES {p.amount.toLocaleString()}</td>
                      <td className="py-3.5 px-6">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-emerald-50 text-emerald-600">
                          CONFIRMED
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Units Status breakdown and doughnut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Units Allocation Breakdown</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Aggregate real estate yield status</p>
          </div>

          {/* Doughnut Chart */}
          <div className="relative w-full h-36 flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[
                    { name: 'Occupied', value: 57 },
                    { name: 'Vacant', value: 18 },
                    { name: 'Service repair', value: 10 },
                  ]} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={50} 
                  outerRadius={65} 
                  paddingAngle={6} 
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#5B4CF5" />
                  <Cell fill="#CBD5E1" />
                  <Cell fill="#F59E0B" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-slate-950">85</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Total Units</span>
            </div>
          </div>

          <div className="space-y-2 text-xs font-semibold">
            <div className="flex justify-between items-center text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-royal-500 rounded-full" />
                <span>Occupied Units</span>
              </div>
              <span>57 (67%)</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-slate-200 rounded-full" />
                <span>Vacant Units</span>
              </div>
              <span>18 (21%)</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                <span>Under Service repair</span>
              </div>
              <span>10 (12%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ADDITIONAL VISUAL METRIC PANELS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Outstanding Rent Heatmap placeholder representation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-900 text-sm mb-4">Water Consumption Billing Trends</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Jan', consumption: 320 },
                { name: 'Feb', consumption: 410 },
                { name: 'Mar', consumption: 290 },
                { name: 'Apr', consumption: 480 },
                { name: 'May', consumption: 360 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="consumption" fill="#5B4CF5" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Growth Trend Area Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-900 text-sm mb-4">Occupancy Growth Trend (YTD)</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Jan', rate: 58 },
                { name: 'Feb', rate: 61 },
                { name: 'Mar', rate: 64 },
                { name: 'Apr', rate: 65 },
                { name: 'May', rate: 67 },
              ]}>
                <defs>
                  <linearGradient id="occupancyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B4CF5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#5B4CF5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="rate" stroke="#5B4CF5" strokeWidth={2.5} fillOpacity={1} fill="url(#occupancyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SUPPORTING COMPONENTS ---

const SettingsConfirmationModal: React.FC<{ config: PaymentConfig, onCancel: () => void, onConfirm: () => void }> = ({ config, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-neutral-900/98 backdrop-blur-lg animate-fadeIn">
    <div className="bg-white w-full max-w-2xl rounded-none md:rounded-[4rem] shadow-2xl overflow-hidden animate-slideUp border border-neutral-200 h-full md:h-auto md:max-h-[90vh] flex flex-col">
      <div className="bg-royal-900 p-6 md:p-12 text-white flex justify-between items-center relative overflow-hidden shrink-0 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-12">
         <div className="absolute top-0 right-0 p-8 md:p-10 opacity-5 text-white pointer-events-none"><ShieldCheck size={120} className="md:w-[160px] md:h-[160px]"/></div>
         <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-royal font-black tracking-tight">Deploy Protocols?</h3>
            <p className="text-royal-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-1">Gateway Verification Flow</p>
         </div>
         <button type="button" onClick={onCancel} className="relative z-20 p-3 md:p-4 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl transition-all shadow-lg cursor-pointer"><X size={24} className="md:w-7 md:h-7"/></button>
      </div>
      <div className="p-8 md:p-12 space-y-8 md:space-y-10 overflow-y-auto">
         <div className="bg-red-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-red-100 flex items-center gap-3 md:gap-4">
            <AlertTriangle className="text-red-500 shrink-0 md:w-6 md:h-6" size={20} />
            <p className="text-[10px] md:text-[11px] font-bold text-red-800 leading-relaxed uppercase tracking-tight">Caution: All residents will immediately see these updated payment instructions on their dashboards.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 md:space-y-6">
               <div className="flex items-center gap-3 text-green-600 mb-1 md:mb-2">
                  <Smartphone size={16} className="md:w-[18px] md:h-[18px]"/>
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">M-Pesa Vector</span>
               </div>
               <div className="space-y-3 md:space-y-4 pl-1">
                  <div>
                    <p className="text-[8px] md:text-[9px] font-black text-neutral-400 uppercase tracking-widest">Type</p>
                    <p className="text-xs md:text-sm font-black text-neutral-900">{config.mpesaType}</p>
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[9px] font-black text-neutral-400 uppercase tracking-widest">Number</p>
                    <p className="text-xs md:text-sm font-black text-neutral-900">{config.mpesaNumber}</p>
                  </div>
                  {config.mpesaType === 'PAYBILL' && (
                    <div>
                      <p className="text-[8px] md:text-[9px] font-black text-neutral-400 uppercase tracking-widest">Account ID</p>
                      <p className="text-xs md:text-sm font-black text-neutral-900">{config.mpesaAccountPrefix}[HOUSE]</p>
                    </div>
                  )}
               </div>
            </div>

            <div className="space-y-4 md:space-y-6">
               <div className="flex items-center gap-3 text-royal-600 mb-1 md:mb-2">
                  <Landmark size={16} className="md:w-[18px] md:h-[18px]"/>
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Bank Vector</span>
               </div>
               <div className="space-y-3 md:space-y-4 pl-1">
                  <div>
                    <p className="text-[8px] md:text-[9px] font-black text-neutral-400 uppercase tracking-widest">Institution</p>
                    <p className="text-xs md:text-sm font-black text-neutral-900">{config.bankName}</p>
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[9px] font-black text-neutral-400 uppercase tracking-widest">Settlement A/C</p>
                    <p className="text-xs md:text-sm font-black text-neutral-900">{config.bankAccountNumber}</p>
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[9px] font-black text-neutral-400 uppercase tracking-widest">Beneficiary</p>
                    <p className="text-xs md:text-sm font-black text-neutral-900">{config.bankAccountName}</p>
                  </div>
               </div>
            </div>
         </div>

         <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4 md:pt-6">
            <button type="button" onClick={onCancel} className="w-full sm:flex-1 py-4 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-widest text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-all cursor-pointer">Abort Update</button>
            <button onClick={onConfirm} className="w-full sm:flex-[2] bg-royal-500 text-white py-4 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-royal-600 shadow-2xl shadow-royal-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
               <CheckCircle2 size={18}/> Authorize Deployment
            </button>
         </div>
      </div>
    </div>
  </div>
);

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode, change: string, trend?: 'up' | 'down', subtitle?: string }> = ({ title, value, icon, change, trend, subtitle }) => (
  <div className="bg-white p-5 md:p-10 rounded-2xl md:rounded-5xl border border-slate-200 shadow-premium transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50 group-hover:bg-royal-50 transition-colors" />
    <div className="flex items-center justify-between mb-6 md:mb-10 relative z-10">
      <div className="p-3 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl group-hover:bg-white group-hover:shadow-lg transition-all duration-500 border border-transparent group-hover:border-slate-100">
        {icon}
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl border ${
        trend === 'up' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
        trend === 'down' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
        'bg-slate-50 text-slate-600 border-slate-200'
      }`}>
         {trend === 'up' ? <TrendingUp size={12} className="md:w-[14px] md:h-[14px]"/> : trend === 'down' ? <TrendingDown size={12} className="md:w-[14px] md:h-[14px]"/> : null}
         {change}
      </div>
    </div>
    <div className="relative z-10">
      <div className="text-[10px] md:text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1 md:mb-2">{title}</div>
      <div className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter mb-1">{value}</div>
      {subtitle && <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{subtitle}</p>}
    </div>
  </div>
);

const ReportActionCard: React.FC<{ title: string, desc: string, icon: React.ReactNode, onClick: () => void, accent: 'royal' | 'amber' | 'red' }> = ({ title, desc, icon, onClick, accent }) => {
  const styles = {
    royal: 'hover:border-royal-500 text-royal-500 bg-royal-50/30',
    amber: 'hover:border-amber-500 text-amber-500 bg-amber-50/30',
    red: 'hover:border-rose-500 text-rose-500 bg-rose-50/30',
  };
  return (
    <button onClick={onClick} className={`bg-white p-6 md:p-12 rounded-2xl md:rounded-6xl border border-slate-200 shadow-premium text-left group transition-all duration-500 hover:-translate-y-3 ${styles[accent]}`}>
       <div className={`p-4 md:p-6 rounded-xl md:rounded-3xl w-fit mb-4 md:mb-10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm ${styles[accent]}`}>{icon}</div>
       <h4 className="text-lg md:text-3xl font-display font-black text-slate-900 tracking-tight">{title}</h4>
       <p className="text-[10px] md:text-sm text-slate-400 font-medium mt-1.5 md:mt-3 mb-6 md:mb-12 leading-relaxed">{desc}</p>
       <div className="flex items-center gap-2 md:gap-4 text-[8px] md:text-[11px] font-black uppercase tracking-[0.2em] text-royal-500 group-hover:translate-x-2 transition-transform">
          Generate Document <Printer size={12} className="md:w-4 md:h-4"/>
       </div>
    </button>
  );
};

const AddExpenseModal: React.FC<{ onAdd: (e: Expense) => void, onClose: () => void }> = ({ onAdd, onClose }) => {
  const [data, setData] = useState({ category: 'MAINTENANCE', amount: '', description: '' });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: `exp-${Date.now()}`,
      date: new Date().toISOString(),
      category: data.category as any,
      amount: Number(data.amount),
      description: data.description
    });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-neutral-900/95 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-none md:rounded-[4rem] shadow-2xl flex flex-col h-full md:h-auto md:max-h-[90vh] overflow-hidden animate-slideUp border border-neutral-200">
        <div className="bg-royal-900 p-6 md:p-12 text-white flex justify-between items-center relative overflow-hidden shrink-0 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-12">
           <div className="absolute top-0 right-0 p-8 md:p-10 opacity-5 text-white pointer-events-none"><Briefcase size={80} className="md:w-[120px] md:h-[120px]"/></div>
           <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-royal font-black tracking-tight">Record Expense</h3>
              <p className="text-royal-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-1">Operational Outflow Audit</p>
           </div>
           <button type="button" onClick={onClose} className="relative z-20 p-3 md:p-4 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl transition-all shadow-lg cursor-pointer"><X size={24} className="md:w-7 md:h-7"/></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-6 md:space-y-8">
             <div className="space-y-2">
                <label className="text-[8px] md:text-[10px] font-black uppercase text-neutral-500 tracking-widest pl-1">Expense Classification</label>
                <select className="w-full p-4 md:p-5 bg-neutral-50 border-2 border-neutral-100 rounded-2xl md:rounded-3xl outline-none focus:border-royal-500 font-black text-base md:text-lg transition-all appearance-none" value={data.category} onChange={e => setData({...data, category: e.target.value})}>
                   <option value="MAINTENANCE">Maintenance & Repairs</option>
                   <option value="UTILITIES">Utility Provisions</option>
                   <option value="TAX">Statutory Taxes</option>
                   <option value="LEGAL">Legal & Compliance</option>
                   <option value="SALARY">Staff Salaries</option>
                   <option value="OTHER">Sundry / Miscellaneous</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[8px] md:text-[10px] font-black uppercase text-neutral-500 tracking-widest pl-1">Amount (KES)</label>
                <input type="number" required placeholder="0.00" className="w-full p-4 md:p-5 bg-neutral-50 border-2 border-neutral-100 rounded-2xl md:rounded-3xl outline-none focus:border-royal-500 font-black text-xl md:text-2xl transition-all" value={data.amount} onChange={e => setData({...data, amount: e.target.value})} />
             </div>
             <div className="space-y-2">
                <label className="text-[8px] md:text-[10px] font-black uppercase text-neutral-500 tracking-widest pl-1">Narration</label>
                <textarea required placeholder="Brief description of the expenditure..." className="w-full p-4 md:p-5 bg-neutral-50 border-2 border-neutral-100 rounded-2xl md:rounded-3xl outline-none focus:border-royal-500 font-bold text-sm md:text-base transition-all h-24 md:h-32 resize-none" value={data.description} onChange={e => setData({...data, description: e.target.value})} />
             </div>
             <button type="submit" className="w-full py-4 md:py-6 bg-royal-500 text-white rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-royal-600 shadow-2xl shadow-royal-500/20 active:scale-95 transition-all">
                Commit to Ledger
             </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const ReportPreviewModal: React.FC<{ type: string, data: any, onClose: () => void }> = ({ type, data, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    const printWindow = window.open('', '', 'height=1000,width=800');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Royal Flats - Official Performance Record</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print { .no-print { display: none; } body { padding: 0; margin: 0; background: white; } }
              body { padding: 40px; font-family: 'Times New Roman', serif; background: #f1f5f9; }
              .page { background: white; padding: 60px; margin: auto; max-width: 800px; min-height: 1100px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            </style>
          </head>
          <body>
            <div class="page">${printContent}</div>
            <script>window.print(); setTimeout(() => window.close(), 500);</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-4 bg-neutral-900/95 backdrop-blur-xl animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-none md:rounded-[4rem] shadow-2xl flex flex-col h-full md:h-auto md:max-h-[90vh] overflow-hidden animate-slideUp">
        <div className="p-5 md:p-10 bg-neutral-50 border-b flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 pt-[calc(1.25rem+env(safe-area-inset-top))] md:pt-10">
           <div className="text-center sm:text-left">
              <h3 className="text-xl md:text-3xl font-royal font-black text-neutral-900 tracking-tight">Performance Audit Preview</h3>
              <p className="text-[10px] md:text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">Reviewing RF-PERF-{new Date().getFullYear()}</p>
           </div>
           <div className="flex gap-3 md:gap-4 w-full sm:w-auto">
              <button onClick={onClose} className="flex-1 sm:flex-none p-3 md:p-5 bg-neutral-200 hover:bg-neutral-300 rounded-xl md:rounded-[2rem] transition-all flex items-center justify-center cursor-pointer" type="button"><X size={20} className="md:w-6 md:h-6"/></button>
              <button onClick={handlePrint} className="flex-[3] sm:flex-none flex items-center justify-center gap-2 md:gap-3 bg-royal-500 text-white px-6 md:px-10 py-3 md:py-5 rounded-xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-widest shadow-2xl shadow-royal-500/20 active:scale-95 transition-all">
                 Finalize & Export <Printer size={16} className="md:w-5 md:h-5"/>
              </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-neutral-100 scrollbar-hide">
           <div ref={printRef} className="bg-white p-6 md:p-16 shadow-inner min-h-[1000px] border border-neutral-200 mx-auto max-w-[800px] text-neutral-900 relative">
              {/* Official Seal Watermark */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-45deg] pointer-events-none">
                 <h1 className="text-[60px] md:text-[120px] font-black">ROYAL FLATS</h1>
              </div>

              {/* Header */}
              <div className="flex justify-between items-start border-b-4 md:border-b-8 border-neutral-900 pb-6 md:pb-10 mb-8 md:mb-16">
                 <div>
                    <h1 className="text-2xl md:text-5xl font-serif font-black tracking-tighter uppercase text-neutral-900">Royal Flats</h1>
                    <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.5em] mt-2 md:mt-3 text-neutral-500">Executive Management Records</p>
                 </div>
                 <div className="text-right text-[8px] md:text-[10px] font-black uppercase tracking-widest text-neutral-500 space-y-0.5 md:space-y-1">
                    <p className="text-neutral-900">Issued: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p>Serial: RF-INT-{(Math.random() * 99999).toFixed(0)}</p>
                    <p>Origin: Nairobi Property Hub</p>
                 </div>
              </div>

              <div className="mb-8 md:mb-16">
                 <h2 className="text-xl md:text-3xl font-serif font-bold uppercase border-b-2 border-neutral-100 pb-3 md:pb-4 mb-6 md:mb-10 tracking-tight">{type.replace('_', ' ')} RECONCILIATION</h2>
                 
                 {type === 'FINANCIAL' && (
                    <div className="space-y-8 md:space-y-12">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10">
                          <div className="p-6 md:p-8 bg-neutral-50 rounded-2xl md:rounded-3xl border border-neutral-100">
                             <p className="text-[8px] md:text-[10px] font-black uppercase text-neutral-400 mb-1 md:mb-2 tracking-widest">Gross Yield Collected</p>
                             <p className="text-2xl md:text-4xl font-black tracking-tighter">KES {data.stats.totalCollected.toLocaleString()}</p>
                          </div>
                          <div className="p-6 md:p-8 bg-neutral-900 rounded-2xl md:rounded-3xl text-white">
                             <p className="text-[8px] md:text-[10px] font-black uppercase text-royal-400 mb-1 md:mb-2 tracking-widest">Net Revenue Position</p>
                             <p className="text-2xl md:text-4xl font-black tracking-tighter text-royal-500">KES {data.stats.netIncome.toLocaleString()}</p>
                          </div>
                       </div>
                       <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs md:text-sm border-collapse min-w-[400px]">
                            <thead>
                                <tr className="border-b-2 border-neutral-900"><th className="py-4 font-black uppercase tracking-widest text-[8px] md:text-[10px]">Date</th><th className="py-4 font-black uppercase tracking-widest text-[8px] md:text-[10px]">Narration</th><th className="py-4 text-right font-black uppercase tracking-widest text-[8px] md:text-[10px]">Amount</th></tr>
                            </thead>
                            <tbody className="divide-y border-b">
                                {data.payments.slice(0, 15).map((p: any) => (
                                    <tr key={p.id}><td className="py-4 md:py-5 font-bold text-neutral-500">{new Date(p.date).toLocaleDateString()}</td><td className="py-4 md:py-5 font-black">{p.type} <span class="text-[8px] md:text-[10px] text-neutral-300 ml-2">({p.reference})</span></td><td className="py-4 md:py-5 text-right font-black">KES {p.amount.toLocaleString()}</td></tr>
                                ))}
                            </tbody>
                        </table>
                       </div>
                    </div>
                 )}

                 {type === 'OCCUPANCY' && (
                    <div className="space-y-8 md:space-y-10">
                       <div className="grid grid-cols-3 gap-4 md:gap-10">
                          <div className="text-center p-4 md:p-6 border-x border-neutral-100">
                             <p className="text-2xl md:text-4xl font-black tracking-tighter">{data.houses.length}</p>
                             <p className="text-[8px] md:text-[9px] font-black uppercase text-neutral-400 mt-1 md:mt-2 tracking-widest">Global Inventory</p>
                          </div>
                          <div className="text-center p-4 md:p-6 border-x border-neutral-100">
                             <p className="text-2xl md:text-4xl font-black tracking-tighter">{data.tenants.length}</p>
                             <p className="text-[8px] md:text-[9px] font-black uppercase text-neutral-400 mt-1 md:mt-2 tracking-widest">Active Tenancy</p>
                          </div>
                          <div className="text-center p-4 md:p-6 border-x border-neutral-100">
                             <p className="text-2xl md:text-4xl font-black tracking-tighter">{((data.tenants.length / data.houses.length) * 100).toFixed(1)}%</p>
                             <p className="text-[8px] md:text-[9px] font-black uppercase text-neutral-400 mt-1 md:mt-2 tracking-widest">Portfolio Efficiency</p>
                          </div>
                       </div>
                       <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs md:text-sm border-t-2 border-neutral-100 min-w-[400px]">
                            <thead>
                                <tr className="border-b border-neutral-900"><th className="py-4 font-black uppercase text-[8px] md:text-[10px]">Suite</th><th className="py-4 font-black uppercase text-[8px] md:text-[10px]">Configuration</th><th className="py-4 font-black uppercase text-[8px] md:text-[10px]">Primary Resident</th><th className="py-4 text-right font-black uppercase text-[8px] md:text-[10px]">Status</th></tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.houses.map((h: any) => {
                                    const t = data.tenants.find((te: any) => te.houseNumber === h.houseNumber);
                                    return (
                                        <tr key={h.id}><td className="py-4 md:py-5 font-black text-base md:text-lg">{h.houseNumber}</td><td className="py-4 md:py-5 text-neutral-500">{h.type}</td><td className="py-4 md:py-5 font-bold">{t?.name || 'VACANT'}</td><td className="py-4 md:py-5 text-right font-black uppercase text-[8px] md:text-[10px] tracking-widest text-neutral-400">{h.status}</td></tr>
                                    );
                                })}
                            </tbody>
                        </table>
                       </div>
                    </div>
                 )}

                 {type === 'ARREARS' && (
                    <div className="space-y-8 md:space-y-10">
                       <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs md:text-sm min-w-[400px]">
                            <thead>
                                <tr className="bg-neutral-900 text-white"><th className="p-4 md:p-5 uppercase font-black tracking-widest text-[8px] md:text-[10px]">Suite</th><th className="p-4 md:p-5 uppercase font-black tracking-widest text-[8px] md:text-[10px]">Resident Narration</th><th className="p-4 md:p-5 uppercase font-black tracking-widest text-[8px] md:text-[10px] text-right">Debit Balance</th></tr>
                            </thead>
                            <tbody className="divide-y border-b">
                                {data.tenants.filter((t: any) => t.bills.total > 0).map((t: any) => (
                                    <tr key={t.id}><td className="p-4 md:p-5 font-black text-lg md:text-xl">{t.houseNumber}</td><td className="p-4 md:p-5 font-bold">{t.name} <span class="block text-[8px] md:text-[10px] text-neutral-400 uppercase mt-1">Status: {t.bills.status}</span></td><td className="p-4 md:p-5 text-right font-black text-red-600 text-lg md:text-xl tracking-tight">KES {t.bills.total.toLocaleString()}</td></tr>
                                ))}
                            </tbody>
                        </table>
                       </div>
                       <div class="p-6 md:p-8 bg-red-50 rounded-2xl md:rounded-3xl border border-red-100 flex items-center gap-4 md:gap-6">
                          <AlertTriangle class="text-red-500 shrink-0" size={24} className="md:w-8 md:h-8" />
                          <div>
                             <p class="font-black text-red-900 uppercase text-[10px] md:text-xs tracking-widest">Escalation Notice</p>
                             <p class="text-red-600 text-[10px] md:text-xs mt-1">The above units have surpassed the standard 5-day grace period. AI notifications have been dispatched.</p>
                          </div>
                       </div>
                    </div>
                 )}
              </div>

              {/* Signature Block */}
              <div className="mt-16 md:mt-24 pt-8 md:pt-12 border-t-2 border-neutral-100 flex justify-between items-start">
                 <div className="space-y-8 md:space-y-12">
                    <div>
                       <div className="w-32 md:w-48 h-px bg-neutral-900 mb-2"></div>
                       <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-neutral-400">Chief Managing Director</p>
                    </div>
                    <div>
                       <div className="w-32 md:w-48 h-px bg-neutral-900 mb-2"></div>
                       <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-neutral-400">Compliance Witness</p>
                    </div>
                 </div>
                 <div className="w-24 h-24 md:w-32 md:h-32 border-2 md:border-4 border-neutral-900 rounded-full flex flex-col items-center justify-center p-2 md:p-4 relative">
                    <span className="text-[8px] md:text-[11px] font-black text-center leading-none tracking-widest uppercase">Verified Performance</span>
                    <span className="text-[6px] md:text-[7px] text-neutral-400 absolute bottom-2 md:bottom-4 uppercase font-bold">Royal Flats Hub</span>
                 </div>
              </div>

              {/* Footer */}
              <div className="mt-12 md:mt-20 text-[6px] md:text-[8px] font-black text-neutral-300 uppercase tracking-[0.3em] md:tracking-[0.5em] text-center">
                 Automated Document System • Secured Property Intelligence • Royal Management Group
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const LandlordAddPropertyModal: React.FC<{ onClose: () => void, onSubmit: (h: House) => void }> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    propertyName: '',
    location: '',
    houseNumber: '',
    type: 'Studio' as any,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyName || !formData.houseNumber) return;

    const newHouse: House = {
      id: `h-${Date.now()}`,
      houseNumber: formData.houseNumber,
      propertyName: formData.propertyName,
      location: formData.location || 'Nairobi',
      type: formData.type,
      status: HouseStatus.VACANT,
      maintenanceStatus: MaintenanceStatus.NONE,
      lastVacantDate: new Date().toISOString().split('T')[0],
      repairs: [],
      totalEarnings: 0,
      tenantHistory: []
    };
    onSubmit(newHouse);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4 bg-slate-900/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-none md:rounded-3xl shadow-2xl flex flex-col h-full md:h-auto md:max-h-[90vh] overflow-hidden border border-slate-200">
         <div className="bg-royal-600 p-4 md:p-6 text-white flex justify-between items-center relative overflow-hidden shrink-0">
          <div>
            <h3 className="text-xl font-display font-black tracking-tight">Register Property & First Unit</h3>
            <p className="text-royal-100 text-[8px] font-black uppercase tracking-[0.2em] mt-1">New Estate Operations Setup</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all cursor-pointer"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 overflow-y-auto">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Name</label>
            <input 
              type="text" 
              placeholder="e.g. Palm Heights, Royal Flats" 
              value={formData.propertyName}
              onChange={(e) => setFormData({...formData, propertyName: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 pl-4 pr-4 py-3 rounded-xl text-xs font-bold focus:border-royal-500 outline-none transition-all"
              required 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</label>
            <input 
              type="text" 
              placeholder="e.g. Kilimani, Westlands, Kileleshwa" 
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 pl-4 pr-4 py-3 rounded-xl text-xs font-bold focus:border-royal-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Unit House Number</label>
            <input 
              type="text" 
              placeholder="e.g. A1, U1, 101" 
              value={formData.houseNumber}
              onChange={(e) => setFormData({...formData, houseNumber: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 pl-4 pr-4 py-3 rounded-xl text-xs font-bold focus:border-royal-500 outline-none transition-all"
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Configuration</label>
            <div className="grid grid-cols-2 gap-2">
              {['Studio', '1 Bedroom', '2 Bedroom', 'Penthouse'].map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setFormData({...formData, type: type as any})}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${formData.type === type ? 'bg-royal-50 border-royal-400 text-royal-600 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-royal-600 hover:bg-royal-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-royal-500/15 transition-all text-center mt-4 cursor-pointer">
            Initialize Property Grid
          </button>
        </form>
      </div>
    </div>
  );
};

const LandlordAddHouseModal: React.FC<{ properties: string[], onClose: () => void, onSubmit: (h: House) => void }> = ({ properties, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    houseNumber: '',
    propertyName: properties[0] || 'Unknown Property',
    type: 'Studio' as any,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.houseNumber || !formData.propertyName) return;

    const newHouse: House = {
      id: `h-${Date.now()}`,
      houseNumber: formData.houseNumber,
      propertyName: formData.propertyName,
      location: 'Nairobi',
      type: formData.type,
      status: HouseStatus.VACANT,
      maintenanceStatus: MaintenanceStatus.NONE,
      lastVacantDate: new Date().toISOString().split('T')[0],
      repairs: [],
      totalEarnings: 0,
      tenantHistory: []
    };
    onSubmit(newHouse);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4 bg-slate-900/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-none md:rounded-3xl shadow-2xl flex flex-col h-full md:h-auto md:max-h-[90vh] overflow-hidden border border-slate-200">
        <div className="bg-royal-600 p-4 md:p-6 text-white flex justify-between items-center relative overflow-hidden shrink-0">
          <div>
            <h3 className="text-xl font-display font-black tracking-tight">Expand Property Index</h3>
            <p className="text-royal-100 text-[8px] font-black uppercase tracking-[0.2em] mt-1">Add Unit to Asset Directory</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all cursor-pointer"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 overflow-y-auto">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Target Property</label>
            <select 
              value={formData.propertyName}
              onChange={(e) => setFormData({...formData, propertyName: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 pl-4 pr-10 py-3 rounded-xl text-xs font-bold text-slate-700 focus:border-royal-500 outline-none transition-all appearance-none"
            >
              {properties.map((prop) => (
                <option key={prop} value={prop}>{prop}</option>
              ))}
              {properties.length === 0 && <option value="Portfolio Asset">Portfolio Asset</option>}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit House Number</label>
            <input 
              type="text" 
              placeholder="e.g. C10, Ground Floor 2" 
              value={formData.houseNumber}
              onChange={(e) => setFormData({...formData, houseNumber: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 pl-4 pr-4 py-3 rounded-xl text-xs font-bold focus:border-royal-500 outline-none transition-all"
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Configuration</label>
            <div className="grid grid-cols-2 gap-2">
              {['Studio', '1 Bedroom', '2 Bedroom', 'Penthouse'].map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setFormData({...formData, type: type as any})}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${formData.type === type ? 'bg-royal-50 border-royal-400 text-royal-600 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-royal-600 hover:bg-royal-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-royal-500/15 transition-all text-center mt-4 cursor-pointer">
            Register Asset Unit
          </button>
        </form>
      </div>
    </div>
  );
};
