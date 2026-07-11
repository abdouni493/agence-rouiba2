export type Language = 'fr' | 'ar';

/**
 * Le rôle n'est plus une union figée : c'est le `name` d'un enregistrement
 * {@link Role} dynamique (table `roles`). On garde `UserRole = string` pour la
 * compatibilité ascendante — tous les contrôles `user.role === 'admin'`
 * existants continuent de fonctionner (le rôle système nommé 'admin' = accès total).
 */
export type UserRole = string;

/**
 * Rôle dynamique attribuable à un travailleur. Les rôles 'admin' et 'worker'
 * de base sont marqués `isSystem` et ne sont pas supprimables.
 */
export interface Role {
  id: string;
  name: string;
  isSystem?: boolean;
}

/**
 * Permission d'un travailleur sur une interface (entrée de SIDEBAR_ITEMS).
 * `interfaceId` correspond à SIDEBAR_ITEMS[].id ; `actions` liste les ids
 * d'actions autorisées (voir INTERFACE_ACTIONS dans constants.ts).
 */
export interface WorkerPermission {
  workerId: string;
  interfaceId: string;
  actions: string[];
}

export interface User {
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

export interface SidebarItem {
  id: string;
  label: {
    fr: string;
    ar: string;
  };
  icon: string;
}

export interface Car {
  id: string;
  brand: string;
  model: string;
  registration: string;
  year: number;
  color: string;
  vin: string;
  energy: string;
  transmission: string;
  seats: number;
  doors: number;
  priceDay: number;
  priceWeek: number;
  priceMonth: number;
  deposit: number;
  images: string[];
  mileage: number;
  fuelLevel?: 'full' | 'half' | 'quarter' | 'eighth' | 'empty';
  // Statut dérivé des réservations réelles (calculé par getCarsWithRealStatus).
  // Seul 'maintenance' peut être saisi manuellement en base.
  status?: 'disponible' | 'reserve' | 'louer' | 'maintenance' | 'available';
  // Masquée du site public (visible par défaut). Les vues admin l'affichent quand même.
  isHiddenFromSite?: boolean;
}

export type ExpenseType = 'vidange' | 'assurance' | 'controle' | 'chaine' | 'autre';

export interface Expense {
  id: string;
  carId: string;
  type: ExpenseType;
  cost: number;
  date: string;
  note?: string;
  // Specific fields
  nextVidangeKm?: number;
  expirationDate?: string;
  name?: string; // For 'autre'
}

export interface Rental {
  id: string;
  carId: string;
  clientId: string;
  clientName?: string;
  startDate: string;
  endDate: string;
  totalCost: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
}

export interface Agency {
  id: string;
  name: string;
  address: string;
  city: string;
  createdAt?: string;
}

export interface Client {
  id: string;
  // Personal Information
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;

  // Official Documents
  idCardNumber?: string;
  licenseNumber: string;
  licenseExpirationDate?: string;
  licenseDeliveryDate?: string;
  licenseDeliveryPlace?: string;

  // Additional Documents
  documentType?: 'id_card' | 'passport' | 'none';
  documentNumber?: string;
  documentDeliveryDate?: string;
  documentExpirationDate?: string;
  documentDeliveryAddress?: string;

  // Address & Location
  wilaya: string;
  completeAddress?: string;

  // Media
  profilePhoto?: string;
  scannedDocuments?: string[];

  createdAt: string;
  agencyId?: string;
}

export type PaymentType = 'daily' | 'monthly';

/** Acompte versé à un travailleur, déduit de sa paie. */
export interface WorkerAdvance {
  id: string;
  workerId: string;
  date: string;
  description?: string;
  amount: number;
  /** true une fois déduit dans une période de paie confirmée (ne pas re-déduire). */
  deducted?: boolean;
}

/** Absence d'un travailleur, dont le `cost` est déduit de sa paie. */
export interface WorkerAbsence {
  id: string;
  workerId: string;
  date: string;
  description?: string;
  cost: number;
  /** true une fois déduit dans une période de paie confirmée (ne pas re-déduire). */
  deducted?: boolean;
}

/**
 * Une période de paie ("Payement") pour un travailleur (un mois ou une plage de
 * jours). `finalAmount` est pré-calculé (base - acomptes - absences) mais reste
 * modifiable manuellement avant confirmation.
 */
export interface WorkerPayrollPeriod {
  id: string;
  workerId: string;
  periodLabel: string;       // ex. "2026-07" (mensuel) ou une plage de dates (journalier)
  baseAmount: number;
  advancesDeducted: number;
  absencesDeducted: number;
  finalAmount: number;       // modifiable manuellement, défaut = valeur calculée
  paymentDate: string;       // modifiable
  description?: string;
  paid: boolean;
}

/**
 * @deprecated Ancien modèle de paie. Conservé le temps que Prompt 5 migre
 * WorkerPaymentModal / ReportsPage vers {@link WorkerPayrollPeriod}.
 */
export interface WorkerPayment {
  id: string;
  amount: number;
  date: string;
  baseSalary: number;
  advances: number;
  absences: number;
  netSalary: number;
  note?: string;
}

export interface Worker {
  id: string;
  fullName: string;
  birthday: string;          // ISO date
  idCardNumber?: string;     // optionnel
  phone: string;
  roleId: string;
  photoUrl?: string;
  startDate: string;         // date de début de travail
  payment: {
    enabled: boolean;
    cycle?: 'daily' | 'monthly';
    amount?: number;
  };
  loginEnabled: boolean;
  email?: string;            // uniquement si loginEnabled
  username?: string;
  createdAt: string;
  /** Soft-delete : false = masqué mais conservé pour résoudre les `createdBy` historiques. */
  active?: boolean;
}
export interface StoreExpense {
  id: string;
  name: string;
  cost: number;
  date: string;
  note?: string;
  icon?: string;
  createdAt: string;
}

export interface VehicleExpense {
  id: string;
  carId: string;
  type: ExpenseType;
  cost: number;
  date: string;
  note?: string;
  currentMileage?: number;
  nextVidangeKm?: number;
  expirationDate?: string;
  expenseName?: string;
  createdAt: string;
}

export interface ReservationStep1 {
  carId: string;
  departureDate: string;
  departureTime: string;
  departureAgency: string;
  returnDate: string;
  returnTime: string;
  returnAgency: string;
  differentReturnAgency: boolean;
}

export interface ReservationStep2 {
  photo?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  licenseNumber: string;
  licenseExpiration?: string;
  licenseDelivery?: string;
  licenseDeliveryPlace?: string;
  additionalDocType?: 'id_card' | 'passport' | 'none';
  additionalDocNumber?: string;
  additionalDocDelivery?: string;
  additionalDocExpiration?: string;
  additionalDocDeliveryAddress?: string;
  wilaya: string;
  completeAddress?: string;
  scannedDocuments?: string[];
}

export interface Reservation {
  id: string;
  step1: ReservationStep1;
  step2: ReservationStep2;
  carInfo: Car;
  totalDays: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

// Une offre spéciale est une PROMOTION attachée à une voiture existante.
// isActive = affichée sur le site (le toggle masquer/afficher) ;
// startDate/endDate (optionnelles) limitent la période de validité de la promo.
export interface SpecialOffer {
  id: string;
  carId: string;
  car: Car;
  oldPrice: number;
  newPrice: number;
  note?: string;
  isActive: boolean;
  createdAt: string;
  label?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  startDate?: string;
  endDate?: string;
}

export interface ContactInfo {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
  email?: string;
}

export interface WebsiteSettings {
  name: string;
  description: string;
  logo?: string;
  phone_number_2?: string;
  bank_number?: string;
  address?: string;
  phone?: string;
  /** Image de fond du landing du site public (URL storage, affichée floutée). */
  landing_background?: string;
}

// Code promo utilisable sur la réservation du site public
export interface PromoCode {
  id: string;
  code: string;
  discountPercentage: number;
  isActive: boolean;
  isUsed: boolean;
  usedAt?: string | null;
  reservationId?: string | null;
  createdAt: string;
}

// Planner Types
export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  idCardNumber?: string;
  licenseNumber: string;
  licenseExpiration?: string;
  licenseDelivery?: string;
  licenseDeliveryPlace?: string;
  additionalDocType?: 'id_card' | 'passport' | 'none';
  additionalDocNumber?: string;
  additionalDocDelivery?: string;
  additionalDocExpiration?: string;
  additionalDocDeliveryAddress?: string;
  wilaya: string;
  completeAddress?: string;
  scannedDocuments?: string[];
  profilePhoto?: string;
  createdAt: string;
}

export interface InspectionItem {
  id: string;
  category: 'security' | 'equipment' | 'comfort' | 'cleanliness';
  name: string;
  checked: boolean;
}

export interface VehicleInspection {
  id: string;
  reservationId: string;
  type: 'departure' | 'return';
  mileage: number;
  fuelLevel: 'full' | 'half' | 'quarter' | 'eighth' | 'empty';
  location: string;
  date: string;
  time: string;
  interiorPhotos: string[];
  exteriorPhotos: string[];
  inspectionItems: InspectionItem[];
  notes: string;
  signature?: string;
  createdAt: string;
  mats?: boolean;
  spareTire?: boolean;
  lights?: boolean;
  windshield?: boolean;
  wheels?: boolean;
  suspension?: boolean;
}

export interface Payment {
  id: string;
  reservationId: string;
  amount: number;
  date: string;
  method: 'cash' | 'card' | 'transfer' | 'check';
  note?: string;
  createdAt: string;
}

export interface AdditionalService {
  id: string;
  category: 'decoration' | 'equipment' | 'insurance' | 'service';
  name: string;
  description?: string;
  price: number;
  selected: boolean;
}

// Un item d'un forfait d'assurance de protection (avec son statut vrai/faux).
export interface ProtectionAssuranceItem {
  linkId?: string;
  itemId: string;
  name: string;
  status: boolean;
  displayOrder?: number;
}

// Un forfait d'assurance de protection (nom + prix/jour + liste d'items).
export interface ProtectionAssurance {
  id: string;
  name: string;
  pricePerDay: number;
  isActive: boolean;
  createdAt: string;
  items: ProtectionAssuranceItem[];
}

export interface ReservationDetails {
  id: string;
  clientId: string;
  client: Client;
  carId: string;
  car: Car;
  step1: ReservationStep1;
  step2: ReservationStep2;
  additionalServices: AdditionalService[];
  deposit: number;
  totalDays: number;
  totalPrice: number;
  discountAmount: number;
  discountType: 'percentage' | 'fixed';
  advancePayment: number;
  remainingPayment: number;
  status: 'pending' | 'accepted' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'terminated';
  // Forfait d'assurance de protection sélectionné (snapshot + référence).
  protectionAssuranceId?: string;
  protectionAssuranceName?: string;
  protectionAssurancePrice?: number; // prix/jour au moment de la réservation
  protectionAssurance?: ProtectionAssurance; // détail (items) chargé pour l'affichage
  departureInspection?: VehicleInspection;
  returnInspection?: VehicleInspection;
  payments: Payment[];
  excessMileage?: number;
  missingFuel?: number;
  additionalFees: number;
  tvaApplied: boolean;
  notes?: string;
  conditions?: string;
  createdAt: string;
  activatedAt?: string;
  completedAt?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface Invoice {
  id: string;
  reservationId: string;
  clientId: string;
  clientName: string;
  carId: string;
  carInfo: string;
  invoiceNumber: string;
  date: string;
  subtotal: number;
  tvaAmount: number;
  additionalFees: number;
  totalAmount: number;
  totalPaid: number;
  remainingAmount: number;
  status: 'paid' | 'partial' | 'unpaid';
  type: 'invoice' | 'quote' | 'contract';
  payments: Payment[];
  createdAt: string;
}

export interface MaintenanceAlert {
  id: string;
  carId: string;
  carInfo: string;
  type: 'vidange' | 'assurance' | 'controle' | 'chaine';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  isExpired: boolean;
  daysUntilDue?: number;
  currentMileage?: number;
  nextServiceMileage?: number;
  createdAt: string;
}

export interface DashboardStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalReservations: number;
  activeReservations: number;
  totalClients: number;
  totalCars: number;
  availableCars: number;
  maintenanceAlerts: number;
  overduePayments: number;
  recentReservations: ReservationDetails[];
  revenueByMonth: { month: string; revenue: number }[];
  carUtilization: { carId: string; carInfo: string; utilization: number }[];
}

export interface WebsiteOrder {
  id: string;
  carId: string;
  car: Car;
  step1: ReservationStep1;
  step2: ReservationStep2;
  step3: {
    additionalServices: AdditionalService[];
  };
  totalDays: number;
  totalPrice: number;
  servicesTotal: number;
  // Assurance de protection sélectionnée
  protectionAssurance?: ProtectionAssurance;
  protectionAssuranceName?: string;
  assuranceTotal?: number;
  status: 'pending' | 'accepted' | 'confirmed' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  source: 'website';
}

// Document Template Types
export type DocumentType = 'contrat' | 'devis' | 'facture' | 'recu' | 'engagement';

export interface DocumentField {
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  maxWidth?: number;
  customText?: string; // For custom text blocks
  width?: number; // For images like logo
  height?: number; // For images like logo
  text?: string; // For dynamic text content
}

export interface DocumentTemplate {
  [key: string]: DocumentField;
}

export interface DocumentTemplates {
  contrat?: DocumentTemplate;
  devis?: DocumentTemplate;
  facture?: DocumentTemplate;
  recu?: DocumentTemplate;
  engagement?: DocumentTemplate;
}

export interface AgencySettings {
  id: string;
  agencyName: string;
  slogan?: string;
  address?: string;
  phone?: string;
  logo?: string;
  documentTemplates?: DocumentTemplates;
  createdAt: string;
  updatedAt: string;
}