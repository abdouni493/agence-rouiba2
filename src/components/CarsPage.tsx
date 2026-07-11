import React, { useState, useEffect, useMemo } from 'react';
import { Car, Rental, Language, Expense, ReservationDetails } from '../types';
import { CarCard } from './CarCard';
import { CarModal } from './CarModal';
import { CarDetailsModal } from './CarDetailsModal';
import { ExpenseModal } from './ExpenseModal';
import { HistoryModal } from './HistoryModal';
import { CarReportModal } from './CarReportModal';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Search, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { getCars, addCar, updateCar, deleteCar, AddCarData } from '../services/carService';
import { addVehicleExpense, getVehicleExpenses } from '../services/expenseService';
import { ReservationsService } from '../services/ReservationsService';
import { DatabaseService } from '../services/DatabaseService';

interface CarsPageProps {
  lang: Language;
  isAuthLoading?: boolean;
  user?: any;
}

export const CarsPage: React.FC<CarsPageProps> = ({ lang, isAuthLoading = false, user = null }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [reservations, setReservations] = useState<ReservationDetails[]>([]);

  // ── Statuts réels calculés à partir des réservations ──────────────────────
  /** Calcule le statut réel de chaque voiture d'après les réservations chargées */
  const computeRealStatuses = (rawCars: Car[], allReservations: ReservationDetails[]): Car[] => {
    const today = new Date().toISOString().substring(0, 10);
    return rawCars.map(car => {
      // La maintenance reste la priorité (saisie manuellement)
      if (car.status === 'maintenance') return car;

      const carRes = allReservations.filter(r => r.carId === car.id || (r.car && r.car.id === car.id));
      const coversToday = (r: ReservationDetails) => {
        const dep = (r.step1?.departureDate || '').substring(0, 10);
        const ret = (r.step1?.returnDate    || '').substring(0, 10);
        return dep <= today && today <= ret;
      };

      const active   = carRes.find(r => r.status === 'active'    && coversToday(r));
      const reserved = carRes.find(r => (r.status === 'confirmed' || r.status === 'pending') && coversToday(r));

      let realStatus: Car['status'] = 'disponible';
      if (active)   realStatus = 'louer';
      else if (reserved) realStatus = 'reserve';

      return { ...car, status: realStatus };
    });
  };

  /** Retourne la réservation en cours pour une voiture donnée (pour afficher client + dates) */
  const getActiveReservationInfo = (carId: string) => {
    const today = new Date().toISOString().substring(0, 10);
    const res = reservations.find(r => {
      const id = r.carId || r.car?.id;
      if (id !== carId) return false;
      if (!['active', 'confirmed', 'pending'].includes(r.status)) return false;
      const dep = (r.step1?.departureDate || '').substring(0, 10);
      const ret = (r.step1?.returnDate    || '').substring(0, 10);
      return dep <= today && today <= ret;
    });
    if (!res) return null;
    return {
      clientName: res.client ? `${res.client.firstName} ${res.client.lastName}` : '',
      departureDate: res.step1?.departureDate || '',
      returnDate:    res.step1?.returnDate    || '',
    };
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250); // wait quarter-second after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [carToDelete, setCarToDelete] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportExpenses, setReportExpenses] = useState<Expense[]>([]);
  const [reportReservations, setReportReservations] = useState<ReservationDetails[]>([]);

  const loadCarsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getCars();
      if (result.success && result.cars) {
        const mappedCars: Car[] = result.cars.map(dbCar => ({
          id: dbCar.id || '',
          brand: dbCar.brand,
          model: dbCar.model,
          registration: dbCar.plate_number,
          year: dbCar.year,
          color: dbCar.color || 'Premium',
          vin: dbCar.vin || '',
          energy: dbCar.energy || 'Essence',
          transmission: dbCar.transmission || 'Automatique',
          seats: dbCar.seats || 5,
          doors: dbCar.doors || 4,
          priceDay: Math.round(Number(dbCar.price_per_day)),
          priceWeek: Math.round(Number(dbCar.price_week || dbCar.price_per_day * 2)),
          priceMonth: Math.round(Number(dbCar.price_month || dbCar.price_per_day * 4)),
          deposit: Math.round(Number(dbCar.deposit || dbCar.price_per_day * 2)),
          images: dbCar.image_url ? [dbCar.image_url] : ['https://picsum.photos/seed/car/400/300'],
          mileage: dbCar.mileage || 0,
          // Conserve 'maintenance' si en DB ; le vrai statut sera recalculé avec les réservations
          status: dbCar.status === 'maintenance' ? 'maintenance' : 'disponible',
          fuelLevel: dbCar.fuel_level || 'full',
          isHiddenFromSite: dbCar.is_hidden_from_site === true,
        }));
        setCars(mappedCars);
      }
    } catch (err) {
      console.error('Error loading cars:', err);
      setError('Failed to load cars');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Skip loading if authentication is still in progress or user not available
    if (isAuthLoading) return;
    if (!user) return;

    loadCarsData();
  }, [user, isAuthLoading]);

  useEffect(() => {
    // Skip loading if authentication is still in progress or user not available
    if (isAuthLoading) return;
    if (!user) return;

    const loadReservations = async () => {
      try {
        console.log('Loading reservations...');
        const reservationsData = await ReservationsService.getReservations();
        console.log('Raw reservations from database:', reservationsData);
        setReservations(reservationsData);
      } catch (err) {
        console.error('Error loading reservations:', err);
      }
    };

    loadReservations();
  }, [user, isAuthLoading]);

  // Voitures avec leur statut RÉEL calculé (dépend des réservations chargées)
  const carsWithRealStatus = useMemo(
    () => computeRealStatuses(cars, reservations),
    [cars, reservations]
  );

  const filteredCars = carsWithRealStatus.filter(car =>
    car.brand.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    car.model.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    car.registration.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // Compteurs par statut réel
  const counters = useMemo(() => ({
    disponible:  carsWithRealStatus.filter(c => c.status === 'disponible').length,
    reserve:     carsWithRealStatus.filter(c => c.status === 'reserve').length,
    louer:       carsWithRealStatus.filter(c => c.status === 'louer').length,
    maintenance: carsWithRealStatus.filter(c => c.status === 'maintenance').length,
  }), [carsWithRealStatus]);

  const handleAddCar = () => {
    setSelectedCar(null);
    setIsCarModalOpen(true);
  };

  const handleEditCar = (car: Car) => {
    setSelectedCar(car);
    setIsCarModalOpen(true);
  };

  const handleSaveCar = async (carData: Partial<Car>) => {
    try {
      if (selectedCar) {
        const updateData = {
          brand: carData.brand || selectedCar.brand,
          model: carData.model || selectedCar.model,
          year: carData.year || selectedCar.year,
          plate_number: carData.registration || selectedCar.registration,
          price_per_day: carData.priceDay || selectedCar.priceDay,
          status: carData.status || selectedCar.status || 'disponible',
          image_url: carData.images?.[0] || selectedCar.images[0],
          color: carData.color || selectedCar.color,
          vin: carData.vin || selectedCar.vin,
          energy: carData.energy || selectedCar.energy,
          transmission: carData.transmission || selectedCar.transmission,
          seats: carData.seats || selectedCar.seats,
          doors: carData.doors || selectedCar.doors,
          price_week: carData.priceWeek || selectedCar.priceWeek,
          price_month: carData.priceMonth || selectedCar.priceMonth,
          deposit: carData.deposit || selectedCar.deposit,
          mileage: carData.mileage || selectedCar.mileage,
          fuel_level: carData.fuelLevel || selectedCar.fuelLevel || 'full',
        };
        const result = await updateCar(selectedCar.id, updateData);
        if (result.success) {
          setCars(prev => prev.map(c => c.id === selectedCar.id ? { ...c, ...carData } as Car : c));
        }
      } else {
        const newCarData: AddCarData = {
          brand: carData.brand || '',
          model: carData.model || '',
          year: carData.year || new Date().getFullYear(),
          plate_number: carData.registration || '',
          price_per_day: carData.priceDay || 0,
          status: 'disponible',
          image_url: carData.images?.[0],
          color: carData.color || '',
          vin: carData.vin || '',
          energy: carData.energy || 'Essence',
          transmission: carData.transmission || 'Manuelle',
          seats: carData.seats || 5,
          doors: carData.doors || 5,
          price_week: carData.priceWeek || 0,
          price_month: carData.priceMonth || 0,
          deposit: carData.deposit || 0,
          mileage: carData.mileage || 0,
        };
        const result = await addCar(newCarData);
        if (result.success && result.car) {
          const newCar: Car = {
            id: result.car.id || '',
            brand: result.car.brand,
            model: result.car.model,
            registration: result.car.plate_number,
            year: result.car.year,
            color: result.car.color || 'Premium',
            vin: result.car.vin || '',
            energy: result.car.energy || 'Essence',
            transmission: result.car.transmission || 'Automatique',
            seats: result.car.seats || 5,
            doors: result.car.doors || 4,
            priceDay: Math.round(Number(result.car.price_per_day)),
            priceWeek: Math.round(Number(result.car.price_week || result.car.price_per_day * 2)),
            priceMonth: Math.round(Number(result.car.price_month || result.car.price_per_day * 4)),
            deposit: Math.round(Number(result.car.deposit || result.car.price_per_day * 2)),
            images: result.car.image_url ? [result.car.image_url] : ['https://picsum.photos/seed/car/400/300'],
            mileage: result.car.mileage || 0,
          };
          setCars(prev => [...prev, newCar]);
        }
      }
      setIsCarModalOpen(false);
    } catch (err) {
      console.error('Error saving car:', err);
      setError('Failed to save car');
    }
  };

  const handleDeleteCar = async (id: string) => {
    setCarToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = async () => {
    if (carToDelete) {
      try {
        const result = await deleteCar(carToDelete);
        if (result.success) {
          setCars(prev => prev.filter(c => c.id !== carToDelete));
          setCarToDelete(null);
          if (selectedCar?.id === carToDelete) {
            setIsCarModalOpen(false);
          }
        }
      } catch (err) {
        console.error('Error deleting car:', err);
        setError('Failed to delete car');
      }
    }
  };

  const handleViewDetails = (car: Car) => {
    setSelectedCar(car);
    setIsDetailsModalOpen(true);
  };

  const handleHistory = (car: Car) => {
    setSelectedCar(car);
    setIsHistoryModalOpen(true);
  };

  const handleExpenses = (car: Car) => {
    setSelectedCar(car);
    setIsExpenseModalOpen(true);
  };

  const handleReports = async (car: Car) => {
    setSelectedCar(car);
    // Fetch all expenses for this car
    const expensesResult = await getVehicleExpenses();
    let carExpenses = [];
    if (expensesResult.success && expensesResult.expenses) {
      carExpenses = expensesResult.expenses.filter(e => e.carId === car.id);
    }
    setReportExpenses(carExpenses);
    // Filter reservations for this car
    const carReservations = reservations.filter(r => r.carId === car.id);
    setReportReservations(carReservations);
    setIsReportModalOpen(true);
  };

  /**
   * Seul le basculement vers/depuis 'maintenance' est autorisé manuellement.
   * Les statuts 'disponible' / 'reserve' / 'louer' sont calculés automatiquement.
   */
  const handleStatusChange = async (carId: string, newStatus: string) => {
    const allowed = ['maintenance', 'disponible'];
    if (!allowed.includes(newStatus)) return; // Sécurité — ignore les appels non autorisés
    try {
      const result = await updateCar(carId, { status: newStatus } as any);
      if (result.success) {
        setCars(prev => prev.map(c =>
          c.id === carId ? { ...c, status: newStatus as Car['status'] } : c
        ));
      } else {
        setError('Failed to update car status');
      }
    } catch (err) {
      console.error('Error updating car status:', err);
      setError('Failed to update car status');
    }
  };

  const handleSaveExpense = async (
    expenseData: Partial<Expense> & {
      currentMileage?: number;
      nextVidangeKm?: number;
      expenseName?: string;
    }
  ) => {
    if (!selectedCar) return;
    try {
      const newExpense: Omit<import('../types').VehicleExpense, 'id' | 'createdAt'> = {
        carId: selectedCar.id,
        type: expenseData.type || 'autre',
        cost: expenseData.cost || 0,
        date: expenseData.date || new Date().toISOString().split('T')[0],
        note: expenseData.note,
        currentMileage: expenseData.currentMileage,
        nextVidangeKm: expenseData.nextVidangeKm,
        expirationDate: expenseData.expirationDate,
        expenseName: expenseData.expenseName || expenseData.name,
      };
      const result = await addVehicleExpense(newExpense);
      if (!result.success) {
        console.error('Error saving expense to DB', result.error);
        setError('Failed to save expense');
      }
    } catch (err) {
      console.error('Unexpected error saving expense', err);
      setError('Failed to save expense');
    }
  };

  return (
    <div className="space-y-10">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-100 border-2 border-red-400 text-red-800 p-4 rounded-2xl"
        >
          {error}
        </motion.div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-8 rounded-2xl border border-saas-border shadow-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-saas-text-main tracking-tighter uppercase flex items-center gap-3">
            {lang === 'fr' ? 'Parc Automobile' : 'أسطول السيارات'}
          </h1>
          <p className="text-saas-primary-via font-bold text-[10px] uppercase tracking-[0.3em]">
            {lang === 'fr' ? 'Gestion de votre flotte premium' : 'إدارة أسطولك المتميز'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-saas-text-muted group-focus-within:text-saas-primary-via transition-colors" size={18} />
            <input
              type="text"
              placeholder={lang === 'fr' ? 'Rechercher un véhicule...' : 'بحث عن مركبة...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3.5 bg-saas-bg border border-saas-border rounded-xl outline-none focus:border-saas-primary-via w-full sm:w-80 transition-all font-medium text-sm shadow-sm"
            />
          </div>
          <button
            onClick={loadCarsData}
            className="btn-saas-secondary px-6 py-3.5 group w-full sm:w-auto justify-center"
            title={lang === 'fr' ? 'Actualiser' : 'تحديث'}
          >
            <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
            <span className="font-bold uppercase tracking-widest text-xs">
              {lang === 'fr' ? 'Actualiser' : 'تحديث'}
            </span>
          </button>
          <button
            onClick={handleAddCar}
            className="btn-saas-primary px-8 py-3.5 group w-full sm:w-auto justify-center"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
            <span className="font-bold uppercase tracking-widest text-xs">
              {lang === 'fr' ? 'Nouveau Véhicule' : 'مركبة جديدة'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Compteurs statuts réels ─────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: 'disponible', label: { fr: 'Disponibles', ar: 'متاحة' },     color: 'bg-green-50 border-green-200 text-green-700',  dot: 'bg-green-500',  count: counters.disponible },
            { key: 'reserve',    label: { fr: 'Réservés',    ar: 'محجوزة' },    color: 'bg-amber-50 border-amber-200 text-amber-700',   dot: 'bg-amber-500',  count: counters.reserve },
            { key: 'louer',      label: { fr: 'En Location', ar: 'في الإيجار' }, color: 'bg-red-50 border-red-200 text-red-700',         dot: 'bg-red-500',    count: counters.louer },
            { key: 'maintenance',label: { fr: 'Maintenance', ar: 'صيانة' },     color: 'bg-gray-50 border-gray-200 text-gray-600',      dot: 'bg-gray-500',   count: counters.maintenance },
          ].map(item => (
            <motion.div key={item.key}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`glass-card border flex items-center gap-3 p-4 ${item.color}`}>
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${item.dot}`} />
              <div>
                <p className="text-2xl font-black">{item.count}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{item.label[lang]}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center min-h-96 bg-white rounded-2xl border border-saas-border"
        >
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-saas-primary-via animate-spin" />
            <p className="text-saas-text-muted font-medium">
              {lang === 'fr' ? 'Chargement des véhicules...' : 'جاري تحميل السيارات...'}
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCars.map(car => (
              <CarCard
                key={car.id}
                car={car}
                lang={lang}
                onDelete={handleDeleteCar}
                onEdit={handleEditCar}
                onViewDetails={handleViewDetails}
                onHistory={handleHistory}
                onExpenses={handleExpenses}
                onReports={handleReports}
                onStatusChange={handleStatusChange}
                activeReservationInfo={getActiveReservationInfo(car.id)}
              />
            ))}
          </div>

          {filteredCars.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">
                {lang === 'fr' ? 'Aucun véhicule trouvé.' : 'لم يتم العثور على مركبات.'}
              </p>
            </div>
          )}
        </>
      )}

      <CarModal
        isOpen={isCarModalOpen}
        onClose={() => setIsCarModalOpen(false)}
        onSave={handleSaveCar}
        onDelete={handleDeleteCar}
        car={selectedCar || undefined}
        lang={lang}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDelete}
        title={{
          fr: 'Confirmation de suppression',
          ar: 'تأكيد الحذف'
        }}
        message={{
          fr: 'Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible.',
          ar: 'هل أنت متأكد من رغبتك في حذف هذه المركبة؟ هذا الإجراء لا يمكن التراجع عنه.'
        }}
        lang={lang}
      />

      {selectedCar && (
        <>
          <CarDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            car={selectedCar}
            lang={lang}
          />
          <ExpenseModal
            isOpen={isExpenseModalOpen}
            onClose={() => setIsExpenseModalOpen(false)}
            onSave={handleSaveExpense}
            car={selectedCar}
            lang={lang}
          />
          <HistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            car={selectedCar}
            reservations={reservations}
            lang={lang}
          />
          <CarReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            car={selectedCar}
            reservations={reportReservations}
            expenses={reportExpenses}
            lang={lang}
          />
        </>
      )}
    </div>
  );
};
