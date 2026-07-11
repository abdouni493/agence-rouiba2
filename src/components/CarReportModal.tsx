import React, { useState } from 'react';
import { Car, ReservationDetails, VehicleExpense, Language, ExpenseType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { generateReportHTML } from './ReportPrintTemplate';
import { DatabaseService } from '../services/DatabaseService';
import {
  X, TrendingUp, TrendingDown, DollarSign, Calendar, Wrench,
  ShieldCheck, Activity, Droplets, Link as LinkIcon, ChevronDown,
  ChevronUp, FileText, Clock, User, AlertCircle, CheckCircle2,
  BarChart3, CreditCard, Banknote, AlertTriangle, Printer
} from 'lucide-react';

interface CarReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  car: Car;
  reservations: ReservationDetails[];
  expenses: VehicleExpense[];
  lang: Language;
}

const EXPENSE_META: Record<ExpenseType, { labelFr: string; labelAr: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  vidange:   { labelFr: 'Vidange',            labelAr: 'تغيير الزيت',     icon: <Droplets size={14}/>,    color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  assurance: { labelFr: 'Assurance',          labelAr: 'تأمين',            icon: <ShieldCheck size={14}/>, color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  controle:  { labelFr: 'Contrôle Technique', labelAr: 'معاينة تقنية',    icon: <Activity size={14}/>,    color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200' },
  chaine:    { labelFr: 'Chaîne / Distribution', labelAr: 'السلسلة',      icon: <LinkIcon size={14}/>,    color: 'text-teal-700',   bg: 'bg-teal-50',    border: 'border-teal-200' },
  autre:     { labelFr: 'Autre',              labelAr: 'أخرى',             icon: <Wrench size={14}/>,      color: 'text-gray-700',   bg: 'bg-gray-50',    border: 'border-gray-200' },
};

const STATUS_STYLE: Record<string, { label: string; labelAr: string; cls: string }> = {
  active:    { label: 'Active',     labelAr: 'نشطة',          cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  completed: { label: 'Terminée',   labelAr: 'مكتملة',        cls: 'bg-green-100 text-green-700 border-green-300' },
  pending:   { label: 'En attente', labelAr: 'قيد الانتظار',  cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  accepted:  { label: 'Acceptée',   labelAr: 'مقبولة',        cls: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  confirmed: { label: 'Confirmée',  labelAr: 'مؤكدة',         cls: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  cancelled: { label: 'Annulée',    labelAr: 'ملغاة',         cls: 'bg-red-100 text-red-700 border-red-300' },
};

export const CarReportModal: React.FC<CarReportModalProps> = ({
  isOpen, onClose, car, reservations, expenses, lang,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [generated, setGenerated] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [expandedRes,  setExpandedRes]  = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const T = (fr: string, ar: string) => lang === 'fr' ? fr : ar;
  const fmt = (n: number) => n.toLocaleString('fr-DZ');
  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; } };

  // ── Filter ────────────────────────────────────────────────────────────────
  // String-based YYYY-MM-DD comparison avoids all timezone bugs
  const dateKey = (d: string) => (d || '').substring(0, 10);
  const inRange = (dateStr: string) => {
    if (!startDate && !endDate) return true;
    if (!dateStr) return false;
    const d = dateKey(dateStr);
    return (!startDate || d >= startDate) && (!endDate || d <= endDate);
  };

  const filteredRes  = reservations.filter(r => inRange(r.step1?.departureDate || r.createdAt || ''));
  const filteredExp  = expenses.filter(e => inRange(e.date || ''));

  // ── Calculations ──────────────────────────────────────────────────────────
  /**
   * Actual money collected:
   *  1. Sum of individual payment records (most accurate)
   *  2. Fallback: totalPrice − remainingPayment
   */
  const calcPaid = (r: ReservationDetails) => {
    const pmts = (r.payments || []) as any[];
    if (pmts.length > 0) {
      const s = pmts.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      if (s > 0) return s;
    }
    return Math.max(0, (Number(r.totalPrice) || 0) - (Number(r.remainingPayment) || 0));
  };

  const totalCollected = filteredRes
    .filter(r => r.status !== 'cancelled')
    .reduce((s, r) => s + calcPaid(r), 0);

  const totalDebt = filteredRes
    .filter(r => !['completed', 'cancelled'].includes(r.status))
    .reduce((s, r) => s + (r.remainingPayment || 0), 0);

  const totalExpenses  = filteredExp.reduce((s, e) => s + (e.cost || 0), 0);
  const netBenefit     = totalCollected - totalExpenses;

  // Group expenses by type
  const byType = (Object.keys(EXPENSE_META) as ExpenseType[]).reduce((acc, k) => {
    const g = filteredExp.filter(e => e.type === k);
    if (g.length) acc[k] = g;
    return acc;
  }, {} as Record<ExpenseType, VehicleExpense[]>);

  const handleGenerate = () => {
    if (!startDate || !endDate) {
      alert(T('Veuillez sélectionner les dates de début et de fin.', 'يرجى تحديد تاريخ البداية والنهاية.'));
      return;
    }
    setLoading(true);
    setTimeout(() => { setGenerated(true); setLoading(false); }, 500);
  };

  const handlePrint = async () => {
    if (!startDate || !endDate) {
      alert(T('Veuillez sélectionner les dates de début et de fin.', 'يرجى تحديد تاريخ البداية والنهاية.'));
      return;
    }

    try {
      const filteredRes = reservations.filter(r => {
        const d = (r.step1?.departureDate || r.createdAt || '').substring(0, 10);
        return (!startDate || d >= startDate) && (!endDate || d <= endDate);
      });

      const filteredExp = expenses.filter(e => {
        const d = (e.date || '').substring(0, 10);
        return (!startDate || d >= startDate) && (!endDate || d <= endDate);
      });

      // Fetch agency settings for logo and info
      const agencySettings = await DatabaseService.getWebsiteSettings();

      const html = await generateReportHTML(car, filteredRes, filteredExp, startDate, endDate, agencySettings, lang);
      
      // Create a temporary div to hold the HTML
      const printDiv = document.createElement('div');
      printDiv.id = '__print_container__';
      printDiv.innerHTML = html;
      printDiv.style.display = 'none';
      document.body.appendChild(printDiv);

      // Use iframe for better print handling
      const iframe = document.createElement('iframe');
      iframe.id = '__print_iframe__';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
        
        setTimeout(() => {
          iframe.contentWindow?.print();
          // Clean up after print
          setTimeout(() => {
            document.body.removeChild(iframe);
            document.body.removeChild(printDiv);
          }, 100);
        }, 250);
      }
    } catch (err) {
      console.error('Error printing report:', err);
      alert(T('Erreur lors de la génération du rapport.', 'خطأ في إنشاء التقرير.'));
    }
  };

  const carImage = car.images?.[0] || 'https://picsum.photos/seed/car/400/300';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"/>
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '10px 10px' }}/>
          <div className="relative px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-11 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg flex-shrink-0">
                <img src={carImage} alt="" className="w-full h-full object-cover"/>
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <FileText size={19} className="opacity-80"/>
                  {T('Rapport', 'تقرير')} — {car.brand} {car.model}
                </h2>
                <p className="text-white/75 text-xs font-semibold mt-0.5">
                  {car.registration} · {car.year} · {car.color}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl text-white transition-colors">
              <X size={20}/>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-5 space-y-5" style={{ scrollbarWidth: 'thin' }}>

          {/* Date Picker */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Calendar size={12}/> {T('Période du rapport', 'فترة التقرير')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-amber-600 mb-1.5">{T('Date de début', 'تاريخ البداية')}</label>
                <input type="date" value={startDate}
                  onChange={e => { setStartDate(e.target.value); setGenerated(false); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none bg-gray-50 transition-all"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-600 mb-1.5">{T('Date de fin', 'تاريخ النهاية')}</label>
                <input type="date" value={endDate}
                  onChange={e => { setEndDate(e.target.value); setGenerated(false); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none bg-gray-50 transition-all"/>
              </div>
              <div className="flex items-end">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleGenerate} disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-2.5 rounded-xl shadow hover:shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60">
                  {loading
                    ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"/>
                    : <BarChart3 size={15}/>}
                  {T('Générer', 'توليد')}
                </motion.button>
              </div>
            </div>
          </div>

          {/* ── Generated Report ── */}
          <AnimatePresence>
            {generated && (
              <motion.div key="report" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }} className="space-y-5">

                {/* KPI Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: T('Montant Encaissé', 'المبلغ المحصّل'), value: `+${fmt(totalCollected)}`, sub: `${filteredRes.filter(r=>r.status!=='cancelled').length} ${T('loc.','إيجار')}`, grad: 'from-emerald-500 to-teal-600', icon: <TrendingUp size={18}/> },
                    { label: T('Reste à Payer', 'المبلغ المتبقي'),   value: `-${fmt(totalDebt)}`,      sub: T('dettes clients','ديون العملاء'),          grad: 'from-yellow-500 to-orange-500', icon: <AlertTriangle size={18}/> },
                    { label: T('Total Dépenses', 'إجمالي المصاريف'), value: `-${fmt(totalExpenses)}`,   sub: `${filteredExp.length} ${T('dép.','مصروف')}`,grad: 'from-red-500 to-rose-600',     icon: <TrendingDown size={18}/> },
                    { label: T('Bénéfice Net', 'صافي الأرباح'),      value: `${netBenefit>=0?'+':''}${fmt(netBenefit)}`, sub: 'DZD', grad: netBenefit>=0 ? 'from-blue-600 to-indigo-700' : 'from-orange-500 to-red-600', icon: <DollarSign size={18}/> },
                  ].map((k, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                      className={`bg-gradient-to-br ${k.grad} rounded-2xl p-4 text-white shadow-lg`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-tight">{k.label}</p>
                        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">{k.icon}</div>
                      </div>
                      <p className="text-lg font-black leading-tight">{k.value}</p>
                      <p className="text-[10px] text-white/60 mt-0.5 font-semibold">{k.sub}</p>
                    </motion.div>
                  ))}
                </div>

                {/* ── Reservations ── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200 px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Calendar size={15} className="text-emerald-600"/>
                      </div>
                      <div>
                        <p className="font-black text-gray-800 text-sm">{T('Liste des Locations', 'قائمة الإيجارات')}</p>
                        <p className="text-xs text-gray-500">{filteredRes.length} {T('réservation(s) dans la période','حجز في الفترة')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{T('Encaissé','المحصّل')}</p>
                      <p className="font-black text-emerald-700">+{fmt(totalCollected)} DZD</p>
                    </div>
                  </div>

                  {filteredRes.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                        <Calendar size={20} className="text-gray-400"/>
                      </div>
                      <p className="text-sm text-gray-400 font-semibold">
                        {T('Aucune location pour cette période','لا توجد إيجارات لهذه الفترة')}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredRes.map((res, idx) => {
                        const paid      = calcPaid(res);
                        const remaining = res.remainingPayment || 0;
                        const total     = res.totalPrice || 0;
                        const st        = STATUS_STYLE[res.status] || STATUS_STYLE['pending'];
                        const open      = expandedRes === res.id;
                        return (
                          <div key={res.id}>
                            <button onClick={() => setExpandedRes(open ? null : res.id)}
                              className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors flex items-center gap-3">
                              {/* Index badge */}
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </div>
                              {/* Client info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-gray-800 text-sm">
                                    <User size={11} className="inline mr-1 text-gray-400"/>
                                    {res.client?.firstName} {res.client?.lastName}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${st.cls}`}>
                                    {lang === 'fr' ? st.label : st.labelAr}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                  <Clock size={10}/>
                                  {res.step1?.departureDate} → {res.step1?.returnDate}
                                  <span className="font-bold text-gray-600 ml-1">{res.totalDays} {T('j','ي')}</span>
                                </p>
                              </div>
                              {/* Payment summary */}
                              <div className="text-right flex-shrink-0 space-y-0.5 mr-2">
                                <p className="text-xs text-gray-400">{T('Total','الإجمالي')}: <span className="font-bold text-gray-700">{fmt(total)}</span></p>
                                <p className="text-xs text-emerald-600 font-black">✓ {fmt(paid)} DZD</p>
                                {remaining > 0 && (
                                  <p className="text-xs text-orange-600 font-bold">⏳ {fmt(remaining)} DZD</p>
                                )}
                              </div>
                              {open ? <ChevronUp size={15} className="text-gray-400 flex-shrink-0"/> : <ChevronDown size={15} className="text-gray-400 flex-shrink-0"/>}
                            </button>

                            <AnimatePresence>
                              {open && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                                  <div className="px-5 pb-4 pt-1 bg-emerald-50/40">
                                    {/* Payment breakdown cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                      {[
                                        { l: T('Prix Total','السعر الإجمالي'), v: fmt(total),             c: 'text-gray-800',   bg: 'bg-white border-gray-200' },
                                        { l: T('Avance Versée','الدفعة المقدمة'),v: fmt(res.advancePayment||0), c: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                                        { l: T('Montant Encaissé','المحصّل'),   v: fmt(paid),              c: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200' },
                                        { l: T('Reste à Payer','المتبقي'),       v: fmt(remaining),         c: remaining>0 ? 'text-orange-700' : 'text-green-700', bg: remaining>0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200' },
                                      ].map((item, i) => (
                                        <div key={i} className={`rounded-xl p-2.5 border text-xs ${item.bg}`}>
                                          <p className="text-gray-500 font-semibold leading-tight">{item.l}</p>
                                          <p className={`font-black text-sm mt-0.5 ${item.c}`}>{item.v}</p>
                                          <p className="text-gray-400 text-[9px]">DZD</p>
                                        </div>
                                      ))}
                                    </div>
                                    {/* Additional info */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                      {res.deposit > 0 && (
                                        <div className="bg-white rounded-xl p-2.5 border border-purple-200">
                                          <p className="text-gray-500">{T('Caution','الضمان')}</p>
                                          <p className="font-black text-purple-700">{fmt(res.deposit)} DZD</p>
                                        </div>
                                      )}
                                      {(res.additionalFees||0) > 0 && (
                                        <div className="bg-white rounded-xl p-2.5 border border-red-200">
                                          <p className="text-gray-500">{T('Frais Suppl.','رسوم إضافية')}</p>
                                          <p className="font-black text-red-600">+{fmt(res.additionalFees||0)} DZD</p>
                                        </div>
                                      )}
                                      {(res.discountAmount||0) > 0 && (
                                        <div className="bg-white rounded-xl p-2.5 border border-teal-200">
                                          <p className="text-gray-500">{T('Remise','الخصم')}</p>
                                          <p className="font-black text-teal-600">-{fmt(res.discountAmount||0)} DZD</p>
                                        </div>
                                      )}
                                      {res.client?.phone && (
                                        <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                                          <p className="text-gray-500">{T('Téléphone','الهاتف')}</p>
                                          <p className="font-bold text-gray-700">{res.client.phone}</p>
                                        </div>
                                      )}
                                      {res.client?.wilaya && (
                                        <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                                          <p className="text-gray-500">{T('Wilaya','الولاية')}</p>
                                          <p className="font-bold text-gray-700">{res.client.wilaya}</p>
                                        </div>
                                      )}
                                    </div>
                                    {/* Individual payments */}
                                    {res.payments && res.payments.length > 0 && (
                                      <div className="mt-3">
                                        <p className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                                          <CreditCard size={11}/> {T('Paiements enregistrés','الدفعات المسجلة')}
                                        </p>
                                        <div className="space-y-1">
                                          {res.payments.map((p: any) => (
                                            <div key={p.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-1.5 text-xs">
                                              <span className="text-gray-500 flex items-center gap-1">
                                                <Calendar size={9}/> {fmtDate(p.date)}
                                                {p.paymentMethod && <> · <span className="capitalize">{p.paymentMethod}</span></>}
                                              </span>
                                              <span className="font-black text-emerald-600">+{fmt(p.amount)} DZD</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {res.notes && (
                                      <p className="mt-2 text-xs text-gray-500 italic bg-white rounded-lg border border-gray-100 px-3 py-2">
                                        {res.notes}
                                      </p>
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

                  {/* Reservations total footer */}
                  {filteredRes.length > 0 && (
                    <div className="bg-emerald-50 border-t border-emerald-200 px-5 py-3 grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500">{T('Total Facturé','الإجمالي المفاتر')}</p>
                        <p className="font-black text-gray-800">{fmt(filteredRes.filter(r=>r.status!=='cancelled').reduce((s,r)=>s+(r.totalPrice||0),0))} DZD</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{T('Total Encaissé','المحصّل')}</p>
                        <p className="font-black text-emerald-700">+{fmt(totalCollected)} DZD</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{T('Total Dettes','إجمالي الديون')}</p>
                        <p className={`font-black ${totalDebt > 0 ? 'text-orange-600' : 'text-green-600'}`}>{fmt(totalDebt)} DZD</p>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* ── Expenses ── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                  <div className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-gray-200 px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
                        <Wrench size={15} className="text-red-500"/>
                      </div>
                      <div>
                        <p className="font-black text-gray-800 text-sm">{T('Dépenses du Véhicule','مصاريف السيارة')}</p>
                        <p className="text-xs text-gray-500">{filteredExp.length} {T('dépense(s)','مصروف')} · {Object.keys(byType).length} {T('type(s)','نوع')}</p>
                      </div>
                    </div>
                    <p className="font-black text-red-700">-{fmt(totalExpenses)} DZD</p>
                  </div>

                  {filteredExp.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 size={20} className="text-green-500"/>
                      </div>
                      <p className="text-sm text-gray-400 font-semibold">
                        {T('Aucune dépense enregistrée','لا توجد مصاريف مسجلة')}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {(Object.entries(byType) as [ExpenseType, VehicleExpense[]][]).map(([type, group], catIdx) => {
                        const meta     = EXPENSE_META[type];
                        const catTotal = group.reduce((s, e) => s + (e.cost || 0), 0);
                        const open     = expandedType === type;
                        return (
                          <div key={type}>
                            <button onClick={() => setExpandedType(open ? null : type)}
                              className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${meta.bg} ${meta.border} ${meta.color}`}>
                                {meta.icon}
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-gray-800 text-sm">{lang === 'fr' ? meta.labelFr : meta.labelAr}</p>
                                <p className="text-xs text-gray-500">{group.length} {T('entrée(s)','إدخال')}</p>
                              </div>
                              <span className={`font-black text-sm ${meta.color} mr-2`}>-{fmt(catTotal)} DZD</span>
                              {open ? <ChevronUp size={15} className="text-gray-400"/> : <ChevronDown size={15} className="text-gray-400"/>}
                            </button>

                            <AnimatePresence>
                              {open && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                                  <div className="px-5 pb-4 space-y-2">
                                    {group.map(e => (
                                      <div key={e.id} className={`rounded-xl border p-3 flex items-start justify-between text-xs ${meta.bg} ${meta.border}`}>
                                        <div className="space-y-0.5">
                                          <p className="font-bold text-gray-800">
                                            {e.expenseName || (lang === 'fr' ? meta.labelFr : meta.labelAr)}
                                          </p>
                                          <p className="text-gray-500 flex items-center gap-1">
                                            <Calendar size={9}/> {e.date}
                                            {e.currentMileage ? ` · ${fmt(e.currentMileage)} km` : ''}
                                          </p>
                                          {e.nextVidangeKm && (
                                            <p className="text-gray-500">
                                              {T('Prochain vidange','الزيت القادم')}: {fmt(e.nextVidangeKm)} km
                                            </p>
                                          )}
                                          {e.expirationDate && (
                                            <p className="text-gray-500">{T('Exp.','انتهاء')}: {e.expirationDate}</p>
                                          )}
                                          {e.note && <p className="text-gray-500 italic">{e.note}</p>}
                                        </div>
                                        <span className={`font-black text-base ml-4 flex-shrink-0 ${meta.color}`}>
                                          -{fmt(e.cost)} DZD
                                        </span>
                                      </div>
                                    ))}
                                    <div className={`flex justify-between px-3 py-2 rounded-xl text-xs font-black ${meta.bg} ${meta.border} border`}>
                                      <span className={meta.color}>{T('Sous-total','المجموع الفرعي')} {lang==='fr'?meta.labelFr:meta.labelAr}</span>
                                      <span className={meta.color}>-{fmt(catTotal)} DZD</span>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {filteredExp.length > 0 && (
                    <div className="bg-red-50 border-t border-red-200 px-5 py-3 flex items-center justify-between text-sm">
                      <span className="font-bold text-red-700">{T('Total Dépenses','إجمالي المصاريف')}</span>
                      <span className="font-black text-red-700">-{fmt(totalExpenses)} DZD</span>
                    </div>
                  )}
                </motion.div>

                {/* ── Final Balance ── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className={`rounded-2xl border-2 p-5 ${netBenefit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${netBenefit>=0?'bg-blue-100 text-blue-600':'bg-orange-100 text-orange-600'}`}>
                        {netBenefit >= 0 ? <TrendingUp size={24}/> : <AlertCircle size={24}/>}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          {T('Bilan Net de la Période','صافي الفترة')}
                        </p>
                        <p className={`text-3xl font-black ${netBenefit>=0?'text-blue-700':'text-orange-700'}`}>
                          {netBenefit>=0?'+':''}{fmt(netBenefit)} DZD
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <div className="text-center">
                        <p className="text-gray-400 font-semibold">{T('Encaissé','المحصّل')}</p>
                        <p className="font-black text-emerald-700 text-sm">+{fmt(totalCollected)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 font-semibold">{T('Dépenses','المصاريف')}</p>
                        <p className="font-black text-red-600 text-sm">-{fmt(totalExpenses)}</p>
                      </div>
                      {totalDebt > 0 && (
                        <div className="text-center">
                          <p className="text-gray-400 font-semibold">{T('Dettes','الديون')}</p>
                          <p className="font-black text-orange-600 text-sm">-{fmt(totalDebt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-5 py-4 flex justify-end gap-3">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handlePrint}
            disabled={!generated}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2.5 px-6 rounded-xl shadow hover:shadow-md transition-all text-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
            <Printer size={16} />
            {T('Imprimer','طباعة')}
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-2.5 px-8 rounded-xl shadow hover:shadow-md transition-all text-sm">
            {T('Fermer','إغلاق')}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
