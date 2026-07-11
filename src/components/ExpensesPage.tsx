import React, { useState, useEffect } from 'react';
import { StoreExpense, VehicleExpense, Language, Car, MaintenanceAlert } from '../types';
import { StoreExpenseCard } from './StoreExpenseCard';
import { StoreExpenseModal } from './StoreExpenseModal';
import { VehicleExpenseCard } from './VehicleExpenseCard';
import { VehicleExpenseModal } from './VehicleExpenseModal';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getStoreExpenses, addStoreExpense, updateStoreExpense, deleteStoreExpense, getVehicleExpenses, addVehicleExpense, updateVehicleExpense, deleteVehicleExpense } from '../services/expenseService';
import { DatabaseService } from '../services/DatabaseService';
import { getVidangeAlert, getAssuranceAlert, getControleAlert, getChaineAlert } from '../utils/vidangeAlerts';

interface ExpensesPageProps {
  lang: Language;
  cars: Car[];
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ lang, cars }) => {
  const [expenseType, setExpenseType] = useState<'store' | 'vehicle'>('vehicle');
  const [storeExpenses, setStoreExpenses] = useState<StoreExpense[]>([]);
  const [vehicleExpenses, setVehicleExpenses] = useState<VehicleExpense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<StoreExpense | VehicleExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [searchQuery, setSearchQuery] = useState('');

  // build alert payload from computed alert object
  const buildMaintenanceAlert = (
    car: Car,
    type: 'vidange' | 'assurance' | 'controle' | 'chaine',
    alertObj: any
  ): Omit<MaintenanceAlert, 'id' | 'created_at'> => {
    const severity: 'low' | 'medium' | 'high' | 'critical' =
      alertObj.status === 'overdue'
        ? 'critical'
        : alertObj.status === 'warning'
        ? 'high'
        : 'medium';

    return {
      carId: car.id,
      carInfo: `${car.brand} ${car.model} - ${car.registration}`,
      type,
      title:
        type === 'vidange'
          ? alertObj.status === 'overdue'
            ? 'Vidange en retard'
            : 'Vidange planifiée'
          : type === 'chaine'
          ? alertObj.status === 'overdue'
            ? 'Chaîne en retard'
            : 'Chaîne planifiée'
          : type === 'assurance'
          ? alertObj.status === 'overdue'
            ? 'Assurance expirée'
            : 'Assurance à jour'
          : alertObj.status === 'overdue'
          ? 'Contrôle technique expirée'
          : 'Contrôle technique à jour',
      message: alertObj.message,
      severity,
      dueDate:
        (type === 'assurance' || type === 'controle') && alertObj.expirationDate
          ? alertObj.expirationDate.toISOString().split('T')[0]
          : undefined,
      isExpired: alertObj.status === 'overdue',
      daysUntilDue:
        alertObj.status === 'overdue'
          ? -alertObj.daysRemaining
          : alertObj.daysRemaining,
      currentMileage: alertObj.currentMileage,
      nextServiceMileage: alertObj.nextVidangeKm,
      createdAt: new Date().toISOString(),
    };
  };

  // Load expenses from database on mount
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [storeResult, vehicleResult] = await Promise.all([
          getStoreExpenses(),
          getVehicleExpenses(),
        ]);

        if (storeResult.success && storeResult.expenses) {
          setStoreExpenses(storeResult.expenses);
        }

        if (vehicleResult.success && vehicleResult.expenses) {
          setVehicleExpenses(vehicleResult.expenses);
        }

        setError(null);
      } catch (err: any) {
        console.error('Error loading expenses:', err);
        if (err.message?.includes('JWT') || err.message?.includes('auth') || err.code === 'PGRST301') {
          setError('Session expirée. Veuillez vous reconnecter.');
        } else {
          setError('Failed to load expenses');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadExpenses();
  }, []);

  // Filter vehicle expenses by car name or chassis number
  const filteredVehicleExpenses = vehicleExpenses.filter(expense => {
    const car = cars.find(c => c.id === expense.carId);
    if (!car) return false;
    const searchLower = searchQuery.toLowerCase();
    return (
      car.brand.toLowerCase().includes(searchLower) ||
      car.model.toLowerCase().includes(searchLower) ||
      car.registration.toLowerCase().includes(searchLower) ||
      car.vin.toLowerCase().includes(searchLower)
    );
  });

  // Get all vehicle expenses sorted by date (newest first) for the Entretien interface
  const allVehicleExpenses = [...vehicleExpenses].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Store Expenses
  const handleSaveStoreExpense = async (data: Partial<StoreExpense>) => {
    try {
      if (editingExpense && 'cost' in editingExpense && storeExpenses.some(e => e.id === editingExpense.id)) {
        // Update existing store expense
        const result = await updateStoreExpense(editingExpense.id, data);
        if (result.success && result.expense) {
          setStoreExpenses(storeExpenses.map(e => e.id === editingExpense.id ? result.expense : e));
        }
      } else {
        // Add new store expense
        const newExpenseData = {
          name: data.name || '',
          cost: data.cost || 0,
          date: data.date || new Date().toISOString().split('T')[0],
          note: data.note,
          icon: data.icon || '🏪',
        };
        const result = await addStoreExpense(newExpenseData);
        if (result.success && result.expense) {
          setStoreExpenses([...storeExpenses, result.expense]);
        }
      }
      setIsModalOpen(false);
      setEditingExpense(null);
    } catch (err) {
      console.error('Error saving store expense:', err);
      setError('Failed to save store expense');
    }
  };

  const handleDeleteStoreExpense = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDeleteStoreExpense = async () => {
    if (deleteConfirm.id) {
      try {
        const result = await deleteStoreExpense(deleteConfirm.id);
        if (result.success) {
          setStoreExpenses(storeExpenses.filter(e => e.id !== deleteConfirm.id));
        }
      } catch (err) {
        console.error('Error deleting store expense:', err);
        setError('Failed to delete store expense');
      }
    }
    setDeleteConfirm({ isOpen: false, id: null });
  };

  // Vehicle Expenses
  const handleSaveVehicleExpense = async (data: Partial<VehicleExpense>) => {
    try {
      if (editingExpense && 'carId' in editingExpense && vehicleExpenses.some(e => e.id === editingExpense.id)) {
        // Update existing vehicle expense
        const result = await updateVehicleExpense(editingExpense.id, data);
        if (result.success && result.expense) {
          const updatedExpenses = vehicleExpenses.map(e => e.id === editingExpense.id ? result.expense! : e);
          setVehicleExpenses(updatedExpenses);

          // also sync alerts similar to new expense case
          if (data.type === 'vidange' || data.type === 'assurance' || data.type === 'controle' || data.type === 'chaine') {
            const car = cars.find(c => c.id === result.expense!.carId);
            if (car) {
              try {
                let alertObj: any = null;
                if (data.type === 'vidange') {
                  alertObj = getVidangeAlert(car, updatedExpenses);
                } else if (data.type === 'chaine') {
                  alertObj = getChaineAlert(car, updatedExpenses);
                } else if (data.type === 'assurance') {
                  alertObj = getAssuranceAlert(car, updatedExpenses);
                } else if (data.type === 'controle') {
                  alertObj = getControleAlert(car, updatedExpenses);
                }
                await DatabaseService.deleteMaintenanceAlert(car.id, data.type || '');
                if (alertObj) {
                  const maintenanceAlert = buildMaintenanceAlert(car, data.type as 'vidange' | 'assurance' | 'controle' | 'chaine', alertObj);
                  await DatabaseService.createMaintenanceAlert(maintenanceAlert);
                }
              } catch (alertError) {
                console.warn('Error syncing maintenance alert:', alertError);
              }
            }
          }
        }
      } else {
        // Add new vehicle expense
        const newExpenseData = {
          carId: data.carId || '',
          type: data.type || 'autre',
          cost: data.cost || 0,
          date: data.date || new Date().toISOString().split('T')[0],
          note: data.note,
          currentMileage: data.currentMileage,
          nextVidangeKm: data.nextVidangeKm,
          expenseName: data.expenseName,
          expirationDate: data.expirationDate,
          // Include filter tracking for vidange
          oilFilterChanged: (data as any).oilFilterChanged || false,
          airFilterChanged: (data as any).airFilterChanged || false,
          fuelFilterChanged: (data as any).fuelFilterChanged || false,
          acFilterChanged: (data as any).acFilterChanged || false,
        };
        const result = await addVehicleExpense(newExpenseData);
        if (result.success && result.expense) {
          // append expense first
          const newExpenses = [...vehicleExpenses, result.expense];
          setVehicleExpenses(newExpenses);

          // If the type should generate an alert, sync alerts to follow latest expense
          if (data.type === 'vidange' || data.type === 'assurance' || data.type === 'controle' || data.type === 'chaine') {
            const car = cars.find(c => c.id === result.expense!.carId);
            if (car) {
              try {
                // compute alert based on updated expenses
                let alertObj: any = null;
                if (data.type === 'vidange') {
                  alertObj = getVidangeAlert(car, newExpenses);
                } else if (data.type === 'chaine') {
                  alertObj = getChaineAlert(car, newExpenses);
                } else if (data.type === 'assurance') {
                  alertObj = getAssuranceAlert(car, newExpenses);
                } else if (data.type === 'controle') {
                  alertObj = getControleAlert(car, newExpenses);
                }

                // first delete previous alerts for this car/type
                await DatabaseService.deleteMaintenanceAlert(car.id, data.type || '');

                if (alertObj) {
                  // use helper to build payload
                  const maintenanceAlert = buildMaintenanceAlert(car, data.type as 'vidange' | 'assurance' | 'controle' | 'chaine', alertObj);
                  await DatabaseService.createMaintenanceAlert(maintenanceAlert);
                  console.log(`Synced ${data.type} alert for car ${car.id}`);
                } else {
                  console.log(`No ${data.type} alert required for car ${car.id}`);
                }
              } catch (alertError) {
                console.warn('Error syncing maintenance alert:', alertError);
              }
            }
          }
        }
      }
      setIsModalOpen(false);
      setEditingExpense(null);
    } catch (err) {
      console.error('Error saving vehicle expense:', err);
      setError('Failed to save vehicle expense');
    }
  };

  const handleDeleteVehicleExpense = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDeleteVehicleExpense = async () => {
    if (deleteConfirm.id) {
      try {
        const result = await deleteVehicleExpense(deleteConfirm.id);
        if (result.success) {
          setVehicleExpenses(vehicleExpenses.filter(e => e.id !== deleteConfirm.id));
        }
      } catch (err) {
        console.error('Error deleting vehicle expense:', err);
        setError('Failed to delete vehicle expense');
      }
    }
    setDeleteConfirm({ isOpen: false, id: null });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-saas-bg via-saas-bg-light to-saas-bg p-4 sm:p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-saas-primary-via animate-spin mx-auto mb-4" />
          <p className="text-saas-text-muted font-bold">{lang === 'fr' ? 'Chargement...' : 'جاري التحميل...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-saas-bg via-saas-bg-light to-saas-bg p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black uppercase tracking-tighter text-saas-text-main mb-2 flex items-center gap-3">
            💰 {{fr: 'Dépenses', ar: 'النفقات'}[lang]}
          </h1>
          <p className="text-saas-text-muted text-sm font-bold uppercase tracking-widest">
            {{fr: 'Gestion des dépenses de magasin et véhicules', ar: 'إدارة نفقات المتجر والمركبات'}[lang]}
          </p>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="text-red-500">⚠️</div>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
            {error.includes('Session expirée') && (
              <button
                onClick={() => window.location.reload()}
                className="btn-saas-primary text-sm px-4 py-2"
              >
                {lang === 'fr' ? 'Se reconnecter' : 'إعادة الاتصال'}
              </button>
            )}
          </motion.div>
        )}

        {/* Type Selection */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={() => {
              setExpenseType('store');
              setEditingExpense(null);
              setIsModalOpen(false);
            }}
            className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              expenseType === 'store'
                ? 'bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white shadow-lg'
                : 'bg-white border-2 border-saas-border text-saas-text-main hover:border-saas-primary-via'
            }`}
          >
            🏪 {{fr: 'Dépenses du Magasin', ar: 'نفقات المتجر'}[lang]}
          </button>
          <button
            onClick={() => {
              setExpenseType('vehicle');
              setEditingExpense(null);
              setIsModalOpen(false);
            }}
            className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              expenseType === 'vehicle'
                ? 'bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white shadow-lg'
                : 'bg-white border-2 border-saas-border text-saas-text-main hover:border-saas-primary-via'
            }`}
          >
            🚗 {{fr: 'Entretien & Frais Véhicules', ar: 'الصيانة ورسوم المركبات'}[lang]}
          </button>
        </motion.div>

        {/* Add Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <button
            onClick={() => {
              setEditingExpense(null);
              setIsModalOpen(true);
            }}
            className="btn-saas-primary px-6 py-3 flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            {{fr: 'Ajouter une dépense', ar: 'إضافة نفقة'}[lang]}
          </button>
        </motion.div>

        {/* Search for Vehicle Expenses */}
        {expenseType === 'vehicle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-saas-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={lang === 'fr' ? 'Rechercher par marque, modèle ou plaque...' : 'ابحث بالعلامة أو النموذج أو اللوحة...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-saas-border focus:outline-none focus:border-saas-primary-via focus:ring-2 focus:ring-saas-primary-via/20 transition-all"
              />
            </div>
          </motion.div>
        )}

        {/* Store Expenses */}
        {expenseType === 'store' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            <AnimatePresence>
              {storeExpenses.map((expense, index) => (
                <StoreExpenseCard
                  key={expense.id}
                  expense={expense}
                  index={index}
                  lang={lang}
                  onEdit={() => {
                    setEditingExpense(expense);
                    setIsModalOpen(true);
                  }}
                  onDelete={() => handleDeleteStoreExpense(expense.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Vehicle Expenses */}
        {expenseType === 'vehicle' && (
          <>
            {/* Vidange Alerts */}
            <div className="mb-8 space-y-4">
              {cars.map((car) => {
                const vidangeAlert = getVidangeAlert(car, vehicleExpenses);
                if (!vidangeAlert || vidangeAlert.status === 'ok') return null;

                return (
                  <motion.div
                    key={car.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-2xl border-2 flex items-center gap-4 ${
                      vidangeAlert.status === 'overdue'
                        ? 'bg-red-50 border-red-300'
                        : vidangeAlert.status === 'warning'
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-green-50 border-green-300'
                    }`}
                  >
                    <AlertCircle className={`flex-shrink-0 ${
                      vidangeAlert.status === 'overdue'
                        ? 'text-red-600'
                        : vidangeAlert.status === 'warning'
                        ? 'text-amber-600'
                        : 'text-green-600'
                    }`} size={24} />
                    <div className="flex-1">
                      <p className={`font-black text-sm uppercase tracking-tight ${
                        vidangeAlert.status === 'overdue'
                          ? 'text-red-700'
                          : vidangeAlert.status === 'warning'
                          ? 'text-amber-700'
                          : 'text-green-700'
                      }`}>
                        {car.brand} {car.model} ({car.registration}): {vidangeAlert.message}
                      </p>
                      <p className={`text-xs mt-1 ${
                        vidangeAlert.status === 'overdue'
                          ? 'text-red-600'
                          : vidangeAlert.status === 'warning'
                          ? 'text-amber-600'
                          : 'text-green-600'
                      }`}>
                        Kilométrage actuel: {vidangeAlert.currentMileage.toLocaleString()} KM | Prochaine vidange à: {vidangeAlert.nextVidangeKm.toLocaleString()} KM
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            <AnimatePresence>
              {filteredVehicleExpenses.length > 0 ? (
                filteredVehicleExpenses.map((expense, index) => {
                  const car = cars.find(c => c.id === expense.carId);
                  return (
                    <VehicleExpenseCard
                      key={expense.id}
                      expense={expense}
                      car={car}
                      index={index}
                      lang={lang}
                      onEdit={() => {
                        setEditingExpense(expense);
                        setIsModalOpen(true);
                      }}
                      onDelete={() => handleDeleteVehicleExpense(expense.id)}
                    />
                  );
                })
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full text-center py-12"
                >
                  <p className="text-saas-text-muted text-lg">
                    {lang === 'fr'
                      ? 'Aucune dépense de véhicule trouvée'
                      : 'لم يتم العثور على نفقات المركبة'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </>
        )}

        {/* Empty State */}
        {((expenseType === 'store' && storeExpenses.length === 0) || (expenseType === 'vehicle' && vehicleExpenses.length === 0)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-saas-text-muted text-lg">
              {{fr: 'Aucune dépense trouvée', ar: 'لم يتم العثور على نفقات'}[lang]}
            </p>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      {expenseType === 'store' && (
        <StoreExpenseModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingExpense(null);
          }}
          onSave={handleSaveStoreExpense}
          expense={editingExpense as StoreExpense | undefined}
          lang={lang}
        />
      )}

      {expenseType === 'vehicle' && (
        <VehicleExpenseModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingExpense(null);
          }}
          onSave={handleSaveVehicleExpense}
          expense={editingExpense as VehicleExpense | undefined}
          cars={cars}
          lang={lang}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={{fr: 'Supprimer la dépense', ar: 'حذف النفقة'}}
        message={{
          fr: 'Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible.',
          ar: 'هل أنت متأكد من حذف هذه النفقة؟ هذا الإجراء لا يمكن التراجع عنه.'
        }}
        onConfirm={expenseType === 'store' ? confirmDeleteStoreExpense : confirmDeleteVehicleExpense}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        lang={lang}
      />
    </div>
  );
};
