import React, { useState, useMemo, useEffect } from 'react';
import { Tenant, PaymentRecord, PaymentConfig } from '../types';
import { 
  CreditCard, Wallet, Smartphone, Home, Calendar, ChevronDown, X, Download, 
  Receipt, User, FileText, Crown, Activity, Droplets, ArrowDownRight, Landmark, Info,
  ShieldCheck
} from 'lucide-react';

interface Props {
  tenant: Tenant;
  payments: PaymentRecord[];
  onPay: (payment: PaymentRecord) => void;
  initialTab?: 'payments' | 'profile';
  paymentConfig: PaymentConfig;
}

export const TenantDashboard: React.FC<Props> = ({ tenant, payments, onPay, initialTab = 'profile', paymentConfig }) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'profile'>(initialTab);
  const [isPaying, setIsPaying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(tenant.bills.total);

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const simulatePayment = () => {
    setShowConfirm(false);
    setIsPaying(true);
    setTimeout(() => {
      onPay({
        id: `pay-${Date.now()}`,
        tenantId: tenant.id,
        amount: paymentAmount,
        date: new Date().toISOString(),
        type: 'TOTAL',
        reference: `MPESA-${Math.random().toString(36).substring(7).toUpperCase()}`,
        method: 'M-Pesa'
      });
      setIsPaying(false);
    }, 2000);
  };

  const tenantPayments = useMemo(() => 
    payments.filter(p => p.tenantId === tenant.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [payments, tenant.id]);

  return (
    <div className="space-y-6 md:space-y-10 animate-fadeIn pb-12">
      {showConfirm && <PaymentConfirmationModal amount={paymentAmount} billType="TOTAL" phone={tenant.phoneNumber} onCancel={() => setShowConfirm(false)} onConfirm={simulatePayment} />}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl md:text-5xl font-display font-black text-slate-900 tracking-tight">Resident Portal</h2>
          <p className="text-slate-400 text-[10px] md:text-sm font-medium">Secure access to residency details and financial settlement.</p>
        </div>
        <div className="flex bg-white p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm w-full md:w-fit">
          {(['profile', 'payments'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-royal-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{tab}</button>
          ))}
        </div>
      </div>

      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 animate-slideUp">
          <div className="lg:col-span-2 space-y-6 md:space-y-10">
            {/* Financial Status Hero */}
            <div className="bg-royal-900 p-5 md:p-12 rounded-2xl md:rounded-6xl text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 md:p-12 opacity-5 text-royal-500 group-hover:scale-110 transition-transform duration-700"><Wallet size={120} className="md:w-[240px] md:h-[240px]" /></div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
                <div>
                  <p className="text-[8px] md:text-[10px] font-black text-royal-300 uppercase tracking-[0.3em] mb-1.5 md:mb-4">Current Outstanding Balance</p>
                  <h3 className="text-3xl md:text-6xl font-black tracking-tighter">KES {tenant.bills.total.toLocaleString()}</h3>
                  <div className="mt-3 md:mt-6 flex items-center gap-2 md:gap-3">
                    <span className={`px-2.5 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border ${tenant.bills.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                      {tenant.bills.status}
                    </span>
                    <span className="text-royal-300 text-[8px] md:text-[10px] font-black uppercase tracking-widest">Due by 5th {new Date().toLocaleDateString('en-GB', { month: 'long' })}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setPaymentAmount(tenant.bills.total)}
                  className="w-full md:w-auto bg-white text-royal-900 px-6 md:px-10 py-3.5 md:py-5 rounded-xl md:rounded-3xl font-black text-[9px] md:text-xs uppercase tracking-widest hover:bg-royal-50 transition-all shadow-xl active:scale-95"
                >
                  Pay Full Balance
                </button>
              </div>
            </div>

            <div className="bg-white p-5 md:p-12 rounded-2xl md:rounded-6xl border border-slate-200 shadow-premium overflow-hidden">
               <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-12">
                  <div className="p-2.5 md:p-4 bg-royal-50 rounded-xl md:rounded-2xl text-royal-600 shadow-sm border border-royal-100"><Smartphone size={20} className="md:w-7 md:h-7"/></div>
                  <div>
                    <h3 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight">Settlement Channels</h3>
                    <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest mt-0.5 md:mt-1">Authorized Payment Protocols</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10">
                  {/* M-Pesa Channel */}
                  <div className="bg-slate-900 text-white p-5 md:p-10 rounded-2xl md:rounded-5xl relative overflow-hidden border border-slate-800 shadow-2xl group">
                    <div className="absolute top-0 right-0 p-6 md:p-8 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform duration-700"><Activity size={64} className="md:w-[120px] md:h-[120px]"/></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
                         <span className="bg-emerald-500 text-white text-[8px] md:text-[9px] font-black px-2 md:px-3 py-1 rounded-md md:rounded-lg uppercase tracking-widest shadow-glow">Primary</span>
                         <h4 className="text-lg md:text-xl font-black tracking-tight">Lipa na M-Pesa</h4>
                      </div>
                      <div className="space-y-4 md:space-y-6 border-b border-white/10 pb-6 md:pb-8">
                         <div>
                            <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 mb-1 md:mb-2 tracking-widest">M-Pesa {paymentConfig.mpesaType}</p>
                            <p className="text-2xl md:text-4xl font-black tracking-tighter text-emerald-400">{paymentConfig.mpesaNumber}</p>
                         </div>
                         {paymentConfig.mpesaType === 'PAYBILL' && (
                           <div>
                              <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 mb-1 md:mb-2 tracking-widest">Account Reference</p>
                              <p className="text-2xl md:text-4xl font-black tracking-tighter text-emerald-400">{paymentConfig.mpesaAccountPrefix}{tenant.houseNumber}</p>
                           </div>
                         )}
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 mt-6 md:mt-8 bg-white/5 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/5">
                         <ShieldCheck className="text-emerald-500 shrink-0 md:w-5 md:h-5" size={18} />
                         <p className="text-[9px] md:text-[10px] text-slate-400 font-medium leading-relaxed">Verified Recipient: <b className="text-white">{paymentConfig.bankAccountName}</b></p>
                      </div>
                    </div>
                  </div>

                  {/* Bank Channel */}
                  <div className="bg-slate-50 p-6 md:p-10 rounded-3xl md:rounded-5xl border border-slate-200 group hover:border-royal-200 transition-all">
                    <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
                       <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg md:rounded-xl flex items-center justify-center text-royal-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform"><Landmark size={16} className="md:w-5 md:h-5"/></div>
                       <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">{paymentConfig.bankName}</h4>
                    </div>
                    <div className="space-y-4 md:space-y-6">
                       <div className="grid grid-cols-2 gap-4 md:gap-6">
                          <div>
                            <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 mb-0.5 md:mb-1 tracking-widest">Bank Paybill</p>
                            <p className="text-lg md:text-xl font-black text-slate-900">{paymentConfig.bankPaybillNumber}</p>
                          </div>
                          <div>
                            <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 mb-0.5 md:mb-1 tracking-widest">Account No</p>
                            <p className="text-lg md:text-xl font-black text-slate-900">{paymentConfig.bankAccountNumber}</p>
                          </div>
                       </div>
                       <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-inner">
                          <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 mb-3 md:mb-4 tracking-widest">Direct Transfer Guide</p>
                          <ul className="space-y-2 md:space-y-3">
                            {[
                              `Select Paybill: ${paymentConfig.bankPaybillNumber}`,
                              `Enter Account: ${paymentConfig.bankAccountNumber}`,
                              `Verify: ${paymentConfig.bankAccountName}`
                            ].map((step, i) => (
                              <li key={i} className="flex items-center gap-2 md:gap-3">
                                <span className="w-4 h-4 md:w-5 md:h-5 bg-royal-50 text-royal-600 rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-black">{i+1}</span>
                                <span className="text-[10px] md:text-[11px] font-bold text-slate-600">{step}</span>
                              </li>
                            ))}
                          </ul>
                       </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Payment History Ledger */}
            <div className="bg-white rounded-3xl md:rounded-6xl border border-slate-200 shadow-premium overflow-hidden">
               <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-3 md:p-4 bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 text-royal-500"><Receipt size={20} className="md:w-6 md:h-6"/></div>
                    <h3 className="font-black text-lg md:text-xl text-slate-900">Payment History</h3>
                  </div>
                  <button className="text-[9px] md:text-[10px] font-black text-royal-500 uppercase tracking-widest hover:underline">Statements</button>
               </div>
               
               {/* Mobile Card View */}
               <div className="block md:hidden divide-y divide-slate-50">
                 {tenantPayments.map(p => (
                   <div key={p.id} className="p-6 space-y-4">
                     <div className="flex justify-between items-start">
                       <span className="font-mono text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.reference}</span>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <div className="flex items-center gap-2">
                         <div className={`p-1.5 rounded-lg ${p.method === 'M-Pesa' ? 'bg-emerald-50 text-emerald-600' : 'bg-royal-50 text-royal-600'}`}>
                           {p.method === 'M-Pesa' ? <Smartphone size={12}/> : <Landmark size={12}/>}
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{p.method}</span>
                       </div>
                       <span className="text-lg font-black text-slate-900">KES {p.amount.toLocaleString()}</span>
                     </div>
                   </div>
                 ))}
                 {tenantPayments.length === 0 && (
                   <div className="p-12 text-center">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No transaction history</p>
                   </div>
                 )}
               </div>

               {/* Desktop Table View */}
               <div className="hidden md:block overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50/50 border-b border-slate-100">
                       <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reference</th>
                       <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                       <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Method</th>
                       <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Date</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {tenantPayments.map(p => (
                       <tr key={p.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                         <td className="px-10 py-8">
                           <span className="font-mono text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.reference}</span>
                         </td>
                         <td className="px-10 py-8">
                           <span className="font-black text-slate-900">KES {p.amount.toLocaleString()}</span>
                         </td>
                         <td className="px-10 py-8">
                           <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${p.method === 'M-Pesa' ? 'bg-emerald-50 text-emerald-600' : 'bg-royal-50 text-royal-600'}`}>
                               {p.method === 'M-Pesa' ? <Smartphone size={14}/> : <Landmark size={14}/>}
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{p.method}</span>
                           </div>
                         </td>
                         <td className="px-10 py-8 text-right">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>

          <div className="space-y-10">
            {/* Quick Pay Card */}
            <div className="bg-slate-900 text-white p-6 md:p-12 rounded-3xl md:rounded-6xl shadow-2xl relative overflow-hidden flex flex-col justify-between md:h-[500px] border border-slate-800 group sticky top-8">
               <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-royal-500/20 rounded-full blur-[100px] pointer-events-none" />
               <div className="relative z-10">
                  <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-12">
                     <div className="w-12 h-12 md:w-14 md:h-14 bg-royal-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-xl shadow-royal-500/20 transition-transform group-hover:scale-110"><Wallet size={24} className="md:w-7 md:h-7"/></div>
                     <div>
                       <h3 className="text-xl md:text-2xl font-black tracking-tight">Initiate STK Push</h3>
                       <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-0.5 md:mt-1">Instant Authorization</p>
                     </div>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); if (paymentAmount > 0) setShowConfirm(true); }} className="space-y-8 md:space-y-10">
                    <div className="space-y-2 md:space-y-3">
                      <label className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] pl-1 block">Transfer Amount (KES)</label>
                      <input 
                        type="number" 
                        value={paymentAmount} 
                        onChange={(e) => setPaymentAmount(Number(e.target.value))} 
                        className="bg-slate-800 border-2 border-slate-700 w-full p-6 md:p-8 rounded-2xl md:rounded-4xl text-royal-500 font-black text-3xl md:text-5xl outline-none focus:border-royal-500 transition-all tracking-tighter shadow-inner" 
                        required 
                        min="1" 
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isPaying || paymentAmount <= 0} 
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-xs md:text-sm uppercase tracking-[0.2em] py-5 md:py-7 rounded-2xl md:rounded-4xl shadow-2xl transition-all active:scale-95 group/btn flex items-center justify-center gap-3 md:gap-4"
                    >
                      {isPaying ? <Activity className="animate-spin" size={18}/> : <Smartphone size={18} className="group-hover/btn:rotate-12 transition-transform"/>}
                      {isPaying ? 'CONNECTING...' : 'SEND PAYMENT PUSH'}
                    </button>
                  </form>
               </div>
               <div className="pt-6 md:pt-8 border-t border-slate-800 text-center relative z-10 mt-8 md:mt-0">
                 <p className="text-[8px] md:text-[9px] text-slate-600 font-black uppercase tracking-[0.4em]">Daraja API Secured Proxy</p>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-8 md:space-y-10 animate-slideUp">
          <div className="bg-royal-900 text-white p-10 md:p-20 rounded-3xl md:rounded-7xl shadow-2xl relative overflow-hidden flex flex-col items-center text-center border border-white/5">
            <div className="absolute top-0 right-0 p-10 md:p-16 opacity-5 text-royal-500"><Crown size={160} className="md:w-[320px] md:h-[320px]" /></div>
            <div className="w-32 h-32 md:w-48 md:h-48 bg-white/5 rounded-3xl md:rounded-6xl flex items-center justify-center border-2 md:border-4 border-royal-500/20 text-royal-400 mb-8 md:mb-12 shadow-2xl relative z-10 backdrop-blur-xl group hover:scale-105 transition-transform duration-500">
              <User size={64} className="md:w-24 md:h-24 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-3xl md:text-6xl font-display font-black text-white mb-4 md:mb-6 relative z-10 tracking-tight">{tenant.name}</h3>
            <p className="text-royal-300 text-[10px] md:text-sm font-black uppercase tracking-[0.5em] relative z-10">Resident Unit {tenant.houseNumber}</p>
            
            <div className="mt-10 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-4xl relative z-10">
               <div className="p-6 md:p-8 bg-white/5 rounded-2xl md:rounded-4xl border border-white/10 backdrop-blur-md">
                  <p className="text-[9px] md:text-[10px] font-black text-royal-400 uppercase tracking-widest mb-1 md:mb-2">Residency Status</p>
                  <p className="text-lg md:text-xl font-black text-white">Active Resident</p>
               </div>
               <div className="p-6 md:p-8 bg-white/5 rounded-2xl md:rounded-4xl border border-white/10 backdrop-blur-md">
                  <p className="text-[9px] md:text-[10px] font-black text-royal-400 uppercase tracking-widest mb-1 md:mb-2">Onboarding Date</p>
                  <p className="text-lg md:text-xl font-black text-white">{new Date(tenant.joinDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
               </div>
               <div className="p-6 md:p-8 bg-white/5 rounded-2xl md:rounded-4xl border border-white/10 backdrop-blur-md">
                  <p className="text-[9px] md:text-[10px] font-black text-royal-400 uppercase tracking-widest mb-1 md:mb-2">Identity Verification</p>
                  <p className="text-lg md:text-xl font-black text-white">Verified: {tenant.idNumber}</p>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <div className="bg-white p-6 md:p-12 rounded-3xl md:rounded-6xl border border-slate-200 shadow-premium">
              <h4 className="text-xl md:text-2xl font-black text-slate-900 mb-8 md:mb-10 flex items-center gap-3 md:gap-4">
                <div className="p-3 md:p-4 bg-royal-50 rounded-xl md:rounded-2xl text-royal-600"><FileText size={20} className="md:w-6 md:h-6"/></div>
                Contact Information
              </h4>
              <div className="space-y-4 md:space-y-8">
                <div className="flex items-center justify-between p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100">
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</span>
                  <span className="font-black text-slate-900 text-sm md:text-base">{tenant.phoneNumber}</span>
                </div>
                <div className="flex items-center justify-between p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100">
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</span>
                  <span className="font-black text-slate-900 text-sm md:text-base">{tenant.email}</span>
                </div>
                <div className="flex items-center justify-between p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100">
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Emergency Contact</span>
                  <span className="font-black text-slate-900 text-sm md:text-base">{tenant.nextOfKin}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-12 rounded-3xl md:rounded-6xl border border-slate-200 shadow-premium relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 md:p-12 opacity-5 text-royal-500"><ShieldCheck size={120} className="md:w-40 md:h-40" /></div>
              <h4 className="text-xl md:text-2xl font-black text-slate-900 mb-8 md:mb-10 flex items-center gap-3 md:gap-4">
                <div className="p-3 md:p-4 bg-emerald-50 rounded-xl md:rounded-2xl text-emerald-600"><ShieldCheck size={20} className="md:w-6 md:h-6"/></div>
                Rental Agreement
              </h4>
              <div className="space-y-6 md:space-y-8 relative z-10">
                <div className="p-6 md:p-8 bg-slate-900 text-white rounded-2xl md:rounded-4xl border border-slate-800">
                  <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 md:mb-4">Digital Contract ID</p>
                  <p className="font-mono text-xs font-black text-emerald-400 mb-4 md:mb-6 break-all">{tenant.agreementUrl}</p>
                  <button className="w-full py-3 md:py-4 bg-white/10 hover:bg-white/20 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 md:gap-3">
                    <Download size={14} className="md:w-4 md:h-4"/> Download Official Copy
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <div className="p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100">
                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Security Deposit</p>
                    <p className="font-black text-slate-900 text-sm md:text-base">KES {tenant.rentAgreement?.depositAmount.toLocaleString()}</p>
                  </div>
                  <div className="p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100">
                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Deposit Status</p>
                    <p className="font-black text-emerald-600 text-sm md:text-base">{tenant.rentAgreement?.depositStatus}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// @fix: Included ShieldCheck in the lucide-react import list above.
const PaymentConfirmationModal: React.FC<{ amount: number, billType: string, phone: string, onCancel: () => void, onConfirm: () => void }> = ({ amount, billType, phone, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-neutral-900/95 backdrop-blur-md animate-fadeIn">
    <div className="bg-white w-full max-w-md rounded-none md:rounded-[3.5rem] shadow-2xl overflow-hidden border border-neutral-200 animate-slideUp flex flex-col h-full md:h-auto">
      <div className="bg-[#32ba43] p-6 md:p-10 text-white flex justify-between items-center relative overflow-hidden pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-10">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Smartphone size={80} className="md:w-[100px] md:h-[100px]"/></div>
        <div className="relative z-10">
          <h3 className="text-xl md:text-2xl font-royal font-black tracking-tight">Confirm Payout</h3>
          <p className="text-green-100 text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-0.5 md:mt-1">M-Pesa STK Authentication</p>
        </div>
        <button type="button" onClick={onCancel} className="relative z-20 p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-xl md:rounded-2xl transition-all shadow-lg cursor-pointer"><X size={20} className="md:w-6 md:h-6" /></button>
      </div>
      <div className="p-8 md:p-12 text-center space-y-8 md:space-y-12">
        <div className="space-y-3 md:space-y-4">
          <p className="text-neutral-400 text-[10px] md:text-[11px] uppercase font-black tracking-[0.2em]">Authorized Transfer Volume</p>
          <div className="text-4xl md:text-6xl font-black text-neutral-900 tracking-tighter">KES {amount.toLocaleString()}</div>
          <div className="text-[9px] md:text-[10px] font-bold text-neutral-500 bg-neutral-50 p-2 rounded-lg md:rounded-xl border border-neutral-100">Destination: Royal Management System</div>
        </div>
        <button onClick={onConfirm} className="w-full bg-[#32ba43] text-white font-black text-xs md:text-sm uppercase tracking-[0.2em] py-5 md:py-6 rounded-2xl md:rounded-[2rem] shadow-2xl shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-3">
          <ShieldCheck size={18} className="md:w-5 md:h-5"/> Authenticate & Send Push
        </button>
        <p className="text-[8px] md:text-[9px] text-neutral-400 uppercase tracking-widest">Verify the prompt on your handset shortly</p>
      </div>
    </div>
  </div>
);