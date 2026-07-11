import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Language, Car, Agency, SpecialOffer, ReservationStep2, AdditionalService, ProtectionAssurance } from '../../../types';
import { DatabaseService } from '../../../services/DatabaseService';
import { getCurrentSpecialOfferForCar } from '../../../utils/specialOffers';
import { fromYmd } from './wizardUi';

// ═══ Modèle d'état du wizard de réservation (source unique de vérité) ═══
// Tout l'état vit ici : naviguer entre les étapes ne perd jamais les saisies.

export interface DateRangeSel {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

/** Critères de recherche pré-remplis depuis le landing (agences + période). */
export interface WizardSearchCriteria {
  from: string;               // YYYY-MM-DD
  to: string;                 // YYYY-MM-DD
  departureAgencyId: string;
  returnAgencyId?: string;    // absent = même agence qu'au départ
}

export const WIZARD_STEP_COUNT = 6;

const emptyPersonal: ReservationStep2 = {
  photo: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  dateOfBirth: '',
  placeOfBirth: '',
  licenseNumber: '',
  licenseExpiration: '',
  licenseDelivery: '',
  licenseDeliveryPlace: '',
  additionalDocType: 'none',
  additionalDocNumber: '',
  additionalDocDelivery: '',
  additionalDocExpiration: '',
  additionalDocDeliveryAddress: '',
  wilaya: '16 - Alger',
  completeAddress: '',
  scannedDocuments: [],
};

export type PromoStatus = 'idle' | 'checking' | 'valid' | 'invalid';

interface WizardContextValue {
  lang: Language;
  cars: Car[];
  agencies: Agency[];
  isLoadingAgencies: boolean;

  // Navigation
  step: number;                 // 1..6
  goToStep: (n: number) => void;
  next: () => void;
  prev: () => void;
  isStepValid: (n: number) => boolean;

  // Étape 1 — voiture + dates
  car: Car | null;
  selectCar: (car: Car | null) => void;
  range: DateRangeSel;
  setRange: React.Dispatch<React.SetStateAction<DateRangeSel>>;
  departureTime: string;
  setDepartureTime: (t: string) => void;
  returnTime: string;
  setReturnTime: (t: string) => void;
  blockedRanges: { from: string; to: string }[];
  loadingBlocked: boolean;

  // Recherche de disponibilité lancée depuis le landing
  search: WizardSearchCriteria | null;
  availableCars: Car[];          // = cars filtrées si recherche active, sinon toutes
  loadingAvailability: boolean;

  // Étape 2 — agences
  departureAgency: string;
  setDepartureAgency: (id: string) => void;
  differentReturnAgency: boolean;
  setDifferentReturnAgency: (b: boolean) => void;
  returnAgency: string;
  setReturnAgency: (id: string) => void;

  // Étape 5 — informations personnelles
  personal: ReservationStep2;
  setPersonal: React.Dispatch<React.SetStateAction<ReservationStep2>>;

  // Étape 3 — assurance de protection
  availableAssurances: ProtectionAssurance[];
  loadingAssurances: boolean;
  selectedAssurance: ProtectionAssurance | null;
  setSelectedAssurance: (a: ProtectionAssurance | null) => void;

  // Étape 4 — services
  availableServices: any[];
  loadingServices: boolean;
  selectedServices: AdditionalService[];
  toggleService: (service: AdditionalService) => void;

  // Étape 6 — récapitulatif
  notes: string;
  setNotes: (n: string) => void;

  // Code promo (vérifié côté serveur, consommé à la création)
  promoInput: string;
  setPromoInput: (v: string) => void;
  promoStatus: PromoStatus;
  promoDiscountPct: number;     // % appliqué si promoStatus === 'valid'
  verifyPromo: () => Promise<void>;
  clearPromo: () => void;

  // Tarification (remise d'offre spéciale appliquée si présente)
  days: number;
  promo: SpecialOffer | undefined;
  basePrice: number;
  discount: number;
  servicesTotal: number;
  assuranceTotal: number;
  promoDiscount: number;        // remise en DA du code promo
  total: number;

  // Soumission
  isSubmitting: boolean;
  submitError: string | null;
  submitted: boolean;
  submit: () => Promise<void>;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export const useWizard = (): WizardContextValue => {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within ReservationWizardProvider');
  return ctx;
};

interface ProviderProps {
  lang: Language;
  cars: Car[];
  agencies: Agency[];
  isLoadingAgencies: boolean;
  specialOffers: SpecialOffer[];
  initialCar?: Car | null;
  /** Recherche lancée depuis le landing : pré-remplit dates + agences et filtre les voitures disponibles. */
  initialSearch?: WizardSearchCriteria | null;
  children: React.ReactNode;
}

export const ReservationWizardProvider: React.FC<ProviderProps> = ({
  lang, cars, agencies, isLoadingAgencies, specialOffers, initialCar, initialSearch, children,
}) => {
  const search = initialSearch || null;

  // Navigation
  const [step, setStep] = useState(1);

  // Étape 1
  const [car, setCar] = useState<Car | null>(initialCar || null);
  const [range, setRange] = useState<DateRangeSel>(
    search ? { from: search.from, to: search.to } : {}
  );
  const [departureTime, setDepartureTime] = useState('10:00');
  const [returnTime, setReturnTime] = useState('10:00');
  const [blockedRanges, setBlockedRanges] = useState<{ from: string; to: string }[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Disponibilité (recherche landing) : ids des voitures indisponibles
  const [unavailableIds, setUnavailableIds] = useState<string[] | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(!!search);

  // Étape 2
  const [departureAgency, setDepartureAgency] = useState(search?.departureAgencyId || '');
  const [differentReturnAgency, setDifferentReturnAgency] = useState(
    !!(search?.returnAgencyId && search.returnAgencyId !== search.departureAgencyId)
  );
  const [returnAgency, setReturnAgency] = useState(
    search?.returnAgencyId && search.returnAgencyId !== search.departureAgencyId ? search.returnAgencyId : ''
  );

  // Étape 5
  const [personal, setPersonal] = useState<ReservationStep2>(emptyPersonal);

  // Étape 3 — assurance de protection
  const [availableAssurances, setAvailableAssurances] = useState<ProtectionAssurance[]>([]);
  const [loadingAssurances, setLoadingAssurances] = useState(false);
  const [selectedAssurance, setSelectedAssurance] = useState<ProtectionAssurance | null>(null);

  // Étape 4
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServices, setSelectedServices] = useState<AdditionalService[]>([]);

  // Étape 6
  const [notes, setNotes] = useState('');

  // Code promo
  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState<PromoStatus>('idle');
  const [promoDiscountPct, setPromoDiscountPct] = useState(0);

  // Soumission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Charge les dates bloquées de la voiture choisie (réservations pending/confirmed/active)
  useEffect(() => {
    if (!car) {
      setBlockedRanges([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingBlocked(true);
      try {
        const ranges = await DatabaseService.getReservedDateRangesForCar(car.id);
        if (!cancelled) setBlockedRanges(ranges);
      } catch (err) {
        console.warn('Failed to load blocked dates:', err);
        if (!cancelled) setBlockedRanges([]);
      } finally {
        if (!cancelled) setLoadingBlocked(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [car]);

  // Recherche du landing : charge les voitures indisponibles sur la période
  useEffect(() => {
    if (!search) return;
    let cancelled = false;
    const load = async () => {
      setLoadingAvailability(true);
      try {
        const ids = await DatabaseService.getUnavailableCarIds(search.from, search.to);
        if (!cancelled) setUnavailableIds(ids); // null = RPC absente → toutes affichées
      } catch {
        if (!cancelled) setUnavailableIds(null);
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [search?.from, search?.to]);

  // Charge les services une fois
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingServices(true);
        setAvailableServices(await DatabaseService.getServices());
      } catch {
        setAvailableServices([]);
      } finally {
        setLoadingServices(false);
      }
    };
    load();
  }, []);

  // Charge les assurances de protection disponibles une fois
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingAssurances(true);
        setAvailableAssurances(await DatabaseService.getProtectionAssurances());
      } catch {
        setAvailableAssurances([]);
      } finally {
        setLoadingAssurances(false);
      }
    };
    load();
  }, []);

  // Voitures proposées à l'étape 1 : filtrées par la recherche du landing
  const availableCars = useMemo(() => {
    if (!search || !unavailableIds) return cars;
    return cars.filter(c => !unavailableIds.includes(c.id));
  }, [cars, search, unavailableIds]);

  // Changer de voiture réinitialise les dates (les dates bloquées diffèrent par
  // voiture) — SAUF quand la période vient de la recherche du landing : les
  // voitures affichées sont déjà disponibles sur cette période.
  const selectCar = (newCar: Car | null) => {
    setCar(newCar);
    if (search && newCar) {
      setRange({ from: search.from, to: search.to });
    } else {
      setRange({});
    }
  };

  const toggleService = (service: AdditionalService) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      return exists ? prev.filter(s => s.id !== service.id) : [...prev, service];
    });
  };

  // ─── Validation par étape ───────────────────────────────────────────────────
  const isStepValid = (n: number): boolean => {
    switch (n) {
      case 1:
        return !!car && !!range.from && !!range.to && !!departureTime && !!returnTime;
      case 2:
        return !!departureAgency && (!differentReturnAgency || !!returnAgency);
      case 3:
        return true; // l'assurance de protection est optionnelle
      case 4:
        return true; // les services sont optionnels
      case 5:
        // Informations personnelles — mêmes champs obligatoires que le flux existant
        return !!(personal.firstName && personal.lastName && personal.phone && personal.email && personal.licenseNumber && personal.wilaya);
      case 6:
        return true;
      default:
        return false;
    }
  };

  const goToStep = (n: number) => {
    if (n < 1 || n > WIZARD_STEP_COUNT) return;
    // En avant : toutes les étapes précédentes doivent être valides
    if (n > step) {
      for (let i = step; i < n; i++) {
        if (!isStepValid(i)) return;
      }
    }
    setStep(n);
  };

  const next = () => goToStep(step + 1);
  const prev = () => goToStep(step - 1);

  // ─── Tarification ───────────────────────────────────────────────────────────
  const days = useMemo(() => {
    if (!range.from || !range.to) return 0;
    const diff = Math.ceil((fromYmd(range.to).getTime() - fromYmd(range.from).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }, [range.from, range.to]);

  const promo = car ? getCurrentSpecialOfferForCar(car.id, specialOffers) : undefined;
  const basePrice = car ? car.priceDay * days : 0;
  const discount = promo && car ? Math.max(0, (car.priceDay - promo.newPrice) * days) : 0;
  const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const assuranceTotal = selectedAssurance ? selectedAssurance.pricePerDay * days : 0;
  const subtotal = Math.max(0, basePrice - discount + servicesTotal + assuranceTotal);
  // Le code promo (en %) s'applique sur le sous-total final
  const promoDiscount = promoStatus === 'valid' && promoDiscountPct > 0
    ? Math.round(subtotal * (promoDiscountPct / 100))
    : 0;
  const total = Math.max(0, subtotal - promoDiscount);

  // ─── Code promo : vérification serveur (RPC, sans exposer la table) ─────────
  const verifyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoStatus('checking');
    try {
      const res = await DatabaseService.verifyPromoCode(code);
      if (res.valid && res.discountPercentage) {
        setPromoDiscountPct(res.discountPercentage);
        setPromoStatus('valid');
      } else {
        setPromoDiscountPct(0);
        setPromoStatus('invalid');
      }
    } catch {
      setPromoDiscountPct(0);
      setPromoStatus('invalid');
    }
  };

  const clearPromo = () => {
    setPromoInput('');
    setPromoStatus('idle');
    setPromoDiscountPct(0);
  };

  // ─── Soumission via RPC SECURITY DEFINER (fix RLS pour le rôle anon) ─────────
  // Client + réservation + services + consommation du code promo : une seule
  // transaction serveur. Garde anti double-clic ; les saisies survivent à une erreur.
  const submit = async () => {
    if (!car || isSubmitting || submitted) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const clientPayload = {
        first_name: personal.firstName,
        last_name: personal.lastName,
        phone: personal.phone,
        email: personal.email,
        date_of_birth: personal.dateOfBirth,
        place_of_birth: personal.placeOfBirth,
        id_card_number: personal.additionalDocType === 'id_card' ? (personal.additionalDocNumber || '') : '',
        license_number: personal.licenseNumber,
        license_expiration_date: personal.licenseExpiration,
        license_delivery_date: personal.licenseDelivery,
        license_delivery_place: personal.licenseDeliveryPlace,
        document_type: personal.additionalDocType,
        document_number: personal.additionalDocNumber,
        document_delivery_date: personal.additionalDocDelivery,
        document_expiration_date: personal.additionalDocExpiration,
        document_delivery_address: personal.additionalDocDeliveryAddress,
        wilaya: personal.wilaya,
        complete_address: personal.completeAddress,
        profile_photo: personal.photo,
        scanned_documents: personal.scannedDocuments || [],
      };

      const reservationPayload = {
        car_id: car.id,
        departure_date: range.from!,
        departure_time: departureTime,
        departure_agency_id: departureAgency,
        return_date: range.to!,
        return_time: returnTime,
        return_agency_id: differentReturnAgency ? returnAgency : departureAgency,
        price_per_day: car.priceDay,
        price_week: car.priceWeek ?? '',
        price_month: car.priceMonth ?? '',
        total_days: days,
        total_price: total,
        deposit: car.deposit,
        discount_amount: discount + promoDiscount,
        discount_type: 'fixed',
        notes,
        // Assurance de protection sélectionnée (snapshot nom + prix/jour)
        protection_assurance_id: selectedAssurance?.id || '',
        protection_assurance_name: selectedAssurance?.name || '',
        protection_assurance_price: selectedAssurance?.pricePerDay ?? 0,
      };

      const servicesPayload = selectedServices.map(s => ({
        category: (s as any).category || 'service',
        service_name: (s as any).name || (s as any).service_name || '',
        description: (s as any).description || '',
        price: s.price,
      }));

      await DatabaseService.createWebsiteReservation({
        client: clientPayload,
        reservation: reservationPayload,
        services: servicesPayload,
        promoCode: promoStatus === 'valid' ? promoInput.trim() : null,
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error('Reservation submit failed:', err);
      setSubmitError(
        lang === 'fr'
          ? `La réservation n'a pas pu être enregistrée : ${err.message || 'erreur inconnue'}. Vos informations sont conservées, vous pouvez réessayer.`
          : `تعذر تسجيل الحجز: ${err.message || 'خطأ غير معروف'}. تم الاحتفاظ بمعلوماتك، يمكنك المحاولة مرة أخرى.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const value: WizardContextValue = {
    lang, cars, agencies, isLoadingAgencies,
    step, goToStep, next, prev, isStepValid,
    car, selectCar, range, setRange,
    departureTime, setDepartureTime, returnTime, setReturnTime,
    blockedRanges, loadingBlocked,
    search, availableCars, loadingAvailability,
    departureAgency, setDepartureAgency, differentReturnAgency, setDifferentReturnAgency, returnAgency, setReturnAgency,
    personal, setPersonal,
    availableAssurances, loadingAssurances, selectedAssurance, setSelectedAssurance,
    availableServices, loadingServices, selectedServices, toggleService,
    notes, setNotes,
    promoInput, setPromoInput, promoStatus, promoDiscountPct, verifyPromo, clearPromo,
    days, promo, basePrice, discount, servicesTotal, assuranceTotal, promoDiscount, total,
    isSubmitting, submitError, submitted, submit,
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
};
