import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './components/Login';
import { CarsPage } from './components/CarsPage';
import { MaintenancePage } from './components/MaintenancePage';
import { AgenciesPage } from './components/AgenciesPage';
import { ClientsPage } from './components/ClientsPage';
import { EquipePage } from './components/EquipePage';
import { ExpensesPage } from './components/ExpensesPage';
import { ConfigPage } from './components/ConfigPage';
import { ProtectionServicesPage } from './components/ProtectionServicesPage';
import { PlannerPage } from './components/PlannerPage';
import { Website } from './components/Website';
import { DashboardPage } from './components/DashboardPage';
import ReportsPage from './components/ReportsPage';
import { CarGainsPage } from './components/CarGainsPage';
import { ReservationsPage } from './components/ReservationsPage';
import { Language, User, UserRole, Car, Agency } from './types';
import { supabase, supabaseConfigured } from './supabase';
import { SIDEBAR_ITEMS } from './constants';
import { DatabaseService } from './services/DatabaseService';
import { setupErrorInterceptor } from './utils/errorInterceptor';
import { DebugAuth } from './utils/debugAuth';
import { sessionService } from './utils/sessionService';

// Initialize global error interceptor on load
setupErrorInterceptor();

// Make Supabase available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).__supabase__ = supabase;
}

// ── Mock fallback data (module scope so its identity is stable across renders) ──
const mockCars: Car[] = [
  {
    id: '1', brand: 'Toyota', model: 'Prius', registration: 'AB-123-CD', year: 2021,
    color: 'Blanc', vin: 'VIN123456', energy: 'Hybride', transmission: 'Automatique',
    seats: 5, doors: 4, priceDay: 5000, priceWeek: 28000, priceMonth: 90000, deposit: 50000,
    images: ['https://images.unsplash.com/photo-1560958089-b8a63dd8aa8b?w=500&h=400&fit=crop'], mileage: 45000,
  },
  {
    id: '2', brand: 'Mercedes', model: 'E-Class', registration: 'AB-456-EF', year: 2022,
    color: 'Noir', vin: 'VIN789012', energy: 'Essence', transmission: 'Automatique',
    seats: 5, doors: 4, priceDay: 12000, priceWeek: 70000, priceMonth: 200000, deposit: 100000,
    images: ['https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=500&h=400&fit=crop'], mileage: 23000,
  },
  {
    id: '3', brand: 'BMW', model: 'X5', registration: 'AB-789-GH', year: 2023,
    color: 'Gris', vin: 'VIN345678', energy: 'Essence', transmission: 'Automatique',
    seats: 7, doors: 4, priceDay: 15000, priceWeek: 85000, priceMonth: 250000, deposit: 125000,
    images: ['https://images.unsplash.com/photo-1605559424843-9e4c3ff86981?w=500&h=400&fit=crop'], mileage: 5000,
  },
];

const mockAgencies: Agency[] = [
  { id: '1', name: 'Luxdrive Alger Centre', address: 'Boulevard Didouche Mourad', city: 'Alger', createdAt: '2024-01-01T00:00:00.000Z' },
  { id: '2', name: 'Luxdrive Oran', address: 'Boulevard Khémisti', city: 'Oran', createdAt: '2024-01-01T00:00:00.000Z' },
  { id: '3', name: 'Luxdrive Annaba', address: 'Rue Larbi Ben Mhidi', city: 'Annaba', createdAt: '2024-01-01T00:00:00.000Z' },
];

const mockContactInfo = {
  facebook: 'https://facebook.com/luxdrive', instagram: '@luxdrive_dz', tiktok: '@luxdrive',
  whatsapp: '+213 5 1234 5678', phone: '+213 5 1234 5678', address: 'Alger, Algeria', email: 'contact@luxdrive.com',
};

const mockWebsiteSettings = {
  name: 'Luxdrive Premium',
  description: 'Votre partenaire de confiance en location de véhicules',
  logo: 'https://images.unsplash.com/photo-1560958089-b8a63dd8aa8b?w=200&h=200&fit=crop',
};

// ── Shared props for the authenticated shell ───────────────────────────────────
interface DashboardLayoutProps {
  lang: Language;
  setLang: (l: Language) => void;
  user: User | null;
  isAuthLoading: boolean;
  cars: Car[];
  websiteSettings: any;
  activeTab: string;
  onTabChange: (id: string) => void;
  onLogout: () => void;
  maintenanceAlertsCount: number;
  isSidebarVisible: boolean;
  setIsSidebarVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Authenticated shell (Sidebar + Navbar + active page).
 * Hoisted to module scope so its component identity is STABLE across App
 * re-renders. Previously it was declared inside App(), so every App state
 * change (cars/website/alerts loads, the 5-min alert poll, navigation) gave it
 * a new identity and React fully remounted the whole page tree — which made
 * every screen refetch and flash its loader ("refreshing multiple times").
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  lang, setLang, user, isAuthLoading, cars, websiteSettings, activeTab,
  onTabChange, onLogout, maintenanceAlertsCount, isSidebarVisible, setIsSidebarVisible,
}) => {
  const activeItem = SIDEBAR_ITEMS.find(item => item.id === activeTab) || SIDEBAR_ITEMS[0];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage lang={lang} isAuthLoading={isAuthLoading} user={user} />;
      case 'planner':
        return <PlannerPage lang={lang} isAuthLoading={isAuthLoading} user={user} />;
      case 'car-gains':
        return <CarGainsPage lang={lang} />;
      case 'vehicles':
        return <CarsPage lang={lang} isAuthLoading={isAuthLoading} user={user} />;
      case 'maintenance':
        return <MaintenancePage lang={lang} isAuthLoading={isAuthLoading} user={user} />;
      case 'agencies':
        return <AgenciesPage lang={lang} />;
      case 'clients':
        return <ClientsPage lang={lang} isAuthLoading={isAuthLoading} user={user} />;
      case 'team':
        return <EquipePage lang={lang} />;
      case 'expenses':
        return <ExpensesPage lang={lang} cars={cars} />;
      case 'services':
        return <ProtectionServicesPage lang={lang} />;
      case 'reservations':
        return <ReservationsPage lang={lang} isAuthLoading={isAuthLoading} user={user} />;
      case 'reports':
        return <ReportsPage lang={lang} />;
      case 'config':
        return user ? <ConfigPage lang={lang} user={user} /> : null;
      default:
        return (
          <div className="space-y-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-black text-saas-text-main uppercase tracking-tighter">
                {activeItem.icon} {activeItem.label[lang]}
              </h2>
              <p className="text-saas-text-muted font-bold uppercase text-[10px] tracking-widest">
                {lang === 'fr'
                  ? `Interface pour ${activeItem.label.fr}`
                  : `واجهة لـ ${activeItem.label.ar}`}
              </p>
            </div>

            <div className="glass-card p-12 min-h-[500px] flex items-center justify-center border-dashed border-saas-border bg-white group">
              <div className="text-center space-y-6">
                <div className="text-8xl opacity-10 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-110">
                  {activeItem.icon}
                </div>
                <div className="space-y-3">
                  <p className="text-saas-text-main font-black text-2xl uppercase tracking-tighter">
                    {lang === 'fr' ? 'Contenu en développement' : 'المحتوى قيد التطوير'}
                  </p>
                  <p className="text-saas-text-muted text-sm font-medium max-w-md mx-auto">
                    {lang === 'fr'
                      ? 'Cette section est en cours de modernisation pour correspondre à votre nouveau standard SaaS.'
                      : 'هذا القسم قيد التحديث ليتناسب مع معايير SaaS الجديدة الخاصة بك.'}
                  </p>
                </div>
                <button className="btn-saas-primary px-8 py-3">
                  {lang === 'fr' ? 'En savoir plus' : 'معرفة المزيد'}
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`flex min-h-screen bg-saas-bg text-saas-text-main ${lang === 'ar' ? 'font-arabic' : ''}`}>
      {!supabaseConfigured && (
        <div className="fixed inset-0 bg-yellow-100 text-yellow-900 flex items-center justify-center z-50 p-4 text-center">
          <strong>Warning:</strong> Supabase variables are missing. Set
          <code className="mx-1">VITE_SUPABASE_URL</code> and
          <code className="mx-1">VITE_SUPABASE_ANON_KEY</code> in your environment.
        </div>
      )}
      <Sidebar
        lang={lang}
        isVisible={isSidebarVisible}
        setIsVisible={setIsSidebarVisible}
        onLogout={onLogout}
        activeTab={activeTab}
        setActiveTab={onTabChange}
        alertsCount={maintenanceAlertsCount}
        websiteSettings={websiteSettings}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          user={user}
          lang={lang}
          setLang={setLang}
          toggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
        />

        <main className="flex-1 p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarVisible(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Gate for protected routes. Hoisted to module scope alongside DashboardLayout
 * so React keeps the shell mounted across App re-renders instead of remounting.
 */
const ProtectedRoute: React.FC<DashboardLayoutProps> = (props) => {
  if (props.isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-saas-bg">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-saas-primary-via border-t-saas-primary-start rounded-full mx-auto mb-4"
          />
          <p className="text-saas-text-muted">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!props.user) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout {...props} />;
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Language>('fr');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Add loading state
  const [isSidebarVisible, setIsSidebarVisible] = useState(window.innerWidth >= 1024);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cars, setCars] = useState<Car[]>([]);
  const [specialOffers, setSpecialOffers] = useState<any[]>([]);
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [websiteSettings, setWebsiteSettings] = useState<any>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoadingAgenciesForWebsite, setIsLoadingAgenciesForWebsite] = useState(true);
  const [maintenanceAlertsCount, setMaintenanceAlertsCount] = useState(0);
  
  // Refs to prevent multiple listener initialization (especially important in StrictMode dev environment)
  const authListenerInitialized = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isWebsiteMode = location.pathname === '/website';

  // Sync URL with active tab - extract tab from URL on mount and when URL changes
  useEffect(() => {
    const pathname = location.pathname;
    
    // Map URL paths to tab IDs
    const pathMap: Record<string, string> = {
      '/dashboard': 'dashboard',
      '/planificateur': 'planner',
      '/gains-vehicule': 'car-gains',
      '/vehicules': 'vehicles',
      '/maintenance': 'maintenance',
      '/clients': 'clients',
      '/agences': 'agencies',
      '/equipe': 'team',
      '/depenses': 'expenses',
      '/services': 'services',
      '/reservations': 'reservations',
      '/rapports': 'reports',
      '/configuration': 'config',
      '/': 'dashboard', // Default to dashboard
    };

    const tabId = pathMap[pathname] || 'dashboard';
    setActiveTab(tabId);
  }, [location.pathname]);

  // Responsive sidebar visibility
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarVisible(true);
      } else {
        setIsSidebarVisible(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update URL when active tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    const urlMap: Record<string, string> = {
      'dashboard': '/dashboard',
      'planner': '/planificateur',
      'car-gains': '/gains-vehicule',
      'vehicles': '/vehicules',
      'maintenance': '/maintenance',
      'clients': '/clients',
      'agencies': '/agences',
      'team': '/equipe',
      'expenses': '/depenses',
      'services': '/services',
      'reservations': '/reservations',
      'reports': '/rapports',
      'config': '/configuration',
    };
    
    // Navigate with empty state to clear any previous location.state
    // This prevents pages like MaintenancePage from re-opening modals
    // triggered by previous dashboard alert clicks
    navigate(urlMap[tabId] || '/dashboard', { state: {} });
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Load maintenance alerts count when user is authenticated
  useEffect(() => {
    if (!user || isAuthLoading) return;

    const loadAlerts = async () => {
      try {
        const alerts = await DatabaseService.getMaintenanceAlerts();
        setMaintenanceAlertsCount(alerts.length);
      } catch (err) {
        console.error('Error loading alerts:', err);
        setMaintenanceAlertsCount(0);
      }
    };

    loadAlerts();

    // Refresh alerts every 5 minutes
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, isAuthLoading]);

  // Load cars from database. La table cars est lisible en anonyme (RLS),
  // ce qui permet au site public d'afficher les vraies voitures sans connexion.
  useEffect(() => {
    const loadCars = async () => {
      try {
        const dbCars = await DatabaseService.getCars();
        setCars(dbCars.length > 0 ? dbCars : mockCars);
      } catch (error) {
        console.error('Failed to load cars from database:', error);
        // Fallback to mock data if database load fails
        setCars(mockCars);
      }
    };

    loadCars();
  }, [user]); // Recharge après connexion/déconnexion

  // Load website data from database
  useEffect(() => {
    const loadWebsiteData = async () => {
      try {
        const [dbSpecialOffers, dbContactInfo, dbWebsiteSettings] = await Promise.all([
          DatabaseService.getSpecialOffers(),
          DatabaseService.getWebsiteContacts(),
          DatabaseService.getWebsiteSettings(),
        ]);

        setSpecialOffers(dbSpecialOffers);
        setContactInfo(dbContactInfo || mockContactInfo);
        setWebsiteSettings(dbWebsiteSettings || mockWebsiteSettings);

        // Branding dynamique : le titre et le favicon suivent le logo/nom
        // de l'agence en base (les PNG de public/ restent le défaut statique).
        if (dbWebsiteSettings?.name) {
          document.title = `${dbWebsiteSettings.name.split(/\s+/).slice(0, 3).join(' ')} | Location de Voitures`;
        }
        if (dbWebsiteSettings?.logo) {
          document.querySelectorAll("link[rel='icon']").forEach(link => {
            (link as HTMLLinkElement).href = dbWebsiteSettings.logo;
          });
        }
      } catch (error) {
        console.error('Failed to load website data from database:', error);
        // Fallback to mock data if database load fails
        setSpecialOffers([]);
        setContactInfo(mockContactInfo);
        setWebsiteSettings(mockWebsiteSettings);
      }
    };

    loadWebsiteData();
  }, []); // Load once on mount

  // fetch agencies for public website mode (used by ReservationWizard)
  useEffect(() => {
    if (!isWebsiteMode) return;

    const loadAgencies = async () => {
      try {
        const dbAgencies = await DatabaseService.getAgencies();
        setAgencies(dbAgencies.length > 0 ? dbAgencies : mockAgencies);
      } catch (err) {
        console.error('Failed to load agencies for website:', err);
        setAgencies(mockAgencies);
      } finally {
        setIsLoadingAgenciesForWebsite(false);
      }
    };

    loadAgencies();
  }, [isWebsiteMode]);

  const handleLogin = (userObj: User) => {
    console.log('[Auth] ======= LOGIN HANDLER STARTED =======');
    console.log('[Auth] User logged in:', { name: userObj.name, role: userObj.role, email: userObj.email });
    console.log('[Auth] Current localStorage state:', {
      has_token: !!localStorage.getItem('supabase.auth.token'),
      token_preview: localStorage.getItem('supabase.auth.token')?.substring(0, 50) + '...'
    });
    setUser(userObj);
    // Add a delay before rendering dashboard to let Supabase settle
    setTimeout(() => {
      console.log('[Auth] 500ms delay complete, setting isAuthLoading to false');
      setIsAuthLoading(false);
    }, 500);
  };

  // Session restoration on app mount - use new session service
  useEffect(() => {
    if (authListenerInitialized.current) {
      console.log('[Auth] Session restoration already initialized, skipping');
      return;
    }
    
    authListenerInitialized.current = true;
    
    const restoreSession = async () => {
      console.log('\n[Auth] ======= SESSION RESTORATION STARTED =======');
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[Auth] Timestamp: ${timestamp}`);
      
      try {
        // Initialize session using new session service
        const session = await sessionService.initializeSession();
        
        if (!session) {
          console.log('[Auth] === No valid session found ===');
          setIsAuthLoading(false);
          return;
        }
        
        // CRITICAL: Sync the restored session with Supabase Auth SDK
        // This ensures Supabase queries work after page refresh
        console.log('[Auth] === Syncing session with Supabase ===');
        try {
          await supabase.auth.setSession({
            access_token: session.accessToken,
            refresh_token: session.refreshToken || ''
          });
          console.log('[Auth] Supabase session synchronized');
        } catch (syncError) {
          console.warn('[Auth] Failed to sync with Supabase:', syncError);
          // Continue anyway - local session is still valid
        }
        
        // Session restored from database/localStorage
        console.log('[Auth] === Session restored successfully ===');
        console.log('[Auth] User:', session.name, 'Role:', session.role);
        
        const userObj: User = {
          name: session.name,
          email: session.email,
          role: session.role as UserRole,
          avatar: '' // Add avatar property
        };
        
        setUser(userObj);
        console.log('[Auth] User state updated, ready to render dashboard');
        
        // Give React time to process state update before marking loading complete
        setTimeout(() => {
          console.log('[Auth] Setting isAuthLoading to false');
          setIsAuthLoading(false);
        }, 100);
        
      } catch (error) {
        console.error('[Auth] Session restoration error:', error);
        setUser(null);
        setIsAuthLoading(false);
      }
    };
    
    restoreSession();

    return () => {
      // No cleanup needed
    };
  }, []);

  const handleLogout = async () => {
    console.log('[Auth] Logout handler called');
    await sessionService.invalidateSession();
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

  // Props for the (module-scope) authenticated shell. Rebuilt each render, but
  // ProtectedRoute/DashboardLayout are stable component types, so React
  // reconciles them in place instead of remounting the whole page tree.
  const layoutProps: DashboardLayoutProps = {
    lang,
    setLang,
    user,
    isAuthLoading,
    cars,
    websiteSettings,
    activeTab,
    onTabChange: handleTabChange,
    onLogout: handleLogout,
    maintenanceAlertsCount,
    isSidebarVisible,
    setIsSidebarVisible,
  };

  return (
    <Routes>
      {/* Website route */}
      <Route path="/website" element={
        <Website
          lang={lang}
          onLangChange={setLang}
          // Le site public exclut les voitures masquées (isHiddenFromSite)
          cars={(cars.length > 0 ? cars : mockCars).filter(car => car.isHiddenFromSite !== true)}
          agencies={agencies.length > 0 ? agencies : mockAgencies}
          isLoadingAgencies={isLoadingAgenciesForWebsite}
          specialOffers={specialOffers}
          contactInfo={contactInfo}
          websiteSettings={websiteSettings}
        />
      } />

      {/* Login route */}
      <Route path="/login" element={
        isAuthLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-saas-bg">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-saas-primary-via border-t-saas-primary-start rounded-full mx-auto mb-4"
              />
              <p className="text-saas-text-muted">Loading...</p>
            </div>
          </div>
        ) : user ? (
          <Navigate to="/dashboard" replace />
        ) : (
          <Login lang={lang} onLogin={handleLogin} />
        )
      } />

      {/* Dashboard and all interface routes - all protected.
          A SINGLE layout route renders <ProtectedRoute>/<DashboardLayout> once;
          the 13 child routes carry no element of their own (the active page is
          chosen by activeTab inside DashboardLayout). Navigating between tabs
          therefore keeps the whole shell mounted — the Sidebar, Navbar and the
          current page are reconciled in place instead of being torn down and
          refetched. This is what stops the "interface refreshes multiple times". */}
      <Route element={<ProtectedRoute {...layoutProps} />}>
        <Route path="/dashboard" element={null} />
        <Route path="/planificateur" element={null} />
        <Route path="/gains-vehicule" element={null} />
        <Route path="/vehicules" element={null} />
        <Route path="/maintenance" element={null} />
        <Route path="/clients" element={null} />
        <Route path="/agences" element={null} />
        <Route path="/equipe" element={null} />
        <Route path="/depenses" element={null} />
        <Route path="/services" element={null} />
        <Route path="/reservations" element={null} />
        <Route path="/rapports" element={null} />
        <Route path="/configuration" element={null} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={
        isAuthLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-saas-bg">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-saas-primary-via border-t-saas-primary-start rounded-full mx-auto mb-4"
              />
              <p className="text-saas-text-muted">Loading...</p>
            </div>
          </div>
        ) : <Navigate to={user ? "/dashboard" : "/login"} replace />
      } />

      {/* Fallback for unknown routes */}
      <Route path="*" element={
        isAuthLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-saas-bg">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-saas-primary-via border-t-saas-primary-start rounded-full mx-auto mb-4"
              />
              <p className="text-saas-text-muted">Loading...</p>
            </div>
          </div>
        ) : <Navigate to={user ? "/dashboard" : "/login"} replace />
      } />
    </Routes>
  );
}