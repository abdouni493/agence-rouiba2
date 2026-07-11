import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Car, Language, VehicleExpense, ReservationDetails } from '../types';
import { X, TrendingUp, TrendingDown, Wallet, Loader2, Trash, AlertCircle } from 'lucide-react';
import { getVehicleExpenses, deleteVehicleExpense } from '../services/expenseService';
import { ConfirmModal } from './ConfirmModal';
import { getVidangeAlert } from '../utils/vidangeAlerts';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  car: Car | null;
  reservations: ReservationDetails[];
  lang: Language;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, car, reservations, lang }) => {
  console.log('HistoryModal opened for car:', car?.id, car?.brand, car?.model);
  console.log('All reservations passed to HistoryModal:', reservations);

  // Filter reservations for this car
  const carReservations = reservations.filter(r => r.carId === car?.id);

  console.log('Filtered car reservations:', carReservations);

  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  useEffect(() => {
    if (isOpen && car?.id) {
      const loadExpenses = async () => {
        try {
          setIsLoading(true);
          const result = await getVehicleExpenses();
          if (result.success && result.expenses) {
            // Filter expenses for the selected car
            const carExpenses = result.expenses.filter(e => e.carId === car.id);
            setExpenses(carExpenses);
          }
        } catch (err) {
          console.error('Error loading expenses:', err);
        } finally {
          setIsLoading(false);
        }
      };
      loadExpenses();
    }
  }, [isOpen, car?.id]);

  const handleDeleteExpense = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDeleteExpense = async () => {
    if (deleteConfirm.id) {
      try {
        const res = await deleteVehicleExpense(deleteConfirm.id);
        if (res.success) {
          setExpenses(prev => prev.filter(e => e.id !== deleteConfirm.id));
        }
      } catch (err) {
        console.error('Error deleting expense:', err);
      }
    }
    setDeleteConfirm({ isOpen: false, id: null });
  };


  if (!isOpen) return null;

  const vidangeAlert = car ? getVidangeAlert(car, expenses) : null;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.cost, 0);
  const totalGains = carReservations.reduce((sum, r) => sum + (r.advancePayment + r.remainingPayment), 0);
  const totalBenefits = totalGains - totalExpenses;

  // Helper function to get expiration status
  const getExpirationStatus = (expirationDate: string | undefined) => {
    if (!expirationDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);

    const daysLeft = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      daysLeft,
      isExpired: daysLeft < 0,
      isWarning: daysLeft >= 0 && daysLeft <= 30,
      isOk: daysLeft > 30,
    };
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-saas-border"
      >
        <div className="p-8 border-b border-saas-border flex items-center justify-between bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              📜 Historique: {car.brand} {car.model}
            </h2>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
              {lang === 'fr' ? 'Historique complet des locations et dépenses' : 'التاريخ الكامل للإيجارات والمصاريف'}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-saas-bg">
          {/* Vidange Alert Banner */}
          {vidangeAlert && vidangeAlert.status !== 'ok' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-2xl border-2 flex items-center gap-4 ${
                vidangeAlert.status === 'overdue'
                  ? 'bg-red-50 border-red-300'
                  : 'bg-amber-50 border-amber-300'
              }`}
            >
              <AlertCircle className={`flex-shrink-0 ${vidangeAlert.status === 'overdue' ? 'text-red-600' : 'text-amber-600'}`} size={24} />
              <div>
                <p className={`font-black text-sm uppercase tracking-tight ${
                  vidangeAlert.status === 'overdue' ? 'text-red-700' : 'text-amber-700'
                }`}>
                  {vidangeAlert.message}
                </p>
                <p className={`text-xs mt-1 ${
                  vidangeAlert.status === 'overdue' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  Kilométrage actuel: {vidangeAlert.currentMileage.toLocaleString()} KM | Prochaine vidange à: {vidangeAlert.nextVidangeKm.toLocaleString()} KM
                </p>
              </div>
            </motion.div>
          )}



          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-saas-primary-via animate-spin" />
            </div>
          )}

          {!isLoading && (
            <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-saas-border flex items-center gap-5 shadow-sm group hover:border-saas-danger-start/30 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-saas-danger-start/10 flex items-center justify-center text-saas-danger-start">
                <TrendingDown size={28} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">Total Dépenses</p>
                <p className="text-3xl font-black text-saas-danger-start">{totalExpenses.toLocaleString()} DZD</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-saas-border flex items-center gap-5 shadow-sm group hover:border-saas-success-start/30 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-saas-success-start/10 flex items-center justify-center text-saas-success-start">
                <TrendingUp size={28} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">Total Gains</p>
                <p className="text-3xl font-black text-saas-success-start">{totalGains.toLocaleString()} DZD</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-saas-border flex items-center gap-5 shadow-sm group hover:border-saas-primary-via/30 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-saas-primary-via/10 flex items-center justify-center text-saas-primary-via">
                <Wallet size={28} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">Bénéfices Nets</p>
                <p className="text-3xl font-black text-saas-text-main">{totalBenefits.toLocaleString()} DZD</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Rentals History */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-saas-primary-via flex items-center gap-3 uppercase tracking-[0.2em]">
                <span className="p-2 bg-saas-primary-via/10 rounded-lg">�</span>
                Historique des Locations
              </h3>
              <div className="space-y-4">
                {carReservations.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-saas-border rounded-3xl text-saas-text-muted italic text-sm bg-white">
                    <span className="text-4xl mb-4 block">🚗</span>
                    Aucune location enregistrée pour ce véhicule.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {carReservations.map((res, index) => {
                      const startDate = new Date(res.step1.departureDate);
                      const endDate = new Date(res.step1.returnDate);
                      const daysRented = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

                      return (
                        <motion.div
                          key={res.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-6 rounded-3xl border border-saas-border bg-white shadow-sm hover:border-saas-primary-via/30 transition-all hover:shadow-md group"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-saas-primary-via/10 flex items-center justify-center text-saas-primary-via font-bold text-lg">
                                #{index + 1}
                              </div>
                              <div>
                                <p className="text-lg font-black text-saas-text-main uppercase tracking-tighter">
                                  {res.client?.firstName} {res.client?.lastName}
                                </p>
                                <p className="text-[10px] text-saas-text-muted font-bold uppercase tracking-widest mt-1">
                                  {startDate.toLocaleDateString('fr-FR')} - {endDate.toLocaleDateString('fr-FR')} ({daysRented} {lang === 'fr' ? 'jours' : 'أيام'})
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Reservation Summary */}
                          <div className="bg-gradient-to-br from-saas-primary-via/5 to-saas-success-start/5 p-5 rounded-2xl border border-saas-border/50 mb-5">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">Total Réservation</span>
                                <span className="text-lg font-black text-saas-primary-via">{(res.advancePayment + res.remainingPayment).toLocaleString()} DZD</span>
                              </div>
                              {res.advancePayment > 0 && (
                                <div className="flex justify-between items-center text-green-600">
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Payé</span>
                                  <span className="text-sm font-black">{res.advancePayment.toLocaleString()} DZD</span>
                                </div>
                              )}
                              {res.remainingPayment > 0 && (
                                <div className="flex justify-between items-center text-red-600">
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Reste à payer</span>
                                  <span className="text-sm font-black">{res.remainingPayment.toLocaleString()} DZD</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Additional Info */}
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">Statut</p>
                              <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide mt-1 ${
                                res.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : res.status === 'active'
                                  ? 'bg-blue-100 text-blue-800'
                                  : res.status === 'confirmed'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {res.status === 'completed' ? 'Terminée' :
                                 res.status === 'active' ? 'Active' :
                                 res.status === 'confirmed' ? 'Confirmée' :
                                 res.status === 'pending' ? 'En attente' : res.status}
                              </span>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">Durée</p>
                              <p className="text-sm font-black text-saas-text-main mt-1">{daysRented} {lang === 'fr' ? 'jours' : 'أيام'}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">Total</p>
                              <p className="text-sm font-black text-saas-success-start mt-1">+{(res.advancePayment + res.remainingPayment).toLocaleString()}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Expenses History */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-saas-secondary-via flex items-center gap-3 uppercase tracking-[0.2em]">
                <span className="p-2 bg-saas-secondary-via/10 rounded-lg">�</span>
                Dépenses
              </h3>
              <div className="space-y-4">
                {expenses.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-saas-border rounded-3xl text-saas-text-muted italic text-sm bg-white">
                    <span className="text-4xl mb-4 block">💰</span>
                    Aucune dépense enregistrée pour ce véhicule.
                  </div>
                ) : (
                  expenses.map((e) => {
                    const expirationStatus = getExpirationStatus(e.expirationDate);
                    return (
                      <div
                        key={e.id}
                        className={`p-6 rounded-3xl border shadow-sm flex items-center justify-between group hover:shadow-md transition-all ${
                          expirationStatus?.isExpired
                            ? 'bg-red-50 border-red-300 hover:border-red-400'
                            : expirationStatus?.isWarning
                            ? 'bg-amber-50 border-amber-300 hover:border-amber-400'
                            : 'bg-white border-saas-border hover:border-saas-secondary-via/30'
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-saas-bg flex items-center justify-center text-2xl grayscale group-hover:grayscale-0 transition-all border border-saas-border">
                            {e.type === 'vidange' ? '🛢️' : e.type === 'assurance' ? '🛡️' : e.type === 'controle' ? '🛠️' : '❓'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-saas-text-main uppercase tracking-tighter capitalize">
                              {e.expenseName || e.type}
                            </p>
                            <p className="text-[10px] text-saas-text-muted font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                expirationStatus?.isExpired ? 'bg-red-500' : 'bg-saas-danger-start'
                              }`} />
                              {e.date}
                            </p>
                            {e.expirationDate && (
                              <p className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${
                                expirationStatus?.isExpired
                                  ? 'text-red-700'
                                  : expirationStatus?.isWarning
                                  ? 'text-amber-700'
                                  : 'text-green-700'
                              }`}>
                                ⏰ {lang === 'fr' ? 'Expiration' : 'الانتهاء'}: {e.expirationDate}
                                {expirationStatus && (
                                  <span className="ml-2">
                                    {expirationStatus.isExpired
                                      ? `❌ ${lang === 'fr' ? 'Expiré' : 'منتهي'}`
                                      : expirationStatus.isWarning
                                      ? `⚠️ ${expirationStatus.daysLeft} ${lang === 'fr' ? 'jours' : 'أيام'}`
                                      : `✅ ${lang === 'fr' ? 'Actif' : 'نشط'}`
                                    }
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
                            className="p-1 text-red-500 hover:text-red-600 rounded-full transition-colors"
                            title={lang === 'fr' ? 'Supprimer dépense' : 'حذف المصاريف'}
                          >
                            <Trash size={18} />
                          </button>
                          <p className="text-base font-black text-saas-danger-start">-{e.cost.toLocaleString()} DZD</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Monthly Gains Summary */}
          <div className="mt-12 space-y-6">
            <h3 className="text-xs font-black text-saas-success-start flex items-center gap-3 uppercase tracking-[0.2em]">
              <span className="p-2 bg-saas-success-start/10 rounded-lg">📊</span>
              Résumé Mensuel des Gains
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                const monthlyData = new Map();

                // Process reservations by month
                carReservations.forEach(r => {
                  const date = new Date(r.step1.departureDate);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

                  if (!monthlyData.has(monthKey)) {
                    monthlyData.set(monthKey, { month: monthName, gains: 0, expenses: 0, net: 0 });
                  }
                  monthlyData.get(monthKey).gains += r.advancePayment + r.remainingPayment;
                });

                // Process expenses by month
                expenses.forEach(e => {
                  const date = new Date(e.date);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

                  if (!monthlyData.has(monthKey)) {
                    monthlyData.set(monthKey, { month: monthName, gains: 0, expenses: 0, net: 0 });
                  }
                  monthlyData.get(monthKey).expenses += e.cost;
                });

                // Calculate net for each month
                monthlyData.forEach(data => {
                  data.net = data.gains - data.expenses;
                });

                // Sort by month (most recent first)
                const sortedMonths = Array.from(monthlyData.entries())
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 6); // Show last 6 months

                return sortedMonths.length === 0 ? (
                  <div className="col-span-full p-12 text-center border-2 border-dashed border-saas-border rounded-3xl text-saas-text-muted italic text-sm bg-white">
                    <span className="text-4xl mb-4 block">📈</span>
                    Aucune donnée disponible pour le résumé mensuel.
                  </div>
                ) : (
                  sortedMonths.map(([monthKey, data]) => (
                    <motion.div
                      key={monthKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 rounded-3xl border border-saas-border bg-white shadow-sm hover:border-saas-success-start/30 transition-all hover:shadow-md"
                    >
                      <div className="text-center mb-4">
                        <p className="text-sm font-black text-saas-text-main uppercase tracking-tighter">
                          {data.month}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">Gains</span>
                          <span className="text-sm font-black text-saas-success-start">+{data.gains.toLocaleString()} DZD</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">Dépenses</span>
                          <span className="text-sm font-black text-saas-danger-start">-{data.expenses.toLocaleString()} DZD</span>
                        </div>
                        <div className="pt-3 border-t border-saas-border/50">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">Net</span>
                            <span className={`text-sm font-black ${
                              data.net >= 0 ? 'text-saas-success-start' : 'text-saas-danger-start'
                            }`}>
                              {data.net >= 0 ? '+' : ''}{data.net.toLocaleString()} DZD
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                );
              })()}
            </div>
          </div>
            </>
          )}
        </div>

        <div className="p-8 border-t border-saas-border flex items-center justify-end bg-white">
          <button onClick={onClose} className="btn-saas-primary px-12">
            {lang === 'fr' ? 'Fermer' : 'إغلاق'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
