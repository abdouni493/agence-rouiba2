import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, animate, useReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';
import {
  Calendar, TrendingUp, ChevronDown, Printer, Loader2, AlertCircle,
  Clock, CreditCard, Droplets, ShieldCheck, Activity, Link as LinkIcon, Wrench,
  Phone, Wallet, Gauge, Percent, CalendarDays, Banknote, Receipt, User,
  ArrowDownCircle, ArrowUpCircle, Sparkles, FileText
} from 'lucide-react';
import { Language, Car, ReservationDetails, VehicleExpense, ExpenseType } from '../types';
import { DatabaseService } from '../services/DatabaseService';
import { ReservationsService } from '../services/ReservationsService';
import { getVehicleExpenses } from '../services/expenseService';
import { generateReportHTML } from './ReportPrintTemplate';

interface CarGainsPageProps {
  lang: Language;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const T = (fr: string, ar: string, lang: Language) => lang === 'fr' ? fr : ar;
const fmt = (n: number) => Math.round(n || 0).toLocaleString('fr-DZ');
const fmtD = (d?: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
};

const DAY_MS = 86400000;

// Paid amount for one reservation (payments first, fallback total − remaining)
const calcPaid = (r: ReservationDetails): number => {
  const payments = (r.payments || []) as any[];
  if (payments.length > 0) {
    const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    if (total > 0) return total;
  }
  return Math.max(0, (Number(r.totalPrice) || 0) - (Number(r.remainingPayment) || 0));
};

// A reservation belongs to the period if its rental window OVERLAPS the period
const overlapsPeriod = (r: ReservationDetails, start: string, end: string): boolean => {
  const dep = (r.step1?.departureDate || r.createdAt || '').substring(0, 10);
  const ret = (r.step1?.returnDate || dep).substring(0, 10);
  if (!dep) return false;
  return (!end || dep <= end) && (!start || ret >= start);
};

// Days of the rental that actually fall inside the period (inclusive)
const daysInPeriod = (r: ReservationDetails, start: string, end: string): number => {
  const dep = (r.step1?.departureDate || r.createdAt || '').substring(0, 10);
  const ret = (r.step1?.returnDate || dep).substring(0, 10);
  const s = Math.max(new Date(dep).getTime(), new Date(start).getTime());
  const e = Math.min(new Date(ret).getTime(), new Date(end).getTime());
  if (isNaN(s) || isNaN(e) || e < s) return 0;
  return Math.round((e - s) / DAY_MS) + 1;
};

const inRange = (dateStr: string, start: string, end: string): boolean => {
  if (!dateStr) return false;
  const d = dateStr.substring(0, 10);
  return (!start || d >= start) && (!end || d <= end);
};

/* ── Metadata (consistent with the rest of the app) ───────────────────────── */

const EXPENSE_META: Record<ExpenseType, { fr: string; ar: string; icon: React.ReactNode; text: string; bg: string; border: string; bar: string }> = {
  vidange:   { fr: 'Vidange',        ar: 'تغيير الزيت',  icon: <Droplets size={15} />,   text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  bar: 'bg-amber-500' },
  assurance: { fr: 'Assurance',      ar: 'تأمين',         icon: <ShieldCheck size={15} />, text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   bar: 'bg-blue-500' },
  controle:  { fr: 'Contrôle Tech.', ar: 'معاينة تقنية', icon: <Activity size={15} />,   text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', bar: 'bg-purple-500' },
  chaine:    { fr: 'Chaîne',         ar: 'السلسلة',       icon: <LinkIcon size={15} />,   text: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200',   bar: 'bg-teal-500' },
  autre:     { fr: 'Autre',          ar: 'أخرى',          icon: <Wrench size={15} />,     text: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-200',   bar: 'bg-gray-500' },
};

const STATUS_META: Record<string, { fr: string; ar: string; cls: string; dot: string }> = {
  pending:    { fr: 'En attente', ar: 'معلقة',  cls: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-500' },
  accepted:   { fr: 'Acceptée',   ar: 'مقبولة', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  confirmed:  { fr: 'Confirmée',  ar: 'مؤكدة',  cls: 'bg-cyan-50 text-cyan-700 border-cyan-200',       dot: 'bg-cyan-500' },
  active:     { fr: 'Active',     ar: 'نشطة',   cls: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-500' },
  completed:  { fr: 'Terminée',   ar: 'منتهية', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  cancelled:  { fr: 'Annulée',    ar: 'ملغاة',  cls: 'bg-red-50 text-red-600 border-red-200',          dot: 'bg-red-500' },
  terminated: { fr: 'Clôturée',   ar: 'مغلقة',  cls: 'bg-gray-100 text-gray-600 border-gray-200',      dot: 'bg-gray-500' },
};

const PAY_METHOD: Record<string, { fr: string; ar: string }> = {
  cash:     { fr: 'Espèces',  ar: 'نقدا' },
  card:     { fr: 'Carte',    ar: 'بطاقة' },
  transfer: { fr: 'Virement', ar: 'تحويل' },
  check:    { fr: 'Chèque',   ar: 'شيك' },
};

/* ── Small building blocks ────────────────────────────────────────────────── */

// Number that counts up when it appears (respects reduced motion)
const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setDisplay(value); return; }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, reduce]);
  return <>{fmt(display)}</>;
};

// Thin animated progress meter
const Meter: React.FC<{ pct: number; barClass: string; delay?: number }> = ({ pct, barClass, delay = 0 }) => {
  const reduce = useReducedMotion();
  const width = `${Math.max(0, Math.min(100, pct))}%`;
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <motion.div
        initial={reduce ? { width } : { width: 0 }}
        animate={{ width }}
        transition={{ duration: 0.8, delay, ease: 'easeOut' }}
        className={`h-full rounded-full ${barClass}`}
      />
    </div>
  );
};

const StatusBadge: React.FC<{ status: string; lang: Language }> = ({ status, lang }) => {
  const meta = STATUS_META[status] || STATUS_META.terminated;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${meta.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {lang === 'fr' ? meta.fr : meta.ar}
    </span>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────── */

interface Report {
  car: Car;
  start: string;
  end: string;
  reservations: ReservationDetails[];
  expenses: VehicleExpense[];
}

export const CarGainsPage: React.FC<CarGainsPageProps> = ({ lang }) => {
  const isRtl = lang === 'ar';
  const reduce = useReducedMotion();

  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [expandedRes, setExpandedRes] = useState<string | null>(null);
  const [expandedExp, setExpandedExp] = useState<string | null>(null);

  useEffect(() => {
    const loadCars = async () => {
      try {
        const carsData = await DatabaseService.getCars();
        setCars(carsData);
        if (carsData.length > 0) setSelectedCarId(carsData[0].id);
      } catch (err) {
        console.error('Error loading cars:', err);
      }
    };
    loadCars();
  }, []);

  const handleGenerate = async () => {
    if (!selectedCarId || !startDate || !endDate) {
      alert(T('Veuillez sélectionner un véhicule et les dates.', 'يرجى تحديد المركبة والتواريخ.', lang));
      return;
    }
    if (startDate > endDate) {
      alert(T('La date de début doit être avant la date de fin.', 'يجب أن يكون تاريخ البداية قبل تاريخ النهاية.', lang));
      return;
    }
    const car = cars.find(c => c.id === selectedCarId);
    if (!car) return;

    setLoading(true);
    try {
      const [resList, expList] = await Promise.all([
        ReservationsService.getReservations(),
        (async () => {
          const res = await getVehicleExpenses();
          return res.expenses || [];
        })(),
      ]);

      // ALL reservations of this car whose rental window touches the period
      const carRes = resList
        .filter(r => (r.carId || r.car?.id) === selectedCarId && overlapsPeriod(r, startDate, endDate))
        .sort((a, b) => (b.step1?.departureDate || b.createdAt || '').localeCompare(a.step1?.departureDate || a.createdAt || ''));

      // ALL expenses of this car inside the period
      const carExp = expList
        .filter(e => e.carId === selectedCarId && inRange(e.date, startDate, endDate))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setExpandedRes(null);
      setExpandedExp(null);
      setReport({ car, start: startDate, end: endDate, reservations: carRes, expenses: carExp });
    } catch (err) {
      console.error('Error loading data:', err);
      alert(T('Erreur lors du chargement des données.', 'خطأ في تحميل البيانات.', lang));
    } finally {
      setLoading(false);
    }
  };

  /* ── Detailed calculations (computed from the generated snapshot) ── */
  const metrics = useMemo(() => {
    if (!report) return null;
    const { reservations, expenses, start, end } = report;

    const nonCancelled = reservations.filter(r => r.status !== 'cancelled');
    const cancelled = reservations.length - nonCancelled.length;

    const totalInvoiced = nonCancelled.reduce((s, r) => s + (Number(r.totalPrice) || 0), 0);
    const totalPaid = nonCancelled.reduce((s, r) => s + calcPaid(r), 0);
    const totalRemaining = reservations
      .filter(r => !['completed', 'cancelled'].includes(r.status))
      .reduce((s, r) => s + (Number(r.remainingPayment) || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.cost) || 0), 0);
    const netBenefit = totalPaid - totalExpenses;

    const periodDays = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / DAY_MS) + 1);
    const rentedDays = nonCancelled.reduce((s, r) => s + daysInPeriod(r, start, end), 0);
    const occupancy = Math.min(100, (rentedDays / periodDays) * 100);
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;
    const margin = totalPaid > 0 ? (netBenefit / totalPaid) * 100 : 0;
    const avgPerDay = rentedDays > 0 ? totalPaid / rentedDays : 0;

    // Expense breakdown by type
    const byType = (Object.keys(EXPENSE_META) as ExpenseType[])
      .map(type => {
        const items = expenses.filter(e => e.type === type);
        const total = items.reduce((s, e) => s + (Number(e.cost) || 0), 0);
        return { type, count: items.length, total, pct: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0 };
      })
      .filter(g => g.count > 0)
      .sort((a, b) => b.total - a.total);

    return {
      nonCancelledCount: nonCancelled.length, cancelled,
      totalInvoiced, totalPaid, totalRemaining, totalExpenses, netBenefit,
      periodDays, rentedDays, occupancy, collectionRate, margin, avgPerDay, byType,
    };
  }, [report]);

  const handlePrint = async () => {
    if (!report) return;
    try {
      const agencySettings = await DatabaseService.getWebsiteSettings();
      const html = generateReportHTML(report.car, report.reservations, report.expenses, report.start, report.end, agencySettings, lang);
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
          setTimeout(() => { document.body.removeChild(iframe); }, 100);
        }, 250);
      }
    } catch (err) {
      console.error('Error printing report:', err);
      alert(T('Erreur lors de l\'impression.', 'خطأ في الطباعة.', lang));
    }
  };

  /* ── Animation variants ── */
  const sectionV: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };
  const listV: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };

  const inputCls = "w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/50 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-300/50 outline-none text-sm font-semibold backdrop-blur-sm hover:bg-white/15 transition-all";

  return (
    <div className="space-y-6 pb-10" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ══ Hero header + filters ══ */}
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950" />
        {/* Ambient glow orbs */}
        {!reduce && (
          <>
            <motion.div
              animate={{ y: [0, 22, 0], x: [0, 14, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-fuchsia-600/25 blur-3xl"
            />
            <motion.div
              animate={{ y: [0, -18, 0], x: [0, -12, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-28 -left-16 w-96 h-96 rounded-full bg-indigo-500/25 blur-3xl"
            />
            <motion.div
              animate={{ opacity: [0.15, 0.35, 0.15] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/3 left-1/2 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl"
            />
          </>
        )}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '14px 14px' }}
        />

        <div className="relative p-7 md:p-8">
          <div className="flex items-center gap-4 mb-7">
            <motion.div
              animate={reduce ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30 border border-white/15 flex items-center justify-center text-4xl shadow-lg shadow-fuchsia-900/30"
            >
              💰
            </motion.div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase">
                {T('Gains par Véhicule', 'الأرباح حسب المركبة', lang)}
              </h1>
              <p className="text-indigo-200 text-sm mt-1 font-semibold flex items-center gap-1.5">
                <Sparkles size={14} className="text-fuchsia-300" />
                {T('Locations, dépenses et bénéfice net — tout en détail', 'الإيجارات والمصاريف وصافي الربح — كل التفاصيل', lang)}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div>
              <label className="block text-[11px] font-black text-indigo-200 mb-2 uppercase tracking-widest">
                {T('Véhicule', 'المركبة', lang)}
              </label>
              <select value={selectedCarId} onChange={(e) => setSelectedCarId(e.target.value)} className={inputCls}>
                <option value="" className="bg-slate-900">
                  {T('-- Choisir une voiture --', '-- اختر سيارة --', lang)}
                </option>
                {cars.map(car => (
                  <option key={car.id} value={car.id} className="bg-slate-900">
                    {car.brand} {car.model} ({car.registration})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-indigo-200 mb-2 uppercase tracking-widest">
                {T('Date de début', 'تاريخ البداية', lang)}
              </label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-black text-indigo-200 mb-2 uppercase tracking-widest">
                {T('Date de fin', 'تاريخ النهاية', lang)}
              </label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </div>
            <div className="flex items-end">
              <motion.button
                whileHover={reduce ? undefined : { scale: 1.04 }}
                whileTap={reduce ? undefined : { scale: 0.96 }}
                onClick={handleGenerate}
                disabled={loading || !selectedCarId}
                className="w-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white font-black py-2.5 px-4 rounded-xl shadow-lg shadow-fuchsia-900/40 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm uppercase tracking-wide"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {T('Génération...', 'جاري...', lang)}
                  </>
                ) : (
                  <>
                    <TrendingUp size={16} />
                    {T('Générer le rapport', 'إنشاء التقرير', lang)}
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══ Loading skeleton ══ */}
      {loading && (
        <div className="space-y-4">
          <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
          <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      )}

      {/* ══ Empty state before generation ══ */}
      <AnimatePresence mode="wait">
        {!report && !loading && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-center py-24"
          >
            <div className="text-center max-w-md">
              <motion.div
                animate={reduce ? undefined : { y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="text-7xl mb-4 opacity-25"
              >
                📊
              </motion.div>
              <p className="text-lg font-bold text-gray-600 mb-2">
                {T('Prêt à analyser vos gains ?', 'هل أنت مستعد لتحليل أرباحك؟', lang)}
              </p>
              <p className="text-sm text-gray-400">
                {T('Sélectionnez un véhicule et une plage de dates, puis cliquez sur Générer pour voir toutes les locations, dépenses et le bénéfice net.', 'اختر مركبة ونطاق تاريخ، ثم انقر على إنشاء لرؤية جميع الإيجارات والمصاريف وصافي الربح.', lang)}
              </p>
            </div>
          </motion.div>
        )}

        {/* ══ Results ══ */}
        {report && metrics && !loading && (
          <motion.div key={`${report.car.id}-${report.start}-${report.end}`} variants={listV} initial="hidden" animate="show" className="space-y-5">

            {/* ── Car banner ── */}
            <motion.div variants={sectionV} className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="absolute inset-y-0 w-1.5 bg-gradient-to-b from-fuchsia-500 to-indigo-500 start-0" />
              <div className="flex flex-col sm:flex-row items-center gap-5 p-6">
                <motion.div
                  whileHover={reduce ? undefined : { scale: 1.04 }}
                  className="w-36 h-24 sm:w-40 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200 shadow-md"
                >
                  <img
                    src={report.car.images?.[0] || 'https://picsum.photos/seed/car/400/300'}
                    alt={`${report.car.brand} ${report.car.model}`}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <div className="flex-1 text-center sm:text-start">
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                    {report.car.brand} {report.car.model}
                  </h2>
                  <p className="inline-block mt-1 text-xs font-black bg-gray-900 text-white px-3 py-1 rounded-md tracking-widest">
                    {report.car.registration}
                  </p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                    <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                      📅 {report.car.year}
                    </span>
                    <span className="text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full">
                      ⛽ {report.car.energy}
                    </span>
                    <span className="text-xs font-bold bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1 rounded-full">
                      🎯 {report.car.mileage.toLocaleString()} KM
                    </span>
                  </div>
                </div>
                <div className="text-center sm:text-end">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    {T('Période analysée', 'الفترة المحللة', lang)}
                  </p>
                  <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-sm px-4 py-2 rounded-xl">
                    <CalendarDays size={16} />
                    {fmtD(report.start)} → {fmtD(report.end)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 font-semibold">
                    {metrics.periodDays} {T('jours', 'يوم', lang)}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ── KPI cards ── */}
            <motion.div variants={sectionV} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: T('Total Facturé', 'الإجمالي المفوتر', lang),
                  value: metrics.totalInvoiced,
                  subtext: `${metrics.nonCancelledCount} ${T('location(s)', 'إيجار', lang)}`,
                  gradient: 'from-blue-600 to-indigo-600',
                  glow: 'shadow-blue-500/30',
                  icon: <Receipt size={20} />
                },
                {
                  label: T('Encaissé', 'المحصّل', lang),
                  value: metrics.totalPaid,
                  subtext: `${Math.round(metrics.collectionRate)}% ${T('du facturé', 'من المفوتر', lang)}`,
                  gradient: 'from-emerald-500 to-teal-600',
                  glow: 'shadow-emerald-500/30',
                  icon: <ArrowDownCircle size={20} />
                },
                {
                  label: T('Dépenses', 'المصاريف', lang),
                  value: metrics.totalExpenses,
                  subtext: `${report.expenses.length} ${T('dépense(s)', 'مصروف', lang)}`,
                  gradient: 'from-rose-500 to-red-600',
                  glow: 'shadow-rose-500/30',
                  icon: <ArrowUpCircle size={20} />
                },
                {
                  label: T('Bénéfice Net', 'صافي الأرباح', lang),
                  value: metrics.netBenefit,
                  subtext: metrics.netBenefit >= 0 ? T('Profit', 'ربح', lang) : T('Perte', 'خسارة', lang),
                  gradient: metrics.netBenefit >= 0 ? 'from-green-500 to-emerald-600' : 'from-orange-500 to-red-600',
                  glow: metrics.netBenefit >= 0 ? 'shadow-green-500/30' : 'shadow-orange-500/30',
                  icon: <Wallet size={20} />
                }
              ].map((kpi, i) => (
                <motion.div
                  key={i}
                  variants={sectionV}
                  whileHover={reduce ? undefined : { scale: 1.03, y: -3 }}
                  className={`relative overflow-hidden bg-gradient-to-br ${kpi.gradient} rounded-2xl p-4 text-white shadow-lg ${kpi.glow}`}
                >
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10" />
                  <div className="flex items-start justify-between mb-3 relative">
                    <p className="text-[10px] font-black text-white/75 uppercase tracking-widest leading-tight">
                      {kpi.label}
                    </p>
                    <span className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
                      {kpi.icon}
                    </span>
                  </div>
                  <p className="text-xl md:text-2xl font-black leading-tight relative">
                    <AnimatedNumber value={kpi.value} />
                    <span className="text-xs font-bold text-white/70 ms-1">DZD</span>
                  </p>
                  <p className="text-white/70 text-[10px] mt-1 font-semibold relative">{kpi.subtext}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* ── Performance meters ── */}
            <motion.div variants={sectionV} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: T("Taux d'occupation", 'معدل الإشغال', lang),
                  display: `${Math.round(metrics.occupancy)}%`,
                  sub: `${metrics.rentedDays}/${metrics.periodDays} ${T('jours loués', 'يوم مؤجر', lang)}`,
                  pct: metrics.occupancy,
                  bar: 'bg-gradient-to-r from-indigo-500 to-violet-500',
                  icon: <Gauge size={16} className="text-indigo-500" />
                },
                {
                  label: T("Taux d'encaissement", 'معدل التحصيل', lang),
                  display: `${Math.round(metrics.collectionRate)}%`,
                  sub: T('du montant facturé', 'من المبلغ المفوتر', lang),
                  pct: metrics.collectionRate,
                  bar: 'bg-gradient-to-r from-emerald-500 to-teal-500',
                  icon: <Percent size={16} className="text-emerald-500" />
                },
                {
                  label: T('Marge nette', 'الهامش الصافي', lang),
                  display: `${Math.round(metrics.margin)}%`,
                  sub: T("de l'encaissé", 'من المحصّل', lang),
                  pct: metrics.margin,
                  bar: metrics.margin >= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-orange-500 to-red-500',
                  icon: <TrendingUp size={16} className="text-green-500" />
                },
                {
                  label: T('Moyenne / jour loué', 'المعدل / يوم مؤجر', lang),
                  display: `${fmt(metrics.avgPerDay)}`,
                  sub: T('DZD encaissés par jour', 'دج محصّلة يوميا', lang),
                  pct: 100,
                  bar: 'bg-gradient-to-r from-fuchsia-500 to-pink-500',
                  icon: <Banknote size={16} className="text-fuchsia-500" />
                }
              ].map((m, i) => (
                <motion.div
                  key={i}
                  variants={sectionV}
                  whileHover={reduce ? undefined : { y: -2 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{m.label}</p>
                    {m.icon}
                  </div>
                  <p className="text-2xl font-black text-gray-900">{m.display}</p>
                  <p className="text-[11px] text-gray-400 font-semibold mb-3">{m.sub}</p>
                  <Meter pct={m.pct} barClass={m.bar} delay={0.15 + i * 0.1} />
                </motion.div>
              ))}
            </motion.div>

            {/* ── Reservations list ── */}
            <motion.div variants={sectionV} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 px-6 py-4 flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-black text-emerald-800 uppercase tracking-tighter flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                    <Calendar size={17} />
                  </span>
                  {T('Locations de la période', 'إيجارات الفترة', lang)}
                  <span className="text-xs font-black bg-emerald-600 text-white px-2.5 py-1 rounded-full">
                    {report.reservations.length}
                  </span>
                </h3>
                <div className="text-end">
                  <p className="text-sm font-black text-emerald-600">+{fmt(metrics.totalPaid)} DZD</p>
                  <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wide">{T('encaissé', 'محصّل', lang)}</p>
                </div>
              </div>

              {report.reservations.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-bold text-sm">
                    {T('Aucune location pour ce véhicule sur cette période.', 'لا توجد إيجارات لهذه المركبة في هذه الفترة.', lang)}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {report.reservations.map((res) => {
                    const paid = calcPaid(res);
                    const debt = Number(res.remainingPayment) || 0;
                    const total = Number(res.totalPrice) || 0;
                    const days = Number(res.totalDays) || 0;
                    const perDay = days > 0 ? total / days : 0;
                    const isCancelled = res.status === 'cancelled';
                    const isOpen = expandedRes === res.id;
                    const clientName = `${res.client?.firstName || res.step2?.firstName || ''} ${res.client?.lastName || res.step2?.lastName || ''}`.trim() || '—';
                    const initials = clientName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
                    const payments = (res.payments || []) as any[];

                    return (
                      <div key={res.id} className={isCancelled ? 'opacity-60' : ''}>
                        <button
                          onClick={() => setExpandedRes(isOpen ? null : res.id)}
                          className="w-full text-start px-5 py-4 hover:bg-emerald-50/40 transition-colors flex items-center gap-4"
                        >
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                            {initials || <User size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-black text-gray-800 truncate">{clientName}</p>
                              <StatusBadge status={res.status} lang={lang} />
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1 flex-wrap">
                              <Clock size={13} className="flex-shrink-0" />
                              {fmtD(res.step1?.departureDate)} → {fmtD(res.step1?.returnDate)}
                              <span className="text-[10px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {days} {T('j', 'ي', lang)}
                              </span>
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-end space-y-0.5">
                            <p className="font-black text-emerald-600 text-sm">✓ {fmt(paid)} DZD</p>
                            {debt > 0 && !isCancelled && (
                              <p className="text-xs font-bold text-orange-500">⏳ {fmt(debt)} DZD</p>
                            )}
                          </div>
                          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }} className="flex-shrink-0">
                            <ChevronDown size={18} className="text-gray-400" />
                          </motion.span>
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: 'easeInOut' }}
                              className="overflow-hidden bg-gradient-to-b from-emerald-50/60 to-white border-t border-emerald-100"
                            >
                              <div className="px-5 py-4 space-y-4">
                                {/* Financial detail grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-sm">
                                  {[
                                    { label: T('Total', 'الإجمالي', lang), val: `${fmt(total)}`, cls: 'text-gray-900' },
                                    { label: T('Prix / jour', 'السعر / يوم', lang), val: `${fmt(perDay)}`, cls: 'text-indigo-600' },
                                    { label: T('Avance', 'التسبيق', lang), val: `${fmt(Number(res.advancePayment) || 0)}`, cls: 'text-blue-600' },
                                    { label: T('Payé', 'المدفوع', lang), val: `${fmt(paid)}`, cls: 'text-emerald-600' },
                                    { label: T('Reste', 'المتبقي', lang), val: `${fmt(debt)}`, cls: debt > 0 ? 'text-orange-600' : 'text-green-600' },
                                    { label: T('Caution', 'الضمان', lang), val: `${fmt(Number(res.deposit) || 0)}`, cls: 'text-gray-600' },
                                  ].map((cell, ci) => (
                                    <div key={ci} className="bg-white rounded-xl border border-gray-200 p-3">
                                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-wide">{cell.label}</p>
                                      <p className={`font-black mt-1 ${cell.cls}`}>{cell.val} <span className="text-[10px] text-gray-400">DZD</span></p>
                                    </div>
                                  ))}
                                </div>

                                {/* Extra info row */}
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {(res.client?.phone || res.step2?.phone) && (
                                    <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 font-bold px-3 py-1.5 rounded-full">
                                      <Phone size={12} /> {res.client?.phone || res.step2?.phone}
                                    </span>
                                  )}
                                  {Number(res.discountAmount) > 0 && (
                                    <span className="inline-flex items-center gap-1.5 bg-pink-50 border border-pink-200 text-pink-600 font-bold px-3 py-1.5 rounded-full">
                                      🏷️ {T('Remise', 'تخفيض', lang)}: {res.discountType === 'percentage' ? `${res.discountAmount}%` : `${fmt(Number(res.discountAmount))} DZD`}
                                    </span>
                                  )}
                                  {Number(res.additionalFees) > 0 && (
                                    <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-600 font-bold px-3 py-1.5 rounded-full">
                                      ➕ {T('Frais supp.', 'رسوم إضافية', lang)}: {fmt(Number(res.additionalFees))} DZD
                                    </span>
                                  )}
                                  {res.protectionAssuranceName && (
                                    <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-600 font-bold px-3 py-1.5 rounded-full">
                                      <ShieldCheck size={12} /> {res.protectionAssuranceName}
                                    </span>
                                  )}
                                  {res.createdByName && (
                                    <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-500 font-bold px-3 py-1.5 rounded-full">
                                      <FileText size={12} /> {T('Créée par', 'أنشأها', lang)} {res.createdByName}
                                    </span>
                                  )}
                                </div>

                                {/* Payments history */}
                                {payments.length > 0 && (
                                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 pt-3 pb-1 flex items-center gap-1.5">
                                      <CreditCard size={12} /> {T('Historique des paiements', 'سجل المدفوعات', lang)} ({payments.length})
                                    </p>
                                    <div className="divide-y divide-gray-50">
                                      {payments.map((p, pi) => (
                                        <div key={p.id || pi} className="flex items-center justify-between px-4 py-2 text-sm">
                                          <span className="text-gray-500 font-semibold flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            {fmtD(p.date)}
                                            <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">
                                              {PAY_METHOD[p.method] ? T(PAY_METHOD[p.method].fr, PAY_METHOD[p.method].ar, lang) : p.method}
                                            </span>
                                          </span>
                                          <span className="font-black text-emerald-600">+{fmt(Number(p.amount) || 0)} DZD</span>
                                        </div>
                                      ))}
                                    </div>
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

              {report.reservations.length > 0 && (
                <div className="bg-emerald-50/70 border-t border-emerald-100 px-6 py-3 flex items-center justify-between text-sm flex-wrap gap-2">
                  <span className="font-bold text-emerald-700">
                    {T('Total facturé', 'إجمالي المفوتر', lang)}
                    {metrics.cancelled > 0 && (
                      <span className="text-[10px] font-bold text-gray-400 ms-2">
                        ({metrics.cancelled} {T('annulée(s) exclue(s)', 'ملغاة مستبعدة', lang)})
                      </span>
                    )}
                  </span>
                  <span className="font-black text-emerald-700">{fmt(metrics.totalInvoiced)} DZD</span>
                </div>
              )}
            </motion.div>

            {/* ── Expenses list ── */}
            <motion.div variants={sectionV} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-rose-50 to-red-50 border-b border-rose-100 px-6 py-4 flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-black text-rose-800 uppercase tracking-tighter flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/30">
                    <Receipt size={17} />
                  </span>
                  {T('Dépenses de la période', 'مصاريف الفترة', lang)}
                  <span className="text-xs font-black bg-rose-600 text-white px-2.5 py-1 rounded-full">
                    {report.expenses.length}
                  </span>
                </h3>
                <div className="text-end">
                  <p className="text-sm font-black text-rose-600">-{fmt(metrics.totalExpenses)} DZD</p>
                  <p className="text-[10px] font-bold text-rose-500/80 uppercase tracking-wide">{T('dépensé', 'مصروف', lang)}</p>
                </div>
              </div>

              {/* Breakdown by type */}
              {metrics.byType.length > 0 && (
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    {T('Répartition par type', 'التوزيع حسب النوع', lang)}
                  </p>
                  <div className="space-y-2.5">
                    {metrics.byType.map((g, gi) => {
                      const meta = EXPENSE_META[g.type];
                      return (
                        <div key={g.type} className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-lg border ${meta.bg} ${meta.text} ${meta.border} w-36 flex-shrink-0`}>
                            {meta.icon} {T(meta.fr, meta.ar, lang)}
                          </span>
                          <div className="flex-1">
                            <Meter pct={g.pct} barClass={meta.bar} delay={0.1 + gi * 0.08} />
                          </div>
                          <span className="text-xs font-black text-gray-700 w-28 text-end flex-shrink-0">
                            {fmt(g.total)} <span className="text-gray-400 font-bold">DZD</span>
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 w-9 text-end flex-shrink-0">
                            {Math.round(g.pct)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {report.expenses.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-bold text-sm">
                    {T('Aucune dépense pour ce véhicule sur cette période.', 'لا توجد مصاريف لهذه المركبة في هذه الفترة.', lang)}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {report.expenses.map((exp) => {
                    const meta = EXPENSE_META[exp.type] || EXPENSE_META.autre;
                    const isOpen = expandedExp === exp.id;
                    const anyExp = exp as any;
                    const filters: string[] = [];
                    if (anyExp.oilFilterChanged) filters.push(T('Filtre à huile', 'فلتر الزيت', lang));
                    if (anyExp.airFilterChanged) filters.push(T('Filtre à air', 'فلتر الهواء', lang));
                    if (anyExp.fuelFilterChanged) filters.push(T('Filtre à carburant', 'فلتر الوقود', lang));
                    if (anyExp.acFilterChanged) filters.push(T('Filtre clim', 'فلتر التكييف', lang));

                    return (
                      <div key={exp.id}>
                        <button
                          onClick={() => setExpandedExp(isOpen ? null : exp.id)}
                          className="w-full text-start px-5 py-4 hover:bg-rose-50/40 transition-colors flex items-center gap-4"
                        >
                          <span className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.text} ${meta.border}`}>
                            {meta.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-black text-gray-800 truncate">
                                {exp.expenseName || T(meta.fr, meta.ar, lang)}
                              </p>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}>
                                {T(meta.fr, meta.ar, lang)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                              <Calendar size={13} /> {fmtD(exp.date)}
                            </p>
                          </div>
                          <p className="flex-shrink-0 font-black text-rose-600 text-sm">-{fmt(Number(exp.cost) || 0)} DZD</p>
                          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }} className="flex-shrink-0">
                            <ChevronDown size={18} className="text-gray-400" />
                          </motion.span>
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: 'easeInOut' }}
                              className="overflow-hidden bg-gradient-to-b from-rose-50/60 to-white border-t border-rose-100"
                            >
                              <div className="px-5 py-4 space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-wide">{T('Montant', 'المبلغ', lang)}</p>
                                    <p className="font-black text-rose-600 mt-1">{fmt(Number(exp.cost) || 0)} <span className="text-[10px] text-gray-400">DZD</span></p>
                                  </div>
                                  {exp.currentMileage != null && (
                                    <div className="bg-white rounded-xl border border-gray-200 p-3">
                                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-wide">{T('Kilométrage', 'المسافة', lang)}</p>
                                      <p className="font-black text-gray-800 mt-1">{Number(exp.currentMileage).toLocaleString()} KM</p>
                                    </div>
                                  )}
                                  {exp.nextVidangeKm != null && (
                                    <div className="bg-white rounded-xl border border-gray-200 p-3">
                                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-wide">{T('Proch. vidange', 'التغيير القادم', lang)}</p>
                                      <p className="font-black text-amber-600 mt-1">{Number(exp.nextVidangeKm).toLocaleString()} KM</p>
                                    </div>
                                  )}
                                  {exp.expirationDate && (
                                    <div className="bg-white rounded-xl border border-gray-200 p-3">
                                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-wide">{T('Expiration', 'الانتهاء', lang)}</p>
                                      <p className="font-black text-purple-600 mt-1">{fmtD(exp.expirationDate)}</p>
                                    </div>
                                  )}
                                </div>
                                {filters.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {filters.map((f, fi) => (
                                      <span key={fi} className="text-[11px] font-bold bg-teal-50 border border-teal-200 text-teal-700 px-2.5 py-1 rounded-full">
                                        ✓ {f}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {exp.note && (
                                  <div className="bg-white rounded-xl border border-gray-200 p-3 text-sm">
                                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-wide mb-1">{T('Note', 'ملاحظة', lang)}</p>
                                    <p className="text-gray-700 font-medium">{exp.note}</p>
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

              {report.expenses.length > 0 && (
                <div className="bg-rose-50/70 border-t border-rose-100 px-6 py-3 flex items-center justify-between text-sm">
                  <span className="font-bold text-rose-700">{T('Total dépenses', 'إجمالي المصاريف', lang)}</span>
                  <span className="font-black text-rose-700">-{fmt(metrics.totalExpenses)} DZD</span>
                </div>
              )}
            </motion.div>

            {/* ── Financial summary ── */}
            <motion.div variants={sectionV} className="relative overflow-hidden rounded-2xl shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950" />
              {!reduce && (
                <motion.div
                  animate={{ opacity: [0.15, 0.3, 0.15] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  className={`absolute -top-20 -right-10 w-72 h-72 rounded-full blur-3xl ${metrics.netBenefit >= 0 ? 'bg-emerald-500/30' : 'bg-rose-500/30'}`}
                />
              )}
              <div className="relative p-6 md:p-7">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-5 flex items-center gap-2">
                  <Wallet size={18} className="text-fuchsia-300" />
                  {T('Résumé Financier', 'الملخص المالي', lang)}
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: T('Facturé', 'المفوتر', lang), value: metrics.totalInvoiced, cls: 'text-blue-300', sign: '' },
                    { label: T('Encaissé', 'المحصّل', lang), value: metrics.totalPaid, cls: 'text-emerald-300', sign: '+' },
                    { label: T('Reste à payer', 'المتبقي', lang), value: metrics.totalRemaining, cls: 'text-orange-300', sign: '⏳' },
                    { label: T('Dépenses', 'المصاريف', lang), value: metrics.totalExpenses, cls: 'text-rose-300', sign: '−' },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
                      <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1.5">{item.label}</p>
                      <p className={`text-xl font-black ${item.cls}`}>
                        {item.sign && <span className="text-sm me-0.5">{item.sign}</span>}
                        <AnimatedNumber value={item.value} />
                      </p>
                      <p className="text-[10px] text-white/40 font-bold mt-0.5">DZD</p>
                    </div>
                  ))}
                </div>

                {/* Net result */}
                <div className={`rounded-xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-3 ${metrics.netBenefit >= 0 ? 'bg-emerald-500/10 border-emerald-400/30' : 'bg-rose-500/10 border-rose-400/30'}`}>
                  <div>
                    <p className={`text-lg font-black uppercase tracking-tight ${metrics.netBenefit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {T('Bénéfice Net', 'صافي الأرباح', lang)}
                    </p>
                    <p className="text-xs text-white/50 font-semibold mt-0.5">
                      {fmt(metrics.totalPaid)} ({T('encaissé', 'محصّل', lang)}) − {fmt(metrics.totalExpenses)} ({T('dépenses', 'مصاريف', lang)})
                    </p>
                  </div>
                  <p className={`text-3xl md:text-4xl font-black ${metrics.netBenefit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {metrics.netBenefit >= 0 ? '+' : '−'}<AnimatedNumber value={Math.abs(metrics.netBenefit)} />
                    <span className="text-sm font-bold text-white/50 ms-1.5">DZD</span>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ── No data at all ── */}
            {report.reservations.length === 0 && report.expenses.length === 0 && (
              <motion.div variants={sectionV} className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                <AlertCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <p className="text-blue-800 font-semibold">
                  {T('Aucune donnée pour cette période. Essayez une autre plage de dates.', 'لا توجد بيانات لهذه الفترة. جرب نطاق تواريخ آخر.', lang)}
                </p>
              </motion.div>
            )}

            {/* ── Print ── */}
            <motion.div variants={sectionV} className="flex justify-center pt-2">
              <motion.button
                whileHover={reduce ? undefined : { scale: 1.05 }}
                whileTap={reduce ? undefined : { scale: 0.95 }}
                onClick={handlePrint}
                className="bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 text-white font-black py-3 px-8 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl transition-all flex items-center gap-2 uppercase tracking-wide"
              >
                <Printer size={18} />
                {T('Imprimer le Rapport', 'طباعة التقرير', lang)}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CarGainsPage;
