import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Language, ReservationDetails } from '../types';
import { X, Eye, ArrowLeft, TrendingUp, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { ReservationsService } from '../services/ReservationsService';
import { ReservationDetailsView } from './ReservationDetailsView';

interface ClientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  rentals?: any[]; // kept for backward compat, ignored
  lang: Language;
}

const calcPaid = (r: ReservationDetails): number => {
  const payments = (r.payments || []) as any[];
  if (payments.length > 0) {
    const total = payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    if (total > 0) return total;
  }
  return Math.max(0, (Number(r.totalPrice) || 0) - (Number(r.remainingPayment) || 0));
};

const STATUS_CLS: Record<string, string> = {
  completed: 'bg-violet-100 text-violet-700 border-violet-200',
  active:    'bg-blue-100  text-blue-700  border-blue-200',
  confirmed: 'bg-teal-100  text-teal-700  border-teal-200',
  accepted:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  pending:   'bg-amber-100 text-amber-700  border-amber-200',
  cancelled: 'bg-red-100   text-red-700   border-red-200',
};

const STATUS_LABEL: Record<string, { fr: string; ar: string }> = {
  completed: { fr: 'Terminée',   ar: 'منتهية' },
  active:    { fr: 'Active',     ar: 'نشطة'   },
  confirmed: { fr: 'Confirmée',  ar: 'مؤكدة'  },
  accepted:  { fr: 'Acceptée',   ar: 'مقبولة' },
  pending:   { fr: 'En attente', ar: 'معلقة'  },
  cancelled: { fr: 'Annulée',    ar: 'ملغاة'  },
};

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d || '—'; }
};

export const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({ isOpen, onClose, client, lang }) => {
  const [reservations, setReservations] = useState<ReservationDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRes, setSelectedRes] = useState<ReservationDetails | null>(null);

  useEffect(() => {
    if (!isOpen || !client?.id) return;
    setSelectedRes(null);
    setIsLoading(true);
    ReservationsService.getReservations({ clientId: client.id })
      .then(setReservations)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isOpen, client?.id]);

  if (!isOpen) return null;

  // ── Stats
  const totalPaid  = reservations.reduce((s, r) => s + calcPaid(r), 0);
  const totalReste = reservations
    .filter(r => !['completed', 'cancelled'].includes(r.status))
    .reduce((s, r) => s + (Number(r.remainingPayment) || 0), 0);

  const handleUpdate = async (updated: ReservationDetails) => {
    try {
      await ReservationsService.updateReservation(updated.id, updated);
      const fresh = await ReservationsService.getReservationById(updated.id);
      setReservations(prev => prev.map(r => r.id === fresh.id ? fresh : r));
      setSelectedRes(fresh);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-saas-border"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-saas-border flex items-center justify-between bg-gradient-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            {selectedRes && (
              <button onClick={() => setSelectedRes(null)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">
                {selectedRes
                  ? (lang === 'fr' ? '📋 Détail réservation' : '📋 تفاصيل الحجز')
                  : (lang === 'fr' ? '📜 Historique client' : '📜 سجل العميل')}
              </h2>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                {client.firstName} {client.lastName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {selectedRes ? (
              /* ── Detail view ── */
              <motion.div key="detail"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              >
                <ReservationDetailsView
                  lang={lang}
                  reservation={selectedRes}
                  onBack={() => setSelectedRes(null)}
                  onUpdate={handleUpdate}
                />
              </motion.div>
            ) : (
              /* ── List view ── */
              <motion.div key="list"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="p-6 space-y-5"
              >
                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Total reservations */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                    <div className="p-2 bg-blue-100 rounded-lg w-fit mx-auto mb-2">
                      <FileText size={16} className="text-blue-600" />
                    </div>
                    <p className="text-2xl font-black text-blue-700">{reservations.length}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-blue-500 mt-0.5">
                      {lang === 'fr' ? 'Réservations' : 'الحجوزات'}
                    </p>
                  </div>
                  {/* Total paid */}
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                    <div className="p-2 bg-emerald-100 rounded-lg w-fit mx-auto mb-2">
                      <TrendingUp size={16} className="text-emerald-600" />
                    </div>
                    <p className="text-lg font-black text-emerald-700">{Math.round(totalPaid).toLocaleString()}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 mt-0.5">
                      {lang === 'fr' ? 'Total payé · DZD' : 'مجموع المدفوع · د.ج'}
                    </p>
                  </div>
                  {/* Total remaining */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                    <div className="p-2 bg-amber-100 rounded-lg w-fit mx-auto mb-2">
                      <AlertCircle size={16} className="text-amber-600" />
                    </div>
                    <p className="text-lg font-black text-amber-700">{Math.round(totalReste).toLocaleString()}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500 mt-0.5">
                      {lang === 'fr' ? 'Reste à payer · DZD' : 'المتبقي · د.ج'}
                    </p>
                  </div>
                </div>

                {/* Reservations list */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-saas-primary-via" size={28} />
                  </div>
                ) : reservations.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-5xl opacity-20 block mb-3">📭</span>
                    <p className="text-saas-text-muted font-bold">
                      {lang === 'fr' ? 'Aucune réservation trouvée' : 'لا توجد حجوزات'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-saas-text-muted uppercase tracking-widest">
                      {lang === 'fr' ? '📋 Réservations' : '📋 الحجوزات'} ({reservations.length})
                    </h3>
                    {reservations.map((r, idx) => {
                      const paid    = calcPaid(r);
                      const reste   = Number(r.remainingPayment) || 0;
                      const sClass  = STATUS_CLS[r.status] || 'bg-gray-100 text-gray-600 border-gray-200';
                      const sLabel  = STATUS_LABEL[r.status]?.[lang] || r.status;
                      return (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="bg-saas-bg border border-saas-border rounded-xl p-4 hover:border-saas-primary-via/30 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-1.5">
                              {/* Vehicle */}
                              <div className="flex items-center gap-2">
                                <span className="font-black text-saas-text-main text-sm">
                                  🚗 {r.car?.brand} {r.car?.model}
                                </span>
                                <span className="text-[10px] font-bold text-saas-primary-via">
                                  {r.car?.registration}
                                </span>
                              </div>
                              {/* Period */}
                              <p className="text-xs text-saas-text-muted">
                                📅 {fmtDate(r.step1?.departureDate || '')} → {fmtDate(r.step1?.returnDate || '')}
                                <span className="ml-2 font-semibold">({r.totalDays} {lang === 'fr' ? 'j' : 'أيام'})</span>
                              </p>
                              {/* Financials */}
                              <div className="flex items-center gap-3 text-xs flex-wrap">
                                <span className="font-black text-saas-text-main">
                                  {Number(r.totalPrice).toLocaleString()} DZD
                                </span>
                                <span className="text-emerald-600 font-bold">
                                  ✓ {Math.round(paid).toLocaleString()} {lang === 'fr' ? 'payé' : 'مدفوع'}
                                </span>
                                {reste > 0 && (
                                  <span className="text-amber-600 font-bold">
                                    ⚠ {Math.round(reste).toLocaleString()} {lang === 'fr' ? 'reste' : 'متبقي'}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Right: status + button */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border ${sClass}`}>
                                {sLabel}
                              </span>
                              <button
                                onClick={() => setSelectedRes(r)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
                              >
                                <Eye size={12} />
                                {lang === 'fr' ? 'Voir' : 'عرض'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!selectedRes && (
          <div className="p-4 border-t border-saas-border bg-saas-bg flex-shrink-0">
            <button onClick={onClose} className="w-full btn-saas-secondary py-2.5 font-bold">
              {lang === 'fr' ? 'Fermer' : 'إغلاق'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
