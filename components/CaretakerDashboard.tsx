import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tenant, House, HouseStatus, MaintenanceStatus, PaymentRecord, Repair, MeterReading, RentAgreement } from '../types';
import { 
  UserPlus, Droplets, Send, Wrench, RefreshCw, X, User, Phone, Mail, 
  Hash, Home, CheckCircle2, CircleDashed, Hammer, Users, AlertTriangle, Clock, 
  History, DollarSign, Activity, Eye, Search, MapPin, ArrowRight, ArrowLeft, Save, Smartphone, Bell,
  Receipt, Calendar, ChevronRight, Filter, RotateCcw, Check, ShieldCheck, CreditCard, Landmark,
  FileText, TrendingUp, MoreHorizontal, BellRing, UserCheck, Wallet, Edit3, Plus,
  ChevronDown, ArrowUp, Zap, FilePenLine, Signature, Printer, AlertOctagon, Briefcase, Settings2, Layers, FileJson, Trash2
} from 'lucide-react';
import { generateTenantNotification, analyzeTenantFinancials } from '../services/geminiService';

interface Props {
  tenants: Tenant[];
  houses: House[];
  payments: PaymentRecord[];
  onAddTenant: (t: Tenant) => void;
  onAddHouse: (h: House) => void;
  onUpdateTenant: (t: Tenant) => void;
  onUpdateBills: (id: string, currentReading: number) => void;
  onBulkUpdateBills?: (readings: Record<string, number>) => void;
  onUpdateHouse: (id: string, status: HouseStatus, maintenanceStatus: MaintenanceStatus, repair?: Repair) => void;
  onLogPayment?: (payment: PaymentRecord) => void;
  onAddGeneralMaintenance?: (repair: any) => void;
  activeTab?: string;
  selectedPropertyName: string | null;
  setSelectedPropertyName: (name: string | null) => void;
  isManagingFullProperty: boolean;
  setIsManagingFullProperty: (manage: boolean) => void;
}

export const CaretakerDashboard: React.FC<Props> = ({ 
  tenants, houses, payments, onAddTenant, onAddHouse, onUpdateTenant, onUpdateBills, onBulkUpdateBills, onUpdateHouse, onLogPayment,
  onAddGeneralMaintenance, activeTab: propTab,
  selectedPropertyName, setSelectedPropertyName, isManagingFullProperty, setIsManagingFullProperty
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'tenants' | 'billing' | 'more' | 'water-meters'>('properties');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddHouseModal, setShowAddHouseModal] = useState(false);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogPaymentModal, setShowLogPaymentModal] = useState(false);
  const [paymentTenantId, setPaymentTenantId] = useState<string>('');
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
    waterTariff: 150,
    lateFeeGraceDays: 5,
    mpesaPaybill: "247247",
    fineAmount: 1000,
  });

  const [staffList, setStaffList] = useState([
    { id: 'STF01', name: 'James Omondi', role: 'Operations Assistant', phone: '+254 712 345 678', status: 'On Duty' as const },
    { id: 'STF02', name: 'Sarah Cherono', role: 'Support & Helpdesk', phone: '+254 723 456 789', status: 'On Duty' as const },
    { id: 'STF03', name: 'David Mwangi', role: 'Electrician & Services', phone: '+254 734 567 890', status: 'Off Duty' as const },
    { id: 'STF04', name: 'Alice Wambua', role: 'Plumbing & Water Ops', phone: '+254 745 678 901', status: 'On Duty' as const }
  ]);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [bulkNotifying, setBulkNotifying] = useState(false);
  const [updatedTenantIds, setUpdatedTenantIds] = useState<Set<string>>(new Set());
  
  const [pendingReadings, setPendingReadings] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantPaymentFilter, setTenantPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [activeNotifyMenu, setActiveNotifyMenu] = useState<string | null>(null);

  const [waterSearchQuery, setWaterSearchQuery] = useState('');
  const [waterFilterStatus, setWaterFilterStatus] = useState<'all' | 'pending' | 'updated'>('all');
  const [selectedWaterProperty, setSelectedWaterProperty] = useState<string>('All');
  const [unitWaterInputs, setUnitWaterInputs] = useState<Record<string, string>>({});
  const [isWaterSessionOpen, setIsWaterSessionOpen] = useState(false);
  const [waterSessIdx, setWaterSessIdx] = useState(0);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const [propSearchQuery, setPropSearchQuery] = useState('');
  const [propFilterTab, setPropFilterTab] = useState<'All' | 'Occupied' | 'Vacant' | 'Paid' | 'Pending' | 'Partial' | 'Late'>('All');

  const allWaterLogs = useMemo(() => {
    const list: { tenantName: string; houseNumber: string; date: string; reading: number; unitsConsumed: number; cost: number; id: string }[] = [];
    tenants.forEach(t => {
      (t.meterReadings || []).forEach(mr => {
        list.push({
          tenantName: t.name,
          houseNumber: t.houseNumber,
          ...mr
        });
      });
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tenants]);

  const [billFilterType, setBillFilterType] = useState<string>('ALL');
  const [billFilterMethod, setBillFilterMethod] = useState<string>('ALL');
  const [billStartDate, setBillStartDate] = useState<string>('');
  const [billEndDate, setBillEndDate] = useState<string>('');

  // Overdue Logic: If day is past grace day and status is not PAID
  const currentDay = new Date().getDate();
  const isOverdue = (tenant: Tenant) => (currentDay > siteSettings.lateFeeGraceDays || tenant.bills.total > 50000) && tenant.bills.status !== 'PAID' && tenant.bills.total > 0;

  const overdueTenants = useMemo(() => tenants.filter(isOverdue), [tenants]);

  const lateTenants = useMemo(() => {
    return tenants.filter(t => {
      if (isManagingFullProperty && selectedPropertyName) {
        const house = houses.find(h => h.houseNumber === t.houseNumber);
        if (!house || house.propertyName !== selectedPropertyName) return false;
      }
      return t.bills.status !== 'PAID' && t.bills.total > 0;
    });
  }, [tenants, houses, isManagingFullProperty, selectedPropertyName]);

  const summaryStats = useMemo(() => {
    const pending = tenants.reduce((acc, t) => acc + t.bills.total, 0);
    const collected = payments.reduce((acc, p) => {
      const pDate = new Date(p.date);
      const now = new Date();
      if (pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear()) {
        return acc + p.amount;
      }
      return acc;
    }, 0);
    return { pending, collected, total: pending + collected };
  }, [tenants, payments]);

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      if (isManagingFullProperty && selectedPropertyName) {
        const house = houses.find(h => h.houseNumber === t.houseNumber);
        if (!house || house.propertyName !== selectedPropertyName) return false;
      }
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.houseNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = tenantPaymentFilter === 'all' || 
                            (tenantPaymentFilter === 'paid' && t.bills.status === 'PAID') ||
                            (tenantPaymentFilter === 'unpaid' && t.bills.status !== 'PAID');
      return matchesSearch && matchesFilter;
    }).sort((a, b) => a.houseNumber.localeCompare(b.houseNumber));
  }, [tenants, houses, searchQuery, tenantPaymentFilter, isManagingFullProperty, selectedPropertyName]);

  useEffect(() => {
    if (propTab) {
      if (propTab === 'dashboard' || propTab === 'overview') setActiveTab('properties');
      else if (propTab === 'houses' || propTab === 'properties') setActiveTab('properties');
      else if (propTab === 'water-meters') setActiveTab('water-meters');
      else if (propTab === 'tenants') setActiveTab('tenants');
      else if (propTab === 'billing' || propTab === 'payments') setActiveTab('billing');
      else if (propTab === 'more') setActiveTab('more');
    }
  }, [propTab]);

  const filteredCollections = useMemo(() => {
    return payments.filter(p => {
      if (isManagingFullProperty && selectedPropertyName) {
        const tenant = tenants.find(t => t.id === p.tenantId);
        const house = tenant ? houses.find(h => h.houseNumber === tenant.houseNumber) : null;
        if (!house || house.propertyName !== selectedPropertyName) return false;
      }
      const matchesType = billFilterType === 'ALL' || p.type === billFilterType;
      const matchesMethod = billFilterMethod === 'ALL' || p.method === billFilterMethod;
      const paymentDate = new Date(p.date).getTime();
      const start = billStartDate ? new Date(billStartDate).getTime() : 0;
      const end = billEndDate ? new Date(billEndDate).getTime() : Infinity;
      const matchesDate = paymentDate >= start && paymentDate <= (end + 86400000);
      return matchesType && matchesMethod && matchesDate;
    });
  }, [payments, tenants, houses, billFilterType, billFilterMethod, billStartDate, billEndDate, isManagingFullProperty, selectedPropertyName]);

  const meteringTenants = useMemo(() => {
    return tenants.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.houseNumber.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.houseNumber.localeCompare(b.houseNumber));
  }, [tenants, searchQuery]);

  const housesByProperty: Record<string, House[]> = useMemo(() => {
    return houses.reduce((acc, house) => {
      const prop = house.propertyName || 'Uncategorized Asset';
      if (!acc[prop]) acc[prop] = [];
      acc[prop].push(house);
      return acc;
    }, {} as Record<string, House[]>);
  }, [houses]);

  const propertiesStats = useMemo(() => {
    const stats: { 
      name: string; 
      location: string; 
      totalUnits: number; 
      occupiedUnits: number; 
      vacantUnits: number; 
      expectedRevenue: number; 
      pendingRevenue: number;
      houses: House[] 
    }[] = [];

    Object.entries(housesByProperty).forEach(([name, pHouses]) => {
      let expected = 0;
      let pending = 0;
      let occupied = 0;
      let vacant = 0;

      pHouses.forEach(h => {
        if (h.status === HouseStatus.RENTED) occupied++;
        if (h.status === HouseStatus.VACANT) vacant++;
        
        const tenant = tenants.find(t => t.houseNumber === h.houseNumber);
        if (tenant) {
          expected += tenant.bills.total;
          if (tenant.bills.status !== 'PAID') {
            pending += tenant.bills.total;
          }
        }
      });

      stats.push({
        name,
        location: pHouses[0]?.location || 'Kawangware',
        totalUnits: pHouses.length,
        occupiedUnits: occupied,
        vacantUnits: vacant,
        expectedRevenue: expected,
        pendingRevenue: pending,
        houses: pHouses
      });
    });

    return stats;
  }, [housesByProperty, tenants]);

  const waterFilteredTenants = useMemo(() => {
    const currentProp = selectedPropertyName || propertiesStats[0]?.name;
    const propHouses = houses.filter(h => h.propertyName === currentProp).map(h => h.houseNumber);

    return tenants.filter(t => {
      const inProp = propHouses.includes(t.houseNumber);
      if (!inProp) return false;

      const matchesSearch = t.name.toLowerCase().includes(waterSearchQuery.toLowerCase()) || 
                            t.houseNumber.toLowerCase().includes(waterSearchQuery.toLowerCase());
      
      const isUpdated = updatedTenantIds.has(t.id);
      const matchesFilter = waterFilterStatus === 'all' ||
                            (waterFilterStatus === 'pending' && !isUpdated) ||
                            (waterFilterStatus === 'updated' && isUpdated);
      return matchesSearch && matchesFilter;
    }).sort((a, b) => a.houseNumber.localeCompare(b.houseNumber));
  }, [tenants, houses, waterSearchQuery, waterFilterStatus, updatedTenantIds, selectedPropertyName, propertiesStats]);

  const hasInvalidReadings = useMemo(() => {
    return Object.entries(pendingReadings).some(([id, val]) => {
      const tenant = tenants.find(t => t.id === id);
      return tenant && val < tenant.bills.currWaterReading;
    });
  }, [pendingReadings, tenants]);

  const handleSendReminder = async (tenant: Tenant, method: 'whatsapp' | 'sms' = 'sms') => {
    setLoadingAI(tenant.id);
    setActiveNotifyMenu(null);
    try {
      const message = await generateTenantNotification(tenant.name, tenant.bills.total);
      const methodLabel = method === 'whatsapp' ? 'WhatsApp' : 'SMS';
      alert(`AI Reminder (${methodLabel}) for ${tenant.name}:\n\n"${message}"\n\nNotification sent to ${tenant.phoneNumber}`);
    } catch (err) { console.error(err); }
    finally { setLoadingAI(null); }
  };

  const handleNotifyAllOverdue = async () => {
    if (overdueTenants.length === 0) return;
    setBulkNotifying(true);
    try {
      // Simulate sequential AI processing
      for (const t of overdueTenants) {
        await generateTenantNotification(t.name, t.bills.total);
      }
      alert(`Successfully dispatched AI reminders to all ${overdueTenants.length} overdue residents.`);
    } catch (err) { console.error(err); }
    finally { setBulkNotifying(false); }
  };

  const handleNotifyAllLate = async () => {
    if (lateTenants.length === 0) return;
    setBulkNotifying(true);
    try {
      // Simulate sequential AI processing
      for (const t of lateTenants) {
        await generateTenantNotification(t.name, t.bills.total);
      }
      alert(`Successfully generated and dispatched AI rent reminders to all ${lateTenants.length} late residents.`);
    } catch (err) { console.error(err); }
    finally { setBulkNotifying(false); }
  };

  const handleExportFinancialJSON = () => {
    try {
      const reportData = {
        reportName: "Royal Flats Financial & Billing Summary Report",
        generatedAt: new Date().toISOString(),
        localTime: "2026-06-20T06:37:49-07:00",
        portfolioSummary: {
          totalExpectedRentAndBills: summaryStats.total,
          totalCollectedAmount: summaryStats.collected,
          totalPendingBalance: summaryStats.pending,
          occupancyRate: `${Math.round((houses.filter(h => h.status === HouseStatus.RENTED).length / houses.length) * 100)}%`
        },
        financialRecords: tenants.map(t => {
          const tenantPayments = payments.filter(p => p.tenantId === t.id);
          const houseInfo = houses.find(h => h.houseNumber === t.houseNumber);
          return {
            tenantId: t.id,
            residentName: t.name,
            houseNumber: t.houseNumber,
            propertyName: houseInfo?.propertyName || 'N/A',
            phoneNumber: t.phoneNumber,
            email: t.email,
            joinDate: t.joinDate,
            rentAgreement: t.rentAgreement ? {
              startDate: t.rentAgreement.startDate,
              depositAmount: t.rentAgreement.depositAmount,
              depositStatus: t.rentAgreement.depositStatus,
              status: t.rentAgreement.status
            } : null,
            billingSummary: {
              rentStatus: t.bills.status,
              rentAmount: t.bills.rent,
              waterAmount: t.bills.water,
              previousWaterReading: t.bills.prevWaterReading,
              currentWaterReading: t.bills.currWaterReading,
              garbageAmount: t.bills.garbage,
              totalBillsAmount: t.bills.total
            },
            paymentHistory: tenantPayments.map(p => ({
              paymentId: p.id,
              date: p.date,
              amount: p.amount,
              paymentType: p.type,
              reference: p.reference,
              method: p.method
            }))
          };
        })
      };

      const jsonStr = JSON.stringify(reportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `royal_flats_financial_report_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate JSON report');
    }
  };

  const handleApplyUpdate = (tenantId: string) => {
    const reading = pendingReadings[tenantId];
    const tenant = tenants.find(t => t.id === tenantId);
    if (reading === undefined || !tenant) return;
    
    if (reading < tenant.bills.currWaterReading) {
      alert(`Error: New reading for ${tenant.name} cannot be less than the current reading of ${tenant.bills.currWaterReading}.`);
      return;
    }

    onUpdateBills(tenantId, reading);
    setUpdatedTenantIds(prev => new Set(prev).add(tenantId));
    setPendingReadings(prev => {
      const next = { ...prev };
      delete next[tenantId];
      return next;
    });
    setTimeout(() => {
      setUpdatedTenantIds(prev => {
        const next = new Set(prev);
        next.delete(tenantId);
        return next;
      });
    }, 2000);
  };

  const handleCommitAllReadings = () => {
    if (hasInvalidReadings) {
      alert("Some readings are invalid. Please correct entries highlighted in red before committing.");
      return;
    }

    if (onBulkUpdateBills) {
      onBulkUpdateBills(pendingReadings);
      const affectedIds = Object.keys(pendingReadings);
      setUpdatedTenantIds(new Set(affectedIds));
      setPendingReadings({});
      setTimeout(() => setUpdatedTenantIds(new Set()), 2000);
    } else {
      Object.keys(pendingReadings).forEach(id => handleApplyUpdate(id));
    }
  };

  const handleEditClick = (tenant: Tenant) => {
    setTenantToEdit(tenant);
    setShowEditModal(true);
  };

  const handleManualPayment = (payment: PaymentRecord) => {
    if (onLogPayment) {
      onLogPayment(payment);
      setShowLogPaymentModal(false);
      setPaymentTenantId('');
    }
  };

  const handleGeneralMaintenance = (repair: any) => {
    if (onAddGeneralMaintenance) {
      onAddGeneralMaintenance(repair);
    } else if (repair.houseId && repair.houseId !== 'common') {
      const targetHouse = houses.find(h => h.id === repair.houseId);
      onUpdateHouse(repair.houseId, targetHouse?.status || HouseStatus.VACANT, MaintenanceStatus.UNDER_REPAIR, {
        id: repair.id,
        date: repair.date,
        description: repair.description,
        cost: repair.cost,
        category: repair.category
      });
    }
    setShowMaintenanceModal(false);
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-fadeIn pb-12">
      {/* Dynamic local notification toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-[200] max-w-sm bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slideUp">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${notification.type === 'success' ? 'bg-emerald-500 animate-ping' : notification.type === 'error' ? 'bg-rose-500' : 'bg-cyan-500'}`} />
          <p className="text-xs font-bold leading-tight">{notification.message}</p>
        </div>
      )}
      {/* Modals and Overlays */}
      {showAddModal && (
        <AddTenantModal 
          houses={houses} 
          onClose={() => setShowAddModal(false)} 
          onSubmit={(tenant) => {
            onAddTenant(tenant);
            setShowAddModal(false);
          }} 
        />
      )}
      {showAddHouseModal && (() => {
        const currentProp = selectedPropertyName || propertiesStats[0]?.name;
        const stats = propertiesStats.find(s => s.name === currentProp);
        return (
          <AddHouseModal 
            defaultPropertyName={isManagingFullProperty ? currentProp : ''}
            defaultLocation={isManagingFullProperty ? (stats?.location || '') : ''}
            onClose={() => setShowAddHouseModal(false)} 
            onSubmit={(house) => {
              onAddHouse(house);
              setShowAddHouseModal(false);
            }} 
          />
        );
      })()}
      {showAddPropertyModal && (
        <AddPropertyModal 
          onClose={() => setShowAddPropertyModal(false)}
          onSubmit={(house) => {
            onAddHouse(house);
            if (house.propertyName) {
              setSelectedPropertyName(house.propertyName);
              setIsManagingFullProperty(false);
            }
            setShowAddPropertyModal(false);
          }}
        />
      )}
      {showLogPaymentModal && <LogPaymentModal tenants={tenants} initialTenantId={paymentTenantId} onClose={() => { setShowLogPaymentModal(false); setPaymentTenantId(''); }} onSubmit={handleManualPayment} />}
      {showMaintenanceModal && <LogGeneralMaintenanceModal houses={houses} onClose={() => setShowMaintenanceModal(false)} onSubmit={handleGeneralMaintenance} />}
      {showSettingsModal && (
        <SiteSettingsModal
          settings={siteSettings}
          onClose={() => setShowSettingsModal(false)}
          onSave={(newSettings) => {
            setSiteSettings(newSettings);
            setShowSettingsModal(false);
          }}
        />
      )}
      {showStaffModal && (
        <StaffRegistryModal
          staff={staffList}
          onClose={() => setShowStaffModal(false)}
          onUpdateStaff={setStaffList}
        />
      )}
      {showEditModal && tenantToEdit && (
        <EditTenantModal 
          tenant={tenantToEdit} 
          onClose={() => { setShowEditModal(false); setTenantToEdit(null); }} 
          onSubmit={(updated) => { 
            onUpdateTenant(updated); 
            setShowEditModal(false); 
            setTenantToEdit(null);
            if (selectedTenant && selectedTenant.id === updated.id) {
               setSelectedTenant(updated);
            }
          }} 
        />
      )}
      {selectedHouse && (
        <HouseDetailModal 
          house={selectedHouse} 
          onClose={() => setSelectedHouse(null)} 
          onUpdateStatus={(status, maintenance, repair) => {
            onUpdateHouse(selectedHouse.id, status, maintenance, repair);
            setSelectedHouse({...selectedHouse, status, maintenanceStatus: maintenance, repairs: repair ? [repair, ...selectedHouse.repairs] : selectedHouse.repairs});
          }}
          currentTenant={tenants.find(t => t.houseNumber === selectedHouse.houseNumber)} 
          onViewTenant={(t) => {
            setSelectedHouse(null);
            setSelectedTenant(t);
          }}
        />
      )}
      {selectedTenant && (
        <TenantIntelligenceModal 
          tenant={selectedTenant} 
          payments={payments.filter(p => p.tenantId === selectedTenant.id)} 
          onClose={() => setSelectedTenant(null)} 
          onNotify={() => handleSendReminder(selectedTenant)} 
          onEdit={() => handleEditClick(selectedTenant)} 
        />
      )}

      {/* Removed Operational Command Header and Tab Switcher */}


      {activeTab === 'properties' && (
        <div className="animate-fadeIn pb-24">
          {/* Header & Prominent Add Action */}
          {!isManagingFullProperty && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm animate-fadeIn">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl md:text-5xl font-display font-black text-slate-900 tracking-tight">Properties Overview</h2>
                <p className="text-slate-400 text-xs md:text-sm font-medium">Select a property below to manage unit-level details, utilities, and billing.</p>
              </div>
              <button 
                onClick={() => setShowAddPropertyModal(true)}
                className="w-full md:w-auto bg-royal-600 hover:bg-royal-700 text-white px-8 py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-royal-500/20 transition-all active:scale-95"
              >
                <Plus size={16}/> Add New Property
              </button>
            </div>
          )}

          {/* Property Selector Row */}
          {!isManagingFullProperty && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-12 w-full">
              {propertiesStats.map((property) => {
                const isActive = (selectedPropertyName === property.name) || (!selectedPropertyName && property.name === propertiesStats[0]?.name);
                return (
                  <motion.button
                    key={property.name}
                    onClick={() => {
                      setSelectedPropertyName(property.name);
                      setIsManagingFullProperty(false);
                    }}
                    whileHover={{ y: -2 }}
                    className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all border text-left ${
                      isActive 
                      ? 'bg-royal-600 border-royal-400 text-white shadow-xl shadow-royal-500/30 ring-4 ring-royal-500/10' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-royal-200 shadow-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 ${isActive ? 'bg-royal-400' : 'bg-slate-50'}`}>
                      <Landmark size={24} />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <h3 className={`text-base font-display font-black tracking-tight truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>{property.name}</h3>
                      <p className={`text-[9px] font-black uppercase tracking-widest mt-1 leading-relaxed ${isActive ? 'text-royal-100' : 'text-slate-400'}`}>
                        {property.location} <span className="opacity-40">•</span> {property.occupiedUnits}/{property.totalUnits} Occ <span className="opacity-40">•</span> KES {property.pendingRevenue.toLocaleString()} Due
                      </p>
                    </div>
                  </motion.button>
                );
              })}

              <motion.button
                onClick={() => setShowAddPropertyModal(true)}
                whileHover={{ y: -2 }}
                className="w-full flex items-center gap-4 p-5 rounded-3xl transition-all border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100 hover:border-royal-400 text-slate-500 shadow-sm text-left"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 text-royal-500 shrink-0">
                  <Plus size={24} />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <h3 className="text-base font-display font-black tracking-tight text-slate-800">Add Property</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
                    Register a new property/estate
                  </p>
                </div>
              </motion.button>
            </div>
          )}

          {/* Detailed View Area */}
          {(() => {
            const currentProp = selectedPropertyName || propertiesStats[0]?.name;
            const stats = propertiesStats.find(s => s.name === currentProp);
            if (!stats) return (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <Landmark size={64} className="mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-[0.3em]">Select a property to view dashboard</p>
              </div>
            );

            if (isManagingFullProperty) {
              const filteredHouses = stats.houses.filter(house => {
                const tenant = tenants.find(t => t.houseNumber === house.houseNumber);
                
                // Match Search Query
                const searchLower = propSearchQuery.toLowerCase();
                const matchesSearch = 
                  house.houseNumber.toLowerCase().includes(searchLower) ||
                  (tenant && tenant.name.toLowerCase().includes(searchLower));
                
                if (!matchesSearch) return false;

                // Match Filter Tab
                if (propFilterTab === 'All') return true;
                if (propFilterTab === 'Occupied') return house.status === HouseStatus.RENTED;
                if (propFilterTab === 'Vacant') return house.status === HouseStatus.VACANT;
                
                if (!tenant) return false;
                const isPaid = tenant.bills.status === 'PAID';
                const isPartial = tenant.bills.status === 'PARTIAL';
                const isLate = tenant.bills.status === 'OVERDUE' || (tenant.bills.total > 0 && new Date().getDate() > 5);

                if (propFilterTab === 'Paid') return isPaid;
                if (propFilterTab === 'Pending') return !isPaid || tenant.bills.total > 0;
                if (propFilterTab === 'Partial') return isPartial;
                if (propFilterTab === 'Late') return isLate;
                
                return true;
              });

              return (
                <div className="space-y-8 animate-fadeIn">
                  {/* Back button */}
                  <div className="flex justify-between items-center bg-white px-8 py-5 rounded-[24px] border border-slate-100 shadow-sm">
                    <motion.button 
                      onClick={() => setIsManagingFullProperty(false)}
                      whileHover={{ x: -4 }}
                      className="flex items-center gap-2 text-slate-500 hover:text-royal-500 text-xs font-black uppercase tracking-widest transition-all"
                    >
                      <ArrowLeft size={18} /> Back to Property Overview
                    </motion.button>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{currentProp} Operations Console</span>
                  </div>

                  {/* Units lists */}
                  <div className="space-y-8 bg-white border border-slate-100 rounded-[32px] md:rounded-[48px] p-6 md:p-10 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                      <div>
                        <h2 className="text-3xl font-display font-black text-slate-900 tracking-tighter">{currentProp} Unit Bills</h2>
                        <p className="text-xs text-slate-400 font-medium max-w-md mt-2">Track rent, water, garbage, paid amount, balance, and payment status per unit</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="relative w-full sm:w-80">
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Search unit or tenant" 
                            value={propSearchQuery}
                            onChange={(e) => setPropSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 pl-11 pr-4 py-3 rounded-2xl text-xs font-bold focus:border-royal-500 outline-none transition-all"
                          />
                        </div>
                        <button
                          onClick={() => setShowAddHouseModal(true)}
                          className="w-full sm:w-auto bg-royal-600 hover:bg-royal-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-royal-500/20 transition-all active:scale-95 cursor-pointer"
                        >
                          <Plus size={16}/> Add Unit
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {(['All', 'Occupied', 'Vacant', 'Paid', 'Pending', 'Partial', 'Late'] as const).map((f) => (
                        <button 
                          key={f} 
                          onClick={() => setPropFilterTab(f)}
                          className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${propFilterTab === f ? 'bg-royal-650 text-white shadow-xl shadow-royal-500/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-6">
                      {filteredHouses.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                          <p className="text-xs font-black uppercase tracking-widest">No units match Search or Filters.</p>
                        </div>
                      ) : (
                        filteredHouses.map(house => (
                          <DetailedUnitCard 
                            key={house.id} 
                            house={house} 
                            tenant={tenants.find(t => t.houseNumber === house.houseNumber)}
                            payments={payments}
                            onView={() => setSelectedHouse(house)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-12 animate-fadeIn">
                {/* Manage Full Property Header Trigger */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">Interactive Unit Bills Ledger</h3>
                    <p className="text-xs text-slate-400 font-medium max-w-xl mt-1">Track comprehensive rent, water, and garbage bills with automatic overdue highlights and status checks for all {currentProp} units.</p>
                  </div>
                  <motion.button 
                    onClick={() => setIsManagingFullProperty(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto px-8 py-4 bg-royal-600 hover:bg-royal-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-royal-500/20 transition-all flex items-center justify-center gap-2 group whitespace-nowrap"
                  >
                    Manage Full Property <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm group">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 text-slate-400 group-hover:bg-royal-500 group-hover:text-white transition-all">
                      <Receipt size={24} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Billed</p>
                    <p className="font-display font-black text-2xl text-slate-900 tracking-tight">KES {stats.expectedRevenue.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-2">Rent + water + garbage</p>
                  </div>
                  
                  <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm group">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <CheckCircle2 size={24} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
                    <p className="font-display font-black text-2xl text-slate-900 tracking-tight">KES {(stats.expectedRevenue - stats.pendingRevenue).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-2">Collected this month</p>
                  </div>

                  <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm group">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                      <AlertTriangle size={24} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
                    <p className="font-display font-black text-2xl text-slate-900 tracking-tight">KES {stats.pendingRevenue.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-2">{tenants.filter(t => t.propertyName === currentProp && t.bills.status !== 'PAID').length} units need follow up</p>
                  </div>

                  <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm group">
                    <div className="w-12 h-12 bg-royal-50 rounded-2xl flex items-center justify-center mb-6 text-royal-500 group-hover:bg-royal-500 group-hover:text-white transition-all">
                      <Droplets size={24} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Water Usage</p>
                    <p className="font-display font-black text-2xl text-slate-900 tracking-tight">55 Units</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-2">KES 6,600 billed</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                  {/* Left Column Snapshot and Water summary */}
                  <div className="space-y-8">
                     {/* Property Snapshot */}
                     <div className="bg-white p-8 rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">Property Snapshot</h3>
                          <span className="bg-rose-100 text-rose-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Issues</span>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest -mt-4">{stats.location}</p>

                        <div className="space-y-6">
                           <div className="space-y-3">
                              <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                                <span className="text-slate-900">Occupancy Rate</span>
                                <span className="text-slate-900">{Math.round((stats.occupiedUnits/stats.totalUnits)*100)}%</span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-royal-500 rounded-full" style={{ width: `${(stats.occupiedUnits/stats.totalUnits)*100}%` }} />
                              </div>
                           </div>
                           <div className="space-y-3">
                              <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                                <span className="text-slate-900">Collection Health</span>
                                <span className="text-slate-900">{Math.round(((stats.expectedRevenue - stats.pendingRevenue)/stats.expectedRevenue)*100)}%</span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-royal-500 rounded-full" style={{ width: `${((stats.expectedRevenue - stats.pendingRevenue)/stats.expectedRevenue)*100}%` }} />
                              </div>
                           </div>
                           <div className="space-y-3">
                              <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                                <span className="text-slate-900">Water Reading Coverage</span>
                                <span className="text-slate-900">67%</span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-royal-500 rounded-full" style={{ width: '67%' }} />
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Water Summary */}
                     <div className="bg-white p-8 rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">Water Summary</h3>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center py-4 border-b border-slate-50">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Usage</span>
                              <span className="text-base font-black text-slate-900">55 units</span>
                           </div>
                           <div className="flex justify-between items-center py-4 border-b border-slate-50">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Water Charges</span>
                              <span className="text-base font-black text-slate-900">KES 6,600</span>
                           </div>
                           <div className="flex justify-between items-center py-4">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg. Usage / Unit</span>
                              <span className="text-base font-black text-slate-900">18 units</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Right Column Bills & Alerts */}
                  <div className="space-y-8">
                     <div className="bg-white p-8 rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-sm space-y-8">
                        <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">Current Bills</h3>
                        
                        <div className="space-y-10">
                           {/* Rent section */}
                           <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-base font-black text-slate-900">Rent</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">81% paid</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Billed</p>
                                  <p className="text-sm font-black text-slate-900">KES 24,200</p>
                                </div>
                                <div className="space-y-2 text-right">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Paid</p>
                                  <p className="text-sm font-black text-emerald-600">KES 19,500</p>
                                </div>
                              </div>
                              <div className="flex justify-between text-rose-500 text-[10px] font-black uppercase tracking-widest pt-2 border-t border-slate-50">
                                <span>Balance</span>
                                <span>KES 4,700</span>
                              </div>
                           </div>

                           {/* Water section */}
                           <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-base font-black text-slate-900">Water</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">51% paid</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Billed</p>
                                  <p className="text-sm font-black text-slate-900">KES 6,600</p>
                                </div>
                                <div className="space-y-2 text-right">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Paid</p>
                                  <p className="text-sm font-black text-emerald-600">KES 3,360</p>
                                </div>
                              </div>
                              <div className="flex justify-between text-rose-500 text-[10px] font-black uppercase tracking-widest pt-2 border-t border-slate-50">
                                <span>Balance</span>
                                <span>KES 3,240</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Alerts Sidebar */}
                     <div className="bg-white p-8 rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">Alerts</h3>
                        <div className="space-y-3">
                           <div className="flex items-center gap-4 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                              <div className="text-rose-500"><AlertTriangle size={18}/></div>
                              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">KES 8,440 total outstanding</span>
                           </div>
                           <div className="flex items-center gap-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                              <div className="text-amber-500"><AlertTriangle size={18}/></div>
                              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">1 unit has late bills</span>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'tenants' && (
        <div className="bg-white rounded-3xl md:rounded-6xl border border-slate-200 shadow-premium overflow-hidden animate-slideUp">
          <div className="p-6 md:p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/30">
             <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button 
                    onClick={() => setTenantPaymentFilter('all')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tenantPaymentFilter === 'all' ? 'bg-white text-royal-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setTenantPaymentFilter('paid')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tenantPaymentFilter === 'paid' ? 'bg-white text-royal-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Paid
                  </button>
                  <button 
                    onClick={() => setTenantPaymentFilter('unpaid')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${tenantPaymentFilter === 'unpaid' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Unpaid <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                  </button>
                </div>
             </div>
             <div className="relative flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-80">
                   <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                    type="text" 
                    placeholder="Search residents..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-6 py-3.5 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold outline-none focus:border-royal-500 transition-all shadow-sm" 
                   />
                </div>
                <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto bg-royal-500 text-white px-6 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-royal-600 transition-all shadow-xl shadow-royal-500/20 active:scale-95 whitespace-nowrap">
                   <UserPlus size={16}/> Register Resident
                </button>
             </div>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-50">
            {filteredTenants.map(t => {
              const tPayments = payments.filter(p => p.tenantId === t.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const lastPayment = tPayments[0];
              const overdue = isOverdue(t);

              return (
                <div key={t.id} className={`p-6 space-y-4 ${overdue ? 'bg-rose-50/20' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] ${overdue ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                        {t.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className={`font-black text-sm ${overdue ? 'text-rose-600' : 'text-slate-900'}`}>{t.name}</div>
                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5 mt-0.5"><Phone size={10}/> {t.phoneNumber}</div>
                      </div>
                    </div>
                    <span className={`font-black text-[10px] px-3 py-1.5 rounded-lg border ${overdue ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{t.houseNumber}</span>
                  </div>
                  
                  <div className="flex justify-between items-end pt-2">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Settlement Status</p>
                      <BillStatusBadge status={t.bills.status} />
                    </div>
                    <div className="flex gap-2 relative">
                      <button onClick={() => setSelectedTenant(t)} className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-lg shadow-sm"><Eye size={16} /></button>
                      <button onClick={() => handleEditClick(t)} className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-lg shadow-sm"><Edit3 size={16} /></button>
                      <div className="relative">
                        <button 
                          onClick={() => setActiveNotifyMenu(activeNotifyMenu === t.id ? null : t.id)} 
                          disabled={loadingAI === t.id}
                          className={`p-2.5 rounded-lg text-white shadow-lg transition-all flex items-center gap-2 ${overdue ? 'bg-rose-500 shadow-rose-500/20' : 'bg-royal-500 shadow-royal-500/20'}`}
                        >
                          {loadingAI === t.id ? <Activity className="animate-spin" size={16}/> : <Send size={16}/>}
                        </button>
                        
                        {activeNotifyMenu === t.id && (
                          <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[70] animate-slideUp">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest p-2 border-b border-slate-50 mb-1">Notify via:</p>
                            <button 
                              onClick={() => handleSendReminder(t, 'whatsapp')}
                              className="w-full flex items-center gap-3 p-3 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600"><Smartphone size={14}/></div>
                              WhatsApp
                            </button>
                            <button 
                              onClick={() => handleSendReminder(t, 'sms')}
                              className="w-full flex items-center gap-3 p-3 hover:bg-royal-50 text-slate-700 hover:text-royal-600 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                              <div className="w-8 h-8 bg-royal-100 rounded-lg flex items-center justify-center text-royal-600"><Send size={14}/></div>
                              SMS
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resident Profile</th>
                  <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Unit</th>
                  <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Last Transaction</th>
                  <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Settlement Status</th>
                  <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tenants.filter(t => {
                  const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.houseNumber.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesFilter = tenantPaymentFilter === 'all' ? true : 
                                       tenantPaymentFilter === 'paid' ? t.bills.total === 0 : 
                                       t.bills.total > 0;
                  return matchesSearch && matchesFilter;
                }).map(t => {
                  const tPayments = payments.filter(p => p.tenantId === t.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  const lastPayment = tPayments[0];
                  const overdue = isOverdue(t);

                  return (
                    <tr key={t.id} className={`hover:bg-slate-50/50 transition-all group ${overdue ? 'bg-rose-50/20' : ''}`}>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs transition-all ${overdue ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400 group-hover:bg-royal-100 group-hover:text-royal-600'}`}>
                              {t.name.split(' ').map(n => n[0]).join('')}
                           </div>
                           <div>
                              <div className={`font-black text-base transition-colors ${overdue ? 'text-rose-600' : 'text-slate-900 group-hover:text-royal-500'}`}>{t.name}</div>
                              <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2 mt-1"><Phone size={10}/> {t.phoneNumber}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`font-black text-sm px-4 py-2 rounded-xl border ${overdue ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{t.houseNumber}</span>
                      </td>
                      <td className="px-10 py-8">
                        {lastPayment ? (
                          <div className="space-y-1">
                            <div className="text-sm font-black text-slate-900">KES {lastPayment.amount.toLocaleString()}</div>
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{new Date(lastPayment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest italic">No records</span>
                        )}
                      </td>
                      <td className="px-10 py-8"><BillStatusBadge status={t.bills.status} /></td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => setSelectedTenant(t)} className="p-3 bg-white border border-slate-200 hover:border-royal-200 text-slate-400 hover:text-royal-500 rounded-xl transition-all shadow-sm"><Eye size={18} /></button>
                          <button onClick={() => handleEditClick(t)} className="p-3 bg-white border border-slate-200 hover:border-royal-200 text-slate-400 hover:text-royal-500 rounded-xl transition-all shadow-sm"><Edit3 size={18} /></button>
                          <div className="relative">
                            <button 
                              onClick={() => setActiveNotifyMenu(activeNotifyMenu === t.id ? null : t.id)} 
                              disabled={loadingAI === t.id} 
                              className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${overdue ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' : 'bg-royal-500 hover:bg-royal-600 text-white shadow-royal-500/20'}`}
                            >
                              {loadingAI === t.id ? <Activity className="animate-spin" size={14}/> : <Send size={14}/>} {overdue ? 'Urgent' : 'Notify'}
                            </button>

                            {activeNotifyMenu === t.id && (
                              <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[70] animate-slideUp text-left">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest p-3 border-b border-slate-50 mb-1">Notification Protocol:</p>
                                <button 
                                  onClick={() => handleSendReminder(t, 'whatsapp')}
                                  className="w-full flex items-center gap-4 p-4 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                                >
                                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600"><Smartphone size={16}/></div>
                                  WhatsApp
                                </button>
                                <button 
                                  onClick={() => handleSendReminder(t, 'sms')}
                                  className="w-full flex items-center gap-4 p-4 hover:bg-royal-50 text-slate-700 hover:text-royal-600 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                                >
                                  <div className="w-10 h-10 bg-royal-100 rounded-xl flex items-center justify-center text-royal-600"><Send size={16}/></div>
                                  SMS
                                </button>
                              </div>
                            )}
                          </div>
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

      {activeTab === 'billing' && (
        <div className="space-y-6 md:space-y-8 animate-fadeIn">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-3xl md:text-5xl font-display font-black text-slate-900 tracking-tighter">Payments</h2>
            <div className="flex items-center justify-end gap-3.5 w-full md:w-auto">
              <button 
                onClick={handleExportFinancialJSON}
                className="px-5 py-3.5 bg-royal-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] hover:bg-royal-700 transition-all flex items-center gap-2.5 shadow-md shadow-royal-500/10 active:scale-95 cursor-pointer shrink-0"
              >
                <FileJson size={14} />
                Export JSON Report
              </button>
              <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-royal-500 hover:border-royal-500 transition-all shadow-sm relative">
                <Bell size={24} />
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-sm"></span>
              </button>
              <div className="w-12 h-12 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-royal-500 transition-all">
                <User size={24} />
              </div>
            </div>
          </div>

          {/* Functional Control Bar */}
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search Suite or Resident..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-14 pr-6 py-4.5 rounded-3xl text-sm font-bold focus:border-royal-500 shadow-sm outline-none transition-all placeholder:text-slate-400" 
                />
              </div>
              <div className="flex bg-slate-100 p-1.5 rounded-3xl self-start lg:self-stretch">
                {(['all', 'unpaid', 'paid'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTenantPaymentFilter(f)}
                    className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      tenantPaymentFilter === f 
                        ? 'bg-white text-royal-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Summary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-100 p-6 rounded-4xl shadow-sm group hover:border-royal-500 transition-all">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Expected</p>
                <p className="text-2xl font-black text-slate-900">KES {summaryStats.total.toLocaleString()}</p>
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-royal-500 transition-all" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-4xl shadow-sm group hover:border-emerald-500 transition-all">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Collected (Month)</p>
                <p className="text-2xl font-black text-emerald-700">KES {summaryStats.collected.toLocaleString()}</p>
                <div className="mt-3 h-1.5 bg-emerald-200/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all" 
                    style={{ width: `${Math.min(100, (summaryStats.collected / summaryStats.total) * 100)}%` }} 
                  />
                </div>
              </div>
              <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-4xl shadow-sm group hover:border-rose-500 transition-all">
                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-2">Pending Balance</p>
                <p className="text-2xl font-black text-rose-700">KES {summaryStats.pending.toLocaleString()}</p>
                <div className="mt-3 h-1.5 bg-rose-200/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 transition-all" 
                    style={{ width: `${Math.min(100, (summaryStats.pending / summaryStats.total) * 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Late Payment & AI Notification Dispatch Center */}
          <div className="bg-[#0f172a] text-white rounded-[32px] p-6 md:p-8 shadow-xl border border-rose-500/20 relative overflow-hidden transition-all hover:border-rose-500/30">
            {/* Background circular glowing aura */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-rose-500 pointer-events-none transform translate-x-12 -translate-y-12">
              <BellRing size={240} />
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center animate-pulse">
                    <AlertTriangle size={16} />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-400">Late Payment Dispatch Center</h3>
                </div>
                <h4 className="text-xl md:text-2xl font-display font-black tracking-tight text-white mt-1">
                  {lateTenants.length === 0 ? (
                    "All payments on schedule"
                  ) : (
                    `${lateTenants.length} Residents Late on Rent & Utilities`
                  )}
                </h4>
                <p className="text-xs text-slate-400 font-medium max-w-2xl leading-relaxed">
                  {lateTenants.length === 0 ? (
                    "Excellent! Zero units have pending balances for this period. AI notification engines are on standby."
                  ) : (
                    `A combined total of KES ${lateTenants.reduce((acc, t) => acc + t.bills.total, 0).toLocaleString()} is overdue. Trigger bulk AI payment routing to automatically customize and dispatch alerts to their devices.`
                  )}
                </p>
                
                {/* Scrollable list of late tenants */}
                {lateTenants.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 mt-4 max-h-[140px] overflow-y-auto pr-2 scrollbar-hide py-1">
                    {lateTenants.map(t => (
                      <div 
                        key={t.id} 
                        className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-rose-500/30 rounded-2xl px-3.5 py-2 flex items-center gap-2.5 transition-all text-left cursor-pointer group"
                        onClick={() => handleSendReminder(t)}
                        title={`Click to notify ${t.name} individually`}
                      >
                        <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 text-[10px] font-black flex items-center justify-center shrink-0">
                          {t.houseNumber}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-200 group-hover:text-rose-400 transition-colors truncate max-w-[120px]">{t.name}</p>
                          <p className="text-[9px] text-slate-500 font-bold">KES {t.bills.total.toLocaleString()}</p>
                        </div>
                        <Send size={10} className="text-slate-600 group-hover:text-rose-400 ml-1 transition-colors shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {lateTenants.length > 0 && (
                <div className="shrink-0 flex flex-col justify-center items-center lg:items-end w-full lg:w-auto">
                  <button
                    onClick={handleNotifyAllLate}
                    disabled={bulkNotifying}
                    className="w-full lg:w-auto bg-rose-500 hover:bg-rose-600 disabled:bg-rose-500/50 text-white font-black text-xs uppercase tracking-widest px-8 py-4.5 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-rose-500/20 transition-all active:scale-95 group cursor-pointer"
                  >
                    {bulkNotifying ? (
                      <>
                        <Activity className="animate-spin" size={16} />
                        Dispersing Alerts...
                      </>
                    ) : (
                      <>
                        <Zap size={16} className="text-yellow-300 animate-pulse group-hover:scale-125 transition-transform" />
                        Notify All Due Tenants
                      </>
                    )}
                  </button>
                  <p className="text-[9px] text-slate-500 text-center uppercase tracking-wider font-extrabold mt-2">
                    Automated AI Routing via SMS / WhatsApp
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tenant Cards Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Active Receivables</h3>
                <span className="bg-slate-100 px-3 py-1 rounded-full text-[9px] font-black text-slate-500">{filteredTenants.length} Units</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredTenants.map(t => {
                  const lastPayment = payments.find(p => p.tenantId === t.id);
                  const isPaid = t.bills.status === 'PAID';
                  const isPartial = t.bills.status === 'PARTIAL';
                  
                  return (
                    <div 
                      key={t.id} 
                      className={`p-5 rounded-4xl border transition-all hover:shadow-lg relative overflow-hidden group ${
                        isPaid ? 'border-emerald-100 bg-emerald-50/10' : 
                        isPartial ? 'border-amber-100 bg-amber-50/10' : 
                        'border-slate-200 bg-white hover:border-royal-500'
                      }`}
                    >
                      {/* Status Accent Bar */}
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${
                        isPaid ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />

                      <div className="flex items-center justify-between mb-6 pl-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-sm shadow-sm ${
                            isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'
                          }`}>
                            {t.houseNumber}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm">{t.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Suite {t.houseNumber}</p>
                          </div>
                        </div>
                        {isPaid && (
                          <div className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-black text-[8px] uppercase tracking-widest">PAID</div>
                        )}
                      </div>

                      <div className="mb-6 pl-2">
                        <p className="text-2xl font-display font-black text-slate-900 tracking-tight">KES {t.bills.total.toLocaleString()}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Outstanding Balance</p>
                      </div>

                      <div className="flex items-center gap-4 text-[9px] text-slate-500 font-bold mb-8 pl-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 uppercase tracking-widest">Last:</span>
                          <span className="text-slate-900">{lastPayment ? lastPayment.amount.toLocaleString() : 'N/A'}</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        <div className="flex items-center gap-1">
                          <Activity size={12} className={t.bills.total > 0 ? 'text-rose-500' : 'text-emerald-500'} />
                          <span>{t.bills.total > 0 ? 'Due now' : 'Clear'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pl-2">
                        <button 
                          onClick={() => { setPaymentTenantId(t.id); setShowLogPaymentModal(true); }}
                          className="py-3.5 bg-royal-500 text-white rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] shadow-glow hover:bg-royal-600 transition-all flex items-center justify-center gap-2"
                        >
                          <Check size={14}/> Pay
                        </button>
                        <button 
                          onClick={() => handleSendReminder(t)}
                          className="py-3.5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                        >
                          <BellRing size={14}/> Notify
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Payments Feed */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Recent Payments</h3>
                <button onClick={() => setActiveTab('billing')} className="text-[9px] font-black text-royal-500 uppercase tracking-widest hover:underline">View All</button>
              </div>

              <div className="bg-white rounded-4xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-50">
                  {payments.slice(0, 8).map(p => {
                    const tenant = tenants.find(t => t.id === p.tenantId);
                    return (
                      <div key={p.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
                            p.method === 'M-Pesa' ? 'bg-emerald-50 text-emerald-600' : 
                            p.method === 'Bank' ? 'bg-royal-50 text-royal-600' : 
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {p.method === 'M-Pesa' ? <Smartphone size={18}/> : p.method === 'Bank' ? <Landmark size={18}/> : <Wallet size={18}/>}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm line-clamp-1">{tenant?.name || 'Unknown'}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                              {new Date(p.date).toLocaleDateString('en-GB')} • {p.method}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900 text-sm">KES {p.amount.toLocaleString()}</p>
                          <p className="text-[8px] text-slate-400 font-mono font-black uppercase tracking-widest mt-0.5">{p.reference}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {payments.length === 0 && (
                  <div className="p-12 text-center text-slate-400">
                    <History size={32} className="mx-auto mb-4 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No recent Activity</p>
                  </div>
                )}
              </div>

              {/* Action FAB Replacement - Record Payment */}
              <button 
                onClick={() => setShowLogPaymentModal(true)}
                className="w-full bg-slate-900 text-white p-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-royal-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
              >
                <div className="bg-white/10 p-2 rounded-lg group-hover:rotate-90 transition-transform duration-500">
                  <Plus size={20} />
                </div>
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'more' && (
        <div className="space-y-10 animate-slideUp">
          <div className="bg-slate-900 text-white p-12 rounded-6xl shadow-2xl relative overflow-hidden group flex flex-col min-h-[600px]">
            <div className="absolute top-0 right-0 p-12 opacity-0 group-hover:opacity-10 transition-opacity duration-700 text-royal-500"><Wrench size={300} /></div>
            <div className="flex justify-between items-center mb-10 relative z-10">
               <div className="flex items-center gap-4">
                  <div className="p-4 bg-royal-500 rounded-2xl shadow-glow text-white"><RefreshCw size={24}/></div>
                  <h3 className="font-black text-2xl tracking-tight">System Maintenance Logs</h3>
               </div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Property Health Index: 94%</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Events</p>
                    <p className="text-3xl font-black text-white">128</p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Quarterly Spend</p>
                    <p className="text-3xl font-black text-royal-400">425K</p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">System Health</p>
                    <p className="text-3xl font-black text-emerald-400">Optimal</p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Pending Tasks</p>
                    <p className="text-3xl font-black text-rose-400">03</p>
                </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide relative z-10 pr-2">
              <MaintenanceItem date="Today" task="Front Gate Calibration" cost={4500} house="External" />
              <MaintenanceItem date="Yesterday" task="Kitchen Sink B4 Repair" cost={8200} house="B4" />
              <MaintenanceItem date="12th Sep" task="Corridor Lighting" cost={1500} house="Common Areas" />
              <MaintenanceItem date="05th Sep" task="Water Pump Service" cost={12000} house="Utility Room" />
              <MaintenanceItem date="01st Sep" task="Elevator Monthly Audit" cost={45000} house="All Floors" />
            </div>
            <button 
              type="button"
              onClick={() => setShowMaintenanceModal(true)}
              className="w-full mt-10 bg-royal-500 text-white py-6 rounded-4xl font-black text-xs uppercase tracking-widest hover:bg-royal-600 shadow-glow transition-all active:scale-95 relative z-10"
            >
              Log New Maintenance Event
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="bg-white p-10 rounded-5xl border border-slate-200 shadow-premium group cursor-pointer hover:border-royal-500 transition-all text-left w-full block focus:ring-2 focus:ring-royal-500"
             >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-royal-50 group-hover:text-royal-500 mb-6 transition-all"><Settings2 size={28}/></div>
                <h4 className="font-black text-xl text-slate-900 mb-2">Site Settings</h4>
                <p className="text-slate-500 text-sm">Configure property-wide variables and notification preferences.</p>
             </button>
             <button
                type="button"
                onClick={() => setShowStaffModal(true)}
                className="bg-white p-10 rounded-5xl border border-slate-200 shadow-premium group cursor-pointer hover:border-royal-500 transition-all text-left w-full block focus:ring-2 focus:ring-royal-500"
             >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-royal-50 group-hover:text-royal-500 mb-6 transition-all"><Briefcase size={28}/></div>
                <h4 className="font-black text-xl text-slate-900 mb-2">Staff Registry</h4>
                <p className="text-slate-500 text-sm">Manage caretaker access levels and security credentials.</p>
             </button>
          </div>
        </div>
      )}

      {activeTab === 'water-meters' && (() => {
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
        const RATE = 120; // synchronized to App.tsx rate
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
                  <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">Water Utility Operations</h1>
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
                    className="w-full bg-slate-50 border border-slate-200/60 hover:bg-slate-100/50 pl-10 pr-4 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#4338CA] transition-all font-sans text-slate-700" 
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
                  className="bg-white border border-slate-200 focus:border-[#4338CA] rounded-lg py-1.5 px-3.5 text-xs font-semibold text-slate-600 outline-none shadow-sm transition-all cursor-pointer"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {metersData.map((m, idx) => {
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
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap inline-span ${statusClass}`}>
                          {statusLabel}
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
                          onClick={() => handleSaveUnitReading(idx, m.unit, m.tenantId, m.prev)}
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
                          {
                            unit: 'A01',
                            tenantName: tenants.find(t => t.id === 't_james')?.name || 'James Mwangi',
                            month: 'Jun 2025',
                            prev: tenants.find(t => t.id === 't_james')?.bills.prevWaterReading ?? 142,
                            curr: tenants.find(t => t.id === 't_james')?.bills.currWaterReading ?? 162,
                            status: 'Billed'
                          },
                          {
                            unit: 'A01',
                            tenantName: 'James Mwangi',
                            month: 'May 2025',
                            prev: 122,
                            curr: 142,
                            status: 'Billed'
                          },
                          {
                            unit: 'A02',
                            tenantName: tenants.find(t => t.id === 't_grace')?.name || 'Grace Atieno',
                            month: 'Jun 2025',
                            prev: tenants.find(t => t.id === 't_grace')?.bills.prevWaterReading ?? 98,
                            curr: tenants.find(t => t.id === 't_grace')?.bills.currWaterReading ?? 113,
                            status: 'Unpaid'
                          },
                          {
                            unit: 'B01',
                            tenantName: tenants.find(t => t.id === 't_peter')?.name || 'Peter Kamau',
                            month: 'Jun 2025',
                            prev: tenants.find(t => t.id === 't_peter')?.bills.prevWaterReading ?? 210,
                            curr: tenants.find(t => t.id === 't_peter')?.bills.currWaterReading ?? 243,
                            status: 'Pending'
                          },
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
                              <td className={`py-3 px-4 font-mono font-bold text-center ${isHigh ? 'text-[#D85A30]' : 'text-slate-700'}`}>
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

            {/* GUIDED SESSION MODAL */}
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
                      <div className="space-y-4 animate-scaleIn">
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

                        <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 text-xs font-semibold flex justify-between items-center mt-2">
                          <div className="text-emerald-800">
                            Usage: <span className="font-extrabold font-mono">{netUsage} m³</span> (+{netUsage} units)
                          </div>
                          <div className="text-emerald-800 text-right leading-tight">
                            Total: <strong className="font-extrabold">KES {netCost.toLocaleString()}</strong>
                          </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-slate-100 mt-6">
                          <button 
                            onClick={() => setIsWaterSessionOpen(false)}
                            className="flex-1 py-3 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                          >
                            Close Modal
                          </button>
                          <button 
                            onClick={handleSessSaveNext}
                            className="flex-[2] py-3 bg-[#4338CA] hover:bg-[#4338CA]/90 text-[#ffffff] font-bold text-xs rounded-xl shadow-glow transition-all active:scale-95 border-none cursor-pointer"
                          >
                            {waterSessIdx === sessionUnits.length - 1 ? 'Save & Complete' : 'Save & Next'}
                          </button>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="text-center py-6 space-y-4 animate-scaleIn">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">✓</div>
                      <h4 className="font-sans font-extrabold text-[#111827] text-base">All Readings Updated!</h4>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                        All occupied residential meters have have been successfully checked and updated. Ready to generate bills.
                      </p>
                      <div className="flex gap-3 pt-4 justify-center">
                        <button
                          onClick={() => setIsWaterSessionOpen(false)}
                          className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 rounded-xl transition-all"
                        >
                          Close Modal
                        </button>
                        <button
                          onClick={() => {
                            setIsWaterSessionOpen(false);
                            triggerNotification(`✓ Generated water invoices for ${sessionUnits.length} units successfully.`, 'success');
                          }}
                          className="px-6 py-2.5 bg-royal-500 hover:bg-royal-600 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-md shadow-royal-500/10 border-none"
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
      })()}

    </div>
  );
};

// COMPONENT: AddPropertyModal
const AddPropertyModal: React.FC<{ onClose: () => void, onSubmit: (h: House) => void }> = ({ onClose, onSubmit }) => {
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
      <div className="bg-white w-full max-w-lg rounded-none md:rounded-6xl shadow-premium flex flex-col h-full md:h-auto md:max-h-[90vh] overflow-hidden animate-slideUp border border-slate-200">
        <div className="bg-royal-600 p-4 md:p-6 text-white flex justify-between items-center relative overflow-hidden shrink-0 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-6">
          <div className="relative z-10">
             <h3 className="text-xl md:text-2xl font-display font-black tracking-tight">Add New Property</h3>
             <p className="text-royal-100 text-[8px] font-black uppercase tracking-[0.2em] mt-1">Property & First Unit Registry</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all cursor-pointer"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto scrollbar-hide">
          <InputGroup 
            icon={<Landmark size={16} className="text-royal-500"/>} 
            label="Property Name" 
            placeholder="e.g. Palm Heights, Ruby Apartments" 
            value={formData.propertyName} 
            onChange={(val) => setFormData({...formData, propertyName: val})} 
          />

          <InputGroup 
            icon={<MapPin size={16} className="text-royal-500"/>} 
            label="Location" 
            placeholder="e.g. Westlands, Kilimani" 
            value={formData.location} 
            onChange={(val) => setFormData({...formData, location: val})} 
          />

          <div className="border-t border-slate-100 pt-6 space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Initial Unit Information</h4>
            
            <InputGroup 
              icon={<Home size={16} className="text-royal-500"/>} 
              label="Unit / House Number" 
              placeholder="e.g. A101, Unit 01" 
              value={formData.houseNumber} 
              onChange={(val) => setFormData({...formData, houseNumber: val})} 
            />

            <div className="space-y-3">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Layers size={14} className="text-royal-500"/> Unit Type
               </label>
               <div className="grid grid-cols-2 gap-3">
                  {['Studio', '1 Bedroom', '2 Bedroom', 'Penthouse'].map((type) => (
                     <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({...formData, type: type as any})}
                        className={`py-4 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.type === type ? 'border-royal-500 bg-royal-50 text-royal-600 shadow-sm' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                     >
                        {type}
                     </button>
                  ))}
               </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
             <button type="button" onClick={onClose} className="flex-1 py-4 md:py-6 rounded-xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
             <button type="submit" className="flex-[2] bg-royal-650 text-white py-4 md:py-6 rounded-xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-royal-700 shadow-glow transition-all active:scale-95">Create Property</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// COMPONENT: AddHouseModal
const AddHouseModal: React.FC<{ 
  defaultPropertyName?: string;
  defaultLocation?: string;
  onClose: () => void;
  onSubmit: (h: House) => void; 
}> = ({ defaultPropertyName = '', defaultLocation = '', onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    houseNumber: '',
    type: 'Studio' as any,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.houseNumber) return;

    const newHouse: House = {
      id: `h-${Date.now()}`,
      houseNumber: formData.houseNumber,
      propertyName: defaultPropertyName || 'Portfolio Asset',
      location: defaultLocation || 'Nairobi',
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
      <div className="bg-white w-full max-w-lg rounded-none md:rounded-6xl shadow-premium flex flex-col h-full md:h-auto md:max-h-[90vh] overflow-hidden animate-slideUp border border-slate-200">
        <div className="bg-royal-500 p-4 md:p-6 text-white flex justify-between items-center relative overflow-hidden shrink-0 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-6">
          <div className="relative z-10">
             <h3 className="text-xl md:text-2xl font-display font-black tracking-tight">Expand Portfolio</h3>
             <p className="text-royal-100 text-[8px] font-black uppercase tracking-[0.2em] mt-1">New Asset Entry Protocol</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all cursor-pointer"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto scrollbar-hide">
          <InputGroup 
            icon={<Home size={16} className="text-royal-500"/>} 
            label="House Number" 
            placeholder="e.g. B4, Tower A-301" 
            value={formData.houseNumber} 
            onChange={(val) => setFormData({...formData, houseNumber: val})} 
          />
          
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} className="text-royal-500"/> Configuration Type
             </label>
             <div className="grid grid-cols-2 gap-3">
                {['Studio', '1 Bedroom', '2 Bedroom', 'Penthouse'].map((type) => (
                   <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, type: type as any})}
                      className={`py-4 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.type === type ? 'border-royal-500 bg-royal-50 text-royal-600 shadow-sm' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                   >
                      {type}
                   </button>
                ))}
             </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
             <button type="button" onClick={onClose} className="flex-1 py-4 md:py-6 rounded-xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
             <button type="submit" className="flex-[2] bg-royal-500 text-white py-4 md:py-6 rounded-xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-royal-600 shadow-glow transition-all active:scale-95">Register Unit</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// COMPONENT: AddTenantModal with E-Contracting Steps
const AddTenantModal: React.FC<{ houses: House[], onClose: () => void, onSubmit: (t: Tenant) => void }> = ({ houses, onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [tenantData, setTenantData] = useState({
    name: '', idNumber: '', phoneNumber: '', email: '', nextOfKin: '', houseNumber: '', rent: 0
  });
  const [agreementData, setAgreementData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    signed: false,
    signDate: '',
    signatureData: '' // Simulated handwritten path
  });

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleFinalSubmit = () => {
    if (!agreementData.signed) {
      alert("Tenant signature required for digital rental agreement.");
      return;
    }

    const newTenant: Tenant = {
      id: `t-${Date.now()}`,
      name: tenantData.name,
      email: tenantData.email,
      houseNumber: tenantData.houseNumber,
      idNumber: tenantData.idNumber,
      phoneNumber: tenantData.phoneNumber,
      nextOfKin: tenantData.nextOfKin,
      joinDate: agreementData.startDate,
      agreementUrl: `royal-agreement-${tenantData.houseNumber}-${Date.now()}.pdf`,
      bills: { 
        rent: tenantData.rent, 
        water: 0, 
        prevWaterReading: 0,
        currWaterReading: 0,
        garbage: 500, 
        total: tenantData.rent + 500, 
        status: 'UNPAID' 
      },
      rentAgreement: {
        startDate: agreementData.startDate,
        depositAmount: tenantData.rent,
        depositStatus: 'HELD',
        status: 'ACTIVE',
        tenantSignature: agreementData.signatureData,
        signedDate: agreementData.signDate
      },
      meterReadings: []
    };
    onSubmit(newTenant);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4 bg-slate-900/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-none md:rounded-6xl shadow-premium flex flex-col h-full md:h-auto md:max-h-[90vh] overflow-hidden animate-slideUp border border-slate-200">
        <div className="bg-royal-500 p-4 md:p-6 text-white flex justify-between items-center relative overflow-hidden shrink-0 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-6">
          <div className="relative z-10">
             <h3 className="text-xl md:text-2xl font-display font-black tracking-tight">{step === 1 ? 'Resident Profiling' : 'Agreement Execution'}</h3>
             <p className="text-royal-100 text-[8px] font-black uppercase tracking-[0.2em] mt-1">Lifecycle Management Protocol</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {step === 1 ? (
            <form id="add-tenant-form" onSubmit={handleNext} className="p-6 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
              <InputGroup icon={<User size={16}/>} label="Full Legal Name" placeholder="e.g. David Mutua" value={tenantData.name} onChange={(v) => setTenantData({...tenantData, name: v})} />
              <InputGroup icon={<Hash size={16}/>} label="National ID / Passport" placeholder="e.g. 12345678" value={tenantData.idNumber} onChange={(v) => setTenantData({...tenantData, idNumber: v})} />
              <InputGroup icon={<Phone size={16}/>} label="Phone Number" placeholder="e.g. 0712..." value={tenantData.phoneNumber} onChange={(v) => setTenantData({...tenantData, phoneNumber: v})} />
              <InputGroup icon={<Mail size={16}/>} label="Email Address" placeholder="tenant@example.com" value={tenantData.email} onChange={(v) => setTenantData({...tenantData, email: v})} />
              <InputGroup icon={<Users size={16}/>} label="Emergency Contact (NOK)" placeholder="Name & Number" value={tenantData.nextOfKin} onChange={(v) => setTenantData({...tenantData, nextOfKin: v})} />
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14}/> Property Suite</label>
                <div className="relative">
                  <select required className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 appearance-none shadow-inner" value={tenantData.houseNumber} onChange={(e) => setTenantData({...tenantData, houseNumber: e.target.value})}>
                    <option value="">Select Unit</option>
                    {houses.map(h => <option key={h.id} value={h.houseNumber} disabled={h.status === HouseStatus.RENTED}>{h.houseNumber} - {h.type}</option>)}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
              </div>
              
              <InputGroup icon={<DollarSign size={16}/>} label="Monthly Rent (KES)" type="number" placeholder="35000" value={tenantData.rent.toString()} onChange={(v) => setTenantData({...tenantData, rent: Number(v)})} />
            </form>
          ) : (
            <div className="p-6 md:p-12 space-y-6 md:space-y-10 animate-fadeIn">
              <div className="bg-slate-50 border border-slate-200 rounded-3xl md:rounded-5xl p-6 md:p-10 max-h-[250px] overflow-y-auto scrollbar-hide relative shadow-inner">
                 <div className="absolute top-6 right-6 text-[8px] font-serif border border-slate-300 p-3 text-slate-300 rotate-12 uppercase pointer-events-none font-black tracking-widest">Draft for Signature</div>
                 <div className="text-center mb-8 md:mb-10">
                   <h4 className="font-display text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Monthly Rental Agreement</h4>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Royal Flats Management Intelligence</p>
                 </div>
                 <div className="prose prose-sm text-slate-600 font-serif leading-relaxed text-sm md:text-base">
                    <p>This Monthly Rental Agreement ("Agreement") is made on {new Date().toLocaleDateString()} between Royal Flats ("Landlord") and {tenantData.name} ("Tenant").</p>
                    <p>1. <strong>Premises:</strong> Unit {tenantData.houseNumber} located at Royal Flats Executive Suites.</p>
                    <p>2. <strong>Rental Cycle:</strong> This agreement commences on {agreementData.startDate} and renews automatically on the 1st of every month.</p>
                    <p>3. <strong>Financials:</strong> Monthly sum of KES {tenantData.rent.toLocaleString()}, plus KES 500 service fee.</p>
                    <p>4. <strong>Utilities:</strong> Water is metered at KES 150 per unit.</p>
                    <p>5. <strong>Execution:</strong> By signing below, the Tenant agrees to digital onboarding and Daraja-secured payments.</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> Commencement Date</label>
                    <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl text-sm font-bold shadow-inner outline-none focus:border-royal-500 transition-all" value={agreementData.startDate} onChange={e => setAgreementData({...agreementData, startDate: e.target.value})} />
                 </div>
              </div>

              <div className="pt-2">
                 {agreementData.signed ? (
                   <div className="bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-3xl md:rounded-5xl p-6 md:p-10 flex flex-col items-center animate-fadeIn relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-6 opacity-5 text-emerald-500"><ShieldCheck size={120}/></div>
                      <CheckCircle2 className="text-emerald-500 mb-4" size={40} />
                      <span className="text-xl md:text-2xl font-serif italic font-black text-emerald-700 tracking-tight text-center">Signed: {tenantData.name}</span>
                      <span className="text-[9px] text-emerald-600 font-mono font-black mt-2 uppercase tracking-widest">TIMESTAMP: {agreementData.signDate}</span>
                      <div className="mt-6 md:mt-8 flex gap-6">
                         <button onClick={() => alert("Printing Official Copy...")} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:underline"><Printer size={16}/> Print Official Copy</button>
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Capture Tenant Identity Signature</p>
                      <button 
                        onClick={() => setAgreementData({...agreementData, signed: true, signDate: new Date().toLocaleString(), signatureData: tenantData.name})}
                        className="w-full py-10 md:py-16 border-2 border-dashed border-slate-200 hover:border-royal-500 hover:bg-royal-50 text-slate-400 hover:text-royal-500 rounded-3xl md:rounded-6xl flex flex-col items-center justify-center gap-4 md:gap-6 transition-all group shadow-inner"
                      >
                         <Signature size={48} className="group-hover:rotate-12 transition-transform duration-500" />
                         <div className="text-center">
                            <span className="text-xs md:text-sm font-black uppercase tracking-widest block">Click to Capture Digital Signature</span>
                            <span className="text-[9px] md:text-[10px] opacity-60 font-medium mt-1 block">Handwritten simulation will be applied to legal draft</span>
                         </div>
                      </button>
                   </div>
                 )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 md:p-10 border-t border-slate-100 bg-slate-50/50 shrink-0">
          {step === 1 ? (
            <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
              <button type="button" onClick={onClose} className="w-full sm:flex-1 py-4 md:py-6 rounded-2xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all border border-slate-200 bg-white">Cancel</button>
              <button form="add-tenant-form" type="submit" className="w-full sm:flex-[2] py-4 md:py-6 rounded-2xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest text-white bg-slate-900 hover:bg-royal-500 shadow-premium transition-all flex items-center justify-center gap-3 active:scale-95">Generate Rent Agreement <ArrowRight size={16}/></button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
              <button type="button" onClick={() => setStep(1)} className="w-full sm:flex-1 py-4 md:py-6 rounded-2xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-100 border border-slate-200 bg-white transition-all">Back to Profiling</button>
              <button 
                onClick={handleFinalSubmit}
                disabled={!agreementData.signed}
                className="w-full sm:flex-[2] py-4 md:py-6 rounded-2xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest text-white bg-royal-500 hover:bg-royal-600 shadow-glow disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                Onboard & Notify Landlord <ShieldCheck size={18}/>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MaintenanceItem: React.FC<{ date: string, task: string, cost: number, house: string }> = ({ date, task, cost, house }) => (
  <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all group">
    <div className="flex items-center gap-5">
      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-royal-400 border border-white/10 group-hover:scale-110 transition-transform shadow-inner"><Wrench size={20}/></div>
      <div>
        <div className="font-black text-white text-base tracking-tight">{task}</div>
        <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.15em] mt-1">{date} • {house}</div>
      </div>
    </div>
    <div className="text-right">
      <div className="font-black text-royal-400 text-lg tracking-tight">KES {cost.toLocaleString()}</div>
    </div>
  </div>
);

const DetailedUnitCard: React.FC<{ house: House, tenant?: Tenant, onView: () => void, payments: PaymentRecord[] }> = ({ house, tenant, onView, payments }) => {
  const isOccupied = house.status === HouseStatus.RENTED;
  const isPaid = tenant?.bills.status === 'PAID';
  const isPartial = tenant?.bills.status === 'PARTIAL';
  const isLate = tenant?.bills.status === 'OVERDUE' || (tenant && tenant.bills.total > 0 && new Date().getDate() > 5);

  const tenantPayments = tenant ? payments.filter(p => p.tenantId === tenant.id) : [];
  const totalPaid = tenantPayments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="bg-slate-50/50 rounded-[32px] p-6 md:p-8 border border-slate-100 hover:border-royal-200 transition-all group overflow-hidden relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-lg font-black text-slate-400 border border-slate-100 shadow-sm transition-all group-hover:scale-110 group-hover:bg-royal-500 group-hover:text-white">
            {house.houseNumber.replace(/[^0-9]/g, '').padStart(2, '0') || '00'}
          </div>
          <div>
            <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">Unit {house.houseNumber}</h3>
            <p className="text-sm font-bold text-slate-400">{tenant?.name || 'No tenant assigned'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
            isOccupied ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            {house.status}
          </div>
          {tenant && (
            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
              isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
              isLate ? 'bg-rose-50 text-rose-600 border-rose-100' : 
              'bg-slate-50 text-slate-600 border-slate-100'
            }`}>
              {isLate ? 'LATE' : tenant.bills.status}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        {/* Rent Details */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-sm font-black text-slate-900">Rent</span>
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
              {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : (tenant ? 'UNPAID' : '—')}
            </span>
          </div>
          <div className="space-y-1.5">
             <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
               <span>Bill</span>
               <span className="text-slate-700">KES {tenant ? (tenant.bills.total + totalPaid).toLocaleString() : 0}</span>
             </div>
             <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
               <span>Paid</span>
               <span className="text-emerald-500">KES {totalPaid.toLocaleString()}</span>
             </div>
             <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
               <span>Balance</span>
               <span className="text-slate-700">KES {tenant ? tenant.bills.total.toLocaleString() : 0}</span>
             </div>
          </div>
        </div>

        {/* Water Details */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-sm font-black text-slate-900">Water</span>
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
               {isLate ? 'LATE' : isPaid ? 'PAID' : (tenant ? 'UNPAID' : '—')}
            </span>
          </div>
          <div className="space-y-1.5">
             <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
               <span>Usage</span>
               <span className="text-slate-700">{tenant ? '12 u' : '0 u'}</span>
             </div>
             <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
               <span>Rate</span>
               <span className="text-slate-700">KES 120/u</span>
             </div>
             <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
               <span>Total</span>
               <span className="text-slate-700">KES {tenant ? '1,440' : 0}</span>
             </div>
          </div>
        </div>

        {/* Garbage Details */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-sm font-black text-slate-900">Garbage</span>
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-50 text-emerald-600'}`}>
               PAID
            </span>
          </div>
          <div className="space-y-1.5">
             <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
               <span>Service</span>
               <span className="text-slate-700 px-2 bg-slate-100 rounded text-[7px]">Weekly</span>
             </div>
             <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
               <span>Vendor</span>
               <span className="text-slate-700">Cleans</span>
             </div>
             <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
               <span>Cost</span>
               <span className="text-slate-700 font-black">KES 500</span>
             </div>
          </div>
        </div>

        {/* Unit Balance Summary */}
        <div className="p-2 space-y-4">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Summary</p>
           <div className="space-y-1">
             <h4 className={`text-2xl font-display font-black tracking-tight ${tenant && tenant.bills.total > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
               KES {tenant?.bills.total.toLocaleString() || 0}
             </h4>
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Outstanding</p>
           </div>
           <div className="flex flex-col gap-1 pt-2">
              <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Last Pay:</span>
                <span className="text-slate-900">{tenantPayments[0] ? new Date(tenantPayments[0].date).toLocaleDateString() : 'None'}</span>
              </div>
           </div>
        </div>
      </div>
      
      {/* View Details Icon Overlay */}
      <button 
        onClick={onView}
        className="absolute top-8 right-8 p-2 bg-white rounded-full border border-slate-100 text-slate-300 hover:text-royal-500 hover:border-royal-500 transition-all shadow-sm"
      >
        <MoreHorizontal size={20} />
      </button>
    </div>
  );
};

const UnitCard: React.FC<{ house: House, onView: any, tenantName?: string }> = ({ house, onView, tenantName }) => {
  const isRented = house.status === HouseStatus.RENTED;
  const isVacant = house.status === HouseStatus.VACANT;
  const borderClass = isRented ? 'border-emerald-100 hover:border-emerald-300' : 'border-amber-100 hover:border-amber-300';
  const accentClass = isRented ? 'bg-emerald-500' : 'bg-amber-500';

  return (
    <div className={`bg-white p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-2 transition-all group relative overflow-hidden flex flex-col shadow-premium hover:shadow-2xl hover:-translate-y-2 ${borderClass}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 md:h-2 ${accentClass}`} />
      <div className="flex justify-between items-start mb-4 md:mb-8">
        <div>
          <h3 className="text-2xl md:text-4xl font-display font-black text-slate-900 tracking-tighter">{house.houseNumber}</h3>
          <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5 md:mt-2">{house.type}</p>
        </div>
        <div className="flex flex-col items-end gap-2 scale-90 md:scale-100 origin-top-right">
          <StatusBadge status={house.status} maintenance={house.maintenanceStatus} />
        </div>
      </div>

      {isRented && (
        <div className="mb-4 md:mb-8 bg-emerald-50/50 p-3 md:p-6 rounded-xl md:rounded-[2rem] border border-emerald-100/50 animate-fadeIn relative overflow-hidden group/tenant">
          <div className="absolute top-0 right-0 p-3 md:p-6 opacity-5 text-emerald-500 group-hover/tenant:scale-110 transition-transform"><User size={48} className="md:w-24 md:h-24" /></div>
          <span className="text-[7px] md:text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1.5 md:mb-3">Current Resident</span>
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-white rounded-lg md:rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-50"><User size={14} className="md:w-5 md:h-5" /></div>
            <span className="text-xs md:text-base font-black text-slate-800 tracking-tight">{tenantName || 'Registering...'}</span>
          </div>
        </div>
      )}

      <div className="space-y-3 mb-4 md:mb-10 flex-1">
        <div className="bg-slate-50 p-3 md:p-6 rounded-xl md:rounded-[2rem] border border-slate-100 flex justify-between items-center transition-all group-hover:bg-white group-hover:shadow-inner">
           <div className="flex items-center gap-1.5 md:gap-3">
             <div className="p-1.5 bg-white rounded-lg text-slate-400 shadow-sm"><Wallet size={12}/></div>
             <span className="text-[7px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">Lifetime Yield</span>
           </div>
           <span className="font-black text-slate-900 tracking-tight text-sm md:text-lg">KES {house.totalEarnings.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[8px] items-center px-1 md:px-4">
          <div className="flex items-center gap-1.5">
            <Wrench size={10} className="text-slate-400"/>
            <span className="text-slate-400 font-black uppercase tracking-widest text-[7px] md:text-[9px]">Service Logs</span>
          </div>
          <span className="font-black text-amber-600 bg-amber-50 px-2 md:px-3 py-0.5 rounded-md border border-amber-100 text-[7px] md:text-[10px]">{house.repairs.length} Events</span>
        </div>
      </div>
      <button 
        type="button"
        onClick={onView} 
        className="w-full py-3.5 md:py-6 bg-slate-900 hover:bg-royal-500 text-white rounded-xl md:rounded-[2rem] font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 md:gap-3 shadow-xl active:scale-95 group/btn"
      >
        View Asset Intelligence <Eye size={14} className="md:w-5 md:h-5 group-hover/btn:scale-110 transition-transform" />
      </button>
    </div>
  );
};

const UnitStatusBtn: React.FC<{ active: boolean, onClick: () => void, color: 'green' | 'amber' | 'red', label: string, icon: React.ReactNode }> = ({ active, onClick, color, label, icon }) => {
  const variants = {
    green: active ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-neutral-400 hover:text-green-600 hover:bg-green-50 border border-neutral-100',
    amber: active ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-neutral-400 hover:text-amber-600 hover:bg-amber-50 border border-neutral-100',
    red: active ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-neutral-400 hover:text-red-600 hover:bg-red-50 border border-neutral-100',
  };
  return (
    <button 
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      className={`flex flex-col items-center justify-center py-4 rounded-2xl transition-all gap-1.5 flex-1 ${variants[color]}`}
    >
      {icon}
      <span className="text-[8px] font-black uppercase tracking-tight">{label}</span>
    </button>
  );
};

const LogPaymentModal: React.FC<{ tenants: Tenant[], initialTenantId?: string, onClose: () => void, onSubmit: (p: PaymentRecord) => void }> = ({ tenants, initialTenantId, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    tenantId: initialTenantId || '',
    amount: '',
    type: 'RENT' as PaymentRecord['type'],
    reference: '',
    method: 'M-Pesa'
  });

  useEffect(() => {
    if (initialTenantId) {
      setFormData(prev => ({ ...prev, tenantId: initialTenantId }));
    }
  }, [initialTenantId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantId) return;
    
    onSubmit({
      id: `pay-${Date.now()}`,
      tenantId: formData.tenantId,
      amount: Number(formData.amount),
      date: new Date().toISOString(),
      type: formData.type,
      reference: formData.reference || `STAFF-${Math.random().toString(36).substring(7).toUpperCase()}`,
      method: formData.method
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-900/95 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-none md:rounded-[3rem] shadow-premium flex flex-col h-full md:h-auto md:max-h-[90vh] overflow-hidden animate-slideUp border border-slate-200">
        <div className="bg-slate-900 p-6 md:p-12 text-white flex justify-between items-center relative overflow-hidden shrink-0 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-12">
          <div className="absolute top-0 right-0 p-8 md:p-10 opacity-10 pointer-events-none"><CreditCard size={100} className="md:w-[140px] md:h-[140px]"/></div>
          <div className="relative z-10">
             <h3 className="text-xl md:text-3xl font-display font-black tracking-tight">Record Collection</h3>
             <p className="text-royal-400 text-[8px] md:text-[10px] uppercase font-black tracking-[0.2em] mt-1 md:mt-2">Manual Ledger Entry Protocol</p>
          </div>
          <button type="button" onClick={onClose} className="relative z-20 p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-xl md:rounded-2xl transition-all border border-white/10 active:scale-90 cursor-pointer"><X size={20} className="md:w-6 md:h-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 md:p-12 space-y-6 md:space-y-8">
            <div className="space-y-2 md:space-y-3">
              <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><User size={14} className="text-royal-500 md:w-4 md:h-4"/> Resident Selection</label>
              <div className="relative">
                <select 
                  required 
                  className="w-full bg-slate-50 border-2 border-slate-100 p-4 md:p-5 rounded-2xl md:rounded-3xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 appearance-none shadow-inner" 
                  value={formData.tenantId} 
                  onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                >
                  <option value="">Select a Resident</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>Suite {t.houseNumber} - {t.name}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-2 md:space-y-3">
                <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14} className="text-emerald-500 md:w-4 md:h-4"/> Amount (KES)</label>
                <input 
                  type="number" 
                  required 
                  className="w-full bg-slate-50 border-2 border-slate-100 p-4 md:p-5 rounded-2xl md:rounded-3xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 shadow-inner" 
                  value={formData.amount} 
                  onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                />
              </div>
              <div className="space-y-2 md:space-y-3">
                <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Receipt size={14} className="text-amber-500 md:w-4 md:h-4"/> Payment Category</label>
                <div className="relative">
                  <select 
                    required 
                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 md:p-5 rounded-2xl md:rounded-3xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 appearance-none shadow-inner" 
                    value={formData.type} 
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="RENT">Rent</option>
                    <option value="WATER">Water</option>
                    <option value="GARBAGE">Garbage</option>
                    <option value="TOTAL">Total Settlement</option>
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
               <div className="space-y-2 md:space-y-3">
                <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Activity size={14} className="text-royal-500 md:w-4 md:h-4"/> Reference Code</label>
                <input 
                  type="text" 
                  placeholder="MPESA Ref / Check No"
                  className="w-full bg-slate-50 border-2 border-slate-100 p-4 md:p-5 rounded-2xl md:rounded-3xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 shadow-inner" 
                  value={formData.reference} 
                  onChange={(e) => setFormData({...formData, reference: e.target.value})} 
                />
              </div>
              <div className="space-y-2 md:space-y-3">
                <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14} className="text-cyan-500 md:w-4 md:h-4"/> Modality</label>
                <div className="relative">
                  <select 
                    required 
                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 md:p-5 rounded-2xl md:rounded-3xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 appearance-none shadow-inner" 
                    value={formData.method} 
                    onChange={(e) => setFormData({...formData, method: e.target.value})}
                  >
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Cash">Cash Deposit</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>
            </div>

            <div className="pt-6 md:pt-10 flex flex-col sm:flex-row gap-4 md:gap-6">
              <button type="button" onClick={onClose} className="w-full sm:flex-1 py-5 md:py-6 rounded-2xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all border border-slate-100">Discard Entry</button>
              <button type="submit" className="w-full sm:flex-[2] py-5 md:py-6 rounded-2xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest text-white bg-royal-500 hover:bg-royal-600 shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3">Finalize Collection <Check size={20}/></button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const LogGeneralMaintenanceModal: React.FC<{ houses: House[], onClose: () => void, onSubmit: (repair: any) => void }> = ({ houses, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    houseId: 'common',
    description: '',
    cost: '',
    category: 'General'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: `r-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      cost: Number(formData.cost)
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-3xl md:rounded-[3rem] shadow-premium flex flex-col max-h-[90vh] overflow-hidden animate-slideUp border border-slate-200">
        <div className="bg-slate-900 p-8 md:p-12 text-white flex justify-between items-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><Wrench size={140}/></div>
          <div className="relative z-10">
             <h3 className="text-2xl md:text-3xl font-display font-black tracking-tight">Maintenance Audit</h3>
             <p className="text-royal-400 text-[10px] uppercase font-black tracking-[0.2em] mt-2">Property Service Registry Protocol</p>
          </div>
          <button type="button" onClick={onClose} className="relative z-20 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 active:scale-90 cursor-pointer"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-6 md:space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={16} className="text-royal-500"/> Allocation</label>
            <div className="relative">
              <select 
                required 
                className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 appearance-none shadow-inner" 
                value={formData.houseId} 
                onChange={(e) => setFormData({...formData, houseId: e.target.value})}
              >
                <option value="common">Common Areas / External</option>
                {houses.map(h => <option key={h.id} value={h.id}>Suite {h.houseNumber} - {h.type}</option>)}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={16} className="text-royal-500"/> Event Description</label>
            <textarea 
              required 
              placeholder="Detail the maintenance task performed..."
              className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-4xl focus:border-royal-500 outline-none transition-all text-sm font-medium text-slate-700 h-32 shadow-inner" 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><DollarSign size={16} className="text-emerald-500"/> Cost (KES)</label>
              <input 
                type="number" 
                required 
                className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 shadow-inner" 
                value={formData.cost} 
                onChange={(e) => setFormData({...formData, cost: e.target.value})} 
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Zap size={16} className="text-amber-500"/> Category</label>
              <div className="relative">
                <select 
                  required 
                  className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 appearance-none shadow-inner" 
                  value={formData.category} 
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="General">General</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Painting">Painting</option>
                  <option value="Carpentry">Carpentry</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
              </div>
            </div>
          </div>

          <div className="pt-6 md:pt-10 flex flex-col sm:flex-row gap-4 md:gap-6">
            <button type="button" onClick={onClose} className="w-full sm:flex-1 py-5 md:py-6 rounded-2xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all border border-slate-100">Discard</button>
            <button type="submit" className="w-full sm:flex-[2] py-5 md:py-6 rounded-2xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest text-white bg-royal-500 hover:bg-royal-600 shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3">Finalize Event <Check size={20}/></button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
};

const EditTenantModal: React.FC<{ tenant: Tenant, onClose: () => void, onSubmit: (t: Tenant) => void }> = ({ tenant, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({ ...tenant });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl md:rounded-[3rem] shadow-premium flex flex-col max-h-[90vh] overflow-hidden animate-slideUp border border-slate-200">
        <div className="bg-slate-900 p-6 md:p-12 text-white flex justify-between items-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-8 md:p-10 opacity-10 pointer-events-none"><Edit3 size={100} className="md:w-[140px] md:h-[140px]"/></div>
          <div className="relative z-10">
             <h3 className="text-xl md:text-3xl font-display font-black tracking-tight">Edit Resident Profile</h3>
             <p className="text-royal-400 text-[8px] md:text-[10px] uppercase font-black tracking-[0.2em] mt-1 md:mt-2">Updating ID: {tenant.id.slice(-6)}</p>
          </div>
          <button type="button" onClick={onClose} className="relative z-20 p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-xl md:rounded-2xl transition-all border border-white/10 active:scale-90 cursor-pointer"><X size={20} className="md:w-6 md:h-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <InputGroup icon={<User size={16} className="text-royal-500 md:w-[18px] md:h-[18px]"/>} label="Full Name" placeholder="Full Name" value={formData.name} onChange={(val) => setFormData({...formData, name: val})} />
            <InputGroup icon={<Mail size={16} className="text-royal-500 md:w-[18px] md:h-[18px]"/>} label="Email Address" placeholder="email@example.com" value={formData.email} onChange={(val) => setFormData({...formData, email: val})} />
            <InputGroup icon={<Phone size={16} className="text-royal-500 md:w-[18px] md:h-[18px]"/>} label="Phone Number" placeholder="07XXXXXXXX" value={formData.phoneNumber} onChange={(val) => setFormData({...formData, phoneNumber: val})} />
            <InputGroup icon={<Users size={16} className="text-royal-500 md:w-[18px] md:h-[18px]"/>} label="Next of Kin" placeholder="Full Name & Contact" value={formData.nextOfKin} onChange={(val) => setFormData({...formData, nextOfKin: val})} />
            
            <div className="md:col-span-2 pt-6 md:pt-10 flex flex-col sm:flex-row gap-4 md:gap-6">
              <button type="button" onClick={onClose} className="w-full sm:flex-1 py-5 md:py-6 rounded-2xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all border border-slate-100">Discard Changes</button>
              <button type="submit" className="w-full sm:flex-[2] py-5 md:py-6 rounded-2xl md:rounded-3xl font-black text-[10px] uppercase tracking-widest text-white bg-royal-500 hover:bg-royal-600 shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3">Commit Updates <Save size={20}/></button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const InputGroup: React.FC<{ icon: React.ReactNode, label: string, placeholder: string, value: string, onChange: (val: string) => void, type?: string }> = ({ icon, label, placeholder, value, onChange, type = 'text' }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">{icon} {label}</label>
    <input 
      type={type} 
      required 
      placeholder={placeholder} 
      className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 shadow-inner" 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
    />
  </div>
);

const BillStatusBadge: React.FC<{ status: 'PAID' | 'UNPAID' | 'PARTIAL' }> = ({ status }) => {
  const variants = {
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm',
    UNPAID: 'bg-rose-50 text-rose-700 border-rose-100 shadow-sm',
    PARTIAL: 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm',
  };
  return <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-xl border transition-all hover:scale-105 ${variants[status]}`}>{status}</span>;
};

const StatusBadge: React.FC<{ status: HouseStatus, maintenance?: MaintenanceStatus }> = ({ status, maintenance }) => {
  const variants = {
    [HouseStatus.RENTED]: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    [HouseStatus.VACANT]: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  
  return (
    <div className="flex gap-2">
      <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-xl border transition-all hover:scale-105 ${variants[status]}`}>{status.replace('_', ' ')}</span>
      {maintenance === MaintenanceStatus.UNDER_REPAIR && (
        <span className="text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-xl border bg-rose-50 text-rose-700 border-rose-100 transition-all hover:scale-105 flex items-center gap-1">
          <Wrench size={10} /> Under Repair
        </span>
      )}
    </div>
  );
};

const HouseDetailModal: React.FC<{ house: House, onClose: () => void, currentTenant?: Tenant, onUpdateStatus: (s: HouseStatus, m: MaintenanceStatus, r?: Repair) => void, onViewTenant?: (t: Tenant) => void }> = ({ house, onClose, currentTenant, onUpdateStatus, onViewTenant }) => {
  const [pendingStatus, setPendingStatus] = useState<HouseStatus | null>(null);
  const [pendingMaintenance, setPendingMaintenance] = useState<MaintenanceStatus | null>(null);
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [repairData, setRepairData] = useState({ description: '', cost: '', category: 'General' });
  const [activeViewTab, setActiveViewTab] = useState<'maintenance' | 'utility'>('maintenance');

  const handleCommit = () => {
    const nextStatus = pendingStatus || house.status;
    const nextMaintenance = pendingMaintenance || house.maintenanceStatus;

    if (nextMaintenance === MaintenanceStatus.UNDER_REPAIR && house.maintenanceStatus !== MaintenanceStatus.UNDER_REPAIR) {
      setShowRepairForm(true);
    } else {
      onUpdateStatus(nextStatus, nextMaintenance);
      setPendingStatus(null);
      setPendingMaintenance(null);
    }
  };

  const handleRepairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const repair: Repair = {
      id: `r-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: repairData.description,
      cost: Number(repairData.cost),
      category: repairData.category
    };
    onUpdateStatus(pendingStatus || house.status, MaintenanceStatus.UNDER_REPAIR, repair);
    setShowRepairForm(false);
    setPendingStatus(null);
    setPendingMaintenance(null);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4 bg-slate-900/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-none md:rounded-6xl shadow-premium overflow-hidden animate-slideUp border border-slate-200 flex flex-col h-full md:h-auto md:max-h-[90vh]">
        <div className="bg-slate-900 p-6 md:p-12 text-white flex justify-between items-center relative overflow-hidden shrink-0 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-12">
          <div className="absolute top-0 right-0 p-8 md:p-10 opacity-10 pointer-events-none"><Home size={100} className="md:w-[140px] md:h-[140px]"/></div>
          <div className="relative z-10">
             <h3 className="text-2xl md:text-3xl font-display font-black tracking-tight">Unit {house.houseNumber}</h3>
             <p className="text-slate-400 text-[8px] md:text-[10px] uppercase font-black tracking-[0.2em] mt-1 md:mt-2">{house.type} Profile Protocol</p>
          </div>
          <button type="button" onClick={onClose} className="relative z-30 p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-xl md:rounded-2xl transition-all border border-white/10 cursor-pointer">
            <X size={20} className="md:w-6 md:h-6" />
          </button>
        </div>

        <div className="p-8 md:p-12 space-y-8 md:space-y-10 overflow-y-auto scrollbar-hide">
          {!showRepairForm ? (
            <>
              <div className="grid grid-cols-2 gap-6 md:gap-10">
                <div className="space-y-2">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Inventory Status</p>
                  <StatusBadge status={house.status} maintenance={house.maintenanceStatus} />
                </div>
                <div className="space-y-2">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Lifetime Yield</p>
                  <p className="text-xl md:text-2xl font-display font-black text-slate-900 tracking-tight">KES {house.totalEarnings.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-6 md:space-y-8">
                <div className="space-y-4">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 tracking-[0.2em]"><RefreshCw size={14} className="text-royal-500"/> Occupancy Control</p>
                  <div className="flex gap-3 md:gap-4">
                    <UnitStatusBtn 
                      active={(pendingStatus || house.status) === HouseStatus.RENTED} 
                      onClick={() => setPendingStatus(HouseStatus.RENTED)} 
                      color="green" 
                      label="Rented" 
                      icon={<CheckCircle2 size={18} className="md:w-5 md:h-5"/>} 
                    />
                    <UnitStatusBtn 
                      active={(pendingStatus || house.status) === HouseStatus.VACANT} 
                      onClick={() => setPendingStatus(HouseStatus.VACANT)} 
                      color="amber" 
                      label="Vacant" 
                      icon={<CircleDashed size={18} className="md:w-5 md:h-5"/>} 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 tracking-[0.2em]"><Wrench size={14} className="text-rose-500"/> Maintenance Status</p>
                  <div className="flex gap-3 md:gap-4">
                    <UnitStatusBtn 
                      active={(pendingMaintenance || house.maintenanceStatus) === MaintenanceStatus.NONE} 
                      onClick={() => setPendingMaintenance(MaintenanceStatus.NONE)} 
                      color="green" 
                      label="Normal Ops" 
                      icon={<ShieldCheck size={18} className="md:w-5 md:h-5"/>} 
                    />
                    <UnitStatusBtn 
                      active={(pendingMaintenance || house.maintenanceStatus) === MaintenanceStatus.UNDER_REPAIR} 
                      onClick={() => setPendingMaintenance(MaintenanceStatus.UNDER_REPAIR)} 
                      color="red" 
                      label="Under Repair" 
                      icon={<Hammer size={18} className="md:w-5 md:h-5"/>} 
                    />
                  </div>
                </div>

                {(pendingStatus || pendingMaintenance) && (
                  <div className="animate-slideUp bg-slate-900 p-2 md:p-3 rounded-2xl md:rounded-3xl flex items-center justify-between pl-4 md:pl-8 shadow-2xl border border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-royal-400 text-[6px] md:text-[8px] font-black uppercase tracking-[0.2em] mb-0.5">Staging Protocol</span>
                      <span className="text-white text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                        {pendingStatus && pendingStatus !== house.status && `Occupancy: ${pendingStatus} `}
                        {pendingMaintenance && pendingMaintenance !== house.maintenanceStatus && `Maintenance: ${pendingMaintenance.replace('_', ' ')}`}
                      </span>
                    </div>
                    <button 
                      type="button"
                      onClick={handleCommit}
                      className="bg-royal-500 text-white px-5 md:px-10 py-3 md:py-5 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[11px] uppercase tracking-widest hover:bg-royal-600 active:scale-95 transition-all shadow-glow flex items-center gap-3"
                    >
                      Commit Sequence <Check size={18} />
                    </button>
                  </div>
                )}
              </div>

              {currentTenant ? (
                <div className="bg-slate-50 p-6 md:p-8 rounded-3xl md:rounded-4xl border border-slate-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 md:p-6 opacity-5 text-royal-500 group-hover:scale-110 transition-transform duration-500"><User size={64} className="md:w-20 md:h-20"/></div>
                  <p className="text-[8px] md:text-[10px] font-black text-royal-500 uppercase tracking-widest mb-3 md:mb-4">Current Resident Intelligence</p>
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <p className="font-display text-lg md:text-xl font-black text-slate-900 tracking-tight">{currentTenant.name}</p>
                      <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">{currentTenant.phoneNumber}</p>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4">
                       <BillStatusBadge status={currentTenant.bills.status} />
                       <button 
                        type="button"
                        onClick={() => onViewTenant?.(currentTenant)}
                        className="p-3 md:p-4 bg-white text-royal-500 rounded-xl md:rounded-2xl hover:bg-royal-500 hover:text-white transition-all border border-slate-200 shadow-premium active:scale-90"
                        title="View Profile Intelligence"
                      >
                        <User size={18} className="md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 p-6 md:p-8 rounded-3xl md:rounded-4xl border border-amber-100 flex items-center gap-3 md:gap-4">
                  <div className="p-2.5 md:p-3 bg-white rounded-xl md:rounded-2xl shadow-sm text-amber-500"><AlertTriangle size={20} className="md:w-6 md:h-6" /></div>
                  <div>
                    <p className="text-xs md:text-sm font-black text-amber-900 uppercase tracking-tight">Unit Unoccupied</p>
                    <p className="text-[9px] md:text-[10px] text-amber-600 font-medium mt-0.5">Asset is currently non-yielding</p>
                  </div>
                </div>
              )}

              <div className="space-y-6 md:space-y-8 pt-2 md:pt-4">
                <div className="flex bg-slate-100 p-1 rounded-xl md:rounded-2xl w-fit">
                   <button 
                    type="button"
                    onClick={() => setActiveViewTab('maintenance')}
                    className={`px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeViewTab === 'maintenance' ? 'bg-white text-royal-500 shadow-premium' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     Maintenance
                   </button>
                   <button 
                    type="button"
                    onClick={() => setActiveViewTab('utility')}
                    className={`px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeViewTab === 'utility' ? 'bg-white text-royal-500 shadow-premium' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     Utility Audit
                   </button>
                </div>

                <div className="min-h-[200px]">
                  {activeViewTab === 'maintenance' && (
                    <div className="space-y-4 animate-fadeIn">
                      {house.repairs.length > 0 ? (
                        house.repairs.map(r => (
                          <div key={r.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-slate-200 transition-all group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 group-hover:text-royal-500 transition-colors">
                                <Wrench size={18}/>
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800">{r.description}</p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{r.date} • {r.category}</p>
                              </div>
                            </div>
                            <p className="text-sm font-black text-slate-900">KES {r.cost.toLocaleString()}</p>
                          </div>
                        ))
                      ) : (
                        <div className="py-16 text-center bg-slate-50 rounded-4xl border-2 border-dashed border-slate-100 text-slate-400 font-medium text-xs">
                          No maintenance records for this unit.
                        </div>
                      )}
                    </div>
                  )}

                  {activeViewTab === 'utility' && (
                    <div className="space-y-4 animate-fadeIn">
                      {currentTenant && (currentTenant.meterReadings || []).length > 0 ? (
                        (currentTenant.meterReadings || []).map(mr => (
                          <div key={mr.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-cyan-200 transition-all group">
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600 border border-cyan-100 group-hover:scale-110 transition-transform shadow-sm">
                                 <ArrowUp size={20}/>
                              </div>
                              <div>
                                 <p className="text-xs font-black text-slate-800">{mr.date}</p>
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mt-1">Reading: {mr.reading} • Δ {mr.unitsConsumed} units</p>
                              </div>
                            </div>
                            <div className="text-right">
                               <p className="text-sm font-black text-slate-900">KES {mr.cost.toLocaleString()}</p>
                               <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1">Archived</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-16 text-center bg-slate-50 rounded-4xl border-2 border-dashed border-slate-100 text-slate-400 font-medium text-xs">
                          {currentTenant ? "No utility history for current resident." : "No utility history available for this vacant unit."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="animate-fadeIn space-y-10">
              <div className="bg-rose-50 p-8 rounded-4xl border border-rose-100 flex items-center gap-5">
                <div className="p-4 bg-white rounded-2xl shadow-sm text-rose-500"><Wrench size={32} /></div>
                <div>
                  <h4 className="font-display text-xl font-black text-rose-900 tracking-tight">Log Maintenance Event</h4>
                  <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest mt-1">Unit {house.houseNumber} will be set to 'Under Repair'</p>
                </div>
              </div>

              <form onSubmit={handleRepairSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Repair Description</label>
                  <textarea 
                    required 
                    className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-4xl focus:border-rose-500 outline-none transition-all text-sm font-medium text-slate-700 h-40 shadow-inner" 
                    placeholder="Describe the damages or maintenance required..."
                    value={repairData.description}
                    onChange={e => setRepairData({...repairData, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14}/> Estimated Cost (KES)</label>
                    <input 
                      type="number" 
                      required 
                      className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl focus:border-rose-500 outline-none transition-all text-sm font-bold text-slate-700 shadow-inner" 
                      placeholder="0.00"
                      value={repairData.cost}
                      onChange={e => setRepairData({...repairData, cost: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Zap size={14}/> Category</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl focus:border-rose-500 outline-none transition-all text-sm font-bold text-slate-700 appearance-none shadow-inner"
                        value={repairData.category}
                        onChange={e => setRepairData({...repairData, category: e.target.value})}
                      >
                        <option value="General">General</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Painting">Painting</option>
                        <option value="Carpentry">Carpentry</option>
                        <option value="Other">Other</option>
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-6 pt-6">
                  <button 
                    type="button" 
                    onClick={() => { setShowRepairForm(false); setPendingStatus(null); }}
                    className="flex-1 py-6 rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-slate-100"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest py-6 rounded-3xl shadow-premium active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    Confirm & Start Repair <Wrench size={18}/>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TenantIntelligenceModal: React.FC<{ tenant: Tenant, payments: PaymentRecord[], onClose: () => void, onNotify?: () => void, onEdit?: () => void }> = ({ tenant, payments, onClose, onNotify, onEdit }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'analysis'>('overview');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

  const handleRunAnalysis = async () => {
    setLoadingAI(true);
    try {
      const insight = await analyzeTenantFinancials(tenant.name, tenant.bills, payments);
      setAiInsight(insight);
    } catch (err) { console.error(err); }
    finally { setLoadingAI(false); }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4 bg-neutral-900/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-none md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-full md:h-auto md:max-h-[95vh] animate-slideUp">
        <div className="bg-neutral-900 p-3 md:p-6 text-white relative overflow-hidden border-b border-neutral-800 shrink-0 pt-[calc(0.5rem+env(safe-area-inset-top))] md:pt-6">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-royal-500 pointer-events-none"><UserCheck size={120} className="md:w-[180px] md:h-[180px]"/></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-neutral-800 rounded-lg md:rounded-2xl flex items-center justify-center border border-royal-500/20 text-royal-300 shadow-lg">
                <User size={20} className="md:w-7 md:h-7" />
              </div>
              <div>
                <h2 className="text-lg md:text-2xl font-royal text-royal-100 font-black tracking-tight leading-tight">{tenant.name}</h2>
                <div className="flex items-center gap-2 mt-0.5 text-neutral-400 text-[9px] md:text-xs font-medium">
                  <span className="flex items-center gap-1"><Home size={10} className="text-royal-400"/> {tenant.houseNumber}</span>
                  <span className="text-neutral-700">•</span>
                  <span className="flex items-center gap-1"><Clock size={10} className="text-amber-400"/> {tenant.joinDate}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
               <button type="button" onClick={onEdit} className="p-2 md:p-3 bg-white/5 hover:bg-white/10 text-white rounded-lg md:rounded-xl transition-all border border-white/5 active:scale-90" title="Edit Profile">
                 <Edit3 size={14} className="md:w-4 md:h-4" />
               </button>
               <button type="button" onClick={onNotify} className="p-2 md:p-3 bg-royal-500 hover:bg-royal-600 text-white rounded-lg md:rounded-xl transition-all shadow-lg shadow-royal-500/20 active:scale-90 group" title="Send SMS Notice">
                 <BellRing size={14} className="md:w-4 md:h-4 group-hover:animate-ring" />
               </button>
               <button type="button" onClick={onClose} className="p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-xl transition-all border border-white/5"><X size={16} className="md:w-5 md:h-5" /></button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-neutral-50/50 scrollbar-hide">
          {activeTab === 'overview' && (
            <div className="space-y-4 md:space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                <IntelligenceMetric 
                  label="LTV (Collected)" 
                  value={`KES ${totalPaid.toLocaleString()}`} 
                  icon={<Wallet size={16} className="text-green-500" />} 
                  subtext={totalPaid > 0 ? `${payments.length} payments recorded` : "No payments recorded yet"}
                />
                <IntelligenceMetric 
                  label="Exposure (Arrears)" 
                  value={`KES ${tenant.bills.total.toLocaleString()}`} 
                  icon={<AlertTriangle size={16} className="text-red-500" />} 
                  highlight 
                  subtext={tenant.bills.total > 0 ? "Outstanding balance" : "Account cleared"}
                />
                <IntelligenceMetric 
                  label="Next Cycle" 
                  value="Nov 1, 2024" 
                  icon={<Calendar size={16} className="text-royal-500" />} 
                  subtext="Upcoming invoice"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-neutral-200 shadow-sm relative overflow-hidden group">
                  <h3 className="text-sm md:text-base font-bold mb-4 md:mb-6 flex items-center gap-2 text-neutral-800"><DollarSign size={16} className="text-green-500"/> Financial Partitioning</h3>
                  <div className="space-y-3 md:space-y-4">
                    <FinancialLine label="Base Rent" value={tenant.bills.rent} max={tenant.bills.rent} color="bg-royal-500" />
                    <FinancialLine label="Water Utility" value={tenant.bills.water} max={2500} color="bg-cyan-500" />
                    <FinancialLine label="Service Levy" value={tenant.bills.garbage} max={tenant.bills.garbage} color="bg-amber-500" />
                    <div className="pt-4 md:pt-6 mt-4 md:mt-6 border-t border-neutral-100 flex justify-between items-center">
                       <span className="text-[9px] md:text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total Liability</span>
                       <span className="text-xl md:text-2xl font-royal font-black text-red-500">KES {tenant.bills.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-neutral-200 shadow-sm relative overflow-hidden">
                   <h3 className="text-sm md:text-base font-bold mb-4 md:mb-6 flex items-center gap-2 text-neutral-800"><History size={16} className="text-royal-500"/> Timeline Milestones</h3>
                   <div className="space-y-3 md:space-y-4 relative before:absolute before:left-[9px] before:top-2 before:bottom-0 before:w-0.5 before:bg-neutral-100">
                      {tenant.incidents?.slice(0, 3).map((incident, i) => (
                        <div key={incident.id} className="flex gap-3 md:gap-4 group">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white relative z-10 transition-colors ${incident.severity === 'high' ? 'bg-red-500' : 'bg-royal-500'}`}>
                            <div className="w-1 h-1 bg-white rounded-full" />
                          </div>
                          <div className="flex-1 pb-3 md:pb-4">
                            <div className="flex justify-between items-center mb-0.5">
                               <span className="text-[7px] md:text-[9px] font-black text-neutral-400 uppercase tracking-widest">{incident.date}</span>
                            </div>
                            <h4 className="font-bold text-neutral-800 text-[10px] md:text-xs">{incident.type.replace('_', ' ')}</h4>
                          </div>
                        </div>
                      ))}
                      {(!tenant.incidents || tenant.incidents.length === 0) && (
                        <div className="py-4 md:py-8 text-center text-neutral-300 italic text-[10px] md:text-xs">No historical events recorded.</div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'ledger' && (
            <div className="bg-white rounded-2xl md:rounded-[3rem] border border-neutral-200 overflow-x-auto shadow-sm">
               <table className="w-full text-left text-xs md:text-sm min-w-[600px]">
                  <thead className="bg-neutral-50 border-b">
                    <tr>
                      <th className="px-6 md:px-10 py-4 md:py-6 text-[10px] md:text-[11px] font-black text-neutral-400 uppercase tracking-widest">Transaction Date</th>
                      <th className="px-6 md:px-10 py-4 md:py-6 text-[10px] md:text-[11px] font-black text-neutral-400 uppercase tracking-widest">Reference Code</th>
                      <th className="px-6 md:px-10 py-4 md:py-6 text-[10px] md:text-[11px] font-black text-neutral-400 uppercase tracking-widest text-center">Modality</th>
                      <th className="px-6 md:px-10 py-4 md:py-6 text-[10px] md:text-[11px] font-black text-neutral-400 uppercase tracking-widest text-right">Amount (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-neutral-50 transition-colors group">
                        <td className="px-6 md:px-10 py-4 md:py-6">
                           <div className="font-bold text-neutral-800">{new Date(p.date).toLocaleDateString()}</div>
                           <div className="text-[8px] md:text-[10px] text-neutral-400 font-bold uppercase">{p.type}</div>
                        </td>
                        <td className="px-6 md:px-10 py-4 md:py-6">
                          <div className="font-mono text-[10px] md:text-xs text-neutral-500 group-hover:text-royal-500 transition-colors">{p.reference}</div>
                        </td>
                        <td className="px-6 md:px-10 py-4 md:py-6 text-center">
                          <span className="bg-neutral-100 text-neutral-600 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase border border-neutral-200">{p.method}</span>
                        </td>
                        <td className="px-6 md:px-10 py-4 md:py-6 text-right font-black text-neutral-900 group-hover:text-green-600 transition-colors">KES {p.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && <tr><td colSpan={4} className="p-16 md:p-32 text-center text-neutral-300 italic">No historical financial footprints.</td></tr>}
                  </tbody>
               </table>
            </div>
          )}
          {activeTab === 'analysis' && (
            <div className="bg-neutral-900 p-10 md:p-20 rounded-3xl md:rounded-[4rem] text-center space-y-8 md:space-y-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-royal-500 to-transparent" />
              <div className="relative z-10 max-w-xl mx-auto space-y-4 md:space-y-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-royal-500/10 rounded-2xl md:rounded-3xl flex items-center justify-center text-royal-500 mx-auto border border-royal-500/20 shadow-inner">
                    <Activity size={32} className={`md:w-10 md:h-10 ${loadingAI ? 'animate-pulse' : ''}`} />
                  </div>
                  <h4 className="text-white text-2xl md:text-3xl font-royal font-black tracking-tight">AI Reliability Auditor</h4>
                  <p className="text-neutral-400 text-base md:text-lg leading-relaxed">System-generated behavioral analysis based on payment periodicity and consumption trends.</p>
                  
                  {aiInsight ? (
                    <div className="mt-8 md:mt-12 bg-white/5 p-8 md:p-12 rounded-2xl md:rounded-[3rem] border border-white/10 text-left animate-fadeIn shadow-2xl relative">
                       <div className="absolute -top-3 md:-top-4 left-6 md:left-10 bg-royal-500 text-white text-[7px] md:text-[8px] font-black px-2 md:px-3 py-1 md:py-1.5 rounded-lg uppercase tracking-[0.2em]">Audit Result</div>
                       <p className="text-royal-100 italic leading-relaxed text-lg md:text-xl font-royal">"{aiInsight}"</p>
                       <div className="flex gap-4 mt-8 md:mt-10 border-t border-white/5 pt-6 md:pt-8">
                          <button type="button" onClick={handleRunAnalysis} className="text-royal-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center gap-2">
                             <RefreshCw size={12} className="md:w-[14px] md:h-[14px]"/> Re-Analyze Engine
                          </button>
                       </div>
                    </div>
                  ) : (
                    <button type="button" onClick={handleRunAnalysis} disabled={loadingAI} className="mt-8 md:mt-12 bg-royal-500 text-white px-8 md:px-12 py-4 md:py-6 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-xs uppercase tracking-[0.3em] hover:bg-royal-600 shadow-2xl shadow-royal-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto">
                      {loadingAI ? <Activity size={16} className="animate-spin md:w-[18px] md:h-[18px]"/> : <ShieldCheck size={16} className="md:w-[18px] md:h-[18px]"/>}
                      {loadingAI ? 'Scanning History...' : 'Run Audit Sequence'}
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Tabs */}
        <div className="bg-neutral-900 p-4 md:p-6 shrink-0 flex justify-center pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-6 border-t border-neutral-800">
           <div className="flex gap-2 md:gap-6 bg-neutral-800/30 p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-neutral-800 w-full md:w-auto overflow-x-auto scrollbar-hide">
             <ModalTab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Vital Signs" icon={<TrendingUp size={14}/>} />
             <ModalTab active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} label="Payment Audit" icon={<Receipt size={14}/>} />
             <ModalTab active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} label="Risk Engine" icon={<Activity size={14}/>} />
           </div>
        </div>
      </div>
    </div>
  );
};

const ModalTab: React.FC<{ active: boolean, onClick: () => void, label: string, icon: React.ReactNode }> = ({ active, onClick, label, icon }) => (
  <button type="button" onClick={onClick} className={`px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 md:gap-3 ${active ? 'bg-royal-500 text-white shadow-glow' : 'text-slate-500 hover:text-slate-300'}`}>
    {icon} {label}
  </button>
);

const IntelligenceMetric: React.FC<{ label: string, value: string, icon: React.ReactNode, subtext?: string, highlight?: boolean }> = ({ label, value, icon, subtext, highlight }) => (
  <div className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border bg-white shadow-sm transition-all hover:shadow-md group ${highlight ? 'border-rose-100 ring-2 md:ring-4 ring-rose-500/5' : 'border-slate-100'}`}>
    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
      <div className="p-2 md:p-2.5 bg-slate-50 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform duration-500">{icon}</div>
      <span className="text-[7px] md:text-[9px] uppercase font-black tracking-[0.15em] text-slate-400">{label}</span>
    </div>
    <div className={`text-lg md:text-2xl font-black font-display tracking-tight truncate ${highlight ? 'text-rose-500' : 'text-slate-900'}`}>{value}</div>
    {subtext && <div className="text-[8px] md:text-[10px] text-slate-400 mt-1 font-medium">{subtext}</div>}
  </div>
);

const FinancialLine: React.FC<{ label: string, value: number, max: number, color: string }> = ({ label, value, max, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em]">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-900">KES {value.toLocaleString()}</span>
    </div>
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${Math.min(100, (value/max)*100)}%` }} />
    </div>
  </div>
);

interface SiteSettings {
  waterTariff: number;
  lateFeeGraceDays: number;
  mpesaPaybill: string;
  fineAmount: number;
}

const SiteSettingsModal: React.FC<{
  settings: SiteSettings;
  onClose: () => void;
  onSave: (settings: SiteSettings) => void;
}> = ({ settings, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...settings });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl md:rounded-[3rem] shadow-premium flex flex-col max-h-[90vh] overflow-hidden animate-slideUp border border-slate-200">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><Settings2 size={120}/></div>
          <div className="relative z-10">
            <h3 className="text-xl md:text-2xl font-display font-black tracking-tight">Site Settings</h3>
            <p className="text-royal-400 text-[9px] uppercase font-black tracking-[0.2em] mt-1">Configure global property parameters</p>
          </div>
          <button type="button" onClick={onClose} className="relative z-20 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 active:scale-90 cursor-pointer"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Droplets size={14} className="text-cyan-500" /> Water Tariff (KES per Unit)
            </label>
            <input
              type="number"
              required
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 shadow-inner"
              value={formData.waterTariff}
              onChange={(e) => setFormData({ ...formData, waterTariff: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={14} className="text-amber-500" /> Late Rent Threshold Day
            </label>
            <input
              type="number"
              required
              min="1"
              max="28"
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 shadow-inner"
              value={formData.lateFeeGraceDays}
              onChange={(e) => setFormData({ ...formData, lateFeeGraceDays: Number(e.target.value) })}
            />
            <p className="text-[10px] text-slate-400 italic">Day of the month (e.g. 5th) after which unpaid rent is flagged overdue.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Smartphone size={14} className="text-emerald-500" /> M-Pesa Paybill / Till Number
            </label>
            <input
              type="text"
              required
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 shadow-inner"
              value={formData.mpesaPaybill}
              onChange={(e) => setFormData({ ...formData, mpesaPaybill: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <DollarSign size={14} className="text-rose-500" /> Standard Overdue Penalty (KES)
            </label>
            <input
              type="number"
              required
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:border-royal-500 outline-none transition-all text-sm font-bold text-slate-700 shadow-inner"
              value={formData.fineAmount}
              onChange={(e) => setFormData({ ...formData, fineAmount: Number(e.target.value) })}
            />
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-royal-500 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl hover:bg-royal-600 transition-colors shadow-premium shadow-royal-500/10 cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  status: 'On Duty' | 'Off Duty';
}

const StaffRegistryModal: React.FC<{
  staff: StaffMember[];
  onClose: () => void;
  onUpdateStaff: React.Dispatch<React.SetStateAction<StaffMember[]>>;
}> = ({ staff, onClose, onUpdateStaff }) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'add'>('list');
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: 'Operations Assistant',
    phone: ''
  });

  const handleToggleStatus = (id: string) => {
    onUpdateStaff(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'On Duty' ? 'Off Duty' : 'On Duty' } : s));
  };

  const handleDeleteStaff = (id: string) => {
    onUpdateStaff(prev => prev.filter(s => s.id !== id));
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name.trim() || !newStaff.phone.trim()) return;
    
    const id = `STF${Math.floor(10 + Math.random() * 90)}`;
    onUpdateStaff(prev => [...prev, {
      id,
      name: newStaff.name.trim(),
      role: newStaff.role,
      phone: newStaff.phone.trim(),
      status: 'On Duty'
    }]);

    setNewStaff({ name: '', role: 'Operations Assistant', phone: '' });
    setActiveSubTab('list');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-3xl md:rounded-[3rem] shadow-premium flex flex-col max-h-[85vh] overflow-hidden animate-slideUp border border-slate-200">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><Briefcase size={120}/></div>
          <div className="relative z-10">
            <h3 className="text-xl md:text-2xl font-display font-black tracking-tight">Staff Registry</h3>
            <p className="text-royal-400 text-[9px] uppercase font-black tracking-[0.2em] mt-1">Caretakers & Field Operations Crew</p>
          </div>
          <button type="button" onClick={onClose} className="relative z-20 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 active:scale-90 cursor-pointer"><X size={20} /></button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-100 shrink-0 bg-slate-50/50 p-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('list')}
            className={`flex-1 py-3 text-center text-[10px] uppercase font-black tracking-wider transition-all rounded-xl cursor-pointer ${activeSubTab === 'list' ? 'bg-white text-royal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Crew Index ({staff.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('add')}
            className={`flex-1 py-3 text-center text-[10px] uppercase font-black tracking-wider transition-all rounded-xl cursor-pointer ${activeSubTab === 'add' ? 'bg-white text-royal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Register Crew Member
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeSubTab === 'list' ? (
            <div className="space-y-3">
              {staff.map(s => (
                <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200/50 rounded-xl flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{s.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${s.status === 'On Duty' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-200 text-slate-500'}`}>
                          {s.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold">{s.role} • {s.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(s.id)}
                      className="px-2.5 py-1.5 bg-white text-[8px] font-black uppercase tracking-widest border border-slate-200 rounded-lg hover:border-royal-500 hover:text-royal-500 transition-colors cursor-pointer"
                      title="Toggle Duty Status"
                    >
                      Toggle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStaff(s.id)}
                      className="p-1.5 bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-lg transition-colors cursor-pointer"
                      title="De-register"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {staff.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  No active team members listed. Click 'Register Crew Member' above to populate.
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleAddStaffSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robert Kweli"
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:border-royal-500 outline-none transition-all text-xs font-bold text-slate-700"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Crew Role Designation</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:border-royal-500 outline-none transition-all text-xs font-bold text-slate-700"
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                >
                  <option value="Operations Assistant">Operations Assistant</option>
                  <option value="Electrician & Services">Electrician & Services</option>
                  <option value="Plumbing & Water Ops">Plumbing & Water Ops</option>
                  <option value="Security Officer">Security Officer</option>
                  <option value="Cleaning & Sanitation">Cleaning & Sanitation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +254 700 000 000"
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:border-royal-500 outline-none transition-all text-xs font-bold text-slate-700"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-royal-500 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-royal-600 transition-colors shadow-md shadow-royal-500/10 cursor-pointer"
              >
                Assemble New Staff Member
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
