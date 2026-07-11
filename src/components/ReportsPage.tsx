import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, TrendingUp, TrendingDown, Users, Car as CarIcon,
  DollarSign, AlertTriangle, BarChart3, Activity, Loader2, Wrench,
  ShieldCheck, Droplets, Link as LinkIcon, ChevronDown, ChevronUp,
  Phone, MapPin, Briefcase, CreditCard, AlertCircle, Clock,
  Building, Star, FileText, Printer
} from 'lucide-react';
import {
  Language, Car, Client, ReservationDetails, Worker,
  StoreExpense, VehicleExpense, MaintenanceAlert, WebsiteOrder, ExpenseType
} from '../types';
import { DatabaseService } from '../services/DatabaseService';
import { ReservationsService } from '../services/ReservationsService';
import { getVehicleExpenses } from '../services/expenseService';
import { generateReportHTML } from './ReportPrintTemplate';

// ── helpers ──────────────────────────────────────────────────────────────────
const T  = (fr: string, ar: string, lang: Language) => lang === 'fr' ? fr : ar;
const fmt  = (n: number) => Math.round(n || 0).toLocaleString('fr-DZ');
const fmtD = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d || ''; } };

/**
 * Returns the YYYY-MM-DD part from any date string (ISO or date-only).
 * Used for robust string-based date comparison.
 */
const dateKey = (d: string) => (d || '').substring(0, 10);

/**
 * True when the date falls inside [startDate, endDate] (both inclusive).
 * Uses simple string comparison on YYYY-MM-DD prefix – avoids timezone bugs.
 */
const inRange = (dateStr: string, startDate: string, endDate: string): boolean => {
  if (!dateStr) return false;
  const d = dateKey(dateStr);
  return (!startDate || d >= startDate) && (!endDate || d <= endDate);
};

/**
 * Actual money collected on a reservation:
 *   1. Sum of payment records (most accurate – includes over-payments)
 *   2. Fallback: totalPrice - remainingPayment
 */
const calcPaid = (r: ReservationDetails): number => {
  const payments = (r.payments || []) as any[];
  if (payments.length > 0) {
    const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    if (total > 0) return total;
  }
  return Math.max(0, (Number(r.totalPrice) || 0) - (Number(r.remainingPayment) || 0));
};

// Expense type metadata
const EXPENSE_META: Record<ExpenseType, { fr: string; ar: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  vidange:   { fr:'Vidange',          ar:'تغيير الزيت', icon:<Droplets size={13}/>,    color:'text-amber-700',  bg:'bg-amber-50',   border:'border-amber-200' },
  assurance: { fr:'Assurance',        ar:'تأمين',        icon:<ShieldCheck size={13}/>, color:'text-blue-700',   bg:'bg-blue-50',    border:'border-blue-200' },
  controle:  { fr:'Contrôle Tech.',   ar:'معاينة تقنية',icon:<Activity size={13}/>,    color:'text-purple-700', bg:'bg-purple-50',  border:'border-purple-200' },
  chaine:    { fr:'Chaîne',           ar:'السلسلة',      icon:<LinkIcon size={13}/>,    color:'text-teal-700',   bg:'bg-teal-50',    border:'border-teal-200' },
  autre:     { fr:'Autre',            ar:'أخرى',         icon:<Wrench size={13}/>,      color:'text-gray-700',   bg:'bg-gray-50',    border:'border-gray-200' },
};

// Status badge
const statusCls = (s: string) => ({
  completed: 'bg-green-100 text-green-700 border-green-200',
  active:    'bg-blue-100 text-blue-700 border-blue-200',
  confirmed: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  accepted:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}[s] || 'bg-gray-100 text-gray-600 border-gray-200');

// ── Car accordion block ───────────────────────────────────────────────────────
interface CarBlockProps {
  car: Car;
  reservations: ReservationDetails[];
  expenses: VehicleExpense[];
  lang: Language;
  idx: number;
}

const CarBlock: React.FC<CarBlockProps> = ({ car, reservations, expenses, lang, idx }) => {
  const [open,    setOpen]    = useState(false);
  const [openRes, setOpenRes] = useState<string | null>(null);

  // Only non-cancelled reservations contribute to gains
  const activeRes      = reservations.filter(r => r.status !== 'cancelled');
  const totalCollected = activeRes.reduce((s, r) => s + calcPaid(r), 0);
  const totalFaced     = activeRes.reduce((s, r) => s + (Number(r.totalPrice) || 0), 0);
  const totalDebt      = reservations
    .filter(r => !['completed','cancelled'].includes(r.status))
    .reduce((s, r) => s + (Number(r.remainingPayment) || 0), 0);
  const totalExpenses  = expenses.reduce((s, e) => s + (Number(e.cost) || 0), 0);
  const netBenefit     = totalCollected - totalExpenses;

  // Group expenses by type
  const byType = (Object.keys(EXPENSE_META) as ExpenseType[]).reduce((acc, k) => {
    const g = expenses.filter(e => e.type === k);
    if (g.length) acc[k] = g;
    return acc;
  }, {} as Record<ExpenseType, VehicleExpense[]>);

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      transition={{ delay: idx * 0.05 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── Header button ── */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          {/* Car image */}
          <div className="w-16 h-11 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-100">
            <img src={car.images?.[0] || 'https://picsum.photos/seed/car/400/300'} alt=""
              className="w-full h-full object-cover"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-sm uppercase tracking-tight">{car.brand} {car.model}</p>
            <p className="text-xs text-blue-600 font-bold">{car.registration}</p>
          </div>
          {/* Mini stats — desktop */}
          <div className="hidden sm:flex gap-4 text-xs mr-2">
            <div className="text-right">
              <p className="text-gray-400 font-semibold">{T('Encaissé','المحصّل',lang)}</p>
              <p className="font-black text-emerald-600">+{fmt(totalCollected)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 font-semibold">{T('Dépenses','المصاريف',lang)}</p>
              <p className="font-black text-red-500">-{fmt(totalExpenses)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 font-semibold">{T('Net','الصافي',lang)}</p>
              <p className={`font-black ${netBenefit>=0?'text-blue-600':'text-orange-600'}`}>
                {netBenefit>=0?'+':''}{fmt(netBenefit)}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-400 font-semibold mr-1">
            {reservations.length} {T('loc.','إيجار',lang)}
          </div>
          {open ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
        </div>
        {/* Mobile stats */}
        <div className="sm:hidden mt-2 flex gap-2 flex-wrap text-[10px] font-bold">
          <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200">+{fmt(totalCollected)} DZD</span>
          <span className="bg-red-50 text-red-600 px-2 py-1 rounded-lg border border-red-200">-{fmt(totalExpenses)} DZD</span>
          <span className={`px-2 py-1 rounded-lg border ${netBenefit>=0?'bg-blue-50 text-blue-700 border-blue-200':'bg-orange-50 text-orange-600 border-orange-200'}`}>
            {netBenefit>=0?'+':''}{fmt(netBenefit)} DZD
          </span>
        </div>
      </button>

      {/* ── Expanded content ── */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }} transition={{ duration:0.28 }}
            className="overflow-hidden border-t border-gray-100">
            <div className="p-4 bg-gray-50 space-y-4">

              {/* KPI row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l:T('Encaissé','المحصّل',lang),        v:`+${fmt(totalCollected)}`, c:'from-emerald-500 to-teal-600' },
                  { l:T('Dépenses','المصاريف',lang),       v:`-${fmt(totalExpenses)}`,  c:'from-red-500 to-rose-600' },
                  { l:T('Bénéfice Net','صافي الأرباح',lang),v:`${netBenefit>=0?'+':''}${fmt(netBenefit)}`, c:netBenefit>=0?'from-blue-600 to-indigo-700':'from-orange-500 to-red-600' },
                ].map((k,i) => (
                  <div key={i} className={`bg-gradient-to-br ${k.c} rounded-xl p-3 text-white text-center`}>
                    <p className="text-[9px] font-bold text-white/70 uppercase">{k.l}</p>
                    <p className="text-base font-black mt-0.5">{k.v}</p>
                    <p className="text-[9px] text-white/50">DZD</p>
                  </div>
                ))}
              </div>

              {/* ── Reservations list ── */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar size={11}/> {T('Locations','الإيجارات',lang)} ({reservations.length})
                  </span>
                  <div className="text-xs text-right">
                    <span className="font-black text-emerald-700">+{fmt(totalCollected)} DZD</span>
                    {totalDebt>0 && <span className="text-orange-600 font-bold ml-2">/ {fmt(totalDebt)} {T('reste','متبقي',lang)}</span>}
                  </div>
                </div>

                {reservations.length === 0 ? (
                  <p className="py-5 text-center text-xs text-gray-400 font-semibold">
                    {T('Aucune location pour cette période','لا توجد إيجارات لهذه الفترة',lang)}
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {reservations.map((r, ri) => {
                      const paid = calcPaid(r);
                      const debt = Number(r.remainingPayment) || 0;
                      const total= Number(r.totalPrice) || 0;
                      const isOpen = openRes === r.id;
                      return (
                        <div key={r.id}>
                          <button onClick={() => setOpenRes(isOpen ? null : r.id)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-black text-[10px] flex items-center justify-center flex-shrink-0">
                              {ri+1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 text-xs truncate">
                                {r.client?.firstName} {r.client?.lastName}
                              </p>
                              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Clock size={8}/> {r.step1?.departureDate} → {r.step1?.returnDate}
                                <span className="font-bold text-gray-500"> {r.totalDays}j</span>
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 space-y-0.5 mr-1">
                              <p className="text-[10px] font-black text-emerald-600">✓ {fmt(paid)} DZD</p>
                              {debt>0 && <p className="text-[10px] font-bold text-orange-500">⏳ {fmt(debt)} DZD</p>}
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border inline-block ${statusCls(r.status)}`}>
                                {r.status}
                              </span>
                            </div>
                            {isOpen ? <ChevronUp size={13} className="text-gray-300"/> : <ChevronDown size={13} className="text-gray-300"/>}
                          </button>

                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                                exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }} className="overflow-hidden">
                                <div className="px-4 pb-3 bg-emerald-50/40">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] mt-2">
                                    {[
                                      { l:T('Total Facturé','الإجمالي',lang), v:fmt(total),   c:'text-gray-800' },
                                      { l:T('Avance Initiale','الأولى',lang), v:fmt(Number(r.advancePayment)||0), c:'text-blue-700' },
                                      { l:T('Montant Encaissé','المحصّل',lang), v:fmt(paid),  c:'text-emerald-700' },
                                      { l:T('Reste à Payer','المتبقي',lang),  v:fmt(debt),   c:debt>0?'text-orange-600':'text-green-600' },
                                    ].map((item,i)=>(
                                      <div key={i} className="bg-white rounded-lg border border-gray-200 p-2">
                                        <p className="text-gray-400 font-semibold">{item.l}</p>
                                        <p className={`font-black ${item.c}`}>{item.v} DZD</p>
                                      </div>
                                    ))}
                                  </div>
                                  {/* Individual payments */}
                                  {r.payments && r.payments.length>0 && (
                                    <div className="mt-2 space-y-1">
                                      <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                                        <CreditCard size={9}/> {T('Paiements enregistrés','المدفوعات المسجلة',lang)}
                                      </p>
                                      {(r.payments as any[]).map((p,pi)=>(
                                        <div key={p.id||pi} className="flex justify-between bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 text-[10px]">
                                          <span className="text-gray-500">{fmtD(p.date)} · {p.paymentMethod||p.payment_method||'cash'}</span>
                                          <span className="font-black text-emerald-600">+{fmt(Number(p.amount)||0)} DZD</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {(Number(r.additionalFees)||0)>0 && (
                                    <div className="mt-1 text-[10px] bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 flex justify-between">
                                      <span className="text-gray-500">{T('Frais Supplémentaires','رسوم إضافية',lang)}</span>
                                      <span className="font-black text-red-600">+{fmt(Number(r.additionalFees))} DZD</span>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}

                {reservations.length>0 && (
                  <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-2.5 grid grid-cols-3 text-[10px] gap-2">
                    <div><p className="text-gray-400">{T('Facturé','المفاتر',lang)}</p><p className="font-black text-gray-700">{fmt(totalFaced)} DZD</p></div>
                    <div><p className="text-gray-400">{T('Encaissé','المحصّل',lang)}</p><p className="font-black text-emerald-700">+{fmt(totalCollected)} DZD</p></div>
                    <div><p className="text-gray-400">{T('Dettes','الديون',lang)}</p><p className={`font-black ${totalDebt>0?'text-orange-600':'text-green-600'}`}>{fmt(totalDebt)} DZD</p></div>
                  </div>
                )}
              </div>

              {/* ── Expenses by type ── */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-red-50 border-b border-red-100 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-black text-red-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Wrench size={11}/> {T('Dépenses','المصاريف',lang)} ({expenses.length})
                  </span>
                  <span className="text-xs font-black text-red-700">-{fmt(totalExpenses)} DZD</span>
                </div>
                {expenses.length===0 ? (
                  <p className="py-5 text-center text-xs text-gray-400 font-semibold">
                    {T('Aucune dépense','لا توجد مصاريف',lang)}
                  </p>
                ) : (
                  <>
                    {(Object.entries(byType) as [ExpenseType, VehicleExpense[]][]).map(([type, group])=>{
                      const meta = EXPENSE_META[type];
                      const sub  = group.reduce((s,e)=>s+(Number(e.cost)||0),0);
                      return (
                        <div key={type}>
                          <div className={`px-4 py-2 flex items-center justify-between border-b border-gray-50 ${meta.bg}`}>
                            <span className={`text-xs font-bold flex items-center gap-1.5 ${meta.color}`}>
                              {meta.icon} {lang==='fr'?meta.fr:meta.ar} ({group.length})
                            </span>
                            <span className={`text-xs font-black ${meta.color}`}>-{fmt(sub)} DZD</span>
                          </div>
                          {group.map(e=>(
                            <div key={e.id} className="px-6 py-2 flex items-start justify-between text-[10px] border-b border-gray-50 last:border-0 hover:bg-gray-50">
                              <div>
                                <p className="font-semibold text-gray-700">{e.expenseName||(lang==='fr'?meta.fr:meta.ar)}</p>
                                <p className="text-gray-400 flex items-center gap-1 mt-0.5">
                                  <Calendar size={8}/> {e.date}
                                  {e.currentMileage ? ` · ${fmt(e.currentMileage)} km` : ''}
                                  {e.note ? ` · ${e.note}` : ''}
                                </p>
                              </div>
                              <span className={`font-black ml-3 flex-shrink-0 ${meta.color}`}>-{fmt(Number(e.cost))} DZD</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    <div className="bg-red-50 px-4 py-2.5 flex justify-between text-xs border-t border-red-100">
                      <span className="font-bold text-red-700">{T('Total Dépenses','إجمالي المصاريف',lang)}</span>
                      <span className="font-black text-red-700">-{fmt(totalExpenses)} DZD</span>
                    </div>
                  </>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Report data type ──────────────────────────────────────────────────────────
interface ReportData {
  clients:         Client[];
  reservations:    ReservationDetails[];
  cars:            Car[];
  workers:         Worker[];
  storeExpenses:   StoreExpense[];
  vehicleExpenses: VehicleExpense[];
  alerts:          MaintenanceAlert[];
  websiteOrders:   WebsiteOrder[];
}

// ── Main page ─────────────────────────────────────────────────────────────────
const ReportsPage: React.FC<{ lang: Language }> = ({ lang }) => {
  const [startDate,    setStartDate]    = useState('');
  const [endDate,      setEndDate]      = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [data,         setData]         = useState<ReportData | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [openSection,  setOpenSection]  = useState<string | null>('cars');

  // ── Generate ────────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!startDate || !endDate) {
      alert(T('Sélectionnez les deux dates.','اختر تاريخ البداية والنهاية.',lang));
      return;
    }
    setIsGenerating(true); setError(null); setData(null);

    try {
      // ── Fetch all data in parallel ──────────────────────────────────────
      let clients: Client[]                 = [];
      let reservations: ReservationDetails[]= [];
      let cars: Car[]                       = [];
      let workers: Worker[]                 = [];
      let storeExpenses: StoreExpense[]     = [];
      let vehicleExpenses: VehicleExpense[] = [];
      let alerts: MaintenanceAlert[]        = [];
      let websiteOrders: WebsiteOrder[]     = [];

      await Promise.all([
        // ✅ USE ReservationsService – it maps snake_case → camelCase correctly
        ReservationsService.getReservations()
          .then(d => reservations = d)
          .catch(e => console.warn('reservations fetch failed:', e)),

        DatabaseService.getClients()
          .then(d => clients = d)
          .catch(() => {}),

        DatabaseService.getCars()
          .then(d => cars = d)
          .catch(() => {}),

        DatabaseService.getWorkers()
          .then(d => workers = d)
          .catch(() => {}),

        DatabaseService.getStoreExpenses()
          .then(d => storeExpenses = d)
          .catch(() => {}),

        getVehicleExpenses()
          .then(r => vehicleExpenses = r.expenses || [])
          .catch(() => {}),

        DatabaseService.getMaintenanceAlerts()
          .then(d => alerts = d)
          .catch(() => {}),

        DatabaseService.getWebsiteOrders()
          .then(d => websiteOrders = d)
          .catch(() => {}),
      ]);

      // ── Apply date filter ──────────────────────────────────────────────
      // For reservations: filter by departure_date (step1.departureDate)
      // For expenses/orders/alerts: filter by their own date field
      // String comparison on YYYY-MM-DD avoids timezone bugs

      const ir = (d: string) => inRange(d, startDate, endDate);

      setData({
        clients,           // keep all clients (for stats cross-reference)
        cars,              // keep all cars
        workers,           // keep all workers (filter their sub-records below)
        reservations:    reservations.filter(r => ir(r.step1?.departureDate || r.createdAt || '')),
        storeExpenses:   storeExpenses.filter(e => ir(e.date)),
        vehicleExpenses: vehicleExpenses.filter(e => ir(e.date)),
        alerts:          alerts.filter(a => ir(a.createdAt)),
        websiteOrders:   websiteOrders.filter(o => ir(o.createdAt)),
      });

    } catch (e: any) {
      console.error(e);
      setError(T('Erreur lors de la génération.','خطأ في التوليد.',lang));
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Print Report ────────────────────────────────────────────────────────────
  const printReport = async () => {
    if (!data) return;
    
    try {
      const agencySettings = await DatabaseService.getWebsiteSettings();
      
      const html = generateReportHTML(
        null, // No specific car for general report
        data.reservations,
        data.vehicleExpenses,
        startDate,
        endDate,
        agencySettings,
        lang
      );
      
      const printWindow = window.open('', '', 'width=794,height=1123');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } catch (err) {
      console.error('Error printing report:', err);
      alert(T('Erreur lors de l\'impression.', 'خطأ في الطباعة.', lang));
    }
  };

  // ── Global KPIs (computed from data) ────────────────────────────────────────
  const nonCancelledRes  = data?.reservations.filter(r => r.status !== 'cancelled') ?? [];
  const totalCollected   = nonCancelledRes.reduce((s, r) => s + calcPaid(r), 0);
  const totalFaced       = nonCancelledRes.reduce((s, r) => s + (Number(r.totalPrice)||0), 0);
  const totalDebtGlobal  = (data?.reservations ?? [])
    .filter(r => !['completed','cancelled'].includes(r.status))
    .reduce((s, r) => s + (Number(r.remainingPayment)||0), 0);
  const totalVehExp      = data?.vehicleExpenses.reduce((s,e) => s + (Number(e.cost)||0), 0) ?? 0;
  const totalStoreExp    = data?.storeExpenses.reduce((s,e) => s + (Number(e.cost)||0), 0) ?? 0;
  const totalExpGlobal   = totalVehExp + totalStoreExp;
  const netBenefitGlobal = totalCollected - totalExpGlobal;

  // ── Section accordion wrapper ────────────────────────────────────────────────
  const Section = ({ id, icon, title, badge, accent, children }: {
    id: string; icon: React.ReactNode; title: string;
    badge?: number | string; accent: string; children: React.ReactNode;
  }) => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setOpenSection(openSection===id ? null : id)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
          <span className="font-black text-gray-800 text-base">{title}</span>
          {badge !== undefined && (
            <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">{badge}</span>
          )}
        </div>
        {openSection===id ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
      </button>
      <AnimatePresence>
        {openSection===id && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }} transition={{ duration:0.28 }}
            className="overflow-hidden border-t border-gray-100">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="space-y-7 pb-8">

      {/* ── Header ── */}
      <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
        className="relative overflow-hidden rounded-3xl text-white shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-blue-700 to-cyan-600"/>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage:'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize:'12px 12px' }}/>
        <div className="relative p-7">
          <div className="flex items-center gap-4 mb-5">
            <motion.div animate={{ rotate:[0,360] }} transition={{ duration:4, repeat:Infinity, ease:'linear' }}
              className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">📊</motion.div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">
                {T('Rapports Complets','التقارير الشاملة',lang)}
              </h1>
              <p className="text-blue-200 text-sm mt-0.5">
                {T('Toutes les données filtrées par période sélectionnée',
                   'جميع البيانات مفلترة حسب الفترة المحددة',lang)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-blue-200 mb-1.5">
                {T('Date de début','تاريخ البداية',lang)}
              </label>
              <input type="date" value={startDate}
                onChange={e=>{ setStartDate(e.target.value); setData(null); }}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/50 focus:ring-2 focus:ring-white/30 outline-none text-sm transition-all"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-200 mb-1.5">
                {T('Date de fin','تاريخ النهاية',lang)}
              </label>
              <input type="date" value={endDate}
                onChange={e=>{ setEndDate(e.target.value); setData(null); }}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/50 focus:ring-2 focus:ring-white/30 outline-none text-sm transition-all"/>
            </div>
            <div className="flex items-end">
              <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                onClick={generate} disabled={isGenerating}
                className="w-full bg-white text-blue-700 font-black py-2.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-sm">
                {isGenerating
                  ? <><motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:0.8, ease:'linear' }}
                      className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"/>
                    {T('Chargement...','جاري التحميل...',lang)}</>
                  : <><BarChart3 size={16}/>{T('Générer le Rapport','توليد التقرير',lang)}</>}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Loading */}
      {isGenerating && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-2"/>
            <p className="text-gray-500 font-semibold text-sm">
              {T('Chargement des données...','جاري تحميل البيانات...',lang)}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0"/>
          <p className="text-red-700 font-semibold text-sm">{error}</p>
        </div>
      )}

      {/* ── Report ── */}
      <AnimatePresence>
        {data && !isGenerating && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0 }} transition={{ duration:0.35 }} className="space-y-5">

            {/* Period info */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center gap-3 text-sm">
              <FileText size={16} className="text-blue-600 flex-shrink-0"/>
              <span className="text-blue-800 font-semibold">
                {T('Rapport du','تقرير من',lang)} <strong>{fmtD(startDate)}</strong>
                {' '}{T('au','إلى',lang)} <strong>{fmtD(endDate)}</strong>
                {' — '}{data.reservations.length} {T('réservation(s) trouvée(s)','حجز موجود',lang)}
              </span>
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l:T('Montant Encaissé','المبلغ المحصّل',lang),
                  v:`+${fmt(totalCollected)}`,
                  sub:`${nonCancelledRes.length} ${T('location(s)','إيجار',lang)}`,
                  grad:'from-emerald-500 to-teal-600', icon:<TrendingUp size={18}/> },
                { l:T('Reste à Payer','المتبقي للعملاء',lang),
                  v:totalDebtGlobal>0 ? `-${fmt(totalDebtGlobal)}` : '✓ 0',
                  sub:T('dettes clients','ديون العملاء',lang),
                  grad:'from-yellow-500 to-orange-500', icon:<AlertCircle size={18}/> },
                { l:T('Total Dépenses','إجمالي المصاريف',lang),
                  v:`-${fmt(totalExpGlobal)}`,
                  sub:T('véhicules + showroom','سيارات + معرض',lang),
                  grad:'from-red-500 to-rose-600', icon:<TrendingDown size={18}/> },
                { l:T('Bénéfice Net','صافي الأرباح',lang),
                  v:`${netBenefitGlobal>=0?'+':''}${fmt(netBenefitGlobal)}`,
                  sub:'DZD',
                  grad:netBenefitGlobal>=0?'from-blue-600 to-indigo-700':'from-orange-500 to-red-600',
                  icon:<DollarSign size={18}/> },
              ].map((k,i) => (
                <motion.div key={i}
                  initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                  transition={{ delay:i*0.07 }} whileHover={{ scale:1.03, y:-2 }}
                  className={`bg-gradient-to-br ${k.grad} rounded-2xl p-4 text-white shadow-lg`}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-tight">{k.l}</p>
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">{k.icon}</div>
                  </div>
                  <p className="text-xl font-black leading-tight">{k.v}</p>
                  <p className="text-white/60 text-[10px] mt-0.5 font-semibold">{k.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* ── Print Button ── */}
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
              <button
                onClick={printReport}
                className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-700 hover:via-purple-600 hover:to-indigo-700 text-white font-black py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 text-base"
              >
                <Printer size={20} />
                {T('Imprimer le Rapport Complet', 'طباعة التقرير الكامل', lang)}
              </button>
            </motion.div>

            {/* ── SECTION: Vehicles ── */}
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.08 }}>
              <Section id="cars" accent="bg-blue-100 text-blue-600"
                icon={<CarIcon size={17} className="text-blue-600"/>}
                title={T('Rapport par Véhicule','التقرير لكل سيارة',lang)}
                badge={data.cars.length}>
                <div className="p-4 space-y-3 bg-gray-50">
                  {data.cars.map((car, i) => (
                    <CarBlock key={car.id} car={car} idx={i} lang={lang}
                      reservations={data.reservations.filter(r => r.carId === car.id)}
                      expenses={data.vehicleExpenses.filter(e => e.carId === car.id)}/>
                  ))}
                  {data.cars.length===0 && (
                    <p className="text-center py-6 text-sm text-gray-400 font-semibold">
                      {T('Aucun véhicule','لا توجد سيارات',lang)}
                    </p>
                  )}
                </div>
              </Section>
            </motion.div>

            {/* ── SECTION: Clients & Debts ── */}
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.12 }}>
              <Section id="clients" accent="bg-indigo-100 text-indigo-600"
                icon={<Users size={17} className="text-indigo-600"/>}
                title={T('Clients & Dettes','العملاء والديون',lang)}
                badge={data.clients.length}>
                <div className="p-5 space-y-4 bg-gray-50">

                  {totalDebtGlobal>0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5"/>
                      <div>
                        <p className="text-sm font-bold text-orange-800">
                          {T('Montants impayés détectés','مبالغ غير مدفوعة',lang)}
                        </p>
                        <p className="text-xs text-orange-700 mt-0.5">
                          {T('Total dettes:','إجمالي الديون:',lang)} <strong>{fmt(totalDebtGlobal)} DZD</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Debts table */}
                  {(() => {
                    const debtors = data.reservations.filter(r =>
                      (Number(r.remainingPayment)||0)>0 && !['completed','cancelled'].includes(r.status));
                    if (!debtors.length) return (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-green-600"/>
                        <p className="text-sm font-bold text-green-800">
                          {T('Aucune dette détectée pour cette période','لا توجد ديون لهذه الفترة',lang)}
                        </p>
                      </div>
                    );
                    return (
                      <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
                        <div className="bg-orange-50 border-b border-orange-100 px-4 py-2.5 flex justify-between">
                          <span className="text-xs font-black text-orange-700 uppercase tracking-widest">
                            {T('Montants Impayés','المبالغ غير المدفوعة',lang)} ({debtors.length})
                          </span>
                          <span className="text-xs font-black text-orange-700">-{fmt(totalDebtGlobal)} DZD</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {debtors.map(r=>(
                            <div key={r.id} className="px-4 py-3 flex items-start gap-3 text-xs">
                              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-black flex items-center justify-center flex-shrink-0 text-sm">
                                {(r.client?.firstName?.[0]||'?').toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800">{r.client?.firstName} {r.client?.lastName}</p>
                                <p className="text-gray-400 flex items-center gap-1 flex-wrap">
                                  <Phone size={9}/> {r.client?.phone}
                                  {r.client?.wilaya && <><MapPin size={9}/> {r.client.wilaya}</>}
                                </p>
                                <p className="text-gray-500 mt-0.5">
                                  {r.car?.brand} {r.car?.model} · {r.step1?.departureDate} → {r.step1?.returnDate}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-[10px] text-gray-400">{T('Total','الإجمالي',lang)}: {fmt(Number(r.totalPrice))} DZD</p>
                                <p className="text-[10px] text-emerald-600 font-bold">✓ {fmt(calcPaid(r))} DZD</p>
                                <p className="font-black text-orange-600">⏳ {fmt(Number(r.remainingPayment))} DZD</p>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${statusCls(r.status)}`}>{r.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="bg-orange-50 border-t border-orange-100 px-4 py-2.5 flex justify-between text-xs">
                          <span className="font-bold text-orange-700">{T('Total Dettes','إجمالي الديون',lang)}</span>
                          <span className="font-black text-orange-700">-{fmt(totalDebtGlobal)} DZD</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* All clients stats */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2.5">
                      <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">
                        {T('Statistiques par Client','إحصاءات العملاء',lang)}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {data.clients.map(client=>{
                        const cRes  = data.reservations.filter(r => r.clientId===client.id);
                        if (cRes.length===0) return null;
                        const cPaid = cRes.filter(r=>r.status!=='cancelled').reduce((s,r)=>s+calcPaid(r),0);
                        const cDebt = cRes.filter(r=>!['completed','cancelled'].includes(r.status))
                                        .reduce((s,r)=>s+(Number(r.remainingPayment)||0),0);
                        const cTotal= cRes.filter(r=>r.status!=='cancelled').reduce((s,r)=>s+(Number(r.totalPrice)||0),0);
                        return (
                          <div key={client.id} className="px-4 py-3 flex items-center gap-3 text-xs hover:bg-gray-50 transition-colors">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 overflow-hidden flex-shrink-0">
                              {client.profilePhoto
                                ? <img src={client.profilePhoto} alt="" className="w-full h-full object-cover"/>
                                : <div className="w-full h-full flex items-center justify-center text-indigo-600 font-black text-sm">
                                    {(client.firstName?.[0]||'?').toUpperCase()}
                                  </div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 truncate">{client.firstName} {client.lastName}</p>
                              <p className="text-gray-400 flex items-center gap-1">
                                <Phone size={9}/> {client.phone}
                                {client.wilaya && <><MapPin size={9}/> {client.wilaya}</>}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 space-y-0.5">
                              <p className="text-[10px] text-gray-400">{T('Facturé','المفاتر',lang)}: {fmt(cTotal)}</p>
                              <p className="font-black text-emerald-600">✓ +{fmt(cPaid)} DZD</p>
                              {cDebt>0 && <p className="font-bold text-orange-500">⏳ -{fmt(cDebt)} DZD</p>}
                              <p className="text-[10px] text-gray-400">{cRes.length} {T('loc.','إيجار',lang)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Section>
            </motion.div>

            {/* ── SECTION: Workers ── */}
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.16 }}>
              <Section id="workers" accent="bg-purple-100 text-purple-600"
                icon={<Briefcase size={17} className="text-purple-600"/>}
                title={T('Équipe & Paiements','الفريق والمدفوعات',lang)}
                badge={data.workers.length}>
                <div className="p-5 space-y-4 bg-gray-50">
                  {data.workers.length===0 ? (
                    <p className="text-center py-5 text-sm text-gray-400 font-semibold">
                      {T('Aucun employé','لا يوجد موظفون',lang)}
                    </p>
                  ) : data.workers.map((worker,wi)=>{
                    const isInPeriod = (d: string) => inRange(d, startDate, endDate);
                    const periodPay  = (worker.payments||[]).filter(p => isInPeriod(p.date));
                    const periodAdv  = (worker.advances||[]).filter(a => isInPeriod(a.date));
                    const periodAbs  = (worker.absences||[]).filter(a => isInPeriod(a.date));
                    const totalPaid  = periodPay.reduce((s,p)=>s+p.amount,0);
                    const totalAdv   = periodAdv.reduce((s,a)=>s+a.amount,0);
                    const totalAbs   = periodAbs.reduce((s,a)=>s+(a.cost||0),0);
                    return (
                      <motion.div key={worker.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                        transition={{ delay:wi*0.05 }}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 bg-purple-50/40 border-b border-gray-100">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-purple-100 flex-shrink-0">
                            {worker.profilePhoto
                              ? <img src={worker.profilePhoto} alt="" className="w-full h-full object-cover"/>
                              : <div className="w-full h-full flex items-center justify-center text-purple-600 font-black text-sm">
                                  {(worker.fullName?.[0]||'?').toUpperCase()}
                                </div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-gray-800 text-sm">{worker.fullName}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="capitalize bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold">{worker.type}</span>
                              <span>{worker.phone}</span>
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <p className="text-gray-400">{T('Salaire base','الراتب',lang)}</p>
                            <p className="font-black text-purple-700">{fmt(worker.baseSalary||0)} DZD</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-gray-100 text-xs">
                          {/* Payments */}
                          <div className="p-3">
                            <p className="font-bold text-gray-500 mb-2 flex items-center gap-1 text-[10px]">
                              <CreditCard size={10}/> {T('Paiements','المدفوعات',lang)} ({periodPay.length})
                            </p>
                            {periodPay.length===0
                              ? <p className="text-gray-300 italic text-[10px]">{T('Aucun','لا يوجد',lang)}</p>
                              : <>{periodPay.slice(0,4).map(p=>(
                                  <div key={p.id} className="flex justify-between py-0.5 border-b border-gray-50 last:border-0 text-[10px]">
                                    <span className="text-gray-500">{fmtD(p.date)}</span>
                                    <span className="font-black text-purple-600">+{fmt(p.amount)}</span>
                                  </div>
                                ))}
                                {periodPay.length>4 && <p className="text-gray-400 text-[10px] mt-1">+{periodPay.length-4} {T('autres','أخرى',lang)}</p>}
                                <div className="border-t border-purple-100 mt-1 pt-1 font-black text-purple-700 text-[10px] text-right">{fmt(totalPaid)} DZD</div>
                              </>}
                          </div>
                          {/* Advances */}
                          <div className="p-3">
                            <p className="font-bold text-gray-500 mb-2 flex items-center gap-1 text-[10px]">
                              <DollarSign size={10}/> {T('Avances','السلفيات',lang)} ({periodAdv.length})
                            </p>
                            {periodAdv.length===0
                              ? <p className="text-gray-300 italic text-[10px]">{T('Aucune','لا توجد',lang)}</p>
                              : <>{periodAdv.slice(0,4).map(a=>(
                                  <div key={a.id} className="flex justify-between py-0.5 border-b border-gray-50 last:border-0 text-[10px]">
                                    <span className="text-gray-500">{fmtD(a.date)}</span>
                                    <span className="font-black text-orange-600">+{fmt(a.amount)}</span>
                                  </div>
                                ))}
                                <div className="border-t border-orange-100 mt-1 pt-1 font-black text-orange-600 text-[10px] text-right">{fmt(totalAdv)} DZD</div>
                              </>}
                          </div>
                          {/* Absences */}
                          <div className="p-3">
                            <p className="font-bold text-gray-500 mb-2 flex items-center gap-1 text-[10px]">
                              <AlertTriangle size={10}/> {T('Absences','الغيابات',lang)} ({periodAbs.length})
                            </p>
                            {periodAbs.length===0
                              ? <p className="text-gray-300 italic text-[10px]">{T('Aucune','لا توجد',lang)}</p>
                              : <>{periodAbs.slice(0,4).map(a=>(
                                  <div key={a.id} className="flex justify-between py-0.5 border-b border-gray-50 last:border-0 text-[10px]">
                                    <span className="text-gray-500">{fmtD(a.date)}</span>
                                    <span className="font-black text-red-600">{fmt(a.cost||0)} DZD</span>
                                  </div>
                                ))}
                                <div className="border-t border-red-100 mt-1 pt-1 font-black text-red-600 text-[10px] text-right">-{fmt(totalAbs)} DZD</div>
                              </>}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </Section>
            </motion.div>

            {/* ── SECTION: Store Expenses ── */}
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
              <Section id="store" accent="bg-pink-100 text-pink-600"
                icon={<Building size={17} className="text-pink-600"/>}
                title={T('Dépenses Showroom','مصاريف المعرض',lang)}
                badge={data.storeExpenses.length}>
                <div className="p-5 bg-gray-50">
                  {data.storeExpenses.length===0 ? (
                    <p className="text-center py-5 text-sm text-gray-400 font-semibold">
                      {T('Aucune dépense showroom pour cette période','لا توجد مصاريف للمعرض في هذه الفترة',lang)}
                    </p>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="bg-pink-50 border-b border-pink-100 px-4 py-2.5 flex justify-between">
                        <span className="text-xs font-black text-pink-700 uppercase tracking-widest">
                          {T('Liste','القائمة',lang)} ({data.storeExpenses.length})
                        </span>
                        <span className="text-xs font-black text-pink-700">-{fmt(totalStoreExp)} DZD</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {data.storeExpenses.map((e,i)=>(
                          <motion.div key={e.id} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                            transition={{ delay:i*0.03 }}
                            className="px-4 py-3 flex items-center gap-3 text-xs hover:bg-gray-50">
                            <div className="w-8 h-8 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center text-base flex-shrink-0">
                              {e.icon||'🏬'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800">{e.name}</p>
                              <p className="text-gray-400 flex items-center gap-1">
                                <Calendar size={9}/> {fmtD(e.date)}
                                {e.note && <> · {e.note}</>}
                              </p>
                            </div>
                            <span className="font-black text-pink-600 flex-shrink-0">-{fmt(e.cost)} DZD</span>
                          </motion.div>
                        ))}
                      </div>
                      <div className="bg-pink-50 border-t border-pink-100 px-4 py-2.5 flex justify-between text-xs">
                        <span className="font-bold text-pink-700">{T('Total Showroom','إجمالي المعرض',lang)}</span>
                        <span className="font-black text-pink-700">-{fmt(totalStoreExp)} DZD</span>
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            </motion.div>

            {/* ── GLOBAL BILAN ── */}
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.24 }}
              className={`rounded-2xl border-2 p-5 ${netBenefitGlobal>=0?'bg-blue-50 border-blue-200':'bg-orange-50 border-orange-200'}`}>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Star size={13}/> {T('Bilan Complet de la Période','ملخص الفترة الكامل',lang)}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                {[
                  { l:T('Total Facturé','المفاتر',lang),      v:fmt(totalFaced),                                     c:'text-gray-700' },
                  { l:T('Encaissé','المحصّل',lang),           v:`+${fmt(totalCollected)}`,                            c:'text-emerald-700' },
                  { l:T('Dépenses','المصاريف',lang),          v:`-${fmt(totalExpGlobal)}`,                            c:'text-red-600' },
                  { l:T('Dettes Clients','ديون العملاء',lang),v:totalDebtGlobal>0 ? `-${fmt(totalDebtGlobal)}` : '✓ 0', c:totalDebtGlobal>0?'text-orange-600':'text-green-600' },
                  { l:T('Bénéfice Net','الصافي',lang),        v:`${netBenefitGlobal>=0?'+':''}${fmt(netBenefitGlobal)}`, c:netBenefitGlobal>=0?'text-blue-700':'text-red-700' },
                ].map((item,i)=>(
                  <div key={i} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <p className="text-[9px] font-bold text-gray-400 uppercase leading-tight">{item.l}</p>
                    <p className={`text-base font-black mt-1 ${item.c}`}>{item.v}</p>
                    <p className="text-[9px] text-gray-400 font-semibold">DZD</p>
                  </div>
                ))}
              </div>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportsPage;
