import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Language, ReservationDetails, Client, Car, VehicleInspection } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Users, Car as CarIcon, Plus, Search, Filter, Eye, Edit, Trash2, CheckCircle, XCircle, Clock, MapPin, Fuel, Camera, FileText, CreditCard, DollarSign, Printer, AlertTriangle, MoreVertical, Grid3x3, CalendarDays, X, Zap, Gauge, Heart, RotateCcw, Phone } from 'lucide-react';
import { ReservationDetailsView } from './ReservationDetailsView';
import { CreateReservationForm } from './CreateReservationForm';
import { EditReservationForm } from './EditReservationForm';
import { ActivationModal, CompletionModal } from './ReservationDetailsView';
import { ReservationTimelineView } from './ReservationTimelineView';
import { ClientModal } from './ClientModal';
import { ReservationsService } from '../services/ReservationsService';
import { DatabaseService } from '../services/DatabaseService';
import { getCars } from '../services/carService';
import { supabase } from '../supabase';
import { generateConditionsPrintHTML } from '../constants/ConditionsTemplates';

/**
 * Force a phone number (or any latin/number string) to render strictly left-to-right,
 * even inside an RTL (Arabic) document, so it prints in the same order as the French layout.
 */
const ltrPhone = (value: any): string =>
  `<span dir="ltr" style="unicode-bidi:bidi-override;direction:ltr;display:inline-block">${value ?? ''}</span>`;

/**
 * Force any latin/number value (car immatriculation, VIN, model, mileage, ...) to render
 * strictly left-to-right so it keeps the same order as French even inside an RTL (Arabic)
 * document. Without this, plate numbers like "01234-116-16" print inverted ("16-116-01234").
 * Alias of {@link ltrPhone}; named separately for readability at call sites.
 */
const ltr = ltrPhone;

/**
 * Open a print window, write the document, and only trigger print() once every
 * image inside it (logo, car photo, ...) has finished loading — capped at 3s —
 * so the logo is never missing or half-loaded on the printed page.
 */
const printHTMLContent = (content: string, onDone?: () => void) => {
  const printWindow = window.open('', '', 'height=800,width=900');
  if (!printWindow) {
    onDone?.();
    return;
  }
  printWindow.document.write(content);
  printWindow.document.close();
  const images = Array.from(printWindow.document.images);
  const allLoaded = Promise.all([
    ...images.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>(resolve => {
            img.addEventListener('load', () => resolve());
            img.addEventListener('error', () => resolve());
          })
    ),
    // Wait for web fonts (templates load Google Fonts) so print output uses them
    (printWindow.document as any).fonts?.ready ?? Promise.resolve()
  ]);
  Promise.race([allLoaded, new Promise<void>(resolve => setTimeout(resolve, 3000))]).then(() => {
    printWindow.focus();
    printWindow.print();
    onDone?.();
  });
};

/** localStorage key caching agency settings (with the logo inlined as a data URI). */
const AGENCY_SETTINGS_CACHE_KEY = 'agency_settings_cache_v1';

interface PlannerPageProps {
  lang: Language;
  isAuthLoading?: boolean;
  user?: any;
}

export const PlannerPage: React.FC<PlannerPageProps> = ({ lang, isAuthLoading = false, user = null }) => {
  const location = useLocation();
  const [currentView, setCurrentView] = useState<'list' | 'calendar' | 'create' | 'create-alt' | 'details' | 'edit'>('list');
  const [displayMode, setDisplayMode] = useState<'grid' | 'calendar'>('grid');
  const [selectedReservation, setSelectedReservation] = useState<ReservationDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [carAvailabilityFilter, setCarAvailabilityFilter] = useState<'all' | 'disponible' | 'louer'>('all');
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [selectedReservationForActivation, setSelectedReservationForActivation] = useState<ReservationDetails | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedReservationForCompletion, setSelectedReservationForCompletion] = useState<ReservationDetails | null>(null);

  // Dropdown direction for print menu per reservation
  const [menuDirections, setMenuDirections] = useState<{[id: string]: 'left' | 'right'}>({});
  const buttonRefs = useRef<{[id: string]: HTMLButtonElement | null}>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<ReservationDetails | null>(null);
  const [openPrintMenu, setOpenPrintMenu] = useState<string | null>(null);
  const [showPersonalization, setShowPersonalization] = useState<{reservation: ReservationDetails, type: string} | null>(null);
  const [showConditionsModal, setShowConditionsModal] = useState(false);
  const [conditionsLanguage, setConditionsLanguage] = useState<'ar' | 'fr'>('ar');
  const [showDebtModal, setShowDebtModal] = useState<{ reservation: ReservationDetails } | null>(null);
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load reservations and cars from database
  const [reservations, setReservations] = useState<ReservationDetails[]>([]);
  const [cars, setCars] = useState<Car[]>([]);

  // Load reservations and agencies from database on component mount
  useEffect(() => {
    // Skip loading if authentication is still in progress or user not available
    if (isAuthLoading) return;
    if (!user) return;

    const loadReservations = async () => {
      try {
        setIsLoading(true);
        const data = await ReservationsService.getReservations();
        setReservations(data);
        setError(null);

        // Only restore view state if we have a valid selected reservation
        // This prevents auto-loading create/edit views on fresh navigation
        const savedViewState = localStorage.getItem('plannerViewState');
        if (savedViewState) {
          try {
            const { view, selectedId } = JSON.parse(savedViewState);
            
            if (selectedId && data.length > 0) {
              const selected = data.find(r => r.id === selectedId);
              if (selected && view && ['details', 'edit'].includes(view)) {
                // Only restore if view is details or edit (not create)
                setSelectedReservation(selected);
                setCurrentView(view);
              } else {
                // Clear invalid saved state
                localStorage.removeItem('plannerViewState');
              }
            } else {
              // Clear if no selectedId or no reservations
              localStorage.removeItem('plannerViewState');
            }
          } catch (err) {
            // Silent fail for view state restore
            localStorage.removeItem('plannerViewState');
          }
        }
      } catch (err: any) {
        console.error('Error loading reservations:', err);
        // Check if it's a table not found error
        if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
          setError('📋 Database setup required. Please run the SQL setup in Supabase.');
        } else {
          setError(`Error loading reservations: ${err?.message || 'Unknown error'}`);
        }
        setReservations([]);
      } finally {
        setIsLoading(false);
      }
    };

    const loadAgencies = async () => {
      try {
        const data = await DatabaseService.getAgencies();
        setAgencies(data);
      } catch (err) {
        console.error('Error loading agencies:', err);
      } finally {
        setIsLoadingAgencies(false);
      }
    };

    const loadCars = async () => {
      try {
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
            status: (dbCar.status || 'disponible') as Car['status'],
          }));
          setCars(mappedCars);
        }
      } catch (err) {
        console.error('Error loading cars:', err);
      }
    };

    loadReservations();
    loadAgencies();
    loadCars();
  }, [user, isAuthLoading]);

  // Handle navigation from dashboard alert card with location state
  useEffect(() => {
    const state = location.state as any;
    // Guard: only proceed if state has a valid non-empty selectedReservationId string
    if (
      state &&
      typeof state.selectedReservationId === 'string' &&
      state.selectedReservationId.length > 0 &&
      reservations.length > 0
    ) {
      const selectedRes = reservations.find(r => r.id === state.selectedReservationId);
      if (selectedRes) {
        setSelectedReservation(selectedRes);
        setCurrentView('details');
        // Clear the location state to prevent re-navigation on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, reservations]);

  const updateReservation = async (updatedReservation: ReservationDetails) => {
    try {
      await ReservationsService.updateReservation(updatedReservation.id, updatedReservation);

      const freshReservation = await ReservationsService.getReservationById(updatedReservation.id);

      setReservations(prev =>
        prev.map(res => res.id === freshReservation.id ? freshReservation : res)
      );

      if (selectedReservation && selectedReservation.id === freshReservation.id) {
        setSelectedReservation(freshReservation);
      }
    } catch (err: any) {
      console.error('❌ Error updating reservation:', err);
      setError('Failed to update reservation');
    }
  };


  // Save view state when it changes (for page refresh persistence)
  useEffect(() => {
    if (currentView !== 'list' && currentView !== 'calendar' && selectedReservation) {
      const viewState = {
        view: currentView,
        selectedId: selectedReservation.id
      };
      localStorage.setItem('plannerViewState', JSON.stringify(viewState));
    }
  }, [currentView, selectedReservation?.id]);

  // Clear view state when returning to list/calendar
  const handleReturnToList = () => {
    localStorage.removeItem('plannerViewState');
    setCurrentView(displayMode === 'calendar' ? 'calendar' : 'list');
  };

  const handleViewDetails = (reservation: ReservationDetails) => {
    setSelectedReservation(reservation);
    setCurrentView('details');
  };

  const handleEdit = (reservation: ReservationDetails) => {
    setSelectedReservation(reservation);
    setCurrentView('edit');
  };

  const handleDelete = (reservation: ReservationDetails) => {
    setShowDeleteConfirm(reservation);
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      try {
        await ReservationsService.deleteReservation(showDeleteConfirm.id);
        setReservations(prev => prev.filter(res => res.id !== showDeleteConfirm.id));
        setShowDeleteConfirm(null);
      } catch (err) {
        console.error('Error deleting reservation:', err);
        setError('Failed to delete reservation');
      }
    }
  };

  const handlePrint = (reservation: ReservationDetails, type: 'quote' | 'contract' | 'invoice' | 'payment' | 'engagement' | 'versement' | 'inspection') => {
    setOpenPrintMenu(null);
    setShowPersonalization({ reservation, type });
  };

  const generatePrintContent = (reservation: ReservationDetails, type: string) => {
    const title = type === 'quote' ? (lang === 'fr' ? 'Devis' : 'عرض أسعار') :
                  type === 'contract' ? (lang === 'fr' ? 'Contrat de Location' : 'عقد التأجير') :
                  type === 'invoice' ? (lang === 'fr' ? 'Facture' : 'الفاتورة') :
                  type === 'engagement' ? (lang === 'fr' ? 'Lettre d\'Engagement' : 'رسالة التزام') :
                  (lang === 'fr' ? 'Reçu de Paiement' : 'إيصال الدفع');
    
    return `
      <!DOCTYPE html>
      <html dir="${lang === 'fr' ? 'ltr' : 'rtl'}">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #333; }
          .section { margin: 20px 0; border: 1px solid #ddd; padding: 15px; }
          .detail { display: flex; justify-content: space-between; margin: 5px 0; }
          .label { font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        
        <div class="section">
          <h3>${lang === 'fr' ? 'Informations Réservation' : 'معلومات الحجز'}</h3>
          <div class="detail">
            <span class="label">${lang === 'fr' ? 'N° Réservation:' : 'رقم الحجز:'}</span>
            <span>${reservation.id}</span>
          </div>
          <div class="detail">
            <span class="label">${lang === 'fr' ? 'Date:' : 'التاريخ:'}</span>
            <span>${new Date().toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
        
        <div class="section">
          <h3>${lang === 'fr' ? 'Client' : 'العميل'}</h3>
          <div class="detail">
            <span class="label">${lang === 'fr' ? 'Nom:' : 'الاسم:'}</span>
            <span>${reservation.client.firstName} ${reservation.client.lastName}</span>
          </div>
          <div class="detail">
            <span class="label">${lang === 'fr' ? 'Téléphone:' : 'الهاتف:'}</span>
            <span>${ltrPhone(reservation.client.phone)}</span>
          </div>
        </div>
        
        <div class="section">
          <h3>${lang === 'fr' ? 'Véhicule' : 'المركبة'}</h3>
          <div class="detail">
            <span class="label">${lang === 'fr' ? 'Voiture:' : 'السيارة:'}</span>
            <span>${ltr((reservation.car.brand || '') + ' ' + (reservation.car.model || ''))}</span>
          </div>
          <div class="detail">
            <span class="label">${lang === 'fr' ? 'Immatriculation:' : 'رقم التسجيل:'}</span>
            <span>${ltr(reservation.car.registration)}</span>
          </div>
        </div>
        
        <div class="section">
          <h3>${lang === 'fr' ? 'Détails Financiers' : 'التفاصيل المالية'}</h3>
          <div class="detail">
            <span class="label">${lang === 'fr' ? 'Durée:' : 'المدة:'}</span>
            <span>${reservation.totalDays} ${lang === 'fr' ? 'jours' : 'أيام'}</span>
          </div>
          <div class="detail">
            <span class="label">${lang === 'fr' ? 'Prix Total:' : 'السعر الإجمالي:'}</span>
            <span>${reservation.totalPrice.toLocaleString()} ${lang === 'fr' ? 'DA' : 'د.ج'}</span>
          </div>
          <div class="detail">
            <span class="label">${lang === 'fr' ? 'Acompte:' : 'الدفعة المقدمة:'}</span>
            <span>${reservation.advancePayment.toLocaleString()} ${lang === 'fr' ? 'DA' : 'د.ج'}</span>
          </div>
          <div class="detail">
            <span class="label">${lang === 'fr' ? 'Reste à Payer:' : 'المبلغ المتبقي:'}</span>
            <span>${reservation.remainingPayment.toLocaleString()} ${lang === 'fr' ? 'DA' : 'د.ج'}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>${lang === 'fr' ? 'Document généré le' : 'تم إنشاء المستند في'} ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleActivate = (reservation: ReservationDetails) => {
    setSelectedReservationForActivation(reservation);
    setShowActivationModal(true);
  };

  const handleComplete = (reservation: ReservationDetails) => {
    setSelectedReservationForCompletion(reservation);
    setShowCompletionModal(true);
  };

  // A car is NOT disponible only if it has an active or confirmed reservation
    const rentedCarIds = new Set(
    reservations
      .filter(r => r.status === 'active' || r.status === 'confirmed')
      .map(r => r.car?.id)
      .filter((id): id is string => Boolean(id))
  );

  const isSearching = searchQuery.trim().length > 0;

  const filteredReservations = reservations.filter(reservation => {
    if (!reservation.client || !reservation.car) return false;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !isSearching ||
      (reservation.client.firstName || '').toLowerCase().includes(q) ||
      (reservation.client.lastName || '').toLowerCase().includes(q) ||
      (`${reservation.client.firstName || ''} ${reservation.client.lastName || ''}`).toLowerCase().includes(q) ||
      (reservation.car.brand || '').toLowerCase().includes(q) ||
      (reservation.car.model || '').toLowerCase().includes(q) ||
      (reservation.car.registration || '').toLowerCase().includes(q) ||
      (reservation.client.phone || '').toLowerCase().includes(q) ||
      (reservation.id || '').toString().toLowerCase().includes(q);

    // Hide completed ("Terminé") reservations from the default planner view.
    // They only surface when the user actively searches (client name / phone /
    // reservation id) or explicitly filters by the "Terminé" status.
    if (reservation.status === 'completed' && !isSearching && filterStatus !== 'completed') {
      return false;
    }

    const matchesFilter = filterStatus === 'all' || reservation.status === filterStatus;

    const resPaid = (reservation.payments && reservation.payments.length > 0)
      ? reservation.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
      : (Number(reservation.advancePayment) || 0);
    const resRemaining = Math.max(0, (Number(reservation.totalPrice) || 0) - resPaid);
    const matchesDebt = !filterDebtOnly || resRemaining > 0;

    return matchesSearch && matchesFilter && matchesDebt;
  });

  if (currentView === 'create' || currentView === 'create-alt') {
    return (
      <CreateReservationForm
        lang={lang}
        user={user}
        defaultStatus="confirmed"
        altFlow={currentView === 'create-alt'}
        onBack={async () => {
          setCurrentView('list');
          setSelectedReservation(null);
          // Reload reservations after creating a new one
          try {
            const data = await ReservationsService.getReservations();
            setReservations(data);
          } catch (err) {
            console.error('Error reloading reservations:', err);
          }
        }}
      />
    );
  }

  if (currentView === 'calendar' && displayMode === 'calendar') {
    return (
      <div className="space-y-8">
        <ReservationTimelineView 
          lang={lang} 
          reservations={reservations}
          onSelectReservation={(res) => {
            setSelectedReservation(res);
            setCurrentView('details');
          }}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setCurrentView('list');
            setDisplayMode('grid');
          }}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <Grid3x3 className="w-4 h-4" />
          {lang === 'fr' ? 'Vue Liste' : 'عرض القائمة'}
        </motion.button>
      </div>
    );
  }

  if (currentView === 'details' && selectedReservation) {
    return <ReservationDetailsView 
      lang={lang} 
      reservation={selectedReservation} 
      onBack={() => {
        localStorage.removeItem('plannerViewState');
        setCurrentView(displayMode === 'calendar' ? 'calendar' : 'list');
      }} 
      onUpdate={updateReservation} 
    />;
  }

  if (currentView === 'edit' && selectedReservation) {
    return <EditReservationForm 
      lang={lang} 
      reservation={selectedReservation} 
      onBack={() => {
        localStorage.removeItem('plannerViewState');
        setCurrentView(displayMode === 'calendar' ? 'calendar' : 'list');
      }} 
      onUpdate={updateReservation}
      agencies={agencies}
      isLoadingAgencies={isLoadingAgencies}
    />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-saas-text-main uppercase tracking-tighter">
          📅 {lang === 'fr' ? 'Planificateur' : 'المخطط'}
        </h2>
        <p className="text-saas-text-muted font-bold uppercase text-[10px] tracking-widest">
          {lang === 'fr' ? 'Gestion des réservations' : 'إدارة الحجوزات'}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder={lang === 'fr' ? 'Rechercher...' : 'البحث...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{lang === 'fr' ? 'Tous les statuts' : 'جميع الحالات'}</option>
            <option value="pending">{lang === 'fr' ? 'En attente' : 'في الانتظار'}</option>
            <option value="accepted">{lang === 'fr' ? 'Accepté' : 'مقبول'}</option>
            <option value="confirmed">{lang === 'fr' ? 'Confirmé' : 'مؤكد'}</option>
            <option value="active">{lang === 'fr' ? 'Actif' : 'نشط'}</option>
            <option value="completed">{lang === 'fr' ? 'Terminé' : 'منتهي'}</option>
            <option value="terminated">{lang === 'fr' ? 'Clôturé' : 'مغلق'}</option>
            <option value="cancelled">{lang === 'fr' ? 'Annulé' : 'ملغي'}</option>
          </select>

          {/* Debt Filter Toggle */}
          <button
            onClick={() => setFilterDebtOnly(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              filterDebtOnly
                ? 'bg-red-500 text-white'
                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            }`}
          >
            💰 {lang === 'fr' ? (filterDebtOnly ? 'Voir tout' : 'Dettes uniquement') : (filterDebtOnly ? 'عرض الكل' : 'الديون فقط')}
          </button>
        </div>

        {/* View Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setDisplayMode('calendar');
            setCurrentView('calendar');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg transition-all"
          title={lang === 'fr' ? 'Voir le calendrier' : 'عرض التقويم'}
        >
          <CalendarDays className="w-4 h-4" />
          {lang === 'fr' ? 'Calendrier' : 'التقويم'}
        </motion.button>

        {/* Add New Reservation */}
        <button
          onClick={() => setCurrentView('create')}
          className="btn-saas-primary"
        >
          <Plus className="w-4 h-4" />
          {lang === 'fr' ? 'Nouvelle Réservation' : 'حجز جديد'}
        </button>
      </div>

      {/* Car Availability Filter */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 flex-wrap bg-white p-5 rounded-2xl border border-saas-border shadow-sm"
      >
        <span className="font-bold text-saas-text-main text-sm uppercase tracking-wide">
          {lang === 'fr' ? '🚗 Véhicules:' : '🚗 السيارات:'}
        </span>
        {(['all', 'disponible', 'louer'] as const).map((status) => (
          <motion.button
            key={status}
            onClick={() => setCarAvailabilityFilter(status)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm uppercase tracking-wide flex items-center gap-2 border-2 ${
              carAvailabilityFilter === status
                ? status === 'all'
                  ? 'border-saas-primary-via bg-saas-primary-via/10 text-saas-primary-via shadow-lg shadow-saas-primary-via/20'
                  : status === 'disponible'
                  ? 'border-green-500 bg-green-50 text-green-700 shadow-lg shadow-green-500/20'
                  : 'border-amber-500 bg-amber-50 text-amber-700 shadow-lg shadow-amber-500/20'
                : 'border-saas-border bg-white text-saas-text-main hover:border-saas-primary-via'
            }`}
          >
            {status === 'all' ? '📊 Tous' : status === 'disponible' ? '✅ Disponible' : '🔄 Loué'}
          </motion.button>
        ))}
      </motion.div>

      {/* Show Cars Grid when filtering by availability */}
      {carAvailabilityFilter !== 'all' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {carAvailabilityFilter === 'disponible' ? '✅' : '🔄'}
              </span>
              <div>
                <h3 className="text-2xl font-black text-saas-text-main uppercase tracking-tighter">
                  {carAvailabilityFilter === 'disponible' 
                    ? (lang === 'fr' ? 'Voitures Disponibles' : 'السيارات المتاحة') 
                    : (lang === 'fr' ? 'Voitures en Location' : 'السيارات المؤجرة')}
                </h3>
                <p className="text-saas-text-muted text-sm font-medium">
                  {carAvailabilityFilter === 'disponible'
                    ? (lang === 'fr' ? `${cars.filter(c => !rentedCarIds.has(c.id)).length} véhicules disponibles` : `${cars.filter(c => !rentedCarIds.has(c.id)).length} مركبة متاحة`)
                    : (lang === 'fr' ? `${cars.filter(c => rentedCarIds.has(c.id)).length} véhicules actuellement loués` : `${cars.filter(c => rentedCarIds.has(c.id)).length} مركبة قيد الإيجار`)}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCarAvailabilityFilter('all')}
              className="px-4 py-2 bg-saas-bg border border-saas-border rounded-xl hover:border-saas-primary-via text-saas-text-main font-bold transition-all"
            >
              ← {lang === 'fr' ? 'Retour' : 'رجوع'}
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(carAvailabilityFilter === 'disponible'
              ? cars.filter(c => !rentedCarIds.has(c.id))
              : cars.filter(c => rentedCarIds.has(c.id))).map((car, index) => (
              <motion.div
                key={car.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl overflow-hidden border border-saas-border shadow-sm hover:shadow-lg hover:border-saas-primary-via transition-all group"
              >
                {/* Car Image */}
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-saas-bg to-gray-100">
                  {car.images && car.images[0] ? (
                    <img 
                      src={car.images[0]} 
                      alt={`${car.brand} ${car.model}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/car/400/300';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-saas-text-muted">
                      <CarIcon size={48} />
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide ${
                        !rentedCarIds.has(car.id)
                          ? 'bg-green-500/90 text-white'
                          : 'bg-amber-500/90 text-white'
                      }`}
                    >
                      {!rentedCarIds.has(car.id) ? '✅ Disponible' : '🔄 Loué'}
                    </motion.div>
                  </div>
                </div>

                {/* Car Info */}
                <div className="p-5 space-y-4">
                  <div>
                    <h4 className="text-lg font-black text-saas-text-main uppercase tracking-tighter">
                      {car.brand} {car.model}
                    </h4>
                    <p className="text-saas-text-muted text-xs font-medium mt-1">
                      {car.registration} • {car.year}
                    </p>
                  </div>

                  {/* Car Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 bg-saas-bg p-2 rounded-lg">
                      <Gauge className="w-4 h-4 text-saas-primary-via" />
                      <span className="font-medium">{car.mileage.toLocaleString()} km</span>
                    </div>
                    <div className="flex items-center gap-2 bg-saas-bg p-2 rounded-lg">
                      <Fuel className="w-4 h-4 text-saas-primary-via" />
                      <span className="font-medium">{car.energy}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-saas-bg p-2 rounded-lg col-span-2">
                      <Users className="w-4 h-4 text-saas-primary-via" />
                      <span className="font-medium">{car.seats} places • {car.transmission}</span>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="border-t border-saas-border pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-saas-text-muted text-xs font-medium">
                        {lang === 'fr' ? 'Par jour' : 'في اليوم'}
                      </span>
                      <span className="font-black text-saas-primary-via">
                        {car.priceDay.toLocaleString()} DA
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-saas-text-muted text-xs font-medium">
                        {lang === 'fr' ? 'Dépôt' : 'الإيداع'}
                      </span>
                      <span className="font-bold text-amber-600">
                        {car.deposit.toLocaleString()} DA
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (!rentedCarIds.has(car.id)) {
                        setCurrentView('create');
                      } else {
                        // Find the current active/confirmed reservation for this car
                        const currentReservation = reservations.find(
                          res => res.car?.id === car.id && ['active', 'confirmed'].includes(res.status)
                        );
                        if (currentReservation) {
                          setSelectedReservation(currentReservation);
                          setCurrentView('details');
                        } else {
                          alert(lang === 'fr'
                            ? 'Aucune réservation active trouvée pour ce véhicule'
                            : 'لم يتم العثور على حجز نشط لهذه المركبة');
                        }
                      }
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold transition-all text-sm uppercase tracking-wide ${
                      !rentedCarIds.has(car.id)
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                        : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
                    }`}
                  >
                    {!rentedCarIds.has(car.id)
                      ? (lang === 'fr' ? '📅 Réserver' : '📅 حجز')
                      : (lang === 'fr' ? '👁️ Détails' : '👁️ التفاصيل')}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>

          {(carAvailabilityFilter === 'disponible'
            ? cars.filter(c => !rentedCarIds.has(c.id))
            : cars.filter(c => rentedCarIds.has(c.id))).length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-20">
                {carAvailabilityFilter === 'disponible' ? '✅' : '🔄'}
              </div>
              <p className="text-saas-text-muted text-lg font-medium">
                {carAvailabilityFilter === 'disponible' 
                  ? (lang === 'fr' ? 'Aucune voiture disponible pour le moment' : 'لا توجد سيارات متاحة في الوقت الحالي') 
                  : (lang === 'fr' ? 'Aucune voiture en location actuellement' : 'لا توجد سيارات قيد الإيجار حالياً')}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Original Reservations Grid - Only show when carAvailabilityFilter is 'all' */}
      {carAvailabilityFilter === 'all' && (
        <>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 flex items-center gap-2"
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-slate-500">{lang === 'fr' ? 'Chargement...' : 'جاري التحميل...'}</p>
              </div>
            </div>
          )}

          {/* Reservations Grid */}
          {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReservations.map((reservation) => {
          // Skip rendering if client or car data is missing
          if (!reservation.client || !reservation.car) {
            return null;
          }

          // Financial calculations: compute base vehicle price from rates and days
          const servicesTotal = (reservation.additionalServices || []).reduce((sum, s) => sum + (s.price || 0), 0);
          const days = Number(reservation.totalDays) || 0;
          const weeks = Math.floor(days / 7);
          const remainingDays = days % 7;
          const priceDay = reservation.car?.priceDay || reservation.car?.priceDay || 0;
          const priceWeek = reservation.car?.priceWeek || (priceDay * 7);
          const weeklyPrice = priceWeek * weeks;
          const remainingPrice = priceDay * remainingDays;
          const basePrice = weeklyPrice + remainingPrice;
          const subtotal = basePrice + servicesTotal;
          const totalCost = subtotal + (Number(reservation.additionalFees) || 0) + (Number((reservation as any).tvaAmount) || 0);
          
          // Use the actual totalPrice from database, not the recalculated one
          const displayTotalPrice = reservation.totalPrice || totalCost;
          
          const paidAmount = (reservation.payments && reservation.payments.length > 0)
            ? reservation.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
            : (Number(reservation.advancePayment) || 0);
          const remainingAmount = Math.max(0, displayTotalPrice - paidAmount);

          // Per-status accent used on the card border + top strip so the state
          // is readable at a glance; hues match the status pills used app-wide.
          const statusAccent =
            reservation.status === 'confirmed' ? 'border-l-green-500' :
            reservation.status === 'accepted' ? 'border-l-teal-500' :
            reservation.status === 'active' ? 'border-l-blue-500' :
            reservation.status === 'completed' ? 'border-l-purple-500' :
            reservation.status === 'terminated' ? 'border-l-red-500' :
            reservation.status === 'cancelled' ? 'border-l-slate-400' :
            'border-l-yellow-400';

          return (
          <motion.div
            key={reservation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-slate-200 border-l-4 ${statusAccent} flex flex-col relative`}
          >
            {/* Car Image */}
            <div className="relative h-40 overflow-hidden rounded-t-2xl">
              <img
                src={reservation.car.images?.[0] || 'https://picsum.photos/seed/car/400/300'}
                alt={`${reservation.car.brand} ${reservation.car.model}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Bottom scrim with car identity — most scanned info, biggest weight */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pt-8 pb-2.5">
                <p className="text-white font-black text-base leading-tight drop-shadow">
                  {reservation.car.brand} {reservation.car.model}
                </p>
                <p className="text-white/90 text-xs font-mono font-bold tracking-wider">
                  {reservation.car.registration}
                </p>
              </div>
              {/* Client Avatar - Circular with Border */}
              <div className="absolute top-3 right-3 w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg bg-slate-100 flex items-center justify-center">
                {reservation.client.profilePhoto ? (
                  <img
                    src={reservation.client.profilePhoto}
                    alt={`${reservation.client.firstName} ${reservation.client.lastName}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-xl">👤</span>
                )}
              </div>
              {/* Status Badge */}
              <div className="absolute top-3 left-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                  reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  reservation.status === 'accepted' ? 'bg-teal-100 text-teal-800' :
                  reservation.status === 'active' ? 'bg-blue-100 text-blue-800' :
                  reservation.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                  reservation.status === 'terminated' ? 'bg-red-100 text-red-800' :
                  reservation.status === 'cancelled' ? 'bg-slate-200 text-slate-700' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {reservation.status === 'confirmed' ? '✅ Confirmé' :
                   reservation.status === 'accepted' ? '✅ Accepté' :
                   reservation.status === 'active' ? '🔄 Actif' :
                   reservation.status === 'completed' ? '🏁 Terminé' :
                   reservation.status === 'terminated' ? '🛑 Clôturé' :
                   reservation.status === 'cancelled' ? '❌ Annulé' :
                   '⏳ En attente'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
              {/* Client & rental info */}
              <div className="space-y-3 mb-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-black text-lg text-slate-900 truncate">
                      {reservation.client.firstName} {reservation.client.lastName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span dir="ltr" className="truncate">{reservation.client.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{reservation.step1.departureDate} → {reservation.step1.returnDate}</span>
                  <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {reservation.totalDays} {lang === 'fr' ? 'j' : 'يوم'}
                  </span>
                </div>

                {/* Payment summary — remaining balance is the operational figure */}
                <div className={`p-4 rounded-xl border ${remainingAmount === 0 ? 'bg-green-50/60 border-green-200' : 'bg-orange-50/60 border-orange-200'}`}>
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{lang === 'fr' ? 'Reste à payer' : 'المتبقي'}</div>
                      <div className={`text-2xl font-black leading-tight ${remainingAmount === 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {remainingAmount === 0
                          ? (lang === 'fr' ? 'Soldé ✓' : 'مسدد ✓')
                          : `${remainingAmount.toLocaleString()} ${lang === 'fr' ? 'DA' : 'د.ج'}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{lang === 'fr' ? 'Total' : 'الإجمالي'}</div>
                      <div className="text-sm font-bold text-slate-700">{displayTotalPrice.toLocaleString()} {lang === 'fr' ? 'DA' : 'د.ج'}</div>
                      <div className="text-[11px] font-semibold text-green-700">{lang === 'fr' ? 'Payé' : 'مدفوع'}: {paidAmount.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="w-full bg-white rounded-full h-1.5 overflow-hidden border border-slate-100">
                    <div
                      className={`h-full rounded-full ${remainingAmount === 0 ? 'bg-green-500' : 'bg-orange-400'}`}
                      style={{ width: `${Math.min(100, Math.round((paidAmount / (displayTotalPrice || 1)) * 100))}%` }}
                    />
                  </div>

                  {servicesTotal > 0 && (
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      {lang === 'fr' ? 'dont services' : 'منها خدمات'}: {servicesTotal.toLocaleString()} {lang === 'fr' ? 'DA' : 'د.ج'}
                    </p>
                  )}
                </div>
              </div>

              {/* Primary actions — clear hierarchy: view (filled) · edit (outline) · delete (ghost) */}
              <div className="flex items-center gap-2 mb-2.5">
                <button
                  onClick={() => handleViewDetails(reservation)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-3 rounded-xl shadow-sm hover:shadow transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <Eye className="w-4 h-4" />
                  {lang === 'fr' ? 'Détails' : 'التفاصيل'}
                </button>
                <button
                  onClick={() => handleEdit(reservation)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold py-2.5 px-3 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <Edit className="w-4 h-4" />
                  {lang === 'fr' ? 'Modifier' : 'تعديل'}
                </button>
                <button
                  onClick={() => handleDelete(reservation)}
                  title={lang === 'fr' ? 'Supprimer' : 'حذف'}
                  aria-label={lang === 'fr' ? 'Supprimer' : 'حذف'}
                  className="inline-flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 p-2.5 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Contextual actions — status transition · pay debt · print menu */}
              <div className="flex items-stretch gap-2">
                {/* Confirmed Status - Activate Button */}
                {reservation.status === 'confirmed' && (
                  <button
                    onClick={() => handleActivate(reservation)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-sm hover:shadow transition-all text-sm"
                  >
                    <Zap className="w-4 h-4" /> {lang === 'fr' ? 'Activer' : 'تفعيل'}
                  </button>
                )}

                {/* Active Status - Complete Button */}
                {reservation.status === 'active' && (
                  <button
                    onClick={() => handleComplete(reservation)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-sm hover:shadow transition-all text-sm"
                  >
                    <CheckCircle className="w-4 h-4" /> {lang === 'fr' ? 'Terminer' : 'إنهاء'}
                  </button>
                )}

                {/* Completed / Terminated Status - Reactivate Button */}
                {(reservation.status === 'completed' || reservation.status === 'terminated') && (
                  <button
                    onClick={() => handleActivate(reservation)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-sm hover:shadow transition-all text-sm"
                  >
                    <RotateCcw className="w-4 h-4" /> {lang === 'fr' ? 'Réactiver' : 'إعادة تفعيل'}
                  </button>
                )}

                {/* Pay Debt Button - only when remaining > 0 */}
                {remainingAmount > 0 && (
                  <button
                    onClick={() => setShowDebtModal({ reservation })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-sm hover:shadow transition-all text-sm"
                  >
                    <DollarSign className="w-4 h-4" /> {lang === 'fr' ? 'Payer' : 'سداد'}
                  </button>
                )}

                {/* Print Menu Button */}
                <div className="relative ml-auto">
                  <button
                    ref={(el: HTMLButtonElement | null) => { if (el) buttonRefs.current[reservation.id] = el; }}
                    onClick={() => {
                      const btn = buttonRefs.current[reservation.id];
                      if (btn) {
                        const rect = btn.getBoundingClientRect();
                        const card = btn.closest('.bg-white.rounded-2xl');
                        if (card instanceof HTMLElement) {
                          const cardRect = card.getBoundingClientRect();
                          const spaceRight = cardRect.right - rect.right;
                          const menuWidth = 200; // approximate
                          setMenuDirections(prev => ({
                            ...prev,
                            [reservation.id]: spaceRight < menuWidth ? 'left' : 'right'
                          }));
                        }
                      }
                      setOpenPrintMenu(openPrintMenu === reservation.id ? null : reservation.id);
                    }}
                    className="h-full inline-flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 px-3 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                    title={lang === 'fr' ? "Imprimer / documents" : 'طباعة / مستندات'}
                    aria-label={lang === 'fr' ? "Imprimer / documents" : 'طباعة / مستندات'}
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {openPrintMenu === reservation.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute bottom-12 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 min-w-[190px] overflow-hidden py-1 ${menuDirections[reservation.id] === 'left' ? 'right-0' : 'left-0'}` }
                      >
                        <button
                          onClick={() => handlePrint(reservation, 'contract')}
                          className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-slate-700 font-semibold text-sm flex items-center gap-2.5 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-indigo-500" /> {lang === 'fr' ? 'Contrat' : 'عقد'}
                        </button>
                        <button
                          onClick={() => {
                            setOpenPrintMenu(null);
                            setConditionsLanguage('ar');
                            setShowConditionsModal(true);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-slate-700 font-semibold text-sm flex items-center gap-2.5 transition-colors"
                        >
                          <Printer className="w-4 h-4 text-indigo-500" /> {lang === 'fr' ? 'Conditions' : 'طباعة الشروط'}
                        </button>
                        <button
                          onClick={() => handlePrint(reservation, 'invoice')}
                          className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-slate-700 font-semibold text-sm flex items-center gap-2.5 transition-colors"
                        >
                          <CreditCard className="w-4 h-4 text-indigo-500" /> {lang === 'fr' ? 'Facture' : 'الفاتورة'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
          );
        })}
          </div>
          )}

          {filteredReservations.length === 0 && !isLoading && carAvailabilityFilter === 'all' && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">
            {lang === 'fr' ? 'Aucune réservation trouvée' : 'لم يتم العثور على حجوزات'}
          </p>
        </div>
      )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-sm w-full p-6 border border-saas-border"
            >
              <h3 className="text-lg font-black text-saas-text-main mb-4">
                ⚠️ {lang === 'fr' ? 'Confirmer la Suppression' : 'تأكيد الحذف'}
              </h3>
              <p className="text-saas-text-muted mb-6">
                {lang === 'fr' ? 'Êtes-vous sûr de vouloir supprimer cette réservation ? Cette action ne peut pas être annulée.' : 'هل أنت متأكد من حذف هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-saas-bg hover:bg-saas-secondary-start/10 text-saas-text-muted font-bold py-2 px-4 rounded-lg border border-saas-border hover:border-saas-secondary-start/20 transition-all"
                >
                  {lang === 'fr' ? 'Annuler' : 'إلغاء'}
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 btn-saas-danger"
                >
                  🗑️ {lang === 'fr' ? 'Supprimer' : 'حذف'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

  {/* Pay Debt Modal */}
  <AnimatePresence>
    {showDebtModal && (
      <PayDebtModal
        lang={lang}
        reservation={showDebtModal.reservation}
        onClose={() => setShowDebtModal(null)}
        onSave={async (reservationId, amount, method, note, newRemaining) => {
          try {
            await ReservationsService.addPayment({
              reservationId,
              amount,
              paymentMethod: method,
              date: new Date().toISOString().split('T')[0],
              note,
            });
            // Update remaining_payment in database
            await ReservationsService.updateReservation(reservationId, { remainingPayment: newRemaining } as any);
            // Refresh the reservation in local state
            const fresh = await ReservationsService.getReservationById(reservationId);
            setReservations(prev => prev.map(r => r.id === fresh.id ? fresh : r));
            setShowDebtModal(null);
          } catch (err: any) {
            console.error('Failed to save payment', err);
            alert(
              (lang === 'fr'
                ? "Échec de l'enregistrement du paiement : "
                : 'فشل تسجيل الدفعة: ') + (err?.message || err)
            );
            throw err;
          }
        }}
      />
    )}
  </AnimatePresence>

  {/* Personalization Modal */}
  <AnimatePresence>
        {showPersonalization && (
          <PersonalizationModal
            lang={lang}
            reservation={showPersonalization.reservation}
            type={showPersonalization.type}
            onClose={() => setShowPersonalization(null)}
            onPrint={(content) => printHTMLContent(content)}
          />
        )}
      </AnimatePresence>

      {/* Conditions Modal - Streamlined */}
      <AnimatePresence>
        {showConditionsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConditionsModal(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header — same design as the contract interface */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-white">
                    {conditionsLanguage === 'fr' ? 'Conditions de Location' : 'شروط الإيجار'}
                  </h2>
                  {/* Template Selector */}
                  <div className="flex gap-2 ml-8">
                    <button
                      onClick={() => setConditionsLanguage('fr')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        conditionsLanguage === 'fr'
                          ? 'bg-white text-blue-600'
                          : 'bg-blue-500 text-white hover:bg-blue-400'
                      }`}
                    >
                      🇫🇷 Français
                    </button>
                    <button
                      onClick={() => setConditionsLanguage('ar')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        conditionsLanguage === 'ar'
                          ? 'bg-white text-blue-600'
                          : 'bg-blue-500 text-white hover:bg-blue-400'
                      }`}
                    >
                      🇸🇦 العربية
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowConditionsModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content Area with Preview — same design as the contract interface */}
              <div className="flex-1 overflow-auto bg-gradient-to-b from-gray-50 to-white p-8">
                <div className="bg-white rounded-lg shadow-lg p-0 mx-auto" style={{ width: '210mm' }}>
                  <iframe
                    srcDoc={generateConditionsPrintHTML(conditionsLanguage)}
                    style={{
                      width: '100%',
                      height: '600px',
                      border: 'none',
                      borderRadius: '0.5rem'
                    }}
                    title="Conditions Preview"
                  />
                </div>
              </div>

              {/* Footer with Actions — same design as the contract interface */}
              <div className="bg-gray-100 px-8 py-4 flex items-center justify-between border-t border-gray-200">
                <button
                  onClick={() => setShowConditionsModal(false)}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-all"
                >
                  {conditionsLanguage === 'fr' ? 'Fermer' : 'إغلاق'}
                </button>
                <button
                  onClick={() => printHTMLContent(generateConditionsPrintHTML(conditionsLanguage))}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                >
                  <Printer size={18} />
                  {conditionsLanguage === 'fr' ? 'Imprimer' : 'طباعة'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showActivationModal && selectedReservationForActivation && (
        <ActivationModal
          lang={lang}
          reservation={selectedReservationForActivation}
          onClose={() => setShowActivationModal(false)}
          onActivate={updateReservation}
        />
      )}
      {showCompletionModal && selectedReservationForCompletion && (
        <CompletionModal
          lang={lang}
          reservation={selectedReservationForCompletion}
          onClose={() => setShowCompletionModal(false)}
          onComplete={updateReservation}
        />
      )}
    </div>
  );
};

// Utility function to get initial elements based on document type
const getInitialElements = (type: string, reservation: ReservationDetails, lang: Language = 'fr') => {
  const baseElements = {
    logo: { x: 50, y: 50, width: 100, height: 100 },
    signatureText1: { x: 50, y: 600, text: 'Signature et cachet de l\'Agence', fontSize: 14, fontFamily: 'Arial', color: '#666666', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
    signatureText2: { x: 300, y: 600, text: 'Signature de client', fontSize: 14, fontFamily: 'Arial', color: '#666666', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' }
  };

  if (type === 'payment' || type === 'receipt' || type === 'versement') {
    // Receipt template - calculate total paid from payments array
    const totalPaid = reservation.payments?.reduce((sum, p) => sum + p.amount, 0) || reservation.advancePayment || 0;
    const remaining = Math.max(0, reservation.totalPrice - totalPaid);
    
    // Receipt template
    return {
      ...baseElements,
      title: { x: 200, y: 50, text: lang === 'fr' ? 'payement' : 'إيصال الدفع', fontSize: 24, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', backgroundColor: 'transparent' },
      receiptNumber: { x: 50, y: 150, text: `N° ${reservation.id}`, fontSize: 14, fontFamily: 'Arial', color: '#333333', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      receiptDate: { x: 50, y: 180, text: `${lang === 'fr' ? 'Date:' : 'التاريخ:'} ${new Date().toLocaleDateString('fr-FR')}`, fontSize: 14, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      clientLabel: { x: 50, y: 220, text: lang === 'fr' ? 'Client:' : 'العميل:', fontSize: 14, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      clientName: { x: 150, y: 220, text: `${reservation.client.firstName} ${reservation.client.lastName}`, fontSize: 14, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      clientPhone: { x: 50, y: 245, text: `${lang === 'fr' ? 'Téléphone:' : 'الهاتف:'} ${reservation.client.phone}`, fontSize: 12, fontFamily: 'Arial', color: '#666666', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      carLabel: { x: 50, y: 280, text: lang === 'fr' ? 'Véhicule:' : 'المركبة:', fontSize: 14, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      carInfo: { x: 50, y: 305, text: `${reservation.car.brand} ${reservation.car.model} - ${reservation.car.registration}`, fontSize: 13, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      rentalPeriod: { x: 50, y: 330, text: `${lang === 'fr' ? 'Période:' : 'الفترة:'} ${reservation.step1.departureDate} ${lang === 'fr' ? 'au' : 'إلى'} ${reservation.step1.returnDate}`, fontSize: 13, fontFamily: 'Arial', color: '#666666', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      totalLabel: { x: 50, y: 380, text: lang === 'fr' ? 'Total:' : 'الإجمالي:', fontSize: 16, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      totalAmount: { x: 200, y: 380, text: `${reservation.totalPrice.toLocaleString()} ${lang === 'fr' ? 'DA' : 'د.ج'}`, fontSize: 16, fontFamily: 'Arial', color: '#0066cc', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      paidLabel: { x: 50, y: 410, text: lang === 'fr' ? 'Montant payé:' : 'المبلغ المدفوع:', fontSize: 14, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      paidAmount: { x: 200, y: 410, text: `${totalPaid.toLocaleString()} ${lang === 'fr' ? 'DA' : 'د.ج'}`, fontSize: 14, fontFamily: 'Arial', color: '#00aa00', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      remainingLabel: { x: 50, y: 440, text: lang === 'fr' ? 'Reste à payer:' : 'المبلغ المتبقي:', fontSize: 14, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      remainingAmount: { x: 200, y: 440, text: `${remaining.toLocaleString()} ${lang === 'fr' ? 'DA' : 'د.ج'}`, fontSize: 14, fontFamily: 'Arial', color: '#cc0000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
    };
  } else if (type === 'invoice' || type === 'facture') {
    // Facture/Invoice - like versement with full details
    const subtotal = reservation.totalPrice;
    const tvaRate = reservation.tvaApplied ? 0.19 : 0;
    const tvaAmount = subtotal * tvaRate;
    const caution = reservation.deposit || 0;
    const totalPaid = reservation.payments?.reduce((sum, payment) => sum + payment.amount, 0) || reservation.advancePayment || 0;
    const remaining = subtotal - totalPaid;

    return {
      ...baseElements,
      title: { x: 200, y: 70, text: lang === 'fr' ? 'FACTURE' : 'الفاتورة', fontSize: 26, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', backgroundColor: 'transparent' },
      invoiceNumber: { x: 50, y: 165, text: `${lang === 'fr' ? 'N° Facture:' : 'رقم الفاتورة:'} ${reservation.id}`, fontSize: 13, fontFamily: 'Arial', color: '#333333', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      invoiceDate: { x: 300, y: 165, text: `${lang === 'fr' ? 'Date:' : 'التاريخ:'} ${new Date().toLocaleDateString('fr-FR')}`, fontSize: 13, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'right', backgroundColor: 'transparent' },
      clientSectionTitle: { x: 50, y: 205, text: lang === 'fr' ? '👤 INFORMATIONS CLIENT' : '👤 معلومات العميل', fontSize: 14, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'underline', textAlign: 'left', backgroundColor: 'transparent' },
      clientNameLabel: { x: 50, y: 240, text: lang === 'fr' ? 'Nom:' : 'الاسم:', fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      clientName: { x: 130, y: 240, text: `${reservation.client.firstName} ${reservation.client.lastName}`, fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      clientPhoneLabel: { x: 50, y: 260, text: lang === 'fr' ? 'Téléphone:' : 'الهاتف:', fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      clientPhone: { x: 130, y: 260, text: reservation.client.phone || 'N/A', fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      clientAddressLabel: { x: 50, y: 280, text: lang === 'fr' ? 'Adresse:' : 'العنوان:', fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      clientAddress: { x: 130, y: 280, text: reservation.client.completeAddress || 'N/A', fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      vehicleSectionTitle: { x: 50, y: 320, text: lang === 'fr' ? '🚗 INFORMATIONS VÉHICULE' : '🚗 معلومات المركبة', fontSize: 14, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'underline', textAlign: 'left', backgroundColor: 'transparent' },
      vehicleBrandLabel: { x: 50, y: 350, text: lang === 'fr' ? 'Marque & Modèle:' : 'العلامة والطراز:', fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      vehicleInfo: { x: 180, y: 350, text: `${reservation.car.brand} ${reservation.car.model}`, fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      vehicleRegLabel: { x: 50, y: 370, text: lang === 'fr' ? 'Immatriculation:' : 'رقم التسجيل:', fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      vehicleReg: { x: 180, y: 370, text: reservation.car.registration || 'N/A', fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      rentalPeriodLabel: { x: 50, y: 390, text: lang === 'fr' ? 'Période:' : 'الفترة:', fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      rentalPeriod: { x: 180, y: 390, text: `${reservation.step1.departureDate} ${lang === 'fr' ? 'au' : 'إلى'} ${reservation.step1.returnDate}`, fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      tarificationSectionTitle: { x: 50, y: 430, text: lang === 'fr' ? '📋 TARIFICATION' : '📋 التسعير', fontSize: 14, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'underline', textAlign: 'left', backgroundColor: 'transparent' },
      basePriceLabel: { x: 50, y: 465, text: lang === 'fr' ? 'Prix:' : 'السعر:', fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      basePrice: { x: 280, y: 465, text: `${subtotal.toLocaleString()} ${lang === 'fr' ? 'DA' : 'د.ج'}`, fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'right', backgroundColor: 'transparent' },
      cautionSectionTitle: { x: 50, y: 510, text: lang === 'fr' ? '🛡️ CAUTION' : '🛡️ الكفالة', fontSize: 14, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'underline', textAlign: 'left', backgroundColor: 'transparent' },
      cautionAmountLabel: { x: 50, y: 540, text: lang === 'fr' ? 'Montant:' : 'المبلغ:', fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      cautionAmount: { x: 280, y: 540, text: `${caution.toLocaleString()} ${lang === 'fr' ? 'DA' : 'د.ج'}`, fontSize: 12, fontFamily: 'Arial', color: '#cc6600', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'right', backgroundColor: 'transparent' },
      paymentSectionTitle: { x: 50, y: 585, text: lang === 'fr' ? '💳 PAIEMENT' : '💳 الدفع', fontSize: 14, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'underline', textAlign: 'left', backgroundColor: 'transparent' },
      totalLabel: { x: 50, y: 620, text: lang === 'fr' ? 'Total:' : 'الإجمالي:', fontSize: 13, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      totalAmount: { x: 280, y: 620, text: `${subtotal.toLocaleString()} ${lang === 'fr' ? 'DA' : 'د.ج'}`, fontSize: 13, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'right', backgroundColor: 'transparent' },
      paidLabel: { x: 50, y: 645, text: lang === 'fr' ? 'Payé:' : 'المدفوع:', fontSize: 13, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      paidAmount: { x: 280, y: 645, text: `${totalPaid.toLocaleString()} ${lang === 'fr' ? 'DA' : 'د.ج'}`, fontSize: 13, fontFamily: 'Arial', color: '#00aa00', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'right', backgroundColor: 'transparent' },
      remainingLabel: { x: 50, y: 670, text: lang === 'fr' ? 'Reste:' : 'المتبقي:', fontSize: 13, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      remainingAmount: { x: 280, y: 670, text: `${remaining.toLocaleString()} ${lang === 'fr' ? 'DA' : 'د.ج'}`, fontSize: 13, fontFamily: 'Arial', color: remaining > 0 ? '#cc0000' : '#00aa00', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'right', backgroundColor: 'transparent' },
      footerText: { x: 150, y: 720, text: lang === 'fr' ? 'Merci' : 'شكراً', fontSize: 12, fontFamily: 'Arial', color: '#666666', fontWeight: 'italic', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', backgroundColor: 'transparent' },
    };
  } else if (type === 'quote' || type === 'devis') {
    // Quote/Devis template - Improved design with colors and better organization
    return {
      ...baseElements,
      title: { x: 200, y: 50, text: lang === 'fr' ? 'DEVIS' : 'عرض أسعار', fontSize: 26, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', backgroundColor: 'transparent' },

      // Quote header with better styling - positioned below logo
      quoteNumber: { x: 50, y: 165, text: `${lang === 'fr' ? 'N° Devis:' : 'رقم عرض السعر:'} ${reservation.id}`, fontSize: 14, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      quoteDate: { x: 300, y: 165, text: `${lang === 'fr' ? 'Date:' : 'التاريخ:'} ${new Date().toLocaleDateString('fr-FR')}`, fontSize: 13, fontFamily: 'Arial', color: '#666666', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },

      // Vehicle Specifications Section - Blue theme
      vehicleSpecsTitle: { x: 50, y: 210, text: lang === 'fr' ? '🚗 SPÉCIFICATIONS DU VÉHICULE' : '🚗 مواصفات المركبة', fontSize: 13, fontFamily: 'Arial', color: '#FFFFFF', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: '#1a3a52', padding: '6px 8px' },
      
      vehicleBrandModelLabel: { x: 50, y: 240, text: lang === 'fr' ? 'Marque/Modèle:' : 'العلامة/الطراز:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      vehicleBrandModel: { x: 200, y: 240, text: `${reservation.car.brand} ${reservation.car.model}`, fontSize: 12, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      
      vehicleCodeLabel: { x: 50, y: 263, text: lang === 'fr' ? 'Code Véhicule:' : 'رمز المركبة:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      vehicleCode: { x: 200, y: 263, text: `${reservation.id.substring(0, 5)}`, fontSize: 12, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      
      vehicleRegistrationLabel: { x: 50, y: 286, text: lang === 'fr' ? 'Immatricule:' : 'لوحة الترخيص:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      vehicleRegistration: { x: 200, y: 286, text: reservation.car.registration || 'N/A', fontSize: 12, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      
      vehicleColorLabel: { x: 50, y: 309, text: lang === 'fr' ? 'Couleur:' : 'اللون:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      vehicleColor: { x: 200, y: 309, text: reservation.car.color || 'N/A', fontSize: 12, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      
      vehicleClassLabel: { x: 50, y: 332, text: lang === 'fr' ? 'Classe:' : 'الفئة:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      vehicleClass: { x: 200, y: 332, text: lang === 'fr' ? 'Véhicule Touristique' : 'مركبة سياحية', fontSize: 12, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      
      vehicleCharacteristicsLabel: { x: 50, y: 355, text: lang === 'fr' ? 'Caractéristiques:' : 'الخصائص:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      vehicleCharacteristics: { x: 200, y: 355, text: reservation.car.energy || 'N/A', fontSize: 12, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      
      fuelTypeLabel: { x: 50, y: 378, text: lang === 'fr' ? 'Carburant:' : 'الوقود:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      fuelType: { x: 200, y: 378, text: reservation.car.energy === 'Essence' ? (lang === 'fr' ? 'Sans plomb' : 'بدون رصاص') : reservation.car.energy, fontSize: 12, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      
      currentMileageLabel: { x: 50, y: 401, text: lang === 'fr' ? 'Kilométrage:' : 'الكيلومتراج:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      currentMileage: { x: 200, y: 401, text: `${reservation.car.mileage || 'N/A'} km`, fontSize: 12, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      
      serialNumberLabel: { x: 50, y: 424, text: lang === 'fr' ? 'N° Série:' : 'رقم السلسلة:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      serialNumber: { x: 200, y: 424, text: reservation.car.vin || 'N/A', fontSize: 12, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },

      // Rental Conditions and Pricing Section - Green theme
      rentalConditionsTitle: { x: 50, y: 465, text: lang === 'fr' ? '📋 CONDITIONS DE LOCATION & TARIFICATION' : '📋 شروط التأجير والتسعير', fontSize: 13, fontFamily: 'Arial', color: '#FFFFFF', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: '#2d7a4d' },
      
      dailyPriceLabel: { x: 50, y: 495, text: lang === 'fr' ? 'Prix Journalier:' : 'السعر اليومي:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      dailyPrice: { x: 280, y: 495, text: `${reservation.car.priceDay?.toLocaleString() || '7000,00'} DA`, fontSize: 12, fontFamily: 'Arial', color: '#2d7a4d', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'right', backgroundColor: 'transparent' },
      
      numberOfDaysLabel: { x: 50, y: 518, text: lang === 'fr' ? 'Nombre de Jours:' : 'عدد الأيام:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      numberOfDays: { x: 280, y: 518, text: `${reservation.totalDays} ${lang === 'fr' ? 'jour(s)' : 'يوم'}`, fontSize: 12, fontFamily: 'Arial', color: '#2d7a4d', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'right', backgroundColor: 'transparent' },
      
      rentalPeriodLabel: { x: 50, y: 541, text: lang === 'fr' ? 'Période:' : 'الفترة:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      rentalPeriod: { x: 280, y: 541, text: `${reservation.step1.departureDate} → ${reservation.step1.returnDate}`, fontSize: 11, fontFamily: 'Arial', color: '#666666', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'right', backgroundColor: 'transparent' },
      
      totalHTLabel: { x: 50, y: 570, text: lang === 'fr' ? 'Sous-Total:' : 'الإجمالي الجزئي:', fontSize: 13, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      totalHT: { x: 280, y: 570, text: `${reservation.totalPrice.toLocaleString()} DA`, fontSize: 13, fontFamily: 'Arial', color: '#2d7a4d', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'right', backgroundColor: 'transparent' },
      
      totalTTCLabel: { x: 50, y: 595, text: lang === 'fr' ? 'Montant Total:' : 'المبلغ الإجمالي:', fontSize: 14, fontFamily: 'Arial', color: '#FFFFFF', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: '#2d7a4d' },
      totalTTC: { x: 280, y: 595, text: `${reservation.totalPrice.toLocaleString()} DA`, fontSize: 14, fontFamily: 'Arial', color: '#FFFFFF', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'right', backgroundColor: '#2d7a4d' },
      
      numberOfVehiclesLabel: { x: 50, y: 630, text: lang === 'fr' ? 'Nombre de Véhicules:' : 'عدد المركبات:', fontSize: 12, fontFamily: 'Arial', color: '#1a3a52', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      numberOfVehicles: { x: 280, y: 630, text: '01', fontSize: 12, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'right', backgroundColor: 'transparent' },

      // Equipment and Accessories Checklist - Orange theme
      checklistTitle: { x: 50, y: 670, text: lang === 'fr' ? '✓ ÉQUIPEMENTS & ACCESSOIRES' : '✓ المعدات والملحقات', fontSize: 13, fontFamily: 'Arial', color: '#FFFFFF', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: '#cc6600' },
      checklistItems: { x: 50, y: 700, text: reservation.departureInspection?.inspectionItems?.map(item =>
        `${item.name}: ${item.checked ? '✓' : '✗'}`
      ).join('\n') || 'Roues de secours: ✓\nTriangle de signalisation: ✓\nCric: ✓\nClé de roue: ✓\nExtincteur: ✓\nCeintures de sécurité: ✓\nFeux de route: ✓\nPneus: ✓\nFreins: ✓\nClimatisation: ✓\nIntérieur propre: ✓', fontSize: 11, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },

      // Signatures
      agencySignatureText: { x: 50, y: 905, text: lang === 'fr' ? 'Signature et cachet de l\'Agence' : 'توقيع وختم الوكالة', fontSize: 11, fontFamily: 'Arial', color: '#666666', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      clientSignatureText: { x: 300, y: 905, text: lang === 'fr' ? 'Signature du Client' : 'توقيع العميل', fontSize: 11, fontFamily: 'Arial', color: '#666666', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
    };
  } else if (type === 'contract') {
    // Contract template - Load from database, fallback to default
    // Note: This returns a basic structure; the actual template from database will be loaded in the component
    return {
      logo: { x: 50, y: 50, width: 90, height: 90 },
      title: { x: 50, y: 160, text: 'Contrat de Location / عقد الإيجار', fontSize: 22, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', backgroundColor: 'transparent' },
      client_name: { x: 80, y: 140, text: `${reservation.client.firstName} ${reservation.client.lastName}`, fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      car_model: { x: 80, y: 180, text: `${reservation.car.brand} ${reservation.car.model}`, fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      rental_dates: { x: 80, y: 220, text: `${reservation.step1.departureDate} - ${reservation.step1.returnDate}`, fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      price_total: { x: 80, y: 260, text: `${reservation.totalPrice.toLocaleString()} DA`, fontSize: 14, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      signature_line: { x: 80, y: 450, text: '_________________________________', fontSize: 10, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
    };
  } else {
    // Engagement template - include logo and agency name with actual settings
    const isPassport = reservation.client.documentType === 'passport';
    const documentText = isPassport ? 'Avoir déposé mon passeport' : 'Avoir déposé ma carte d\'identité';
    const documentNumber = isPassport ? 
      (reservation.client.documentNumber || 'N/A') : 
      (reservation.client.idCardNumber || 'N/A');
    const documentDeliveryDate = isPassport ?
      (reservation.client.documentDeliveryDate || reservation.client.licenseDeliveryDate) :
      (reservation.client.licenseDeliveryDate || reservation.client.documentDeliveryDate);
    const documentDeliveryPlace = isPassport ?
      (reservation.client.documentDeliveryAddress || reservation.client.wilaya) :
      (reservation.client.licenseDeliveryPlace || reservation.client.wilaya);

    return {
      logo: { x: 50, y: 50, width: 100, height: 100 },
      agenceName: { x: 200, y: 100, text: 'LuxDrive Premium Car Rental', fontSize: 18, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      title: { x: 200, y: 50, text: 'Engagement', fontSize: 24, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      introText: { x: 50, y: 150, text: 'Je soussigne[e] Mrs/Mme:', fontSize: 16, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      clientName: { x: 250, y: 150, text: `${reservation.client.firstName} ${reservation.client.lastName}`, fontSize: 16, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      passportText: { x: 50, y: 200, text: documentText, fontSize: 16, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      passportNumber: { x: 50, y: 250, text: `N° ${documentNumber} Délivré le ${documentDeliveryDate ? new Date(documentDeliveryDate).toLocaleDateString('fr-FR') : 'N/A'} A ${documentDeliveryPlace || 'N/A'}`, fontSize: 14, fontFamily: 'Arial', color: '#666666', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      agenceText: { x: 50, y: 300, text: 'Au niveau de votre agence de location de voiture le', fontSize: 16, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      currentDate: { x: 50, y: 350, text: new Date().toLocaleDateString('fr-FR'), fontSize: 16, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      contractText: { x: 50, y: 400, text: `Contrat N° ${reservation.id}`, fontSize: 16, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      cautionText: { x: 50, y: 450, text: 'Comme caution pour location du véhicule', fontSize: 16, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      carInfo: { x: 50, y: 500, text: `Marque ${reservation.car.brand} ${reservation.car.model} Immatric ${reservation.car.registration}`, fontSize: 16, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      datesText: { x: 50, y: 550, text: `Du ${new Date(reservation.step1.departureDate).toLocaleDateString('fr-FR')} Au ${new Date(reservation.step1.returnDate).toLocaleDateString('fr-FR')}`, fontSize: 16, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      signatureText1: { x: 50, y: 600, text: 'Signature et cachet de l\'Agence', fontSize: 14, fontFamily: 'Arial', color: '#666666', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      signatureText2: { x: 300, y: 600, text: 'Signature de client', fontSize: 14, fontFamily: 'Arial', color: '#666666', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' }
    };
  }
};

// Utility function to generate personalized print content
const generatePersonalizedContent = (elements: any, newTextElements: any[], reservation: ReservationDetails, type: string, lang: Language = 'fr', agencySettings?: any) => {
  const renderElement = (key: string, elementData: any) => {
    if (!elementData) return '';
    const x = elementData.x ?? 0;
    const y = elementData.y ?? 0;
    const fontSize = elementData.fontSize ?? 12;
    const fontFamily = elementData.fontFamily ?? 'Arial';
    const color = elementData.color ?? '#000000';
    const fontWeight = elementData.fontWeight ?? 'normal';
    const fontStyle = elementData.fontStyle ?? 'normal';
    const textDecoration = elementData.textDecoration ?? 'none';
    const textAlign = elementData.textAlign ?? 'left';
    const backgroundColor = elementData.backgroundColor ?? 'transparent';
    const text = elementData.text ?? '';
    const maxWidth = elementData.maxWidth ? `max-width: ${elementData.maxWidth}px; word-wrap: break-word;` : '';
    
    return `<div class="draggable" style="position: absolute; left: ${x}px; top: ${y}px; font-size: ${fontSize}px; font-family: ${fontFamily}; color: ${color}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration}; text-align: ${textAlign}; background-color: ${backgroundColor}; ${backgroundColor !== 'transparent' ? 'padding: 4px 8px;' : ''} ${maxWidth}">
      ${text}
    </div>`;
  };

  let bodyContent = '';
  
  // Logo and Agency Name - use actual settings for engagement, payment, invoice, facture, quote, devis, contract, inspection types, always display logo
  if (type === 'engagement' || type === 'payment' || type === 'receipt' || type === 'invoice' || type === 'facture' || type === 'quote' || type === 'devis' || type === 'contract' || type === 'inspection') {
    // For engagement, payment, invoice, facture, contract, devis and inspection documents, use actual logo and agency name from settings
    if (elements.logo) {
      if (agencySettings?.logo) {
        bodyContent += `<div class="draggable logo" style="position: absolute; left: ${elements.logo.x || 50}px; top: ${elements.logo.y || 50}px; width: ${elements.logo.width || 100}px; height: ${elements.logo.height || 100}px;">
          <img src="${agencySettings.logo}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>`;
      } else {
        // Fallback placeholder logo
        bodyContent += `<div class="draggable logo" style="position: absolute; left: ${elements.logo.x || 50}px; top: ${elements.logo.y || 50}px; width: ${elements.logo.width || 100}px; height: ${elements.logo.height || 100}px;">
          <img src="https://via.placeholder.com/100x100/007bff/ffffff?text=AGENCY" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>`;
      }
    }
    
    bodyContent += renderElement('title', elements.title);
    
    if (elements.agenceName) {
      if (agencySettings?.name) {
        // Override the text with actual agency name
        const agenceElement = { ...elements.agenceName, text: agencySettings.name };
        bodyContent += renderElement('agenceName', agenceElement);
      } else {
        bodyContent += renderElement('agenceName', elements.agenceName);
      }
    }
  } else {
    // For other types, use the standard logo and agency name
    if (elements.logo) {
      bodyContent += `<div class="draggable logo" style="position: absolute; left: ${elements.logo.x || 50}px; top: ${elements.logo.y || 50}px; width: ${elements.logo.width || 100}px; height: ${elements.logo.height || 100}px;">
        <img src="https://via.placeholder.com/100x100/007bff/ffffff?text=AGENCY" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>`;
    }
    
    bodyContent += renderElement('title', elements.title);
    bodyContent += renderElement('agenceName', elements.agenceName);
  }

  // Type-specific content
  if (type === 'payment' || type === 'receipt') {
    // Receipt content
    bodyContent += renderElement('receiptNumber', elements.receiptNumber);
    bodyContent += renderElement('receiptDate', elements.receiptDate);
    bodyContent += renderElement('clientLabel', elements.clientLabel);
    bodyContent += renderElement('clientName', elements.clientName);
    bodyContent += renderElement('clientPhone', elements.clientPhone);
    bodyContent += renderElement('carLabel', elements.carLabel);
    bodyContent += renderElement('carInfo', elements.carInfo);
    bodyContent += renderElement('rentalPeriod', elements.rentalPeriod);
    bodyContent += renderElement('totalLabel', elements.totalLabel);
    bodyContent += renderElement('totalAmount', elements.totalAmount);
    bodyContent += renderElement('paidLabel', elements.paidLabel);
    bodyContent += renderElement('paidAmount', elements.paidAmount);
    bodyContent += renderElement('remainingLabel', elements.remainingLabel);
    bodyContent += renderElement('remainingAmount', elements.remainingAmount);
  } else if (type === 'versement') {
    // Versement (payment receipt) content - same as payment/receipt
    // Add logo
    if (elements.logo) {
      const logoUrl = agencySettings?.logo || 'https://via.placeholder.com/100x100/007bff/ffffff?text=AGENCY';
      bodyContent += `<div class="draggable logo" style="position: absolute; left: ${elements.logo.x || 50}px; top: ${elements.logo.y || 50}px; width: ${elements.logo.width || 100}px; height: ${elements.logo.height || 100}px;">
        <img src="${logoUrl}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>`;
    }
    
    // Add title
    bodyContent += renderElement('title', elements.title);
    
    // Add agency name
    if (elements.agenceName) {
      const agenceElement = agencySettings?.name ? { ...elements.agenceName, text: agencySettings.name } : elements.agenceName;
      bodyContent += renderElement('agenceName', agenceElement);
    }
    
    // Add a separator line
    bodyContent += `<div style="position: absolute; left: 50px; top: 180px; width: 500px; border-top: 2px solid #333333;"></div>`;
    
    // Add all receipt details
    bodyContent += renderElement('receiptNumber', elements.receiptNumber);
    bodyContent += renderElement('receiptDate', elements.receiptDate);
    bodyContent += renderElement('clientLabel', elements.clientLabel);
    bodyContent += renderElement('clientName', elements.clientName);
    bodyContent += renderElement('clientPhone', elements.clientPhone);
    bodyContent += renderElement('carLabel', elements.carLabel);
    bodyContent += renderElement('carInfo', elements.carInfo);
    bodyContent += renderElement('rentalPeriod', elements.rentalPeriod);
    
    // Add another separator before financial details
    bodyContent += `<div style="position: absolute; left: 50px; top: 365px; width: 500px; border-top: 2px solid #cccccc;"></div>`;
    
    // Add financial details with better styling
    bodyContent += renderElement('totalLabel', elements.totalLabel);
    bodyContent += renderElement('totalAmount', elements.totalAmount);
    bodyContent += renderElement('paidLabel', elements.paidLabel);
    bodyContent += renderElement('paidAmount', elements.paidAmount);
    bodyContent += renderElement('remainingLabel', elements.remainingLabel);
    bodyContent += renderElement('remainingAmount', elements.remainingAmount);
  } else if (type === 'invoice' || type === 'facture') {
    // Invoice content
    bodyContent += renderElement('invoiceNumber', elements.invoiceNumber);
    bodyContent += renderElement('invoiceDate', elements.invoiceDate);

    // Client Information
    bodyContent += renderElement('clientSectionTitle', elements.clientSectionTitle);
    bodyContent += renderElement('clientNameLabel', elements.clientNameLabel);
    bodyContent += renderElement('clientName', elements.clientName);
    bodyContent += renderElement('clientPhoneLabel', elements.clientPhoneLabel);
    bodyContent += renderElement('clientPhone', elements.clientPhone);
    bodyContent += renderElement('clientAddressLabel', elements.clientAddressLabel);
    bodyContent += renderElement('clientAddress', elements.clientAddress);

    // Vehicle Information
    bodyContent += renderElement('vehicleSectionTitle', elements.vehicleSectionTitle);
    bodyContent += renderElement('vehicleBrandLabel', elements.vehicleBrandLabel);
    bodyContent += renderElement('vehicleInfo', elements.vehicleInfo);
    bodyContent += renderElement('vehicleRegLabel', elements.vehicleRegLabel);
    bodyContent += renderElement('vehicleReg', elements.vehicleReg);
    bodyContent += renderElement('rentalPeriodLabel', elements.rentalPeriodLabel);
    bodyContent += renderElement('rentalPeriod', elements.rentalPeriod);

    // Tarification Section
    bodyContent += renderElement('tarificationSectionTitle', elements.tarificationSectionTitle);
    bodyContent += renderElement('basePriceLabel', elements.basePriceLabel);
    bodyContent += renderElement('basePrice', elements.basePrice);

    // Caution Section
    bodyContent += renderElement('cautionSectionTitle', elements.cautionSectionTitle);
    bodyContent += renderElement('cautionAmountLabel', elements.cautionAmountLabel);
    bodyContent += renderElement('cautionAmount', elements.cautionAmount);

    // Payment Information
    bodyContent += renderElement('paymentSectionTitle', elements.paymentSectionTitle);
    bodyContent += renderElement('totalLabel', elements.totalLabel);
    bodyContent += renderElement('totalAmount', elements.totalAmount);
    bodyContent += renderElement('paidLabel', elements.paidLabel);
    bodyContent += renderElement('paidAmount', elements.paidAmount);
    bodyContent += renderElement('remainingLabel', elements.remainingLabel);
    bodyContent += renderElement('remainingAmount', elements.remainingAmount);

    // Footer
    bodyContent += renderElement('footerText', elements.footerText);
  } else if (type === 'quote' || type === 'devis') {
    // Quote/Devis content
    bodyContent += renderElement('quoteNumber', elements.quoteNumber);
    bodyContent += renderElement('quoteDate', elements.quoteDate);

    // Vehicle Specifications
    bodyContent += renderElement('vehicleSpecsTitle', elements.vehicleSpecsTitle);
    bodyContent += renderElement('vehicleBrandModelLabel', elements.vehicleBrandModelLabel);
    bodyContent += renderElement('vehicleBrandModel', elements.vehicleBrandModel);
    bodyContent += renderElement('vehicleCodeLabel', elements.vehicleCodeLabel);
    bodyContent += renderElement('vehicleCode', elements.vehicleCode);
    bodyContent += renderElement('vehicleRegistrationLabel', elements.vehicleRegistrationLabel);
    bodyContent += renderElement('vehicleRegistration', elements.vehicleRegistration);
    bodyContent += renderElement('vehicleColorLabel', elements.vehicleColorLabel);
    bodyContent += renderElement('vehicleColor', elements.vehicleColor);
    bodyContent += renderElement('vehicleClassLabel', elements.vehicleClassLabel);
    bodyContent += renderElement('vehicleClass', elements.vehicleClass);
    bodyContent += renderElement('vehicleCharacteristicsLabel', elements.vehicleCharacteristicsLabel);
    bodyContent += renderElement('vehicleCharacteristics', elements.vehicleCharacteristics);
    bodyContent += renderElement('fuelTypeLabel', elements.fuelTypeLabel);
    bodyContent += renderElement('fuelType', elements.fuelType);
    bodyContent += renderElement('currentMileageLabel', elements.currentMileageLabel);
    bodyContent += renderElement('currentMileage', elements.currentMileage);
    bodyContent += renderElement('serialNumberLabel', elements.serialNumberLabel);
    bodyContent += renderElement('serialNumber', elements.serialNumber);

    // Rental Conditions and Pricing
    bodyContent += renderElement('rentalConditionsTitle', elements.rentalConditionsTitle);
    bodyContent += renderElement('dailyPriceLabel', elements.dailyPriceLabel);
    bodyContent += renderElement('dailyPrice', elements.dailyPrice);
    bodyContent += renderElement('numberOfDaysLabel', elements.numberOfDaysLabel);
    bodyContent += renderElement('numberOfDays', elements.numberOfDays);
    bodyContent += renderElement('rentalPeriodLabel', elements.rentalPeriodLabel);
    bodyContent += renderElement('rentalPeriod', elements.rentalPeriod);
    bodyContent += renderElement('totalHTLabel', elements.totalHTLabel);
    bodyContent += renderElement('totalHT', elements.totalHT);
    bodyContent += renderElement('totalTTCLabel', elements.totalTTCLabel);
    bodyContent += renderElement('totalTTC', elements.totalTTC);
    bodyContent += renderElement('numberOfVehiclesLabel', elements.numberOfVehiclesLabel);
    bodyContent += renderElement('numberOfVehicles', elements.numberOfVehicles);

    // Equipment and Accessories Checklist
    bodyContent += renderElement('checklistTitle', elements.checklistTitle);
    bodyContent += renderElement('checklistItems', elements.checklistItems);

    // Signatures
    bodyContent += renderElement('agencySignatureText', elements.agencySignatureText);
    bodyContent += renderElement('clientSignatureText', elements.clientSignatureText);
  } else if (type === 'contract') {
    // Contract content - Professional format with logo like devis
    // Add logo
    if (elements.logo && agencySettings?.logo) {
      bodyContent += `<div class="draggable logo" style="position: absolute; left: ${elements.logo.x || 50}px; top: ${elements.logo.y || 50}px; width: ${elements.logo.width || 90}px; height: ${elements.logo.height || 90}px;">
        <img src="${agencySettings.logo}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>`;
    }
    
    // Add agency name
    if (elements.agenceName) {
      const agenceElement = agencySettings?.name ? { ...elements.agenceName, text: agencySettings.name } : elements.agenceName;
      bodyContent += renderElement('agenceName', agenceElement);
    }
    
    // Main Title
    bodyContent += renderElement('title', elements.title);
    
    // Contract Details Section
    bodyContent += renderElement('contractDetailsTitle', elements.contractDetailsTitle);
    bodyContent += renderElement('contractNumberLabel', elements.contractNumberLabel);
    bodyContent += renderElement('contractNumber', elements.contractNumber);
    bodyContent += renderElement('contractDateLabel', elements.contractDateLabel);
    bodyContent += renderElement('contractDate', elements.contractDate);
    
    // Rental Period Section
    bodyContent += renderElement('rentalPeriodTitle', elements.rentalPeriodTitle);
    bodyContent += renderElement('startDateLabel', elements.startDateLabel);
    bodyContent += renderElement('startDate', elements.startDate);
    bodyContent += renderElement('endDateLabel', elements.endDateLabel);
    bodyContent += renderElement('endDate', elements.endDate);
    bodyContent += renderElement('durationLabel', elements.durationLabel);
    bodyContent += renderElement('duration', elements.duration);
    
    // Driver Information Section
    bodyContent += renderElement('driverInfoTitle', elements.driverInfoTitle);
    bodyContent += renderElement('driverNameLabel', elements.driverNameLabel);
    bodyContent += renderElement('driverName', elements.driverName);
    bodyContent += renderElement('driverBirthDateLabel', elements.driverBirthDateLabel);
    bodyContent += renderElement('driverBirthDate', elements.driverBirthDate);
    bodyContent += renderElement('placeOfBirthLabel', elements.placeOfBirthLabel);
    bodyContent += renderElement('placeOfBirth', elements.placeOfBirth);
    bodyContent += renderElement('documentTypeLabel', elements.documentTypeLabel);
    bodyContent += renderElement('documentType', elements.documentType);
    bodyContent += renderElement('documentNumberLabel', elements.documentNumberLabel);
    bodyContent += renderElement('documentNumber', elements.documentNumber);
    bodyContent += renderElement('issueeDateLabel', elements.issueeDateLabel);
    bodyContent += renderElement('issueDate', elements.issueDate);
    bodyContent += renderElement('expirationDateLabel', elements.expirationDateLabel);
    bodyContent += renderElement('expirationDate', elements.expirationDate);
    bodyContent += renderElement('placeOfIssueLabel', elements.placeOfIssueLabel);
    bodyContent += renderElement('placeOfIssue', elements.placeOfIssue);
    
    // Vehicle Information Section
    bodyContent += renderElement('vehicleInfoTitle', elements.vehicleInfoTitle);
    bodyContent += renderElement('vehicleModelLabel', elements.vehicleModelLabel);
    bodyContent += renderElement('vehicleModel', elements.vehicleModel);
    bodyContent += renderElement('vehicleColorLabel', elements.vehicleColorLabel);
    bodyContent += renderElement('vehicleColor', elements.vehicleColor);
    bodyContent += renderElement('vehiclePlateLabel', elements.vehiclePlateLabel);
    bodyContent += renderElement('vehiclePlate', elements.vehiclePlate);
    bodyContent += renderElement('vehicleVINLabel', elements.vehicleVINLabel);
    bodyContent += renderElement('vehicleVIN', elements.vehicleVIN);
    bodyContent += renderElement('vehicleFuelLabel', elements.vehicleFuelLabel);
    bodyContent += renderElement('vehicleFuel', elements.vehicleFuel);
    bodyContent += renderElement('vehicleMileageLabel', elements.vehicleMileageLabel);
    bodyContent += renderElement('vehicleMileage', elements.vehicleMileage);
    
    // Financials Section
    bodyContent += renderElement('financialsTitle', elements.financialsTitle);
    bodyContent += renderElement('unitPriceLabel', elements.unitPriceLabel);
    bodyContent += renderElement('unitPrice', elements.unitPrice);
    bodyContent += renderElement('totalHTLabel', elements.totalHTLabel);
    bodyContent += renderElement('totalHT', elements.totalHT);
    bodyContent += renderElement('totalAmountLabel', elements.totalAmountLabel);
    bodyContent += renderElement('totalAmount', elements.totalAmount);
    
    // Equipment Checklist Section
    bodyContent += renderElement('equipmentTitle', elements.equipmentTitle);
    bodyContent += renderElement('equipment1', elements.equipment1);
    bodyContent += renderElement('equipment2', elements.equipment2);
    bodyContent += renderElement('equipment3', elements.equipment3);
    bodyContent += renderElement('equipment4', elements.equipment4);
    bodyContent += renderElement('equipment5', elements.equipment5);
    bodyContent += renderElement('equipment6', elements.equipment6);
    bodyContent += renderElement('equipment7', elements.equipment7);
    bodyContent += renderElement('equipment8', elements.equipment8);
    
    // Signatures
    bodyContent += renderElement('agencySignatureText', elements.agencySignatureText);
    bodyContent += renderElement('clientSignatureText', elements.clientSignatureText);
    bodyContent += renderElement('dateSignatureText', elements.dateSignatureText);
  } else {
    // Engagement content
    bodyContent += renderElement('introText', elements.introText);
    bodyContent += renderElement('clientName', elements.clientName);
    bodyContent += renderElement('passportText', elements.passportText);
    bodyContent += renderElement('passportNumber', elements.passportNumber);
    bodyContent += renderElement('agenceText', elements.agenceText);
    bodyContent += renderElement('currentDate', elements.currentDate);
    bodyContent += renderElement('contractText', elements.contractText);
    bodyContent += renderElement('cautionText', elements.cautionText);
    bodyContent += renderElement('carInfo', elements.carInfo);
    bodyContent += renderElement('datesText', elements.datesText);
  }

  // Signatures (common to all)
  bodyContent += renderElement('signatureText1', elements.signatureText1);
  bodyContent += renderElement('signatureText2', elements.signatureText2);

  // New text elements
  newTextElements.forEach((element) => {
    bodyContent += `<div class="draggable" style="position: absolute; left: ${element.x}px; top: ${element.y}px; font-size: ${element.fontSize}px; font-family: ${element.fontFamily}; color: ${element.color}; font-weight: ${element.fontWeight}; font-style: ${element.fontStyle}; text-decoration: ${element.textDecoration}; text-align: ${element.textAlign}; background-color: ${element.backgroundColor}; ${element.backgroundColor !== 'transparent' ? 'padding: 4px 8px;' : ''}">
      ${element.text}
    </div>`;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          padding: 30px 40px; 
          position: relative; 
          min-height: 1000px;
          background: #f5f5f5;
        }
        .page {
          width: 210mm;
          min-height: 297mm;
          background: white;
          padding: 20px;
          margin: 0 auto 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .draggable { 
          position: absolute; 
          cursor: move;
          max-width: 600px;
          word-wrap: break-word;
        }
        .selected { border: 2px solid #007bff; }
        .logo { border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
        
        /* Print specific styles */
        @media print {
          body {
            padding: 0;
            background: white;
          }
          .page {
            box-shadow: none;
            margin: 0;
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        ${bodyContent}
      </div>
    </body>
    </html>
  `;
};

// ── PayDebtModal ──────────────────────────────────────────────────────────────
const PayDebtModal: React.FC<{
  lang: Language;
  reservation: ReservationDetails;
  onClose: () => void;
  onSave: (reservationId: string, amount: number, method: 'cash' | 'card' | 'transfer' | 'check', note: string, newRemaining: number) => Promise<void>;
}> = ({ lang, reservation, onClose, onSave }) => {
  const totalPrice = Number(reservation.totalPrice) || 0;
  const existingPaid = (reservation.payments && reservation.payments.length > 0)
    ? reservation.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    : (Number(reservation.advancePayment) || 0);
  const currentRemaining = Math.max(0, totalPrice - existingPaid);

  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer' | 'check'>('cash');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const amountNum = Math.max(0, Math.min(Number(amount) || 0, currentRemaining));
  const newRemaining = Math.max(0, currentRemaining - amountNum);
  const pctPaid = totalPrice > 0 ? Math.min(100, Math.round(((existingPaid + amountNum) / totalPrice) * 100)) : 100;

  const handleSave = async () => {
    if (!amountNum || amountNum <= 0) return;
    setIsSaving(true);
    try {
      await onSave(reservation.id, amountNum, method, note, newRemaining);
    } catch {
      // Error already surfaced by the parent onSave handler; keep modal open.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                💰 {lang === 'fr' ? 'Enregistrer un paiement' : 'تسجيل دفعة'}
              </h2>
              <p className="text-emerald-100 text-xs mt-0.5 font-medium">
                {reservation.client?.firstName} {reservation.client?.lastName} · {reservation.car?.brand} {reservation.car?.model}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Financial Summary */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">{lang === 'fr' ? 'Total réservation' : 'إجمالي الحجز'}</span>
                <span className="font-black text-slate-900">{totalPrice.toLocaleString()} {lang === 'fr' ? 'DA' : 'د.ج'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">{lang === 'fr' ? 'Déjà payé' : 'مدفوع مسبقاً'}</span>
                <span className="font-bold text-emerald-600">{existingPaid.toLocaleString()} {lang === 'fr' ? 'DA' : 'د.ج'}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                <span className="text-red-500 font-bold">{lang === 'fr' ? 'Reste actuel' : 'المتبقي الحالي'}</span>
                <span className="font-black text-red-600">{currentRemaining.toLocaleString()} {lang === 'fr' ? 'DA' : 'د.ج'}</span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                {lang === 'fr' ? 'Montant à payer' : 'المبلغ للدفع'} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={currentRemaining}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`Max: ${currentRemaining.toLocaleString()} DA`}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  onClick={() => setAmount(String(currentRemaining))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg"
                >
                  {lang === 'fr' ? 'Tout' : 'الكل'}
                </button>
              </div>
            </div>

            {/* New Remaining Preview */}
            {amountNum > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4 space-y-2"
              >
                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctPaid}%` }}
                    className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500"
                  />
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-700">{lang === 'fr' ? 'Payé après' : 'بعد الدفع'}: {(existingPaid + amountNum).toLocaleString()} DA ({pctPaid}%)</span>
                  <span className={newRemaining === 0 ? 'text-emerald-600' : 'text-amber-600'}>
                    {lang === 'fr' ? 'Nouveau reste' : 'المتبقي الجديد'}: {newRemaining.toLocaleString()} DA
                  </span>
                </div>
                {newRemaining === 0 && (
                  <p className="text-emerald-700 font-bold text-xs text-center">
                    ✅ {lang === 'fr' ? 'Réservation entièrement soldée !' : 'تم سداد الحجز بالكامل!'}
                  </p>
                )}
              </motion.div>
            )}

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                {lang === 'fr' ? 'Note (optionnel)' : 'ملاحظة (اختياري)'}
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={lang === 'fr' ? 'Ex: versement partiel...' : 'مثال: دفع جزئي...'}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                {lang === 'fr' ? 'Annuler' : 'إلغاء'}
              </button>
              <button
                onClick={handleSave}
                disabled={!amountNum || amountNum <= 0 || isSaving}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {lang === 'fr' ? 'Enregistrement...' : 'جاري الحفظ...'}</>
                ) : (
                  <>✅ {lang === 'fr' ? 'Enregistrer' : 'حفظ'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

// Personalization Modal Component — exported so ReservationsPage can reuse it
export const PersonalizationModal: React.FC<{
  lang: Language;
  reservation: ReservationDetails;
  type: string;
  onClose: () => void;
  onPrint: (content: string) => void;
}> = ({ lang, reservation, type, onClose, onPrint }) => {
  const [agencySettings, setAgencySettings] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'fr' | 'ar'>('ar');
  const [secondConductor, setSecondConductor] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  // Société (company client) state
  const [isSociete, setIsSociete] = useState(false);
  const [societeData, setSocieteData] = useState({
    conducteur: '',
    rc: '',
    art: '',
    nis: '',
    nif: '',
    email: '',
  });

  useEffect(() => {
    loadAgencySettings();
  }, []);

  const searchClients = async (query: string) => {
    console.log('🔍 Searching for:', query);
    
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    try {
      // Fetch all clients with correct snake_case column names
      const { data: allClients, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone, email, license_number, date_of_birth, place_of_birth')
        .limit(200);
      
      if (error) {
        console.error('❌ Error fetching clients:', error);
        // Try with wildcard select as fallback
        try {
          const { data: fallbackClients, error: fallbackError } = await supabase
            .from('clients')
            .select('*')
            .limit(200);
          
          if (fallbackError) {
            console.error('❌ Fallback error:', fallbackError);
            setSearchResults([]);
            setShowSearchResults(true);
            return;
          }
          
          // Process fallback results
          const searchLower = query.toLowerCase().trim();
          const filtered = (fallbackClients || []).filter(client => {
            const firstName = client.first_name ? client.first_name.toLowerCase() : (client.firstName ? client.firstName.toLowerCase() : '');
            const lastName = client.last_name ? client.last_name.toLowerCase() : (client.lastName ? client.lastName.toLowerCase() : '');
            const phone = client.phone ? client.phone.toLowerCase() : '';
            
            const matchesFirstName = firstName.includes(searchLower);
            const matchesLastName = lastName.includes(searchLower);
            const matchesPhone = phone.includes(searchLower);
            
            const notCurrentClient = client.id !== reservation?.client?.id;
            const matches = (matchesFirstName || matchesLastName || matchesPhone) && notCurrentClient;
            
            if (matches) {
              console.log('✅ Found match:', `${firstName} ${lastName}`);
            }
            
            return matches;
          });
          
          console.log('🎯 Filtered results (fallback):', filtered.length);
          setSearchResults(filtered.slice(0, 15));
          setShowSearchResults(true);
        } catch (fallbackException) {
          console.error('❌ Fallback exception:', fallbackException);
          setSearchResults([]);
          setShowSearchResults(true);
        }
        return;
      }

      console.log('📋 Total clients fetched:', allClients?.length);

      // Filter clients by matching first_name, last_name, or phone
      const searchLower = query.toLowerCase().trim();
      const filtered = (allClients || []).filter(client => {
        // Handle both snake_case and camelCase (in case DB has mixed naming)
        const firstName = client.first_name ? client.first_name.toLowerCase() : (client.firstName ? client.firstName.toLowerCase() : '');
        const lastName = client.last_name ? client.last_name.toLowerCase() : (client.lastName ? client.lastName.toLowerCase() : '');
        const phone = client.phone ? client.phone.toLowerCase() : '';
        
        const matchesFirstName = firstName.includes(searchLower);
        const matchesLastName = lastName.includes(searchLower);
        const matchesPhone = phone.includes(searchLower);
        
        // Exclude the current client
        const notCurrentClient = client.id !== reservation?.client?.id;
        
        const matches = (matchesFirstName || matchesLastName || matchesPhone) && notCurrentClient;
        
        if (matches) {
          console.log('✅ Found match:', `${firstName} ${lastName}`);
        }
        
        return matches;
      });

      console.log('🎯 Filtered results:', filtered.length);
      setSearchResults(filtered.slice(0, 15)); // Limit to 15 results
      setShowSearchResults(true);
    } catch (error) {
      console.error('❌ Exception during search:', error);
      setSearchResults([]);
      setShowSearchResults(true);
    }
  };

  const selectSecondConductor = (client: any) => {
    setSecondConductor(client);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Create a brand-new client (same flow as the reservation interface) and
  // automatically select it as the second conductor.
  const handleSaveSecondConductor = async (clientData: Partial<Client>): Promise<void> => {
    try {
      const created = await DatabaseService.createClient(clientData as Omit<Client, 'id' | 'createdAt'>);
      setSecondConductor(created);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      setIsClientModalOpen(false);
    } catch (err) {
      console.error('Error creating second conductor:', err);
      throw new Error(lang === 'fr' ? "Erreur lors de l'enregistrement" : 'خطأ في الحفظ');
    }
  };

  const loadAgencySettings = async () => {
    // Show cached settings immediately (logo already inlined as a data URI)
    // so the header never renders empty while the network request runs.
    try {
      const cached = localStorage.getItem(AGENCY_SETTINGS_CACHE_KEY);
      if (cached) {
        setAgencySettings(JSON.parse(cached));
      }
    } catch {
      /* corrupt cache — ignore, fresh fetch below overwrites it */
    }
    try {
      const { data: settings } = await supabase
        .from('website_settings')
        .select('logo, name, address, phone, phone_number_2, bank_number')
        .limit(1)
        .single();
      if (settings) {
        // Inline the logo as a data URI so print windows and previews render
        // it instantly instead of re-downloading it on every open.
        let logo = settings.logo;
        if (logo && !String(logo).startsWith('data:')) {
          try {
            const response = await fetch(logo);
            const blob = await response.blob();
            logo = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch {
            /* CORS/network failure — keep the original URL */
          }
        }
        const fullSettings = { ...settings, logo };
        setAgencySettings(fullSettings);
        try {
          localStorage.setItem(AGENCY_SETTINGS_CACHE_KEY, JSON.stringify(fullSettings));
        } catch {
          /* quota exceeded — cache is an optimization only */
        }
      }
    } catch (error) {
      console.error('❌ Error loading agency settings:', error);
    }
  };

  const generateContractHTML = (templateLang: 'fr' | 'ar'): string => {
    const isFrench = templateLang === 'fr';
    const textDir = isFrench ? 'ltr' : 'rtl';
    
    const labels = {
      contractTitle: isFrench ? 'Contrat de Location' : 'عقد كراء السيارة',
      contractDate: isFrench ? 'Date du Contrat' : 'تاريخ العقد',
      contractNumber: isFrench ? 'N° de Contrat' : 'رقم العقد',
      client: isFrench ? 'Client' : 'العميل',
      createdBy: isFrench ? 'Établi par' : 'أنشئ بواسطة',
      rentalPeriod: isFrench ? 'Période de Location' : 'فترة الإيجار',
      departure: isFrench ? 'Départ' : 'المغادرة',
      return: isFrench ? 'Retour' : 'العودة',
      duration: isFrench ? 'Durée' : 'المدة',
      days: isFrench ? 'jours' : 'أيام',
      driverInfo: isFrench ? 'Conducteur Principal' : 'السائق الرئيسي',
      secondDriver: isFrench ? 'Conducteur Secondaire' : 'السائق الثانوي',
      fullName: isFrench ? 'Nom Complet' : 'الاسم الكامل',
      birthDate: isFrench ? 'Date de Naissance' : 'تاريخ الميلاد',
      birthPlace: isFrench ? 'Lieu de Naissance' : 'مكان الميلاد',
      licenseNumber: isFrench ? 'Numéro de Permis' : 'رقم الرخصة',
      licenseDeliveryDate: isFrench ? 'Délivrance Permis' : 'تاريخ إصدار الرخصة',
      licenseExpirationDate: isFrench ? 'Expiration Permis' : 'تاريخ انتهاء الرخصة',
      licenseDeliveryPlace: isFrench ? 'Lieu Délivrance Permis' : 'مكان إصدار الرخصة',
      vehicleInfo: isFrench ? 'Informations du Véhicule' : 'معلومات المركبة',
      model: isFrench ? 'Modèle' : 'الموديل',
      registration: isFrench ? 'Immatriculation' : 'التسجيل',
      color: isFrench ? 'Couleur' : 'اللون',
      vin: isFrench ? 'N° de Série' : 'الرقم التسلسلي',
      type: isFrench ? 'Type' : 'النوع',
      mileage: isFrench ? 'Kilométrage' : 'الكيلومترات',
      kmPerDay: isFrench ? 'Kilométrage / Jour' : 'الكيلومترات في اليوم',
      pricing: isFrench ? 'Tarification' : 'التسعير',
      pricePerDay: isFrench ? 'Prix par Jour' : 'السعر في اليوم',
      numberOfDays: isFrench ? 'Nombre de Jours' : 'عدد الأيام',
      totalHT: isFrench ? 'Montant HT' : 'المبلغ غير ضريبي',
      tva: isFrench ? 'TVA 19%' : 'الضريبة 19%',
      totalTTC: isFrench ? 'TOTAL TTC' : 'الإجمالي',
      conditions: isFrench ? 'Conditions Acceptées' : 'الشروط المقبولة',
      signatures: isFrench ? 'Signatures' : 'التوقيعات',
      clientSignature: isFrench ? 'Signature du Client' : 'توقيع العميل',
      agencySignature: isFrench ? "Signature de l'Agence" : 'توقيع الوكالة',
      dateAndSignature: isFrench ? 'Date et signature' : 'التاريخ والتوقيع',
      statement: isFrench ? 'Déclaration du Locataire' : 'إقرار المستأجر',
      specialConditions: isFrench ? 'Conditions Spéciales' : 'الشروط الخاصة',
    };

    const alignStart = isFrench ? 'left' : 'right';

    const statementText = isFrench
      ? "Avant la prise en charge du véhicule, le locataire a inspecté la voiture à l'intérieur et à l'extérieur. Tout objet en sa possession durant la période de location qui serait contraire à la loi engage sa seule responsabilité et l'expose aux sanctions prévues par la loi."
      : 'قبل إستلام السيارة قام المستأجر بفحص السيارة من الداخل والخارج، وأي شيء يكون بحوزته في مدة إستئجارها يكون مخالفاً للقانون والعقوبات.';

    const specialConditions = isFrench
      ? [
          "1- Toute prolongation doit être signalée par le client 24 heures avant la date d'expiration du contrat de location.",
          '2- Interdiction de conduire le véhicule avec le carburant de réserve (réserve).',
          "3- Le renouvellement du contrat de location débute à la date d'expiration du contrat et relève de la responsabilité du client.",
          "4- Respecter l'heure de retour du véhicule à l'heure convenue."
        ]
      : [
          '1- كل تمديد يجب على الزبون الابلاغ قبل 24 ساعة من تاريخ انتهاء صلاحيات عقد الكراء',
          '2- عدم قيادة السيارة بوقود احتياطي (réserve)',
          '3- تجديد عقد الكراء يكون من تاريخ انتهاء العقد من مسؤولية الزبون',
          '4- احترام موعد دخول السيارة في الوقت المحدد'
        ];

    const hasSecondConductor = !!secondConductor;

    /**
     * There is a single contract design. Adding a secondary driver inserts one more section,
     * so the whole template is rendered at a uniform reduced scale instead of a different,
     * cramped layout — same proportions, same page frame, same signature placement, just
     * smaller, so it still prints on one A4 sheet.
     */
    const contentScale = hasSecondConductor ? 0.87 : 1;
    const px = (n: number): string => `${Math.round(n * contentScale * 100) / 100}px`;
    const baseFontSize = 18;
    const carImageUrl = reservation?.car?.images?.[0] || '';

    // Contract number: a 4-digit, zero-padded number (0001, 0002, …) derived
    // deterministically from the reservation id so the same contract always
    // prints the same number. Defaults to 0001 when no id is available.
    const contractNo = reservation?.id
      ? (Array.from(String(reservation.id)).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 10000, 0) || 1)
          .toString()
          .padStart(4, '0')
      : '0001';

    // Themed document font: traditional Naskh serif for Arabic (common on
    // Algerian official documents), formal serif for French.
    const docFontFamily = isFrench
      ? "'Marcellus', 'Cormorant Garamond', Georgia, serif"
      : "'Amiri', 'Aref Ruqaa', 'Traditional Arabic', serif";

    const html = `
    <!DOCTYPE html>
    <html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
    <head>
      <meta charset="UTF-8">
      <title>Contrat de Location</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Marcellus&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          line-height: 1.45;
          color: #222;
          background: white;
          direction: ${textDir};
          font-size: ${px(baseFontSize)};
        }
        .page {
          width: 210mm;
          height: 297mm;
          padding: 0.5mm 2.5mm 2.5mm;
          margin: 0 auto;
          background: white;
          display: flex;
          flex-direction: column;
          border: 2px solid #d1d5db;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .header {
          border-bottom: 3px solid #1a3a8a;
          padding-bottom: ${px(2)};
          margin-bottom: ${px(7)};
        }
        .header-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          direction: ltr;
          gap: 12px;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .logo {
          display: block;
          max-width: ${px(320)};
          max-height: ${px(156)};
          width: auto;
          height: auto;
          object-fit: contain;
        }
        .agency-name {
          font-size: ${px(31)};
          font-weight: 900;
          color: #1a3a8a;
          text-align: center;
          margin: 0 auto 2px;
          line-height: 1.12;
          letter-spacing: ${isFrench ? '2px' : '0.5px'};
          text-transform: uppercase;
          font-family: ${docFontFamily};
        }
        .agency-contact {
          font-size: ${px(14)};
          color: #1f2937;
          font-weight: 700;
          line-height: 1.5;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-align: right;
          gap: 3px;
          flex-shrink: 0;
          font-family: ${docFontFamily};
        }
        .agency-contact-item {
          margin: 0;
          white-space: nowrap;
        }
        .agency-contact-item strong {
          color: #1a3a8a;
        }
        .agency-contact-label {
          font-weight: 600;
          color: #1a3a8a;
          display: none;
        }
        .contract-title {
          font-size: ${px(28)};
          font-weight: 900;
          color: #1a3a8a;
          text-align: center;
          margin: 0;
          letter-spacing: ${isFrench ? '1px' : '0'};
          font-family: ${docFontFamily};
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: ${px(6)};
          font-size: ${px(13)};
          border: 1.5px solid #1a3a8a;
          border-radius: 6px;
          overflow: hidden;
        }
        .info-table td {
          padding: ${px(5)} ${px(9)};
          border: 1px solid #dbe2f0;
        }
        .info-table .it-label {
          background-color: #eef2fb;
          font-weight: 700;
          color: #1a3a8a;
          white-space: nowrap;
          width: 11%;
        }
        .info-table .it-value {
          color: #333;
          font-weight: 500;
        }
        .info-table .it-section {
          background-color: #1a3a8a;
          color: #fff;
          font-weight: 700;
          text-align: center;
          letter-spacing: 0.6px;
          font-size: ${px(13)};
          padding-top: ${px(4)};
          padding-bottom: ${px(4)};
        }
        .section {
          margin-bottom: ${px(4)};
          page-break-inside: avoid;
          padding: ${px(4)} ${px(5)};
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }
        .section.driver-section {
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
        }
        .section.vehicle-section {
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
        }
        .section.pricing-section {
          background-color: #fffbeb;
          border: 1px solid #fde68a;
        }
        .section.conditions-section {
          background-color: #eef2fb;
          border: 1px solid #c7d2ee;
        }
        .section.inspection-section {
          background-color: #eef2fb;
          border: 1px solid #c7d2ee;
        }
        .section.statement-section {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
        }
        .statement-text {
          font-size: ${px(14)};
          line-height: 1.6;
          color: #1f2937;
          text-align: justify;
          padding: 2px;
        }
        .section.special-section {
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
        }
        .special-title {
          color: #b91c1c !important;
        }
        .special-list {
          font-size: ${px(13)};
          line-height: 1.55;
          color: #b91c1c;
        }
        .special-item {
          margin: ${px(2)} 0;
        }
        /* Bottom grid: statement + special conditions on the left, car image on the right */
        .bottom-grid {
          display: grid;
          grid-template-columns: 1.65fr 1fr;
          gap: ${px(8)};
          margin-bottom: ${px(4)};
          align-items: stretch;
        }
        .bottom-left {
          display: flex;
          flex-direction: column;
          gap: ${px(8)};
          min-width: 0;
        }
        .bottom-left .section {
          margin-bottom: 0;
        }
        .statement-section.compact {
          padding: ${px(4)} ${px(6)};
        }
        .statement-section.compact .statement-text {
          font-size: ${px(12)};
          line-height: 1.4;
        }
        .car-photo-box {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #f8fafc;
          padding: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .car-photo {
          width: 100%;
          height: 100%;
          max-height: ${px(220)};
          object-fit: cover;
          border-radius: 4px;
        }
        .car-photo-label {
          font-size: ${px(11)};
          font-weight: 600;
          color: #64748b;
          text-align: center;
        }
        .section-title {
          font-size: ${px(13)};
          font-weight: 700;
          background-color: transparent;
          padding: ${px(3)} 0;
          margin-bottom: ${px(3)};
          color: #1a3a8a;
          letter-spacing: 0.3px;
        }
        .section-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: ${px(9)} ${px(7)};
          font-size: ${px(15)};
        }
        .section-content.full {
          grid-template-columns: 1fr 1fr 1fr;
        }
        .field {
          padding: ${px(2)} 0;
          border-bottom: 0.5px solid #ddd;
        }
        .field-label {
          font-weight: 600;
          color: #1a3a8a;
          font-size: ${px(14)};
        }
        .field-value {
          color: #444;
          margin-top: 0px;
          font-size: ${px(15)};
        }
        .pricing-table {
          width: 100%;
          margin-bottom: ${px(4)};
          font-size: ${px(15)};
          border-collapse: collapse;
        }
        .pricing-row {
          display: flex;
          justify-content: space-between;
          padding: ${px(2)} 0;
          border-bottom: 0.5px solid #ddd;
        }
        .pricing-row.total {
          border-top: 1px solid #222;
          font-weight: 600;
          margin-top: 1px;
          padding-top: ${px(2)};
        }
        .pricing-row.grand-total {
          font-size: ${px(14)};
          font-weight: 700;
          color: #1a3a8a;
          border-top: 2px solid #1a3a8a;
          padding-top: ${px(2)};
        }
        .conditions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: ${px(5)} ${px(6)};
          font-size: ${px(14)};
          margin-bottom: ${px(4)};
        }
        .condition-item {
          display: flex;
          align-items: center;
          gap: 3px;
          line-height: 1.25;
        }
        .checkbox {
          width: ${px(12)};
          height: ${px(12)};
          border: 1px solid #999;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: ${px(8)};
          flex-shrink: 0;
        }
        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: ${px(20)};
          margin-top: ${px(8)};
          font-size: ${px(14)};
          padding-top: ${px(4)};
        }
        .signature-block {
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin-bottom: ${px(2)};
          height: ${px(25)};
        }
        .signature-label {
          font-weight: 600;
          font-size: ${px(13)};
        }
        .date-sig {
          font-size: ${px(10)};
          color: #666;
          margin-top: 1px;
        }
        /* =============================================================
           PRINT STYLES - FIXES FOR A4 CENTERED LAYOUT
           Issues fixed:
           - Contract was shifted to the left
           - Not properly centered on page
           - Inconsistent margins
           - Frame did not align properly
           ============================================================= */
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          
          /* Reset for print */
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: white;
            overflow: hidden;
          }
          
          /* Center container on page */
          body { 
            margin: 0; 
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            overflow: hidden;
          }
          
          /* Perfect centering with margins. The page geometry is identical whether or not
             there is a second conductor — only the content inside is scaled (contentScale),
             so both variants fill the same sheet and print at the same size. */
          .page {
            margin: 0 auto;
            padding: 10mm;
            width: 190mm;
            min-height: 277mm;
            height: auto;
            box-sizing: border-box;
            border: 2px solid black;
            left: 0;
            right: 0;
            transform: scale(1.15);
            transform-origin: top center;
          }
          
          /* Ensure proper box sizing */
          *, *::before, *::after {
            box-sizing: border-box;
          }
          
          /* Hide non-contract elements */
          body > * {
            visibility: hidden;
          }
          
          .page, .page * {
            visibility: visible;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header: agency name, then logo + contract title + agency info row -->
        <div class="header">
          <h1 class="agency-name">${agencySettings?.name || 'AGENCY NAME'}</h1>
          <div class="header-row">
            <div class="header-brand">
              ${agencySettings?.logo ? `<img src="${agencySettings.logo}" alt="Logo" class="logo">` : ''}
            </div>
            <p class="contract-title">${labels.contractTitle}</p>
            <div class="agency-contact">
              ${agencySettings?.address ? `<span class="agency-contact-item">${agencySettings.address}</span>` : ''}
              ${agencySettings?.phone ? `<span class="agency-contact-item"><strong>walid</strong>: ${ltrPhone(agencySettings.phone)}</span>` : ''}
              ${agencySettings?.phone_number_2 ? `<span class="agency-contact-item"><strong>elias</strong>: ${ltrPhone(agencySettings.phone_number_2)}</span>` : ''}
              ${agencySettings?.bank_number ? `<span class="agency-contact-item">${isFrench ? 'Compte' : 'الحساب'}: ${agencySettings.bank_number}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Contract Info & Rental Period Table -->
        <table class="info-table">
          <tbody>
            <tr>
              <td class="it-label">${labels.contractDate}</td>
              <td class="it-value">${new Date().toLocaleDateString('en-US')}</td>
              <td class="it-label">${labels.contractNumber}</td>
              <td class="it-value">${contractNo}</td>
              <td class="it-label">${labels.createdBy}</td>
              <td class="it-value">${agencySettings?.name || 'N/A'}</td>
            </tr>
            <tr>
              <td class="it-section" colspan="6">${labels.rentalPeriod}</td>
            </tr>
            <tr>
              <td class="it-label">${labels.departure}</td>
              <td class="it-value">${new Date(reservation?.step1?.departureDate).toLocaleDateString('fr-FR')}</td>
              <td class="it-label">${labels.return}</td>
              <td class="it-value">${new Date(reservation?.step1?.returnDate).toLocaleDateString('fr-FR')}</td>
              <td class="it-label">${labels.duration}</td>
              <td class="it-value">${reservation?.totalDays || 0} ${labels.days}</td>
            </tr>
          </tbody>
        </table>

        <!-- Driver & Vehicle Info (2 columns) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: ${px(10)};">
          <!-- Driver Info -->
          <div class="section driver-section">
            <div class="section-title">${labels.driverInfo}</div>
            <div class="section-content">
              <div class="field">
                <div class="field-label">${labels.fullName}</div>
                <div class="field-value">${reservation?.client?.firstName} ${reservation?.client?.lastName}</div>
              </div>
              <div class="field">
                <div class="field-label">${labels.birthDate}</div>
                <div class="field-value">${new Date(reservation?.client?.dateOfBirth).toLocaleDateString('fr-FR')}</div>
              </div>
              <div class="field">
                <div class="field-label">${labels.birthPlace}</div>
                <div class="field-value">${reservation?.client?.placeOfBirth || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="field-label">${labels.licenseNumber}</div>
                <div class="field-value">${reservation?.client?.licenseNumber || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="field-label">${labels.licenseDeliveryDate}</div>
                <div class="field-value">${reservation?.client?.licenseDeliveryDate ? new Date(reservation.client.licenseDeliveryDate).toLocaleDateString('fr-FR') : 'dd/mm/yyyy'}</div>
              </div>
              <div class="field">
                <div class="field-label">${labels.licenseExpirationDate}</div>
                <div class="field-value">${reservation?.client?.licenseExpirationDate ? new Date(reservation.client.licenseExpirationDate).toLocaleDateString('fr-FR') : 'dd/mm/yyyy'}</div>
              </div>
              <div class="field">
                <div class="field-label">${labels.licenseDeliveryPlace}</div>
                <div class="field-value">${reservation?.client?.licenseDeliveryPlace || ''}</div>
              </div>
            </div>
          </div>

          <!-- Vehicle Info -->
          <div class="section vehicle-section">
            <div class="section-title">${labels.vehicleInfo}</div>
            <div class="section-content">
              <div class="field">
                <div class="field-label">${labels.model}</div>
                <div class="field-value">${ltr((reservation?.car?.brand || '') + ' ' + (reservation?.car?.model || ''))}</div>
              </div>
              <div class="field">
                <div class="field-label">${labels.registration}</div>
                <div class="field-value">${ltr(reservation?.car?.registration || 'N/A')}</div>
              </div>
              <div class="field">
                <div class="field-label">${labels.color}</div>
                <div class="field-value">${reservation?.car?.color || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="field-label">${labels.type}</div>
                <div class="field-value">${reservation?.car?.energy || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="field-label">${labels.vin}</div>
                <div class="field-value">${ltr(reservation?.car?.vin || 'N/A')}</div>
              </div>
              <div class="field">
                <div class="field-label">${labels.mileage}</div>
                <div class="field-value">${ltr((reservation?.departureInspection?.mileage || reservation?.car?.mileage || 'N/A') + ' km')}</div>
              </div>
              <div class="field">
                <div class="field-label">${labels.kmPerDay}</div>
                <div class="field-value">${ltr('300 km')}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Second Driver Section (if exists) -->
        ${secondConductor ? `
        <div class="section">
          <div class="section-title">${labels.secondDriver}</div>
          <div class="section-content full">
            <div class="field">
              <div class="field-label">${labels.fullName}</div>
              <div class="field-value">${(secondConductor?.first_name || secondConductor?.firstName)} ${(secondConductor?.last_name || secondConductor?.lastName)}</div>
            </div>
            <div class="field">
              <div class="field-label">${labels.licenseNumber}</div>
              <div class="field-value">${(secondConductor?.license_number || secondConductor?.licenseNumber) || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">${isFrench ? 'Téléphone' : 'الهاتف'}</div>
              <div class="field-value">${secondConductor?.phone ? ltrPhone(secondConductor.phone) : 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">${labels.birthDate}</div>
              <div class="field-value">${(secondConductor?.date_of_birth || secondConductor?.dateOfBirth) ? new Date(secondConductor?.date_of_birth || secondConductor?.dateOfBirth).toLocaleDateString('en-US') : 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">${labels.birthPlace}</div>
              <div class="field-value">${(secondConductor?.place_of_birth || secondConductor?.placeOfBirth) || 'N/A'}</div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Statement + Special Conditions (left) with Car Image (right) -->
        <div class="bottom-grid">
          <div class="bottom-left">
            <!-- Locataire Statement -->
            <div class="section statement-section compact">
              <div class="statement-text">${statementText}</div>
            </div>

            <!-- Special Conditions -->
            <div class="section special-section">
              <div class="section-title special-title">${labels.specialConditions}</div>
              <div class="special-list" style="direction: ${textDir}; text-align: ${alignStart};">
                ${specialConditions.map(c => `<div class="special-item">${c}</div>`).join('')}
              </div>
            </div>
          </div>

          <!-- Car Image -->
          <div class="car-photo-box">
            ${carImageUrl
              ? `<img src="${carImageUrl}" alt="${labels.vehicleInfo}" class="car-photo" referrerpolicy="no-referrer">`
              : `<span class="car-photo-label">${labels.vehicleInfo}</span>`}
          </div>
        </div>

        <!-- Signatures -->
        <div class="signatures" style="padding-top: ${px(10)}; border-top: 2px solid #1a3a8a;">
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">${labels.clientSignature}</div>
            <div class="date-sig">${labels.dateAndSignature}</div>
          </div>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">${labels.agencySignature}</div>
            <div class="date-sig">${labels.dateAndSignature}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
    return html;
  };

  const generateDevisHTML = (templateLang: 'fr' | 'ar'): string => {
    const isFrench = templateLang === 'fr';
    const textDir = isFrench ? 'ltr' : 'rtl';
    
    const labels = {
      devisTitle: isFrench ? 'DEVIS' : 'عرض أسعار',
      devisNumber: isFrench ? 'N° Devis' : 'رقم عرض السعر',
      date: isFrench ? 'Date' : 'التاريخ',
      client: isFrench ? 'Client' : 'العميل',
      vehicle: isFrench ? 'Véhicule' : 'المركبة',
      brand: isFrench ? 'Marques' : 'العلامات',
      registration: isFrench ? 'Immatriculation' : 'التسجيل',
      color: isFrench ? 'Couleur' : 'اللون',
      vehicleClass: isFrench ? 'Classe' : 'فئة',
      fuel: isFrench ? 'Carburant' : 'وقود',
      mileage: isFrench ? 'Kilométrage' : 'المسافة',
      vin: isFrench ? 'VIN' : 'VIN',
      inspection: isFrench ? 'Inspection' : 'الفحص',
      mats: isFrench ? 'Housses' : 'المقاعد',
      spareTire: isFrench ? 'Pneu Secours' : 'الإطار الاحتياطي',
      lights: isFrench ? 'Éclairage' : 'الأضواء',
      windshield: isFrench ? 'Pare-brise' : 'الزجاج',
      wheels: isFrench ? 'Jantes' : 'العجلات',
      suspension: isFrench ? 'Suspension' : 'التعليق',
      rentalPeriod: isFrench ? 'Période de Location' : 'فترة الإيجار',
      from: isFrench ? 'Du' : 'من',
      to: isFrench ? 'Au' : 'إلى',
      days: isFrench ? 'Jours' : 'أيام',
      amount: isFrench ? 'Montant HT' : 'المبلغ',
      tva: isFrench ? 'TVA 19%' : 'الضريبة 19%',
      total: isFrench ? 'Total TTC' : 'الإجمالي',
      validity: isFrench ? 'Validité 30 jours' : 'صلاحية 30 يوم',
    };

    const subtotal = reservation.totalPrice || 0;
    const tvaAmount = reservation.tvaApplied ? subtotal * 0.19 : 0;
    const total = subtotal + tvaAmount;

    const html = `
    <!DOCTYPE html>
    <html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
    <head>
      <meta charset="UTF-8">
      <title>Devis</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.5;
          color: #1a1a1a;
          background: #f5f5f5;
          direction: ${textDir};
        }
        .page {
          width: 210mm;
          height: 297mm;
          padding: 10mm;
          margin: 10px auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          border-bottom: 3px solid #2d7a4d;
          padding-bottom: 8px;
        }
        .logo {
          width: 50px;
          height: 50px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .header-text {
          flex: 1;
        }
        .agency-name {
          font-size: 24px;
          font-weight: 700;
          color: #2d7a4d;
          text-align: center;
          margin: 0 0 3px 0;
          letter-spacing: 0.3px;
        }
        .devis-title {
          font-size: 18px;
          font-weight: 700;
          color: #2d7a4d;
          text-align: center;
          margin: 0;
          letter-spacing: 0.5px;
          text-decoration: underline;
        }
        .header-info {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
          margin-bottom: 10px;
        }
        .info-box {
          padding: 8px;
          border-radius: 4px;
          font-size: 14px;
          line-height: 1.3;
        }
        .info-box.green {
          background-color: #dcfce7;
          border-left: 4px solid #16a34a;
        }
        .info-label {
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 1px;
          font-size: 12px;
        }
        .info-value {
          color: #1a1a1a;
          font-size: 14px;
          font-weight: 600;
        }
        .section {
          margin-bottom: 10px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          background-color: #dcfce7;
          padding: 6px 8px;
          border-radius: 3px;
          margin-bottom: 6px;
          border-left: 4px solid #2d7a4d;
          color: #2d7a4d;
        }
        .vehicle-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          font-size: 12px;
          border: 1px solid #2d7a4d;
        }
        .vehicle-table th {
          background-color: #dcfce7;
          border: 1px solid #2d7a4d;
          padding: 6px 4px;
          text-align: left;
          font-weight: 600;
          color: #2d7a4d;
        }
        .vehicle-table td {
          border: 1px solid #ddd;
          padding: 5px 4px;
          text-align: left;
          background-color: #fafafa;
        }
        .inspection-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          font-size: 12px;
          border: 1px solid #2d7a4d;
        }
        .inspection-table th {
          background-color: #dcfce7;
          border: 1px solid #2d7a4d;
          padding: 6px 4px;
          text-align: left;
          font-weight: 600;
          color: #2d7a4d;
        }
        .inspection-table td {
          border: 1px solid #ddd;
          padding: 5px 4px;
          text-align: left;
          background-color: #fafafa;
        }
        .rental-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        .info-field {
          padding: 8px;
          background-color: #f9fdf7;
          border-left: 3px solid #2d7a4d;
          border-radius: 3px;
        }
        .info-field-label {
          font-weight: 600;
          color: #2d7a4d;
          font-size: 12px;
          margin-bottom: 2px;
        }
        .info-field-value {
          color: #1a1a1a;
          font-size: 13px;
        }
        .pricing-summary {
          background: white;
          border: 2px solid #2d7a4d;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 10px;
        }
        .pricing-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 0.5px solid #ddd;
          font-size: 13px;
        }
        .pricing-row.total {
          border-top: 2px solid #2d7a4d;
          font-weight: 600;
          margin-top: 3px;
          padding-top: 8px;
          border-bottom: none;
          color: #2d7a4d;
          font-size: 14px;
        }
        .pricing-label {
          font-weight: 500;
          color: #1a1a1a;
        }
        .pricing-value {
          font-weight: 600;
          color: #2d7a4d;
        }
        .validity-note {
          text-align: center;
          color: #2d7a4d;
          font-size: 12px;
          font-weight: 600;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #ddd;
        }
        /* Print styles for A4 centering */
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: white;
            overflow: hidden;
          }
          body { 
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            overflow: hidden;
          }
          .page { 
            margin: 0 auto;
            padding: 10mm;
            width: 190mm;
            min-height: 277mm;
            height: auto;
            box-sizing: border-box;
            border: 2px solid black;
            transform: scale(1.15);
            transform-origin: top center;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          body > * {
            visibility: hidden;
          }
          .page, .page * {
            visibility: visible;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          ${agencySettings?.logo ? `<img src="${agencySettings.logo}" alt="Logo" class="logo">` : ''}
          <div class="header-text">
            <h1 class="agency-name">${agencySettings?.name || 'AGENCY NAME'}</h1>
            <p class="devis-title">${labels.devisTitle}</p>
          </div>
        </div>

        <!-- Header Info Boxes -->
        <div class="header-info">
          <div class="info-box green">
            <div class="info-label">🔢 ${labels.devisNumber}</div>
            <div class="info-value">#${reservation?.id ? reservation.id.toString().substring(0, 8).toUpperCase() : 'N/A'}</div>
          </div>
          <div class="info-box green">
            <div class="info-label">📅 ${labels.date}</div>
            <div class="info-value">${new Date().toLocaleDateString('en-US')}</div>
          </div>
          <div class="info-box green">
            <div class="info-label">👤 ${labels.client}</div>
            <div class="info-value">${reservation?.client?.lastName || 'N/A'}</div>
          </div>
        </div>

        <!-- Vehicle Information Table -->
        <div class="section">
          <div class="section-title">🚗 ${labels.vehicle}</div>
          <table class="vehicle-table">
            <thead>
              <tr>
                <th>${labels.brand}</th>
                <th>${labels.registration}</th>
                <th>${labels.color}</th>
                <th>${labels.vehicleClass}</th>
                <th>${labels.fuel}</th>
                <th>${labels.mileage}</th>
                <th>${labels.vin}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${ltr((reservation?.car?.brand || 'N/A') + ' ' + (reservation?.car?.model || ''))}</td>
                <td>${ltr(reservation?.car?.registration || 'N/A')}</td>
                <td>${reservation?.car?.color || 'N/A'}</td>
                <td>${ltr(reservation?.car?.model || 'N/A')}</td>
                <td>${reservation?.car?.energy || 'N/A'}</td>
                <td>${ltr((reservation?.departureInspection?.mileage || reservation?.car?.mileage || '0') + ' km')}</td>
                <td>${ltr(reservation?.car?.vin || 'N/A')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Inspection Information Table -->
        <div class="section">
          <div class="section-title">✓ ${labels.inspection}</div>
          <table class="inspection-table">
            <thead>
              <tr>
                <th>${labels.mats}</th>
                <th>${labels.spareTire}</th>
                <th>${labels.lights}</th>
                <th>${labels.windshield}</th>
                <th>${labels.wheels}</th>
                <th>${labels.suspension}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${reservation?.departureInspection?.mats ? '✓ Bon' : '✗ Mauvais'}</td>
                <td>${reservation?.departureInspection?.spareTire ? '✓ Présent' : '✗ Absent'}</td>
                <td>${reservation?.departureInspection?.lights ? '✓ Bon' : '✗ Mauvais'}</td>
                <td>${reservation?.departureInspection?.windshield ? '✓ Bon' : '✗ Mauvais'}</td>
                <td>${reservation?.departureInspection?.wheels ? '✓ Bon' : '✗ Mauvais'}</td>
                <td>${reservation?.departureInspection?.suspension ? '✓ Bon' : '✗ Mauvais'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Rental Period Info -->
        <div class="section">
          <div class="section-title">📅 ${labels.rentalPeriod}</div>
          <div class="rental-info">
            <div class="info-field">
              <div class="info-field-label">${labels.from}</div>
              <div class="info-field-value">${reservation?.step1?.departureDate || 'N/A'}</div>
            </div>
            <div class="info-field">
              <div class="info-field-label">${labels.to}</div>
              <div class="info-field-value">${reservation?.step1?.returnDate || 'N/A'}</div>
            </div>
            <div class="info-field">
              <div class="info-field-label">${labels.days}</div>
              <div class="info-field-value">${reservation?.totalDays || '1'} ${isFrench ? 'jour(s)' : 'يوم'}</div>
            </div>
            <div class="info-field">
              <div class="info-field-label">${isFrench ? 'Prix Jour' : 'السعر اليومي'}</div>
              <div class="info-field-value">${reservation?.car?.priceDay?.toLocaleString() || '0'} DA</div>
            </div>
          </div>
        </div>

        <!-- Pricing Section -->
        <div class="pricing-summary">
          <div class="pricing-row">
            <span class="pricing-label">${labels.amount}</span>
            <span class="pricing-value">${subtotal.toLocaleString()} DA</span>
          </div>
          ${reservation.tvaApplied ? `
          <div class="pricing-row">
            <span class="pricing-label">${labels.tva}</span>
            <span class="pricing-value">${tvaAmount.toLocaleString()} DA</span>
          </div>
          ` : ''}
          <div class="pricing-row total">
            <span>${labels.total}</span>
            <span>${total.toLocaleString()} DA</span>
          </div>
          <div class="validity-note">✓ ${labels.validity}</div>
        </div>
      </div>
    </body>
    </html>
    `;
    return html;
  };

  const generateFactureHTML = (templateLang: 'fr' | 'ar', societe?: { conducteur: string; rc: string; art: string; nis: string; nif: string; email: string } | null): string => {
    const subtotal = reservation.totalPrice || 0;
    const tvaAmount = reservation.tvaApplied ? subtotal * 0.19 : 0;
    const timbre = 200;
    const total = subtotal + tvaAmount + timbre;
    const departDate = reservation?.step1?.departureDate || '';
    const returnDate = reservation?.step1?.returnDate || '';
    const days = reservation?.totalDays || 0;
    const pricePerDay = (reservation?.car as any)?.priceDay || (reservation?.car as any)?.price_per_day || 0;

    const html = `
    <!DOCTYPE html>
    <html dir="ltr" lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Facture</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.5;
          color: #1a1a1a;
          background: #f5f5f5;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 8mm 10mm;
          margin: 10px auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 10px;
          border-bottom: 3px solid #d97706;
          padding-bottom: 10px;
        }
        .logo { width: 55px; height: 55px; object-fit: contain; flex-shrink: 0; border-radius: 4px; }
        .logo-placeholder { width: 55px; height: 55px; border: 2px solid #e5e5e5; display: flex; align-items: center; justify-content: center; font-size: 36px; flex-shrink: 0; border-radius: 4px; background: #f9f9f9; }
        .header-text { flex: 1; }
        .agency-name { font-size: 20px; font-weight: 700; color: #d97706; margin: 0 0 2px 0; }
        .invoice-title { font-size: 15px; font-weight: 700; color: #d97706; margin: 0; text-decoration: underline; }
        .invoice-meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 10px; }
        .meta-box { padding: 6px 10px; border-radius: 4px; background: #fff8f0; border-left: 3px solid #d97706; font-size: 12px; }
        .meta-label { font-weight: 600; color: #92400e; font-size: 10px; text-transform: uppercase; }
        .meta-value { color: #1a1a1a; font-weight: 600; margin-top: 1px; }
        .two-col { display: grid; grid-template-columns: 1.1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .info-section { border: 1.5px solid #d97706; border-radius: 5px; padding: 10px 12px; background: #fffcf8; }
        .info-section .sec-title { font-weight: 700; font-size: 11px; color: #d97706; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #fde68a; padding-bottom: 5px; margin-bottom: 7px; }
        .info-row { display: flex; gap: 6px; margin: 4px 0; font-size: 12px; }
        .info-label { font-weight: 600; color: #92400e; min-width: 80px; flex-shrink: 0; }
        .info-value { color: #1a1a1a; }
        .agency-inner { display: flex; gap: 10px; align-items: flex-start; }
        .agency-inner img { width: 40px; height: 40px; object-fit: contain; border-radius: 3px; flex-shrink: 0; }
        .agency-name-sm { font-weight: 700; color: #d97706; font-size: 13px; margin-bottom: 3px; }
        .agency-detail { font-size: 11px; color: #444; margin: 1px 0; }
        /* Societe block */
        .societe-block { border: 2px solid #d97706; border-radius: 5px; padding: 10px 12px; margin-bottom: 10px; background: linear-gradient(135deg, #fff8f0 0%, #fef3e2 100%); }
        .societe-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #fde68a; }
        .societe-header-icon { width: 26px; height: 26px; background: #d97706; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
        .societe-title { font-weight: 800; font-size: 12px; color: #d97706; text-transform: uppercase; letter-spacing: 0.5px; }
        .societe-subtitle { font-size: 10px; color: #92400e; font-weight: 500; }
        .societe-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .societe-field { padding: 6px 8px; background: white; border-radius: 4px; border: 1px solid #fde68a; border-left: 3px solid #d97706; }
        .societe-field-label { font-weight: 700; font-size: 9px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        .societe-field-value { font-size: 12px; color: #1a1a1a; font-weight: 600; word-break: break-all; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px; border: 1.5px solid #d97706; overflow: hidden; border-radius: 4px; }
        .items-table th { background: #d97706; color: white; border: 1px solid #d97706; padding: 8px 6px; text-align: center; font-weight: 700; font-size: 11px; text-transform: uppercase; }
        .items-table td { border: 1px solid #e5e5e5; padding: 8px 6px; text-align: center; vertical-align: middle; }
        .items-table td.left { text-align: left; padding-left: 10px; }
        .items-table tbody tr:nth-child(odd) { background: #fffcf8; }
        .totals-wrapper { display: flex; justify-content: flex-end; margin-bottom: 10px; }
        .totals-table { width: 260px; border-collapse: collapse; font-size: 12px; border: 1.5px solid #d97706; border-radius: 4px; overflow: hidden; }
        .totals-table tr td { border: 1px solid #e5e5e5; padding: 7px 10px; }
        .totals-table tr td:first-child { font-weight: 600; background: #fff8f0; color: #92400e; white-space: nowrap; }
        .totals-table tr td:last-child { text-align: right; font-weight: 600; }
        .totals-table tr.grand-total td { background: #d97706; color: white; font-weight: 700; font-size: 13px; border-color: #d97706; }
        .agency-strip { width: 100%; border: 1.5px solid #d97706; border-radius: 4px; padding: 8px 12px; margin-bottom: 10px; background: #fff8f0; }
        .strip-row { display: flex; gap: 5px; margin: 3px 0; font-size: 11px; }
        .strip-label { font-weight: 700; color: #d97706; min-width: 160px; }
        .strip-value { color: #333; font-weight: 500; }
        @media print {
          @page { size: A4; margin: 0; }
          html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; background: white; overflow: hidden; }
          body { margin: 0; padding: 0; background: white; display: flex; justify-content: center; align-items: flex-start; }
          .page { margin: 0 auto; padding: 8mm 10mm; width: 190mm; min-height: 277mm; box-sizing: border-box; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="page">

        <!-- HEADER -->
        <div class="header">
          ${agencySettings?.logo ? `<img src="${agencySettings.logo}" alt="Logo" class="logo">` : '<div class="logo-placeholder">\u{1F3E2}</div>'}
          <div class="header-text">
            <div class="agency-name">${agencySettings?.name || 'NOM AGENCE'}</div>
            <div class="invoice-title">FACTURE</div>
          </div>
          <div style="text-align:right;font-size:11px;color:#92400e;">
            <div style="font-weight:700;">N\u00b0 ${reservation?.id ? reservation.id.toString().substring(0, 8).toUpperCase() : '000'}</div>
            <div>${new Date().toLocaleDateString('fr-FR')}</div>
          </div>
        </div>

        <!-- AGENCY STRIP -->
        <div class="agency-strip">
          ${agencySettings?.name ? `<div class="strip-row"><span class="strip-label">Nom de l\u2019enseigne :</span><span class="strip-value">${agencySettings.name}</span></div>` : ''}
          ${agencySettings?.address ? `<div class="strip-row"><span class="strip-label">Adresse :</span><span class="strip-value">${agencySettings.address}</span></div>` : ''}
          ${agencySettings?.phone ? `<div class="strip-row"><span class="strip-label">\u{1F4DE} T\u00e9l\u00e9phone :</span><span class="strip-value">${ltrPhone(agencySettings.phone)}${agencySettings.phone_number_2 ? ' / ' + ltrPhone(agencySettings.phone_number_2) : ''}</span></div>` : ''}
          ${agencySettings?.bank_number ? `<div class="strip-row"><span class="strip-label">\u{1F3E6} Num\u00e9ro de compte :</span><span class="strip-value">${agencySettings.bank_number}</span></div>` : ''}
        </div>

        <!-- AGENCE + CLIENT SIDE BY SIDE -->
        <div class="two-col">
          <div class="info-section">
            <div class="sec-title">\u{1F3E2} Agence / Fournisseur</div>
            <div class="agency-inner">
              ${agencySettings?.logo ? `<img src="${agencySettings.logo}" alt="Logo">` : ''}
              <div>
                <div class="agency-name-sm">${agencySettings?.name || 'NOM AGENCE'}</div>
                ${agencySettings?.address ? `<div class="agency-detail">${agencySettings.address}</div>` : ''}
                ${agencySettings?.phone ? `<div class="agency-detail">T\u00e9l: ${ltrPhone(agencySettings.phone)}</div>` : ''}
              </div>
            </div>
          </div>
          <div class="info-section">
            <div class="sec-title">\u{1F464} Client</div>
            <div class="info-row"><span class="info-label">Nom :</span><span class="info-value">${reservation?.client?.firstName || ''} ${reservation?.client?.lastName || ''}</span></div>
            <div class="info-row"><span class="info-label">Adresse :</span><span class="info-value">${reservation?.client?.completeAddress || reservation?.client?.wilaya || 'N/A'}</span></div>
            ${reservation?.client?.phone ? `<div class="info-row"><span class="info-label">T\u00e9l :</span><span class="info-value">${ltrPhone(reservation.client.phone)}</span></div>` : ''}
            ${reservation?.client?.idCardNumber ? `<div class="info-row"><span class="info-label">N\u00b0 CIN :</span><span class="info-value">${reservation.client.idCardNumber}</span></div>` : ''}
          </div>
        </div>

        ${societe ? `
        <!-- SOCIETE BLOCK -->
        <div class="societe-block">
          <div class="societe-header">
            <div class="societe-header-icon">\u{1F3E2}</div>
            <div>
              <div class="societe-title">Informations Soci\u00e9t\u00e9</div>
              <div class="societe-subtitle">Donn\u00e9es fiscales et commerciales</div>
            </div>
          </div>
          <div class="societe-grid">
            ${societe.conducteur ? `<div class="societe-field"><div class="societe-field-label">Conducteur</div><div class="societe-field-value">${societe.conducteur}</div></div>` : ''}
            ${societe.rc ? `<div class="societe-field"><div class="societe-field-label">RC</div><div class="societe-field-value">${societe.rc}</div></div>` : ''}
            ${societe.art ? `<div class="societe-field"><div class="societe-field-label">ART</div><div class="societe-field-value">${societe.art}</div></div>` : ''}
            ${societe.nis ? `<div class="societe-field"><div class="societe-field-label">NIS</div><div class="societe-field-value">${societe.nis}</div></div>` : ''}
            ${societe.nif ? `<div class="societe-field"><div class="societe-field-label">NIF</div><div class="societe-field-value">${societe.nif}</div></div>` : ''}
            ${societe.email ? `<div class="societe-field"><div class="societe-field-label">Email</div><div class="societe-field-value">${societe.email}</div></div>` : ''}
          </div>
        </div>` : ''}

        <!-- ITEMS TABLE -->
        <table class="items-table">
          <thead>
            <tr>
              <th>R\u00e9f</th>
              <th>D\u00e9signation</th>
              <th>Immatricul\u00e9</th>
              <th>Du</th>
              <th>Au</th>
              <th>Jours</th>
              <th>Prix/J</th>
              <th>HT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${reservation?.id ? reservation.id.toString().substring(0, 3).toUpperCase() : '001'}</td>
              <td class="left">${ltr((reservation?.car?.brand || '') + ' ' + (reservation?.car?.model || ''))}</td>
              <td>${ltr((reservation?.car as any)?.registration || (reservation?.car as any)?.plate_number || 'N/A')}</td>
              <td>${departDate}</td>
              <td>${returnDate}</td>
              <td>${days}</td>
              <td>${pricePerDay.toLocaleString('fr-FR')} DA</td>
              <td>${subtotal.toLocaleString('fr-FR')} DA</td>
            </tr>
          </tbody>
        </table>

        <!-- TOTALS -->
        <div class="totals-wrapper">
          <table class="totals-table">
            <tr><td>TOTAL HT :</td><td>${subtotal.toLocaleString('fr-FR')} DA</td></tr>
            <tr><td>TVA (19%) :</td><td>${tvaAmount.toLocaleString('fr-FR')} DA</td></tr>
            <tr><td>TIMBRE :</td><td>${timbre.toLocaleString('fr-FR')} DA</td></tr>
            <tr class="grand-total"><td>TOTAL \u00c0 PAYER :</td><td>${total.toLocaleString('fr-FR')} DA</td></tr>
          </table>
        </div>

      </div>
    </body>
    </html>
    `;
    return html;
  };

  const generateEngagementHTML = (templateLang: 'fr' | 'ar'): string => {
    const isFrench = templateLang === 'fr';
    const textDir = isFrench ? 'ltr' : 'rtl';
    
    // Determine if passport or ID
    const isPassport = reservation.client.documentType === 'passport';
    const documentLabel = isPassport ? (isFrench ? 'Passeport' : 'جواز سفر') : (isFrench ? 'Carte d\'Identité' : 'بطاقة هوية');
    const depositLabel = isPassport ? (isFrench ? 'Avoir déposé mon passeport' : 'قمت بإيداع جواز سفري') : (isFrench ? 'Avoir déposé ma carte d\'identité' : 'قمت بإيداع بطاقتي الشخصية');
    
    const documentNumber = isPassport ? 
      (reservation.client.documentNumber || 'N/A') : 
      (reservation.client.idCardNumber || 'N/A');
    const documentDeliveryDate = isPassport ?
      (reservation.client.documentDeliveryDate || reservation.client.licenseDeliveryDate) :
      (reservation.client.licenseDeliveryDate || reservation.client.documentDeliveryDate);
    const documentDeliveryPlace = isPassport ?
      (reservation.client.documentDeliveryAddress || reservation.client.wilaya) :
      (reservation.client.licenseDeliveryPlace || reservation.client.wilaya);
    
    const labels = {
      engagement: isFrench ? 'ENGAGEMENT' : 'التزام',
      iAmSigning: isFrench ? 'Je soussigné(e) Mme/Mrs' : 'أنا الموقع أدناه السيدة/السيد',
      haveDeposited: depositLabel,
      documentNum: isFrench ? 'N°' : 'رقم',
      issuedOn: isFrench ? 'Délivré le' : 'صادر في',
      atLocation: isFrench ? 'À' : 'في',
      atAgency: isFrench ? 'Au niveau de votre agence de location de voiture le' : 'لدى وكالة تأجير السيارات الخاصة بكم في',
      contractNum: isFrench ? 'Contrat N°' : 'العقد رقم',
      asCaution: isFrench ? 'Comme caution pour location du véhicule' : 'كضمان لاستئجار المركبة',
      vehicleModel: isFrench ? 'Modèle Véhicule' : 'موديل المركبة',
      registration: isFrench ? 'Immatriculation' : 'رقم التسجيل',
      rentalPeriod: isFrench ? 'Période de Location' : 'فترة الإيجار',
      from: isFrench ? 'Du' : 'من',
      to: isFrench ? 'Au' : 'إلى',
      agencySignature: isFrench ? 'Signature et cachet de l\'Agence' : 'توقيع وختم الوكالة',
      clientSignature: isFrench ? 'Signature de client' : 'توقيع العميل',
    };

    const html = `
    <!DOCTYPE html>
    <html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
    <head>
      <meta charset="UTF-8">
      <title>Engagement</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.5;
          color: #1a1a1a;
          background: #f5f5f5;
          direction: ${textDir};
        }
        .page {
          width: 210mm;
          height: 297mm;
          padding: 10mm;
          margin: 10px auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          border-bottom: 3px solid #d97706;
          padding-bottom: 8px;
        }
        .logo {
          width: 50px;
          height: 50px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .header-text {
          flex: 1;
        }
        .agency-name {
          font-size: 24px;
          font-weight: 700;
          color: #d97706;
          text-align: center;
          margin: 0 0 3px 0;
          letter-spacing: 0.3px;
        }
        .engagement-title {
          font-size: 18px;
          font-weight: 700;
          color: #d97706;
          text-align: center;
          margin: 0;
          letter-spacing: 0.5px;
          text-decoration: underline;
        }
        .content {
          line-height: 1.4;
          font-size: 14px;
        }
        .intro-line {
          margin: 8px 0;
          font-size: 14px;
          color: #1a1a1a;
        }
        .highlight {
          font-weight: 600;
          color: #d97706;
        }
        .document-info {
          margin: 10px 0;
          padding: 12px;
          border: 2px solid #d97706;
          border-radius: 4px;
          background: #fafafa;
        }
        .info-line {
          margin: 8px 0;
          font-size: 15px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }
        .info-label {
          font-weight: 600;
          color: #d97706;
          min-width: 140px;
        }
        .info-value {
          color: #1a1a1a;
          flex: 1;
          font-weight: 500;
        }
        .vehicle-section {
          background: #fff8f0;
          padding: 15px;
          border-radius: 4px;
          margin: 15px 0;
          border: 2px solid #d97706;
          border-left: 5px solid #d97706;
        }
        .vehicle-header {
          font-weight: 700;
          color: #d97706;
          margin-bottom: 10px;
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .model-highlight {
          background: #fff3cd;
          padding: 8px 12px;
          border-radius: 4px;
          font-weight: 700;
          color: #d97706;
          display: inline-block;
          margin: 8px 0;
          border: 1px solid #d97706;
        }
        .signature-section {
          margin-top: 30px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        .signature-block {
          text-align: center;
          border: 2px solid #d97706;
          border-radius: 4px;
          padding: 20px 15px;
          background: #fafafa;
        }
        .signature-space {
          min-height: 60px;
          border-bottom: 2px solid #1a1a1a;
          margin-bottom: 10px;
        }
        .signature-label {
          font-weight: 700;
          font-size: 13px;
          color: #d97706;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: white;
            overflow: hidden;
          }
          body { 
            margin: 0;
            padding: 0;
            background: white;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            overflow: hidden;
          }
          .page { 
            margin: 0 auto;
            padding: 10mm;
            width: 190mm;
            min-height: 277mm;
            height: auto;
            box-sizing: border-box;
            border: 2px solid black;
            box-shadow: none;
            transform: scale(1.15);
            transform-origin: top center;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          body > * {
            visibility: hidden;
          }
          .page, .page * {
            visibility: visible;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          ${agencySettings?.logo ? `<img src="${agencySettings.logo}" alt="Logo" class="logo">` : ''}
          <div class="header-text">
            <h1 class="agency-name">${agencySettings?.name || 'AGENCY NAME'}</h1>
            <p class="engagement-title">${labels.engagement}</p>
          </div>
        </div>

        <!-- Main Content -->
        <div class="content">
          <!-- Introduction -->
          <div class="intro-line">
            ${labels.iAmSigning} <span class="highlight">${reservation?.client?.firstName} ${reservation?.client?.lastName}</span>
          </div>

          <!-- Document Section -->
          <div class="intro-line" style="margin-top: 12px;">
            ${labels.haveDeposited}
          </div>

          <!-- Document Details -->
          <div class="document-info">
            <div class="info-line">
              <span class="info-label">${labels.documentNum}</span>
              <span class="info-value">${documentNumber}</span>
            </div>
            <div class="info-line">
              <span class="info-label">${labels.issuedOn}</span>
              <span class="info-value">${documentDeliveryDate ? new Date(documentDeliveryDate).toLocaleDateString('en-US') : 'N/A'}</span>
            </div>
            <div class="info-line">
              <span class="info-label">${labels.atLocation}</span>
              <span class="info-value">${documentDeliveryPlace || 'N/A'}</span>
            </div>
          </div>

          <!-- Agency Section -->
          <div class="intro-line" style="margin-top: 15px;">
            ${labels.atAgency} <span class="highlight">${new Date().toLocaleDateString('en-US')}</span>
          </div>

          <!-- Contract Number -->
          <div class="intro-line" style="margin: 10px 0;">
            ${labels.contractNum} <span class="highlight">${reservation?.id?.toString().substring(0, 8).toUpperCase() || 'N/A'}</span>
          </div>

          <!-- Caution Declaration -->
          <div class="intro-line">
            ${labels.asCaution}
          </div>

          <!-- Vehicle Information Section -->
          <div class="vehicle-section">
            <div class="vehicle-header">🚗 ${labels.vehicleModel}</div>
            <div class="model-highlight">
              ${ltr((reservation?.car?.brand || 'N/A') + ' ' + (reservation?.car?.model || 'N/A'))}
            </div>
            <div class="info-line" style="margin-top: 8px;">
              <span class="info-label">${labels.registration}</span>
              <span class="info-value">${ltr(reservation?.car?.registration || 'N/A')}</span>
            </div>
            <div class="info-line">
              <span class="info-label">${labels.rentalPeriod}</span>
              <span class="info-value">${labels.from} ${reservation?.step1?.departureDate} ${labels.to} ${reservation?.step1?.returnDate}</span>
            </div>
          </div>

          <!-- Signatures -->
          <div class="signature-section">
            <div class="signature-block">
              <div class="signature-space"></div>
              <div class="signature-label">${labels.agencySignature}</div>
            </div>
            <div class="signature-block">
              <div class="signature-space"></div>
              <div class="signature-label">${labels.clientSignature}</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
    return html;
  };

  const generateRecuHTML = (templateLang: 'fr' | 'ar'): string => {
    const isFrench = templateLang === 'fr';
    const textDir = isFrench ? 'ltr' : 'rtl';
    
    const labels = {
      recuTitle: isFrench ? 'REÇU DE VERSEMENT' : 'إيصال الدفع',
      recuNumber: isFrench ? 'N° Reçu' : 'رقم الإيصال',
      date: isFrench ? 'Date' : 'التاريخ',
      client: isFrench ? 'Client' : 'العميل',
      amountReceived: isFrench ? 'Montant Reçu' : 'المبلغ المستلم',
      totalAmount: isFrench ? 'Montant Total' : 'المبلغ الإجمالي',
      amountPaid: isFrench ? 'Montant Payé' : 'المبلغ المدفوع',
      remainingBalance: isFrench ? 'Solde Restant' : 'الرصيد المتبقي',
      method: isFrench ? 'Mode de Paiement' : 'طريقة الدفع',
      reservation: isFrench ? 'N° Réservation' : 'رقم الحجز',
      bank: isFrench ? 'Virement Bancaire' : 'تحويل بنكي',
      cash: isFrench ? 'Espèces' : 'نقداً',
      card: isFrench ? 'Carte Bancaire' : 'بطاقة بنكية',
      thanks: isFrench ? 'Merci de votre paiement' : 'شكراً على دفعتك',
    };

    // Calculate payment information
    const totalAmount = reservation.totalPrice || 0;
    const totalPaid = reservation.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || reservation.advancePayment || 0;
    const remainingBalance = totalAmount - totalPaid;
    const currentPayment = reservation.payments?.[0] || { amount: 0, method: 'bank' };

    const html = `
    <!DOCTYPE html>
    <html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
    <head>
      <meta charset="UTF-8">
      <title>Reçu de Versement</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.5;
          color: #1a1a1a;
          background: #f5f5f5;
          direction: ${textDir};
        }
        .page {
          width: 210mm;
          height: 297mm;
          padding: 10mm;
          margin: 10px auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          border-bottom: 3px solid #7c3aed;
          padding-bottom: 8px;
        }
        .logo {
          width: 50px;
          height: 50px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .header-text {
          flex: 1;
        }
        .agency-name {
          font-size: 24px;
          font-weight: 700;
          color: #7c3aed;
          text-align: center;
          margin: 0 0 3px 0;
          letter-spacing: 0.3px;
        }
        .recu-title {
          font-size: 18px;
          font-weight: 700;
          color: #7c3aed;
          text-align: center;
          margin: 0;
          letter-spacing: 0.5px;
          text-decoration: underline;
        }
        .header-info {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
          margin-bottom: 10px;
        }
        .info-box {
          padding: 8px;
          border-radius: 4px;
          font-size: 14px;
          line-height: 1.3;
        }
        .info-box.purple {
          background-color: #f3e8ff;
          border-left: 4px solid #7c3aed;
        }
        .info-label {
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 1px;
          font-size: 12px;
        }
        .info-value {
          color: #1a1a1a;
          font-size: 14px;
          font-weight: 600;
        }
        .section {
          margin-bottom: 10px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          background-color: #f3e8ff;
          padding: 6px 8px;
          border-radius: 3px;
          margin-bottom: 6px;
          border-left: 4px solid #7c3aed;
          color: #7c3aed;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 10px;
        }
        .detail-item {
          padding: 8px;
          background-color: #f9f5ff;
          border-radius: 3px;
        }
        .detail-label {
          font-weight: 600;
          color: #7c3aed;
          font-size: 11px;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        .detail-value {
          color: #1a1a1a;
          font-size: 14px;
        }
        .payment-section {
          background: white;
          border: 2px solid #7c3aed;
          border-radius: 6px;
          padding: 12px;
          margin: 10px 0;
        }
        .payment-box {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        .payment-item {
          background: #f9f5ff;
          padding: 10px;
          border-radius: 4px;
          border-left: 4px solid #7c3aed;
        }
        .payment-item.highlight {
          background: #fff8f0;
          border-left-color: #f97316;
        }
        .payment-label {
          font-weight: 600;
          color: #7c3aed;
          font-size: 11px;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .payment-label.highlight {
          color: #f97316;
        }
        .payment-value {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
        }
        .payment-value.highlight {
          color: #f97316;
        }
        .payment-value.positive {
          color: #10b981;
        }
        .payment-value.negative {
          color: #ef4444;
        }
        .amount-large-box {
          background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%);
          color: white;
          padding: 15px;
          border-radius: 6px;
          text-align: center;
          margin: 10px 0;
        }
        .amount-large-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 4px;
          opacity: 0.9;
        }
        .amount-large-value {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .footer-note {
          margin-top: 12px;
          text-align: center;
          color: #7c3aed;
          font-size: 14px;
          font-weight: 600;
        }
        .signature-section {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .signature-block {
          text-align: center;
        }
        .signature-line {
          border-top: 2px solid #1a1a1a;
          margin: 40px 0 5px 0;
          height: 2px;
        }
        .signature-label {
          font-weight: 600;
          font-size: 13px;
          color: #1a1a1a;
          margin-top: 3px;
          text-transform: uppercase;
        }
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: white;
            overflow: hidden;
          }
          body { 
            margin: 0;
            padding: 0;
            background: white;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            overflow: hidden;
          }
          .page { 
            margin: 0 auto;
            padding: 10mm;
            width: 190mm;
            min-height: 277mm;
            height: auto;
            box-sizing: border-box;
            border: 2px solid black;
            box-shadow: none;
            transform: scale(1.15);
            transform-origin: top center;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          body > * {
            visibility: hidden;
          }
          .page, .page * {
            visibility: visible;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          ${agencySettings?.logo ? `<img src="${agencySettings.logo}" alt="Logo" class="logo">` : ''}
          <div class="header-text">
            <h1 class="agency-name">${agencySettings?.name || 'AGENCY NAME'}</h1>
            <p class="recu-title">${labels.recuTitle}</p>
          </div>
        </div>

        <!-- Header Info Boxes -->
        <div class="header-info">
          <div class="info-box purple">
            <div class="info-label">🔢 ${labels.recuNumber}</div>
            <div class="info-value">#${reservation?.id ? reservation.id.toString().substring(0, 8).toUpperCase() : 'N/A'}</div>
          </div>
          <div class="info-box purple">
            <div class="info-label">📅 ${labels.date}</div>
            <div class="info-value">${new Date().toLocaleDateString('en-US')}</div>
          </div>
          <div class="info-box purple">
            <div class="info-label">👤 ${labels.client}</div>
            <div class="info-value">${reservation?.client?.lastName || 'N/A'}</div>
          </div>
        </div>

        <!-- Client & Reservation Info -->
        <div class="section">
          <div class="section-title">📋 ${isFrench ? 'Informations du Client' : 'معلومات العميل'}</div>
          <div class="details-grid">
            <div class="detail-item">
              <div class="detail-label">${labels.client}</div>
              <div class="detail-value">${reservation?.client?.firstName} ${reservation?.client?.lastName}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">${labels.reservation}</div>
              <div class="detail-value">#${reservation?.id || 'N/A'}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">📞 ${isFrench ? 'Téléphone' : 'الهاتف'}</div>
              <div class="detail-value">${reservation?.client?.phone ? ltrPhone(reservation.client.phone) : 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- Payment Summary Section -->
        <div class="payment-section">
          <div class="section-title" style="margin-bottom: 12px;">💰 ${isFrench ? 'Détails de Paiement' : 'تفاصيل الدفع'}</div>
          
          <div class="payment-box">
            <div class="payment-item">
              <div class="payment-label">${labels.totalAmount}</div>
              <div class="payment-value">${totalAmount.toLocaleString()} DA</div>
            </div>
            <div class="payment-item">
              <div class="payment-label">${labels.amountPaid}</div>
              <div class="payment-value positive">${totalPaid.toLocaleString()} DA</div>
            </div>
          </div>

          <div class="payment-box">
            <div class="payment-item">
              <div class="payment-label">${labels.amountReceived}</div>
              <div class="payment-value">${(currentPayment.amount || totalPaid).toLocaleString()} DA</div>
            </div>
            <div class="payment-item highlight">
              <div class="payment-label highlight">${labels.remainingBalance}</div>
              <div class="payment-value ${remainingBalance > 0 ? 'negative' : 'positive'}">${Math.abs(remainingBalance).toLocaleString()} DA</div>
            </div>
          </div>
        </div>

        <!-- Large Amount Display -->
        <div class="amount-large-box">
          <div class="amount-large-label">${labels.amountReceived}</div>
          <div class="amount-large-value">${(currentPayment.amount || totalPaid).toLocaleString()} DA</div>
        </div>

        <!-- Thank You Message -->
        <div class="footer-note">
          ✓ ${labels.thanks}
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">${isFrench ? 'Cachet et Signature' : 'الختم والتوقيع'}<br/>${isFrench ? 'de l\'Agence' : 'للوكالة'}</div>
          </div>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">${isFrench ? 'Signature du Client' : 'توقيع العميل'}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
    return html;
  };

  const generateInspectionHTML = (templateLang: 'fr' | 'ar'): string => {
    const isFrench = templateLang === 'fr';
    const textDir = isFrench ? 'ltr' : 'rtl';
    
    const labels = isFrench ? {
      inspectionTitle: 'Inspection',
      inspectionDate: 'Date',
      clientInfo: 'Informations du Client',
      vehicleInfo: 'Informations du Véhicule',
      inspectionDetails: 'Détails de l\'Inspection',
      fullName: 'Nom Complet',
      phone: 'Téléphone',
      email: 'Email',
      licenseNumber: 'Numéro de Permis',
      model: 'Modèle',
      registration: 'Immatriculation',
      vin: 'VIN',
      color: 'Couleur',
      mileage: 'Kilométrage',
      inspection: 'Inspection de Départ',
      departureInspection: 'État de Départ',
      bodyCondition: 'État de la Carrosserie',
      tires: 'Pneus',
      lights: 'Éclairage',
      windows: 'Vitres',
      mirrors: 'Rétroviseurs',
      doors: 'Portes',
      interior: 'Intérieur',
      upholstery: 'Rembourrage',
      dashboard: 'Tableau de Bord',
      equipment: 'Équipements',
      engine: 'Moteur',
      brakes: 'Freins',
      suspension: 'Suspension',
      condition: 'État',
      good: 'Bon',
      fair: 'Acceptable',
      poor: 'Mauvais',
      notes: 'Remarques',
      approvedBy: 'Approuvé par',
      signature: 'Signature',
    } : {
      inspectionTitle: 'فحص المركبة',
      inspectionDate: 'التاريخ',
      clientInfo: 'معلومات العميل',
      vehicleInfo: 'معلومات المركبة',
      inspectionDetails: 'تفاصيل الفحص',
      fullName: 'الاسم الكامل',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      licenseNumber: 'رقم الرخصة',
      model: 'الطراز',
      registration: 'التسجيل',
      vin: 'رقم الهيكل',
      color: 'اللون',
      mileage: 'الكيلومترات',
      inspection: 'فحص المغادرة',
      departureInspection: 'حالة المغادرة',
      bodyCondition: 'حالة الهيكل',
      tires: 'الإطارات',
      lights: 'الأضواء',
      windows: 'الزجاج',
      mirrors: 'المرايا',
      doors: 'الأبواب',
      interior: 'الداخلية',
      upholstery: 'التنجيد',
      dashboard: 'لوحة القيادة',
      equipment: 'المعدات',
      engine: 'المحرك',
      brakes: 'الفرامل',
      suspension: 'التعليق',
      condition: 'الحالة',
      good: 'جيد',
      fair: 'مقبول',
      poor: 'سيء',
      notes: 'ملاحظات',
      approvedBy: 'موافق عليه من قبل',
      signature: 'التوقيع',
    };

    const inspectionData: Partial<VehicleInspection> = reservation?.departureInspection || {};
    
    const html = `
    <!DOCTYPE html>
    <html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
    <head>
      <meta charset="UTF-8">
      <title>${labels.inspectionTitle}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.5;
          color: #222;
          background: white;
          direction: ${textDir};
          font-size: 14px;
        }
        .page {
          width: 210mm;
          height: 297mm;
          padding: 12mm;
          margin: 0 auto;
          background: white;
        }
        .header {
          border-bottom: 3px solid #2d7a4d;
          padding-bottom: 10px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          width: 50px;
          height: 50px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .header-text {
          flex: 1;
        }
        .agency-name {
          font-size: 32px;
          font-weight: bold;
          color: #2d7a4d;
          margin: 0;
        }
        .inspection-title {
          font-size: 20px;
          color: #555;
          margin-top: 3px;
        }
        .header-info {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }
        .info-box {
          padding: 10px 12px;
          border-radius: 4px;
          border-left: 4px solid #2d7a4d;
          background-color: #e8f5e9;
        }
        .info-label {
          font-weight: 600;
          color: #2d7a4d;
          font-size: 12px;
          margin-bottom: 3px;
          text-transform: uppercase;
        }
        .info-value {
          color: #333;
          font-size: 16px;
          font-weight: 600;
        }
        .section {
          margin-bottom: 12px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 16px;
          font-weight: 700;
          background-color: #e8f5e9;
          padding: 8px 10px;
          border-radius: 3px;
          margin-bottom: 8px;
          border-left: 4px solid #2d7a4d;
          color: #2d7a4d;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 15px;
          margin-bottom: 10px;
        }
        .detail-item {
          padding: 10px;
          background-color: #f1f8f6;
          border-radius: 3px;
          border-left: 3px solid #2d7a4d;
        }
        .detail-label {
          font-weight: 600;
          color: #2d7a4d;
          font-size: 11px;
          margin-bottom: 3px;
          text-transform: uppercase;
        }
        .detail-value {
          color: #333;
          font-size: 14px;
        }
        .checklist {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 10px;
        }
        .checklist-item {
          padding: 10px;
          background-color: #f1f8f6;
          border-radius: 3px;
          border-left: 3px solid #2d7a4d;
        }
        .checklist-title {
          font-weight: 600;
          color: #2d7a4d;
          font-size: 13px;
          margin-bottom: 6px;
        }
        .checkbox {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
          font-size: 13px;
        }
        .check-box {
          width: 14px;
          height: 14px;
          border: 1px solid #2d7a4d;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .check-box.checked::before {
          content: '✓';
          color: #2d7a4d;
          font-weight: bold;
          font-size: 12px;
        }
        .notes-section {
          margin-top: 12px;
          padding: 10px;
          background-color: #fff3e0;
          border-left: 3px solid #ff9800;
          border-radius: 3px;
        }
        .notes-title {
          font-weight: 600;
          color: #ff9800;
          margin-bottom: 6px;
          font-size: 12px;
          text-transform: uppercase;
        }
        .notes-text {
          color: #333;
          font-size: 13px;
          line-height: 1.4;
          min-height: 60px;
          border: 1px dashed #ff9800;
          padding: 6px;
          border-radius: 2px;
        }
        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 30px;
        }
        .signature-block {
          text-align: center;
        }
        .signature-line {
          border-top: 2px solid #333;
          margin-bottom: 8px;
          height: 60px;
        }
        .signature-label {
          font-weight: 600;
          font-size: 12px;
          color: #333;
          text-transform: uppercase;
        }
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: white;
            overflow: hidden;
          }
          body { 
            margin: 0;
            padding: 0;
            background: white;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            overflow: hidden;
          }
          .page { 
            margin: 0 auto;
            padding: 10mm;
            width: 190mm;
            min-height: 277mm;
            height: auto;
            box-sizing: border-box;
            border: 2px solid black;
            transform: scale(1.15);
            transform-origin: top center;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          body > * {
            visibility: hidden;
          }
          .page, .page * {
            visibility: visible;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          ${agencySettings?.logo ? `<img src="${agencySettings.logo}" alt="Logo" class="logo">` : ''}
          <div class="header-text">
            <h1 class="agency-name">${agencySettings?.name || 'AGENCY NAME'}</h1>
            <p class="inspection-title">🔍 ${labels.inspectionTitle}</p>
          </div>
        </div>

        <!-- Header Info -->
        <div class="header-info">
          <div class="info-box">
            <div class="info-label">📅 ${labels.inspectionDate}</div>
            <div class="info-value">${new Date().toLocaleDateString('en-US')}</div>
          </div>
          <div class="info-box">
            <div class="info-label">🗂️ ${isFrench ? 'N° de Réservation' : 'رقم الحجز'}</div>
            <div class="info-value">#${reservation?.id || 'N/A'}</div>
          </div>
          <div class="info-box">
            <div class="info-label">🚗 ${isFrench ? 'Immatriculation' : 'التسجيل'}</div>
            <div class="info-value">${ltr(reservation?.car?.registration || 'N/A')}</div>
          </div>
        </div>

        <!-- Client Information -->
        <div class="section">
          <div class="section-title">👤 ${labels.clientInfo}</div>
          <div class="details-grid">
            <div class="detail-item">
              <div class="detail-label">${labels.fullName}</div>
              <div class="detail-value">${reservation?.client?.firstName || (reservation?.client as any)?.first_name} ${reservation?.client?.lastName || (reservation?.client as any)?.last_name}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">${labels.phone}</div>
              <div class="detail-value">${reservation?.client?.phone ? ltrPhone(reservation.client.phone) : 'N/A'}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">${labels.email}</div>
              <div class="detail-value">${reservation?.client?.email || 'N/A'}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">${labels.licenseNumber}</div>
              <div class="detail-value">${reservation?.client?.licenseNumber || (reservation?.client as any)?.license_number || 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- Vehicle Information -->
        <div class="section">
          <div class="section-title">🚗 ${labels.vehicleInfo}</div>
          <div class="details-grid">
            <div class="detail-item">
              <div class="detail-label">${labels.model}</div>
              <div class="detail-value">${ltr((reservation?.car?.brand || '') + ' ' + (reservation?.car?.model || ''))}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">${labels.registration}</div>
              <div class="detail-value">${ltr(reservation?.car?.registration || 'N/A')}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">${labels.vin}</div>
              <div class="detail-value">${ltr(reservation?.car?.vin || 'N/A')}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">${labels.color}</div>
              <div class="detail-value">${reservation?.car?.color || 'N/A'}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">${labels.mileage}</div>
              <div class="detail-value">${ltr((inspectionData?.mileage || 'N/A') + ' km')}</div>
            </div>
          </div>
        </div>

        <!-- Inspection Checklist -->
        <div class="section">
          <div class="section-title">✅ ${labels.inspectionDetails}</div>
          ${(() => {
            const categoryLabels = {
              security: isFrench ? '🛡️ Sécurité' : '🛡️ الأمان',
              equipment: isFrench ? '🔧 Équipements' : '🔧 المعدات',
              comfort: isFrench ? '✨ Confort & Propreté' : '✨ الراحة والنظافة',
              cleanliness: isFrench ? '🧹 Nettoyage' : '🧹 التنظيف'
            };
            
            const categoryColors = {
              security: '#e74c3c',
              equipment: '#3498db',
              comfort: '#f39c12',
              cleanliness: '#27ae60'
            };
            
            const groupedItems: any = {};
            (inspectionData?.inspectionItems || []).forEach((item: any) => {
              if (!groupedItems[item.category]) {
                groupedItems[item.category] = [];
              }
              groupedItems[item.category].push(item);
            });
            
            return Object.entries(groupedItems).map(([category, items]: any) => {
              const categoryHeader = categoryLabels[category as keyof typeof categoryLabels];
              const bgColor = categoryColors[category as keyof typeof categoryColors];
              const itemsHtml = (items as any[]).map((item: any) => `<div class="inspection-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><span class="item-name" style="flex: 1; font-size: 13px; color: #2c3e50;">${item.name}</span><span class="item-status" style="font-size: 18px;">${item.checked ? '✅' : '❌'}</span></div>`).join('');
              return `<div style="margin-bottom: 16px; background: #f8f9fa; border-left: 4px solid ${bgColor}; border-radius: 4px; overflow: hidden;"><div style="background-color: ${bgColor}; color: white; padding: 10px 12px; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px;">${categoryHeader}</div><div style="padding: 12px;">${itemsHtml}</div></div>`;
            }).join('');
          })()}
        </div>

        <!-- Notes Section -->
        <div class="notes-section">
          <div class="notes-title">📝 ${labels.notes}</div>
          <div class="notes-text">${inspectionData?.notes || ''}</div>
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">${isFrench ? 'Client' : 'العميل'}</div>
          </div>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">${isFrench ? 'Agence' : 'الوكالة'}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
    return html;
  };

  const handlePrint = () => {
    setIsPrinting(true);
    let content = '';
    
    // Select the appropriate template function based on document type
    if (type === 'engagement') {
      content = generateEngagementHTML(selectedTemplate);
    } else if (type === 'invoice' || type === 'facture') {
      content = generateFactureHTML(selectedTemplate, isSociete ? societeData : null);
    } else if (type === 'quote' || type === 'devis') {
      content = generateDevisHTML(selectedTemplate);
    } else if (type === 'payment' || type === 'versement' || type === 'receipt' || type === 'recu') {
      content = generateRecuHTML(selectedTemplate);
    } else if (type === 'inspection') {
      content = generateInspectionHTML(selectedTemplate);
    } else {
      content = generateContractHTML(selectedTemplate);
    }
    
    printHTMLContent(content, () => setIsPrinting(false));
  };

  const getDocumentTitle = (): string => {
    const titleMap: { [key: string]: { fr: string; ar: string } } = {
      contract: { fr: 'Contrat de Location', ar: 'عقد التأجير' },
      engagement: { fr: 'Lettre d\'Engagement', ar: 'رسالة التزام' },
      invoice: { fr: 'Facture', ar: 'الفاتورة' },
      facture: { fr: 'Facture', ar: 'الفاتورة' },
      quote: { fr: 'Devis', ar: 'عرض أسعار' },
      devis: { fr: 'Devis', ar: 'عرض أسعار' },
      payment: { fr: 'Reçu de Versement', ar: 'إيصال الدفع' },
      versement: { fr: 'Reçu de Versement', ar: 'إيصال الدفع' },
      receipt: { fr: 'Reçu de Versement', ar: 'إيصال الدفع' },
      recu: { fr: 'Reçu de Versement', ar: 'إيصال الدفع' },
    };
    
    const typeKey = type.toLowerCase();
    const titleObj = titleMap[typeKey] || { fr: 'Document', ar: 'وثيقة' };
    return lang === 'fr' ? titleObj.fr : titleObj.ar;
  };

  const getHeaderColor = (): string => {
    const typeKey = type.toLowerCase();
    if (typeKey === 'engagement') return 'from-amber-600 to-amber-700';
    if (typeKey === 'invoice' || typeKey === 'facture') return 'from-blue-600 to-blue-700';
    if (typeKey === 'quote' || typeKey === 'devis') return 'from-green-600 to-green-700';
    if (typeKey === 'payment' || typeKey === 'versement' || typeKey === 'receipt' || typeKey === 'recu') return 'from-purple-600 to-purple-700';
    return 'from-blue-600 to-blue-700';
  };

  const getCurrentTemplate = (): string => {
    const typeKey = type.toLowerCase();
    if (typeKey === 'engagement') {
      return generateEngagementHTML(selectedTemplate);
    } else if (typeKey === 'invoice' || typeKey === 'facture') {
      return generateFactureHTML(selectedTemplate, isSociete ? societeData : null);
    } else if (typeKey === 'quote' || typeKey === 'devis') {
      return generateDevisHTML(selectedTemplate);
    } else if (typeKey === 'payment' || typeKey === 'versement' || typeKey === 'receipt' || typeKey === 'recu') {
      return generateRecuHTML(selectedTemplate);
    } else if (typeKey === 'inspection') {
      return generateInspectionHTML(selectedTemplate);
    } else {
      return generateContractHTML(selectedTemplate);
    }
  };

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className={`bg-gradient-to-r ${getHeaderColor()} px-8 py-6 flex items-center justify-between`}>
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">
                {getDocumentTitle()}
              </h2>
              {/* Template Selector */}
              <div className="flex gap-2 ml-8">
                <button
                  onClick={() => setSelectedTemplate('fr')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    selectedTemplate === 'fr'
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-500 text-white hover:bg-blue-400'
                  }`}
                >
                  🇫🇷 Français
                </button>
                <button
                  onClick={() => setSelectedTemplate('ar')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    selectedTemplate === 'ar'
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-500 text-white hover:bg-blue-400'
                  }`}
                >
                  🇸🇦 العربية
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content Area with Preview */}
          <div className="flex-1 overflow-auto bg-gradient-to-b from-gray-50 to-white p-8">

            {/* Société Option - Only for invoice/facture */}
            {(type === 'invoice' || type === 'facture') && (
              <div className="mb-5 border-2 border-amber-300 rounded-xl overflow-hidden">
                {/* Checkbox header */}
                <label className="flex items-center gap-3 px-4 py-3 bg-amber-50 cursor-pointer select-none hover:bg-amber-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={isSociete}
                    onChange={e => setIsSociete(e.target.checked)}
                    className="w-5 h-5 accent-amber-600 cursor-pointer"
                  />
                  <span className="text-xl">&#x1F3E2;</span>
                  <div className="flex-1">
                    <div className="font-bold text-amber-800 text-sm">
                      {lang === 'fr' ? 'Facturation Société' : 'فاتورة شركة'}
                    </div>
                    <div className="text-xs text-amber-600">
                      {lang === 'fr' ? 'Cochez pour ajouter les informations de la société sur la facture' : 'حدد لإضافة معلومات الشركة إلى الفاتورة'}
                    </div>
                  </div>
                  {isSociete && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-600 text-white">
                      {lang === 'fr' ? 'ACTIF' : 'مفعل'}
                    </span>
                  )}
                </label>

                {/* Fields - shown when checked */}
                {isSociete && (
                  <div className="p-4 bg-white border-t border-amber-200 space-y-3">
                    <p className="text-xs text-amber-600 font-semibold">
                      {lang === 'fr'
                        ? 'Remplissez les champs voulus — seuls les champs remplis apparaitront sur la facture.'
                        : 'ملأ الحقول المطلوبة — ستظهر فقط الحقول المملوئة على الفاتورة.'}
                    </p>
                    <div className="grid grid-cols-2 gap-3">

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-700 uppercase tracking-wide block">&#x1F464; {lang === 'fr' ? 'Conducteur' : 'المسؤول'}</label>
                        <input type="text" value={societeData.conducteur}
                          onChange={e => setSocieteData(prev => ({ ...prev, conducteur: e.target.value }))}
                          placeholder={lang === 'fr' ? 'Nom du conducteur' : 'اسم المسؤول'}
                          className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-300"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-700 uppercase tracking-wide block">&#x1F4CB; RC</label>
                        <input type="text" value={societeData.rc}
                          onChange={e => setSocieteData(prev => ({ ...prev, rc: e.target.value }))}
                          placeholder="Ex: 12/00-0000000B19"
                          className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-300"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-700 uppercase tracking-wide block">&#x1F3DB;&#xFE0F; ART</label>
                        <input type="text" value={societeData.art}
                          onChange={e => setSocieteData(prev => ({ ...prev, art: e.target.value }))}
                          placeholder="Ex: 000000000"
                          className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-300"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-700 uppercase tracking-wide block">&#x1F522; NIS</label>
                        <input type="text" value={societeData.nis}
                          onChange={e => setSocieteData(prev => ({ ...prev, nis: e.target.value }))}
                          placeholder="Ex: 000000000000000"
                          className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-300"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-700 uppercase tracking-wide block">&#x1FAA6; NIF</label>
                        <input type="text" value={societeData.nif}
                          onChange={e => setSocieteData(prev => ({ ...prev, nif: e.target.value }))}
                          placeholder="Ex: 000000000000000"
                          className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-300"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-700 uppercase tracking-wide block">&#x2709;&#xFE0F; Email</label>
                        <input type="email" value={societeData.email}
                          onChange={e => setSocieteData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="societe@example.com"
                          className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-300"
                        />
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Second Conductor Search (only for contract) */}
            {type === 'contract' && (
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-5">
                <h3 className="font-bold text-lg text-blue-900 mb-4 flex items-center gap-2">
                  👥 {lang === 'fr' ? 'Ajouter un Conducteur Secondaire' : 'إضافة سائق ثانوي'}
                </h3>
                
                {/* Search Input + New Client */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder={lang === 'fr'
                        ? 'Tapez le nom, prénom ou numéro de téléphone...'
                        : 'اكتب الاسم أو رقم الهاتف...'}
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSearchQuery(value);
                        if (value.length > 0) {
                          searchClients(value);
                        } else {
                          setSearchResults([]);
                          setShowSearchResults(false);
                        }
                      }}
                      onFocus={() => {
                        if (searchQuery.length > 0) {
                          setShowSearchResults(true);
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-base"
                      autoComplete="off"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                          setShowSearchResults(false);
                        }}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setIsClientModalOpen(true)}
                    className="whitespace-nowrap px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Plus size={18} />
                    {lang === 'fr' ? 'Nouveau Client' : 'عميل جديد'}
                  </button>
                </div>
                
                {/* Selected Conductor Display */}
                {secondConductor && (
                  <div className="bg-green-100 border-2 border-green-400 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-green-900 text-lg">
                          {(secondConductor.first_name || secondConductor.firstName)} {(secondConductor.last_name || secondConductor.lastName)}
                        </p>
                        <p className="text-sm text-green-700">📱 {secondConductor.phone || 'N/A'}</p>
                        <p className="text-sm text-green-700">🎫 {(secondConductor.license_number || secondConductor.licenseNumber) || 'N/A'}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSecondConductor(null);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
                      >
                        ✕ {lang === 'fr' ? 'Retirer' : 'إزالة'}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Search Results Dropdown */}
                {showSearchResults && searchQuery && (
                  <div className="bg-white border-2 border-blue-300 rounded-lg overflow-hidden shadow-lg">
                    {searchResults.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto">
                        {searchResults.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => selectSecondConductor(client)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-100 border-b border-gray-200 last:border-b-0 transition-colors flex items-center justify-between group"
                          >
                            <div>
                              <p className="font-semibold text-gray-900 group-hover:text-blue-700">
                                {(client.first_name || client.firstName)} {(client.last_name || client.lastName)}
                              </p>
                              <p className="text-sm text-gray-600">
                                📱 {client.phone || 'N/A'} | 🎫 {(client.license_number || client.licenseNumber) || 'N/A'}
                              </p>
                            </div>
                            <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-gray-500 font-medium">
                          {lang === 'fr' 
                            ? '❌ Aucun client trouvé avec cet terme' 
                            : '❌ لم يتم العثور على عملاء بهذا المصطلح'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {lang === 'fr' 
                            ? 'Vérifiez le nom, prénom ou numéro de téléphone' 
                            : 'تحقق من الاسم أو رقم الهاتف'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* New Client modal — same form used in the reservation interface.
                On save the client is created and auto-selected as second conductor. */}
            {type === 'contract' && (
              <ClientModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onSave={handleSaveSecondConductor}
                lang={lang}
              />
            )}

            <div className="bg-white rounded-lg shadow-lg p-0 mx-auto" style={{ width: '210mm' }}>
              <iframe
                srcDoc={getCurrentTemplate()}
                style={{ 
                  width: '100%', 
                  height: '600px', 
                  border: 'none',
                  borderRadius: '0.5rem'
                }}
                title="Document Preview"
              />
            </div>
          </div>

          {/* Footer with Actions */}
          <div className="bg-gray-100 px-8 py-4 flex items-center justify-between border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-all"
            >
              {lang === 'fr' ? 'Fermer' : 'إغلاق'}
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Printer size={18} />
              {isPrinting ? (lang === 'fr' ? 'Impression...' : 'جاري الطباعة...') : (lang === 'fr' ? 'Imprimer' : 'طباعة')}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};
