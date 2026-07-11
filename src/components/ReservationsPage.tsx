import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye, Edit, FileText, Printer, Search, X, ChevronDown,
  TrendingUp, Users, AlertCircle, DollarSign, Calendar,
  Loader2, Receipt
} from 'lucide-react';
import { Language, ReservationDetails } from '../types';
import { ReservationsService } from '../services/ReservationsService';
import { DatabaseService } from '../services/DatabaseService';
import { ReservationDetailsView } from './ReservationDetailsView';
import { EditReservationForm } from './EditReservationForm';
import { PersonalizationModal } from './PlannerPage';

// ── helpers ─────────────────────────────────────────────────────────────────
const T = (fr: string, ar: string, lang: Language) => lang === 'fr' ? fr : ar;
const fmt = (n: number) => Math.round(n || 0).toLocaleString('fr-DZ');
const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d || '—'; }
};

const dateKey = (d: string) => (d || '').substring(0, 10);

const inRange = (dateStr: string, startDate: string, endDate: string): boolean => {
  if (!dateStr) return false;
  const d = dateKey(dateStr);
  return (!startDate || d >= startDate) && (!endDate || d <= endDate);
};

const calcPaid = (r: ReservationDetails): number => {
  const payments = (r.payments || []) as any[];
  if (payments.length > 0) {
    const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    if (total > 0) return total;
  }
  return Math.max(0, (Number(r.totalPrice) || 0) - (Number(r.remainingPayment) || 0));
};

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CLS: Record<string, string> = {
  completed: 'bg-violet-100 text-violet-700 border-violet-200',
  active:    'bg-blue-100  text-blue-700  border-blue-200',
  confirmed: 'bg-teal-100  text-teal-700  border-teal-200',
  accepted:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  pending:   'bg-amber-100 text-amber-700 border-amber-200',
  cancelled: 'bg-red-100   text-red-700   border-red-200',
};
const STATUS_LABEL: Record<string, { fr: string; ar: string }> = {
  completed: { fr: 'Terminée',  ar: 'منتهية'  },
  active:    { fr: 'Active',    ar: 'نشطة'    },
  confirmed: { fr: 'Confirmée', ar: 'مؤكدة'   },
  accepted:  { fr: 'Acceptée',  ar: 'مقبولة'  },
  pending:   { fr: 'En attente',ar: 'معلقة'   },
  cancelled: { fr: 'Annulée',   ar: 'ملغاة'   },
};

// ── Period options ────────────────────────────────────────────────────────────
type PeriodKey = 'today' | '7d' | '30d' | 'custom';
const PERIODS: { key: PeriodKey; fr: string; ar: string }[] = [
  { key: 'today', fr: "Aujourd'hui",    ar: 'اليوم'          },
  { key: '7d',    fr: '7 derniers jours', ar: '٧ أيام أخيرة'  },
  { key: '30d',   fr: '30 derniers jours',ar: '٣٠ يوماً أخيراً'},
  { key: 'custom', fr: 'Personnalisé',   ar: 'مخصص'           },
];

const getPeriodRange = (key: PeriodKey): { startDate: string; endDate: string } => {
  if (key === 'custom') return { startDate: '', endDate: '' };
  const now  = new Date();
  const end  = now.toISOString().substring(0, 10);
  if (key === 'today') return { startDate: end, endDate: end };
  const start = new Date(now);
  start.setDate(start.getDate() - (key === '7d' ? 6 : 29));
  return { startDate: start.toISOString().substring(0, 10), endDate: end };
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
interface ReservationsPageProps {
  lang: Language;
  isAuthLoading?: boolean;
  user?: any;
}

type CurrentView = 'list' | 'details' | 'edit';

export const ReservationsPage: React.FC<ReservationsPageProps> = ({ lang, isAuthLoading = false, user = null }) => {
  // ── Data
  const [reservations, setReservations] = useState<ReservationDetails[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [agencies, setAgencies]         = useState<any[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);

  // ── Navigation
  const [currentView, setCurrentView]             = useState<CurrentView>('list');
  const [selectedReservation, setSelectedReservation] = useState<ReservationDetails | null>(null);

  // ── Print
  const [showPersonalization, setShowPersonalization] = useState<{ reservation: ReservationDetails; type: string } | null>(null);

  // ── Filters
  const [period, setPeriod]         = useState<PeriodKey>('today');
  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);
  const [customStartDate, setCustomStartDate] = useState(todayStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // ── Debt modal
  const [showDebtModal, setShowDebtModal] = useState(false);

  // ── Segmented control animation ref
  const segRef = useRef<HTMLDivElement>(null);

  // ── Load
  useEffect(() => {
    if (isAuthLoading || !user) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await ReservationsService.getReservations();
        setReservations(data);
      } catch (e) {
        console.error('ReservationsPage: failed to load reservations', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user, isAuthLoading]);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    DatabaseService.getAgencies().then(setAgencies).catch(console.error)
      .finally(() => setIsLoadingAgencies(false));
  }, [user, isAuthLoading]);

  // ── Computed
  const { startDate, endDate } = useMemo(() => {
    if (period === 'custom') {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return getPeriodRange(period);
  }, [period, customStartDate, customEndDate]);

  /** Contrats = only completed reservations in the selected period */
  const periodReservations = useMemo(
    () => reservations.filter(r =>
      r.status === 'completed' &&
      inRange(r.completedAt || r.step1?.returnDate || r.createdAt, startDate, endDate)
    ),
    [reservations, startDate, endDate]
  );

  /** After text search filter */
  const filteredReservations = useMemo(() => {
    let list = periodReservations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => {
        const client = `${r.client?.firstName || ''} ${r.client?.lastName || ''}`.toLowerCase();
        const car    = `${r.car?.brand || ''} ${r.car?.model || ''} ${r.car?.registration || ''}`.toLowerCase();
        return client.includes(q) || car.includes(q);
      });
    }
    return list;
  }, [periodReservations, searchQuery]);

  // ── Stats
  const totalGains = useMemo(
    () => periodReservations.reduce((s, r) => s + calcPaid(r), 0),
    [periodReservations]
  );
  const totalReste = useMemo(
    () => periodReservations.reduce((s, r) => s + (Number(r.remainingPayment) || 0), 0),
    [periodReservations]
  );

  /** Réservations impayées (pour le modal dette) */
  const debtReservations = useMemo(
    () => periodReservations.filter(r => (Number(r.remainingPayment) || 0) > 0),
    [periodReservations]
  );

  // ── Actions
  const handleViewDetails = (r: ReservationDetails) => {
    setSelectedReservation(r);
    setCurrentView('details');
  };
  const handleEdit = (r: ReservationDetails) => {
    setSelectedReservation(r);
    setCurrentView('edit');
  };
  const handleBack = () => {
    setCurrentView('list');
    setSelectedReservation(null);
  };
  const handleUpdate = async (updated: ReservationDetails) => {
    try {
      await ReservationsService.updateReservation(updated.id, updated);
      const fresh = await ReservationsService.getReservationById(updated.id);
      setReservations(prev => prev.map(r => r.id === fresh.id ? fresh : r));
      if (selectedReservation?.id === fresh.id) setSelectedReservation(fresh);
    } catch (e) { console.error('Failed to update reservation', e); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Sub-views
  // ─────────────────────────────────────────────────────────────────────────
  if (currentView === 'details' && selectedReservation) {
    return (
      <ReservationDetailsView
        lang={lang}
        reservation={selectedReservation}
        onBack={handleBack}
        onUpdate={handleUpdate}
      />
    );
  }

  if (currentView === 'edit' && selectedReservation) {
    return (
      <EditReservationForm
        lang={lang}
        reservation={selectedReservation}
        onBack={handleBack}
        onUpdate={handleUpdate}
        agencies={agencies}
        isLoadingAgencies={isLoadingAgencies}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main list view
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-saas-border p-8 shadow-sm"
      >
        <h1 className="text-3xl font-black text-saas-text-main tracking-tighter uppercase">
          🧾 {T('Contrats', 'العقود', lang)}
        </h1>
        <p className="text-[10px] text-saas-primary-via font-bold uppercase tracking-[0.3em] mt-1">
          {T('Réservations terminées · contrats clôturés', 'الحجوزات المنتهية · العقود المغلقة', lang)}
        </p>
      </motion.div>

      {/* ── Filtres ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center w-full">
        {/* Segmented control période et dates personnalisées */}
        <div className="flex flex-wrap items-center gap-3">
          <div ref={segRef} className="relative flex bg-saas-bg border border-saas-border rounded-xl p-1 gap-0.5">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`relative z-10 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  period === p.key
                    ? 'bg-white shadow-sm text-saas-text-main border border-saas-border'
                    : 'text-saas-text-muted hover:text-saas-text-main'
                }`}
              >
                {p[lang]}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          <AnimatePresence>
            {period === 'custom' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <div className="flex items-center gap-2 bg-white border border-saas-border rounded-xl px-3 py-2">
                  <Calendar size={14} className="text-saas-text-muted" />
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-saas-text-main font-semibold"
                  />
                </div>
                <span className="text-saas-text-muted text-xs font-bold text-center">→</span>
                <div className="flex items-center gap-2 bg-white border border-saas-border rounded-xl px-3 py-2">
                  <Calendar size={14} className="text-saas-text-muted" />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-saas-text-main font-semibold"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recherche */}
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-saas-text-muted" size={16} />
          <input
            type="text"
            placeholder={T('Client, véhicule, immatriculation…', 'عميل، مركبة، رقم لوحة…', lang)}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-saas-border rounded-xl text-sm outline-none focus:border-saas-primary-via transition-all"
          />
        </div>

        {/* Statut badge — toujours "Terminée" */}
        <div className="px-4 py-2.5 bg-violet-50 border border-violet-200 rounded-xl text-xs font-black text-violet-700 uppercase tracking-wider">
          ✅ {T('Terminées', 'منتهية', lang)}
        </div>
      </div>

      {/* ── Cartes stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Carte 1 — Total gains */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="glass-card border border-emerald-100 bg-emerald-50 p-6 flex items-start gap-4"
        >
          <div className="p-3 bg-emerald-100 rounded-xl flex-shrink-0">
            <TrendingUp className="text-emerald-600" size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-700">{fmt(totalGains)}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 mt-0.5">
              {T('Total encaissé · DZD', 'إجمالي المحصّل · د.ج', lang)}
            </p>
          </div>
        </motion.div>

        {/* Carte 2 — Nombre */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card border border-blue-100 bg-blue-50 p-6 flex items-start gap-4"
        >
          <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
            <Users className="text-blue-600" size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-blue-700">{periodReservations.length}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-blue-500 mt-0.5">
              {T('Contrats terminés · période', 'عقود منتهية · الفترة', lang)}
            </p>
          </div>
        </motion.div>

        {/* Carte 3 — Total restes (cliquable) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.01 }}
          onClick={() => setShowDebtModal(true)}
          className="glass-card border border-amber-100 bg-amber-50 p-6 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="p-3 bg-amber-100 rounded-xl flex-shrink-0">
            <AlertCircle className="text-amber-600" size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-amber-700">{fmt(totalReste)}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500 mt-0.5">
              {T('Total des restes · DZD (cliquer)', 'إجمالي الديون · د.ج (اضغط)', lang)}
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Tableau ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 bg-white rounded-2xl border border-saas-border">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-saas-primary-via" size={32} />
            <p className="text-saas-text-muted font-medium text-sm">
              {T('Chargement des réservations…', 'جاري تحميل الحجوزات…', lang)}
            </p>
          </div>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="flex items-center justify-center py-24 bg-white rounded-2xl border-2 border-dashed border-saas-border">
          <div className="text-center">
            <span className="text-6xl opacity-20 block mb-4">🧾</span>
            <p className="text-saas-text-muted font-bold uppercase text-sm tracking-wider">
              {T('Aucun contrat terminé sur cette période', 'لا توجد عقود منتهية في هذه الفترة', lang)}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-saas-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-saas-border bg-saas-bg">
                  {[
                    T('Client', 'العميل', lang),
                    T('Véhicule', 'المركبة', lang),
                    T('Période', 'الفترة', lang),
                    T('Total', 'الإجمالي', lang),
                    T('Payé', 'المدفوع', lang),
                    T('Reste', 'المتبقي', lang),
                    T('Statut', 'الحالة', lang),
                    T('Actions', 'إجراءات', lang),
                  ].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[9px] font-black text-saas-text-muted uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filteredReservations.map((r, idx) => {
                    const paid    = calcPaid(r);
                    const reste   = Number(r.remainingPayment) || 0;
                    const sClass  = STATUS_CLS[r.status] || 'bg-gray-100 text-gray-600 border-gray-200';
                    const sLabel  = STATUS_LABEL[r.status]?.[lang] || r.status;
                    return (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        whileHover={{ backgroundColor: '#f8fafc' }}
                        className={`border-b border-saas-border last:border-0 transition-colors ${idx % 2 === 0 ? '' : 'bg-saas-bg/40'}`}
                      >
                        {/* Client */}
                        <td className="px-4 py-3 font-semibold text-saas-text-main whitespace-nowrap">
                          {r.client ? `${r.client.firstName} ${r.client.lastName}` : '—'}
                          <div className="text-[10px] text-saas-text-muted font-normal">{r.client?.phone || ''}</div>
                        </td>
                        {/* Véhicule */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold text-saas-text-main">{r.car?.brand} {r.car?.model}</span>
                          <div className="text-[10px] text-saas-primary-via font-bold">{r.car?.registration}</div>
                        </td>
                        {/* Période */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-saas-text-muted">
                          <div>{fmtDate(r.step1?.departureDate || '')}</div>
                          <div>→ {fmtDate(r.step1?.returnDate || '')}</div>
                        </td>
                        {/* Total */}
                        <td className="px-4 py-3 font-black text-saas-text-main whitespace-nowrap">
                          {fmt(r.totalPrice)} <span className="text-[9px] font-normal text-saas-text-muted">DZD</span>
                        </td>
                        {/* Payé */}
                        <td className="px-4 py-3 font-bold text-emerald-600 whitespace-nowrap">
                          {fmt(paid)} <span className="text-[9px] font-normal text-saas-text-muted">DZD</span>
                        </td>
                        {/* Reste */}
                        <td className="px-4 py-3 font-bold whitespace-nowrap">
                          <span className={reste > 0 ? 'text-amber-600' : 'text-emerald-500'}>
                            {fmt(reste)} <span className="text-[9px] font-normal text-saas-text-muted">DZD</span>
                          </span>
                        </td>
                        {/* Statut */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border ${sClass}`}>
                            {sLabel}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {/* Voir */}
                            <ActionBtn
                              icon={<Eye size={14} />}
                              label={T('Voir', 'عرض', lang)}
                              color="text-blue-600 hover:bg-blue-50"
                              onClick={() => handleViewDetails(r)}
                            />
                            {/* Modifier */}
                            <ActionBtn
                              icon={<Edit size={14} />}
                              label={T('Modifier', 'تعديل', lang)}
                              color="text-amber-600 hover:bg-amber-50"
                              onClick={() => handleEdit(r)}
                            />
                            {/* Contrat */}
                            <ActionBtn
                              icon={<FileText size={14} />}
                              label={T('Contrat', 'عقد', lang)}
                              color="text-indigo-600 hover:bg-indigo-50"
                              onClick={() => setShowPersonalization({ reservation: r, type: 'contract' })}
                            />
                            {/* Facture */}
                            <ActionBtn
                              icon={<Receipt size={14} />}
                              label={T('Facture', 'فاتورة', lang)}
                              color="text-emerald-600 hover:bg-emerald-50"
                              onClick={() => setShowPersonalization({ reservation: r, type: 'invoice' })}
                            />
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal : restes impayés ────────────────────────────────────────── */}
      <AnimatePresence>
        {showDebtModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-saas-border bg-amber-50">
                <div>
                  <h3 className="font-black text-amber-900 text-lg">
                    {T('Réservations impayées', 'الحجوزات غير المسددة', lang)}
                  </h3>
                  <p className="text-xs text-amber-700 font-medium mt-0.5">
                    {debtReservations.length} {T('réservation(s)', 'حجز/حجوزات', lang)}
                    {' · '}
                    {T('Total : ', 'الإجمالي: ', lang)}{fmt(totalReste)} DZD
                  </p>
                </div>
                <button onClick={() => setShowDebtModal(false)}
                  className="p-2 hover:bg-amber-100 rounded-lg transition-colors">
                  <X size={20} className="text-amber-700" />
                </button>
              </div>

              {/* List */}
              <div className="overflow-y-auto max-h-[60vh] divide-y divide-saas-border">
                {debtReservations.length === 0 ? (
                  <div className="py-10 text-center text-saas-text-muted">
                    {T('Aucun reste à payer 🎉', 'لا توجد ديون متبقية 🎉', lang)}
                  </div>
                ) : (
                  debtReservations.map(r => (
                    <div key={r.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-saas-text-main truncate">
                          {r.client ? `${r.client.firstName} ${r.client.lastName}` : '—'}
                        </p>
                        <p className="text-xs text-saas-text-muted truncate">
                          {r.car?.brand} {r.car?.model} · {r.car?.registration}
                        </p>
                        <p className="text-xs text-saas-text-muted">
                          {fmtDate(r.step1?.departureDate || '')} → {fmtDate(r.step1?.returnDate || '')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-saas-text-muted">{T('Total', 'الإجمالي', lang)}</p>
                          <p className="font-black text-saas-text-main text-sm">{fmt(r.totalPrice)} DZD</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-saas-text-muted">{T('Reste', 'المتبقي', lang)}</p>
                          <p className="font-black text-amber-600 text-sm">{fmt(Number(r.remainingPayment))} DZD</p>
                        </div>
                        <button
                          onClick={() => { setShowDebtModal(false); handleViewDetails(r); }}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          title={T('Voir la réservation', 'عرض الحجز', lang)}
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer total */}
              {debtReservations.length > 0 && (
                <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                    {T('Total restant à encaisser', 'إجمالي المتبقي للتحصيل', lang)}
                  </span>
                  <span className="font-black text-amber-800 text-lg">{fmt(totalReste)} DZD</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PersonalizationModal (contrat / facture) ─────────────────────── */}
      <AnimatePresence>
        {showPersonalization && (
          <PersonalizationModal
            lang={lang}
            reservation={showPersonalization.reservation}
            type={showPersonalization.type}
            onClose={() => setShowPersonalization(null)}
            onPrint={(content) => {
              const win = window.open('', '', 'height=600,width=800');
              if (win) {
                win.document.write(content);
                win.document.close();
                win.print();
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── ActionBtn helper ──────────────────────────────────────────────────────────
// Bordered chip: icon always visible, label shown on wide screens. More visible
// and professional than a bare icon, while staying compact inside the table row.
const ActionBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}> = ({ icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-saas-border bg-white text-[11px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-saas-primary-via/40 ${color}`}
  >
    {icon}
    <span className="hidden xl:inline">{label}</span>
  </button>
);
