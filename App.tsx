import React, { useState } from 'react';
import { UserRole, Tenant, House, PaymentRecord, Expense, HouseStatus, Repair, MeterReading, PaymentConfig } from './types';
import { INITIAL_TENANTS, INITIAL_HOUSES, INITIAL_PAYMENTS, DEFAULT_PAYMENT_CONFIG } from './constants';
import { Layout } from './components/Layout';
import { CaretakerDashboard } from './components/CaretakerDashboard';
import { LandlordDashboard } from './components/LandlordDashboard';
import { TenantDashboard } from './components/TenantDashboard';
import { Users, ShieldCheck, Key, ArrowRight, Briefcase, User } from 'lucide-react';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [activeView, setActiveView] = useState<string>('overview');
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [houses, setHouses] = useState<House[]>(INITIAL_HOUSES);
  const [payments, setPayments] = useState<PaymentRecord[]>(INITIAL_PAYMENTS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [selectedPropertyName, setSelectedPropertyName] = useState<string | null>(null);
  const [isManagingFullProperty, setIsManagingFullProperty] = useState<boolean>(false);

  const handleAddTenant = (newTenant: Tenant) => {
    setTenants(prev => [...prev, newTenant]);
    setHouses(prev => prev.map(h => h.houseNumber === newTenant.houseNumber ? { ...h, status: HouseStatus.RENTED } : h));
  };

  const handleAddHouse = (newHouse: House) => {
    setHouses(prev => [...prev, newHouse]);
  };

  const handleUpdateTenant = (updatedTenant: Tenant) => {
    setTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
  };

  const handleUpdateBills = (tenantId: string, currentReading: number) => {
    setTenants(prev => prev.map(t => {
      if (t.id === tenantId) {
        const unitsUsed = Math.max(0, currentReading - t.bills.currWaterReading);
        const waterCost = unitsUsed * 120;
        const newTotal = t.bills.rent + waterCost + t.bills.garbage;
        
        const newReading: MeterReading = {
          id: `mr-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          reading: currentReading,
          unitsConsumed: unitsUsed,
          cost: waterCost
        };

        return { 
          ...t, 
          bills: { 
            ...t.bills, 
            water: waterCost, 
            prevWaterReading: t.bills.currWaterReading,
            currWaterReading: currentReading,
            total: newTotal, 
            status: 'UNPAID' 
          },
          meterReadings: [newReading, ...(t.meterReadings || [])]
        };
      }
      return t;
    }));
  };

  const handlePayment = (payment: PaymentRecord) => {
    setPayments(prev => [payment, ...prev]);
    setTenants(prev => prev.map(t => {
      if (t.id === payment.tenantId) {
        const bills = { ...t.bills };
        if (payment.type === 'RENT') bills.rent = Math.max(0, bills.rent - payment.amount);
        else if (payment.type === 'WATER') bills.water = Math.max(0, bills.water - payment.amount);
        else if (payment.type === 'GARBAGE') bills.garbage = Math.max(0, bills.garbage - payment.amount);
        else {
          let rem = payment.amount;
          const waterPay = Math.min(rem, bills.water);
          bills.water -= waterPay;
          rem -= waterPay;
          const garbagePay = Math.min(rem, bills.garbage);
          bills.garbage -= garbagePay;
          rem -= garbagePay;
          bills.rent = Math.max(0, bills.rent - rem);
        }
        bills.total = bills.rent + bills.water + bills.garbage;
        bills.status = bills.total <= 0 ? 'PAID' : 'PARTIAL';
        return { ...t, bills };
      }
      return t;
    }));
  };

  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    setActiveView(
      newRole === UserRole.TENANT 
        ? 'profile' 
        : newRole === UserRole.LANDLORD 
          ? 'overview' 
          : 'properties'
    );
    setSelectedPropertyName(null);
    setIsManagingFullProperty(false);
  };

  const renderContent = () => {
    if (role === UserRole.CARETAKER || (role === UserRole.LANDLORD && activeView === 'water-meters')) {
      return (
        <CaretakerDashboard 
          tenants={tenants} 
          houses={houses}
          payments={payments}
          activeTab={activeView as any}
          selectedPropertyName={selectedPropertyName}
          setSelectedPropertyName={setSelectedPropertyName}
          isManagingFullProperty={isManagingFullProperty}
          setIsManagingFullProperty={setIsManagingFullProperty}
          onAddTenant={handleAddTenant}
          onAddHouse={handleAddHouse}
          onUpdateTenant={handleUpdateTenant}
          onUpdateBills={handleUpdateBills}
          onUpdateHouse={(id, status, maintenanceStatus, repair) => setHouses(prev => prev.map(h => h.id === id ? {
            ...h, 
            status, 
            maintenanceStatus, 
            repairs: repair ? [repair, ...h.repairs] : h.repairs 
          } : h))}
        />
      );
    }
    if (role === UserRole.LANDLORD) {
      return (
        <LandlordDashboard 
          tenants={tenants} 
          houses={houses}
          payments={payments}
          expenses={expenses}
          view={activeView}
          onAddExpense={(e) => setExpenses(prev => [e, ...prev])}
          onUpdateTenant={handleUpdateTenant}
          onAddHouse={handleAddHouse}
          onAddTenant={handleAddTenant}
          onUpdateBills={handleUpdateBills}
          paymentConfig={paymentConfig}
          onUpdatePaymentConfig={setPaymentConfig}
        />
      );
    }
    if (role === UserRole.TENANT) {
      return (
        <TenantDashboard 
          tenant={tenants[0]} 
          payments={payments.filter(p => p.tenantId === tenants[0].id)}
          onPay={handlePayment}
          initialTab={activeView === 'payments' ? 'payments' : 'profile'}
          paymentConfig={paymentConfig}
        />
      );
    }
    return null;
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 bg-royal-500/10 rounded-full blur-[160px] animate-pulse" />
          <div className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 bg-royal-600/10 rounded-full blur-[160px] animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
        </div>

        <div className="mb-24 text-center animate-fadeIn relative z-10">
          <div className="inline-flex items-center gap-3 mb-8 px-6 py-2.5 bg-white/5 rounded-full border border-white/10 backdrop-blur-md shadow-2xl">
            <div className="w-2 h-2 bg-royal-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-royal-400">Enterprise Operations Hub v4.0</span>
          </div>
          <h1 className="text-9xl font-display mb-6 text-white tracking-tighter font-black drop-shadow-2xl">
            ROYAL<span className="text-royal-500">FLATS</span>
          </h1>
          <p className="text-slate-400 uppercase tracking-[0.8em] text-[11px] font-black max-w-lg mx-auto leading-loose opacity-80">
            Intelligent Property Management & Revenue Optimization
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl animate-slideUp z-10">
          <RoleCard 
            title="Landlord" 
            icon={<Briefcase className="w-10 h-10"/>} 
            description="Executive property oversight, financial analytics, cash flow, and administrative tools." 
            onClick={() => handleSetRole(UserRole.LANDLORD)} 
            highlight 
          />
          <RoleCard 
            title="Operations" 
            icon={<ShieldCheck className="w-10 h-10"/>} 
            description="Caretaker control center. Monitor unit occupancy, update meter readings, and manage day-to-day site operations." 
            onClick={() => handleSetRole(UserRole.CARETAKER)} 
          />
          <RoleCard 
            title="Tenant" 
            icon={<User className="w-10 h-10"/>} 
            description="Resident portal. View outstanding bills, confirm M-Pesa payouts, and view tenancy agreements." 
            onClick={() => handleSetRole(UserRole.TENANT)} 
          />
        </div>

        <div className="mt-24 flex items-center gap-6 text-slate-500 text-[10px] font-black uppercase tracking-widest z-10 opacity-40">
          <span>Secure Access Protocol</span>
          <div className="w-1 h-1 bg-slate-700 rounded-full" />
          <span>Encrypted Session</span>
          <div className="w-1 h-1 bg-slate-700 rounded-full" />
          <span>Node 24-B</span>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      role={role} 
      onLogout={() => { 
        setRole(null); 
        setSelectedPropertyName(null); 
        setIsManagingFullProperty(false); 
      }} 
      activeView={activeView} 
      onViewChange={setActiveView}
      isManagingFullProperty={isManagingFullProperty}
    >
      {renderContent()}
    </Layout>
  );
};

const RoleCard: React.FC<{ title: string, icon: React.ReactNode, description: string, onClick: () => void, highlight?: boolean }> = ({ title, icon, description, onClick, highlight }) => (
  <button 
    onClick={onClick} 
    className={`p-14 rounded-[4rem] border transition-all duration-700 text-left group flex flex-col relative overflow-hidden backdrop-blur-sm ${
      highlight 
        ? 'border-royal-500/40 bg-white/[0.03] hover:border-royal-500 shadow-glow' 
        : 'border-white/5 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]'
    }`}
  >
    <div className={`mb-12 p-8 rounded-[2rem] inline-block transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 ${
      highlight ? 'bg-royal-500 text-white shadow-glow' : 'bg-white/5 text-royal-400 border border-white/5'
    }`}>
      {icon}
    </div>
    <h3 className="text-5xl font-display mb-8 text-white font-black tracking-tight group-hover:text-royal-400 transition-colors">{title} Portal</h3>
    <p className="text-slate-400 text-base leading-relaxed mb-12 flex-1 font-medium opacity-80 group-hover:opacity-100 transition-opacity">{description}</p>
    <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] text-royal-500 md:opacity-0 md:group-hover:opacity-100 transition-all duration-700 md:translate-y-4 md:group-hover:translate-y-0">
      Initialize Secure Session <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
    </div>
    
    {/* Subtle hover background glow */}
    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-royal-500/10 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
  </button>
);

export default App;