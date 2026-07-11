import { SidebarItem, Agency, Car } from './types';

/**
 * Scène Spline 3D du hero de la page d'accueil publique.
 * TODO : coller ici l'URL .splinecode d'une scène de VOITURE dont vous avez
 * les droits (export "Code" → "React" dans votre compte Spline, ex :
 * "https://prod.spline.design/xxxxxxxx/scene.splinecode").
 * Tant que cette constante est vide, le hero affiche le visuel statique
 * (anneaux animés + logo) — rien ne casse.
 */
export const HERO_SPLINE_SCENE_URL = '';

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: { fr: 'Tableau de bord', ar: 'لوحة القيادة' }, icon: '📊' },
  { id: 'planner', label: { fr: 'Planificateur', ar: 'المخطط' }, icon: '📅' },
  { id: 'reservations', label: { fr: 'Contrats', ar: 'العقود' }, icon: '🧾' },
  { id: 'services', label: { fr: 'Services', ar: 'الخدمات' }, icon: '🛎️' },
  { id: 'vehicles', label: { fr: 'Véhicules', ar: 'المركبات' }, icon: '🚗' },
  { id: 'maintenance', label: { fr: 'Maintenance', ar: 'الصيانة' }, icon: '🔧' },
  { id: 'clients', label: { fr: 'Clients', ar: 'العملاء' }, icon: '👥' },
  { id: 'agencies', label: { fr: 'Agences', ar: 'الوكالات' }, icon: '🏢' },
  { id: 'team', label: { fr: 'Équipe', ar: 'الفريق' }, icon: '🤝' },
  { id: 'expenses', label: { fr: 'Dépenses', ar: 'المصاريف' }, icon: '📉' },
  { id: 'car-gains', label: { fr: 'Gains par Véhicule', ar: 'الأرباح حسب المركبة' }, icon: '💰' },
  { id: 'reports', label: { fr: 'Rapports', ar: 'التقارير' }, icon: '📄' },
  { id: 'config', label: { fr: 'Configuration', ar: 'الإعدادات' }, icon: '🛠️' },
];

/**
 * Actions (boutons) disponibles par interface, pour la configuration fine des
 * permissions (voir WorkerPermission dans types.ts et PermissionsEditor — Prompt 4).
 * La clé correspond à SIDEBAR_ITEMS[].id. On ne référence que les interfaces
 * conservées après Prompt 6 (protection-services / personalization / web-mgmt /
 * web-orders sont supprimées).
 *
 * NOTE : ces listes reflètent les actions réelles des pages. Elles seront affinées
 * quand chaque page verra ses boutons câblés au hook usePermission (Prompt 4/7).
 */
export const INTERFACE_ACTIONS: Record<string, { id: string; label: { fr: string; ar: string } }[]> = {
  dashboard: [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
  ],
  planner: [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
    { id: 'create', label: { fr: 'Créer une réservation', ar: 'إنشاء حجز' } },
  ],
  reservations: [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
    { id: 'create', label: { fr: 'Créer', ar: 'إنشاء' } },
    { id: 'edit', label: { fr: 'Modifier', ar: 'تعديل' } },
    { id: 'delete', label: { fr: 'Supprimer', ar: 'حذف' } },
    { id: 'status', label: { fr: 'Changer le statut', ar: 'تغيير الحالة' } },
    { id: 'payment', label: { fr: 'Ajouter un paiement', ar: 'إضافة دفعة' } },
    { id: 'print', label: { fr: 'Imprimer le contrat', ar: 'طباعة العقد' } },
    { id: 'export', label: { fr: 'Exporter', ar: 'تصدير' } },
  ],
  services: [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
    { id: 'create', label: { fr: 'Créer', ar: 'إنشاء' } },
    { id: 'edit', label: { fr: 'Modifier', ar: 'تعديل' } },
    { id: 'delete', label: { fr: 'Supprimer', ar: 'حذف' } },
  ],
  vehicles: [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
    { id: 'create', label: { fr: 'Ajouter un véhicule', ar: 'إضافة مركبة' } },
    { id: 'edit', label: { fr: 'Modifier', ar: 'تعديل' } },
    { id: 'delete', label: { fr: 'Supprimer', ar: 'حذف' } },
  ],
  maintenance: [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
    { id: 'create', label: { fr: 'Ajouter', ar: 'إضافة' } },
    { id: 'edit', label: { fr: 'Modifier', ar: 'تعديل' } },
    { id: 'delete', label: { fr: 'Supprimer', ar: 'حذف' } },
  ],
  clients: [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
    { id: 'create', label: { fr: 'Créer', ar: 'إنشاء' } },
    { id: 'edit', label: { fr: 'Modifier', ar: 'تعديل' } },
    { id: 'delete', label: { fr: 'Supprimer', ar: 'حذف' } },
    { id: 'export', label: { fr: 'Exporter', ar: 'تصدير' } },
  ],
  agencies: [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
    { id: 'create', label: { fr: 'Créer', ar: 'إنشاء' } },
    { id: 'edit', label: { fr: 'Modifier', ar: 'تعديل' } },
    { id: 'delete', label: { fr: 'Supprimer', ar: 'حذف' } },
  ],
  team: [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
    { id: 'create', label: { fr: 'Ajouter un travailleur', ar: 'إضافة موظف' } },
    { id: 'edit', label: { fr: 'Modifier', ar: 'تعديل' } },
    { id: 'delete', label: { fr: 'Supprimer', ar: 'حذف' } },
    { id: 'permissions', label: { fr: 'Gérer les permissions', ar: 'إدارة الصلاحيات' } },
    { id: 'payroll', label: { fr: 'Acomptes / Absences / Paie', ar: 'السلف / الغياب / الأجر' } },
  ],
  expenses: [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
    { id: 'create', label: { fr: 'Créer', ar: 'إنشاء' } },
    { id: 'edit', label: { fr: 'Modifier', ar: 'تعديل' } },
    { id: 'delete', label: { fr: 'Supprimer', ar: 'حذف' } },
    { id: 'export', label: { fr: 'Exporter', ar: 'تصدير' } },
  ],
  'car-gains': [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
    { id: 'export', label: { fr: 'Exporter', ar: 'تصدير' } },
  ],
  reports: [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
    { id: 'export', label: { fr: 'Exporter', ar: 'تصدير' } },
  ],
  config: [
    { id: 'view', label: { fr: 'Voir', ar: 'عرض' } },
    { id: 'edit', label: { fr: 'Modifier', ar: 'تعديل' } },
  ],
};

// Agencies data
export const AGENCIES: Agency[] = [
  {
    id: '1',
    name: 'Agence Centre Ville',
    address: '123 Rue Principal, Alger Centre',
    city: 'Alger'
  },
  {
    id: '2',
    name: 'Agence Aéroport',
    address: 'Aéroport Houari Boumediene, Alger',
    city: 'Alger'
  },
  {
    id: '3',
    name: 'Agence Oran',
    address: '456 Boulevard de la République, Oran',
    city: 'Oran'
  },
  {
    id: '4',
    name: 'Agence Constantine',
    address: '789 Rue de France, Constantine',
    city: 'Constantine'
  }
];

// Car images data
export const CAR_IMAGES = {
  toyota: [
    'https://images.unsplash.com/photo-1560958089-b8a63dd8aa8b?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=500&h=400&fit=crop'
  ],
  renault: [
    'https://images.unsplash.com/photo-1549399735-cef2e2c3f638?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560958089-b8a63dd8aa8b?w=500&h=400&fit=crop'
  ],
  peugeot: [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1549399735-cef2e2c3f638?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560958089-b8a63dd8aa8b?w=500&h=400&fit=crop'
  ],
  citroen: [
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560958089-b8a63dd8aa8b?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1549399735-cef2e2c3f638?w=500&h=400&fit=crop'
  ],
  bmw: [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560958089-b8a63dd8aa8b?w=500&h=400&fit=crop'
  ],
  mercedes: [
    'https://images.unsplash.com/photo-1549399735-cef2e2c3f638?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560958089-b8a63dd8aa8b?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=400&fit=crop'
  ],
  audi: [
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1549399735-cef2e2c3f638?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560958089-b8a63dd8aa8b?w=500&h=400&fit=crop'
  ],
  default: [
    'https://images.unsplash.com/photo-1560958089-b8a63dd8aa8b?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1549399735-cef2e2c3f638?w=500&h=400&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=400&fit=crop'
  ]
};

export const TRANSLATIONS = {
  fr: {
    login: 'Connexion',
    email: 'Email',
    password: 'Mot de passe',
    username: 'Nom d\'utilisateur',
    fullName: 'Nom complet',
    signup: 'Créer un compte',
    admin: 'Administrateur',
    worker: 'Employé',
    driver: 'Chauffeur',
    logout: 'Déconnexion',
    welcome: 'Bienvenue',
    changeLang: 'العربية',
  },
  ar: {
    login: 'تسجيل الدخول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    username: 'اسم المستخدم',
    fullName: 'الاسم الكامل',
    signup: 'إنشاء حساب',
    admin: 'مدير',
    worker: 'موظف',
    driver: 'سائق',
    logout: 'تسجيل الخروج',
    welcome: 'مرحباً',
    changeLang: 'Français',
  }
};
