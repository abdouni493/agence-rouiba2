import React, { useState, useEffect } from 'react';
import { Language, Car, SpecialOffer, ContactInfo, WebsiteSettings, PromoCode } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, EyeOff, Tag, Calendar, Ticket, RefreshCw, Trash2, Copy, Loader2, ImageIcon } from 'lucide-react';
import { DatabaseService } from '../services/DatabaseService';
import { uploadWebsiteImage } from '../services/uploadWebsiteImage';
import { CarCard } from './CarCard';

interface WebsiteManagementPageProps {
  lang: Language;
}

/** Code aléatoire lisible (sans 0/O/1/I) pour les codes promo. */
const generateRandomPromoCode = (length = 8): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const rand = new Uint32Array(length);
  crypto.getRandomValues(rand);
  for (let i = 0; i < length; i++) code += alphabet[rand[i] % alphabet.length];
  return code;
};

export const WebsiteManagementPage: React.FC<WebsiteManagementPageProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<'offers' | 'special' | 'promo' | 'contacts' | 'settings'>('offers');

  // OFFERS TAB — les voitures existantes s'affichent automatiquement
  // (même source de données que l'interface Voitures : la table cars).
  const [siteCars, setSiteCars] = useState<Car[]>([]);
  const [offerSearch, setOfferSearch] = useState('');

  // SPECIAL OFFERS STATE — la seule chose encore créable : une promotion liée à une voiture
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [specialSearch, setSpecialSearch] = useState('');
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);
  const [selectedCarSpecial, setSelectedCarSpecial] = useState<Car | null>(null);
  const [specialOldPrice, setSpecialOldPrice] = useState('');
  const [specialDiscountType, setSpecialDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [specialDiscountValue, setSpecialDiscountValue] = useState('');
  const [specialLabel, setSpecialLabel] = useState('');
  const [specialStartDate, setSpecialStartDate] = useState('');
  const [specialEndDate, setSpecialEndDate] = useState('');
  const [specialNote, setSpecialNote] = useState('');
  const [editingSpecial, setEditingSpecial] = useState<SpecialOffer | null>(null);

  // CONTACTS STATE
  const [contacts, setContacts] = useState<ContactInfo>({});
  const [settings, setSettings] = useState<WebsiteSettings>({
    name: '',
    description: '',
    logo: '',
    landing_background: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // SETTINGS — uploads (logo + image de fond, même bucket "website")
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  // PROMO CODES STATE
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [newPromoCode, setNewPromoCode] = useState(generateRandomPromoCode());
  const [newPromoPct, setNewPromoPct] = useState('10');
  const [creatingPromo, setCreatingPromo] = useState(false);

  const notify = (type: 'success' | 'error', message: string, ms = 4000) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), ms);
  };

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [carsData, specialOffersData, contactsData, settingsData] = await Promise.all([
          DatabaseService.getCars(),
          DatabaseService.getSpecialOffers(),
          DatabaseService.getWebsiteContacts(),
          DatabaseService.getWebsiteSettings(),
        ]);

        setSiteCars(carsData);
        setSpecialOffers(specialOffersData);
        setContacts(contactsData);
        setSettings(settingsData);
        setError(null);

        // Codes promo chargés à part : si la table n'existe pas encore
        // (migration non appliquée), le reste de la page fonctionne quand même.
        try {
          setPromoCodes(await DatabaseService.getPromoCodes());
          setPromoError(null);
        } catch (promoErr: any) {
          console.warn('Promo codes unavailable:', promoErr);
          setPromoError(promoErr.message || 'Table promo_codes indisponible');
        }
      } catch (error: any) {
        console.error('Error loading website data:', error);
        if (error.message?.includes('JWT') || error.message?.includes('auth') || error.code === 'PGRST301') {
          setError('Session expirée. Veuillez vous reconnecter.');
        } else {
          setError('Erreur lors du chargement des données du site web');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ─── CODES PROMO ────────────────────────────────────────────────────────────
  const handleCreatePromo = async () => {
    const pct = parseFloat(newPromoPct);
    const code = (newPromoCode || '').trim().toUpperCase();
    if (!code) {
      notify('error', lang === 'fr' ? 'Générez ou saisissez un code' : 'قم بإنشاء أو إدخال رمز');
      return;
    }
    if (!pct || pct <= 0 || pct > 100) {
      notify('error', lang === 'fr' ? 'Le pourcentage doit être entre 1 et 100' : 'يجب أن تكون النسبة بين 1 و 100');
      return;
    }
    setCreatingPromo(true);
    try {
      const created = await DatabaseService.createPromoCode(code, pct);
      setPromoCodes(prev => [created, ...prev]);
      setNewPromoCode(generateRandomPromoCode());
      setPromoError(null);
      notify('success', lang === 'fr' ? `Code ${created.code} créé (−${created.discountPercentage}%)` : `تم إنشاء الرمز ${created.code} (−${created.discountPercentage}%)`);
    } catch (err: any) {
      notify('error', err.message || (lang === 'fr' ? 'Erreur lors de la création du code' : 'خطأ في إنشاء الرمز'), 6000);
    } finally {
      setCreatingPromo(false);
    }
  };

  const handleDeletePromo = async (promo: PromoCode) => {
    if (!confirm(lang === 'fr' ? `Supprimer le code ${promo.code} ?` : `حذف الرمز ${promo.code}؟`)) return;
    try {
      await DatabaseService.deletePromoCode(promo.id);
      setPromoCodes(prev => prev.filter(p => p.id !== promo.id));
    } catch (err: any) {
      notify('error', err.message || (lang === 'fr' ? 'Erreur lors de la suppression' : 'خطأ في الحذف'));
    }
  };

  const handleTogglePromoActive = async (promo: PromoCode) => {
    try {
      await DatabaseService.setPromoCodeActive(promo.id, !promo.isActive);
      setPromoCodes(prev => prev.map(p => p.id === promo.id ? { ...p, isActive: !promo.isActive } : p));
    } catch (err: any) {
      notify('error', err.message || (lang === 'fr' ? 'Erreur lors du changement de statut' : 'خطأ في تغيير الحالة'));
    }
  };

  const handleCopyPromo = async (promo: PromoCode) => {
    try {
      await navigator.clipboard.writeText(promo.code);
      notify('success', lang === 'fr' ? `Code ${promo.code} copié !` : `تم نسخ الرمز ${promo.code}!`, 2000);
    } catch {
      /* clipboard indisponible : ignorer */
    }
  };

  // OFFERS TAB — toggle masquer/afficher une voiture sur le site
  // (mise à jour optimiste avec rollback si l'écriture échoue).
  const handleToggleCarVisibility = async (car: Car) => {
    const newHidden = !(car.isHiddenFromSite === true);
    setSiteCars(prev => prev.map(c => c.id === car.id ? { ...c, isHiddenFromSite: newHidden } : c));
    try {
      await DatabaseService.setCarVisibility(car.id, newHidden);
      setNotification({
        type: 'success',
        message: lang === 'fr'
          ? (newHidden ? `${car.brand} ${car.model} est maintenant masquée du site` : `${car.brand} ${car.model} est maintenant affichée sur le site`)
          : (newHidden ? `تم إخفاء ${car.brand} ${car.model} من الموقع` : `تم إظهار ${car.brand} ${car.model} على الموقع`),
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setSiteCars(prev => prev.map(c => c.id === car.id ? { ...c, isHiddenFromSite: !newHidden } : c));
      console.error('Error toggling car visibility:', error);
      setNotification({ type: 'error', message: error.message || (lang === 'fr' ? 'Erreur lors du changement de visibilité' : 'خطأ في تغيير الرؤية') });
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const offerTabCars = offerSearch.trim()
    ? siteCars.filter(car =>
        car.brand.toLowerCase().includes(offerSearch.toLowerCase()) ||
        car.model.toLowerCase().includes(offerSearch.toLowerCase()) ||
        car.registration.toLowerCase().includes(offerSearch.toLowerCase())
      )
    : siteCars;

  // SPECIAL OFFERS SEARCH
  const handleSpecialSearch = (query: string) => {
    setSpecialSearch(query);
    if (query.trim()) {
      const filtered = siteCars.filter(car =>
        car.brand.toLowerCase().includes(query.toLowerCase()) ||
        car.model.toLowerCase().includes(query.toLowerCase()) ||
        car.registration.toLowerCase().includes(query.toLowerCase()) ||
        car.vin.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCars(filtered);
    } else {
      setFilteredCars([]);
    }
  };

  const handleSelectCarSpecial = (car: Car) => {
    setSelectedCarSpecial(car);
    setSpecialSearch(`${car.brand} ${car.model}`);
    setFilteredCars([]);
    // Le prix original est proposé automatiquement depuis la voiture
    setSpecialOldPrice(String(car.priceDay));
  };

  // Prix promotionnel calculé à partir de la remise (pourcentage ou montant fixe)
  const computedSpecialNewPrice = (() => {
    const oldP = parseFloat(specialOldPrice);
    const val = parseFloat(specialDiscountValue);
    if (!oldP || !val || val <= 0) return null;
    const newP = specialDiscountType === 'percentage' ? oldP * (1 - val / 100) : oldP - val;
    return newP > 0 && newP < oldP ? Math.round(newP) : null;
  })();

  const specialDatesValid = !specialStartDate || !specialEndDate || specialStartDate <= specialEndDate;
  const isSpecialFormValid = !!selectedCarSpecial && !!computedSpecialNewPrice && specialDatesValid;

  const resetSpecialForm = () => {
    setShowSpecialModal(false);
    setEditingSpecial(null);
    setSelectedCarSpecial(null);
    setSpecialOldPrice('');
    setSpecialDiscountType('percentage');
    setSpecialDiscountValue('');
    setSpecialLabel('');
    setSpecialStartDate('');
    setSpecialEndDate('');
    setSpecialNote('');
    setSpecialSearch('');
    setFilteredCars([]);
  };

  const handleAddSpecial = async () => {
    if (!selectedCarSpecial || !computedSpecialNewPrice || !specialDatesValid) return;
    // La voiture liée doit toujours exister
    if (!siteCars.some(c => c.id === selectedCarSpecial.id)) {
      setNotification({ type: 'error', message: lang === 'fr' ? 'La voiture sélectionnée n\'existe plus' : 'السيارة المحددة لم تعد موجودة' });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    const payload = {
      carId: selectedCarSpecial.id,
      oldPrice: parseFloat(specialOldPrice),
      newPrice: computedSpecialNewPrice,
      note: specialNote,
      isActive: editingSpecial ? editingSpecial.isActive : true,
      label: specialLabel,
      discountType: specialDiscountType,
      discountValue: parseFloat(specialDiscountValue),
      startDate: specialStartDate,
      endDate: specialEndDate,
    };
    try {
      if (editingSpecial) {
        const updatedSpecial = await DatabaseService.updateSpecialOffer(editingSpecial.id, payload);
        setSpecialOffers(prev => prev.map(s => s.id === editingSpecial.id ? updatedSpecial : s));
      } else {
        const newSpecial = await DatabaseService.createSpecialOffer(payload);
        setSpecialOffers(prev => [newSpecial, ...prev]);
      }
      resetSpecialForm();
    } catch (error: any) {
      console.error('Error saving special offer:', error);
      setNotification({ type: 'error', message: error.message || (lang === 'fr' ? 'Erreur lors de la sauvegarde de l\'offre spéciale' : 'خطأ في حفظ العرض الخاص') });
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const handleDeleteSpecial = async (id: string) => {
    if (confirm(lang === 'fr' ? 'Êtes-vous sûr?' : 'هل أنت متأكد؟')) {
      try {
        await DatabaseService.deleteSpecialOffer(id);
        setSpecialOffers(prev => prev.filter(s => s.id !== id));
      } catch (error) {
        console.error('Error deleting special offer:', error);
        setNotification({ type: 'error', message: lang === 'fr' ? 'Erreur lors de la suppression' : 'خطأ في الحذف' });
        setTimeout(() => setNotification(null), 4000);
      }
    }
  };

  const handleEditSpecial = (special: SpecialOffer) => {
    setEditingSpecial(special);
    setSelectedCarSpecial(special.car);
    setSpecialOldPrice(special.oldPrice.toString());
    // Retrouve la remise stockée, sinon la déduit des prix ancien/nouveau
    if (special.discountType && special.discountValue) {
      setSpecialDiscountType(special.discountType);
      setSpecialDiscountValue(special.discountValue.toString());
    } else {
      setSpecialDiscountType('fixed');
      setSpecialDiscountValue(String(Math.max(0, special.oldPrice - special.newPrice)));
    }
    setSpecialLabel(special.label || '');
    setSpecialStartDate(special.startDate ? special.startDate.substring(0, 10) : '');
    setSpecialEndDate(special.endDate ? special.endDate.substring(0, 10) : '');
    setSpecialNote(special.note || '');
    setSpecialSearch(`${special.car.brand} ${special.car.model}`);
    setShowSpecialModal(true);
  };

  const handleToggleSpecialStatus = async (id: string) => {
    try {
      const updatedSpecial = await DatabaseService.toggleSpecialOfferStatus(id);
      setSpecialOffers(prev => prev.map(s => s.id === id ? updatedSpecial : s));
    } catch (error) {
      console.error('Error toggling special offer status:', error);
      setNotification({ type: 'error', message: lang === 'fr' ? 'Erreur lors du changement de statut' : 'خطأ في تغيير الحالة' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleSaveContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await DatabaseService.updateWebsiteContacts(contacts);
      setNotification({ type: 'success', message: lang === 'fr' ? 'Contacts enregistrés avec succès!' : 'تم حفظ جهات الاتصال بنجاح!' });
      setTimeout(() => setNotification(null), 4000);
    } catch (error: any) {
      console.error('Error saving contacts:', error);
      setNotification({ type: 'error', message: lang === 'fr' ? 'Erreur lors de la sauvegarde des contacts' : 'خطأ في حفظ جهات الاتصال' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure settings are properly prepared for saving
      const settingsToSave = {
        ...settings,
        name: settings.name || '',
        description: settings.description || '',
        logo: settings.logo || '',
      };

      await DatabaseService.updateWebsiteSettings(settingsToSave);
      
      // Reload settings after save to confirm
      const updatedSettings = await DatabaseService.getWebsiteSettings();
      setSettings(updatedSettings);
      
      setNotification({ type: 'success', message: lang === 'fr' ? 'Paramètres enregistrés avec succès!' : 'تم حفظ الإعدادات بنجاح!' });
      setTimeout(() => setNotification(null), 4000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      if (error.message?.includes('JWT') || error.message?.includes('auth') || error.code === 'PGRST301') {
        setNotification({ type: 'error', message: lang === 'fr' ? 'Session expirée. Veuillez vous reconnecter.' : 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.' });
        setTimeout(() => setNotification(null), 4000);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setNotification({ type: 'error', message: lang === 'fr' ? 'Erreur lors de la sauvegarde' : 'خطأ في الحفظ' });
        setTimeout(() => setNotification(null), 4000);
      }
    }
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContacts(prev => ({ ...prev, [name]: value }));
  };

  const validateImageFile = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      notify('error', lang === 'fr' ? 'Veuillez sélectionner une image valide' : 'يرجى تحديد صورة صحيحة');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('error', lang === 'fr' ? 'La taille du fichier ne doit pas dépasser 5MB' : 'حجم الملف لا يجب أن يتجاوز 5MB');
      return false;
    }
    return true;
  };

  // Logo : téléversé dans le bucket "website" (repli base64 si le bucket
  // n'existe pas encore), puis sauvegarde immédiate des paramètres.
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !validateImageFile(file)) return;

    setUploadingLogo(true);
    try {
      let logoValue: string | null = null;
      const uploaded = await uploadWebsiteImage(file, 'logo');
      if (uploaded.success && uploaded.url) {
        logoValue = uploaded.url;
      } else {
        // Repli : ancien comportement (data URL) si le bucket manque
        logoValue = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = ev => resolve(ev.target?.result as string);
          reader.onerror = () => reject(new Error('read error'));
          reader.readAsDataURL(file);
        });
      }

      setSettings(prev => ({ ...prev, logo: logoValue! }));
      await DatabaseService.updateWebsiteSettings({ ...settings, logo: logoValue! });
      notify('success', lang === 'fr' ? 'Logo enregistré avec succès!' : 'تم حفظ الشعار بنجاح!', 3000);
    } catch (error: any) {
      console.error('Error auto-saving logo:', error);
      notify('error', error.message || (lang === 'fr' ? 'Erreur lors de la sauvegarde du logo' : 'خطأ في حفظ الشعار'));
    } finally {
      setUploadingLogo(false);
    }
  };

  // Image de fond du landing : MÊME bucket que le logo ("website"),
  // affichée floutée derrière le hero du site public.
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !validateImageFile(file)) return;

    setUploadingBackground(true);
    try {
      let bgValue: string | null = null;
      const uploaded = await uploadWebsiteImage(file, 'background');
      if (uploaded.success && uploaded.url) {
        bgValue = uploaded.url;
      } else {
        // Fallback: store as data URL (same pattern as logo upload)
        console.warn('Background storage upload failed, falling back to data URL:', uploaded.error);
        bgValue = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = ev => resolve(ev.target?.result as string);
          reader.onerror = () => reject(new Error('read error'));
          reader.readAsDataURL(file);
        });
      }
      setSettings(prev => ({ ...prev, landing_background: bgValue! }));
      await DatabaseService.updateWebsiteSettings({ ...settings, landing_background: bgValue! });
      notify('success', lang === 'fr' ? 'Image de fond enregistrée ! Elle apparaît floutée sur le landing.' : 'تم حفظ صورة الخلفية! ستظهر مموهة على الصفحة الرئيسية.');
    } catch (error: any) {
      console.error('Error saving background:', error);
      notify('error', error.message || (lang === 'fr' ? 'Erreur lors de la sauvegarde de l\'image de fond' : 'خطأ في حفظ صورة الخلفية'), 7000);
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleRemoveBackground = async () => {
    try {
      setSettings(prev => ({ ...prev, landing_background: '' }));
      await DatabaseService.updateWebsiteSettings({ ...settings, landing_background: '' });
      notify('success', lang === 'fr' ? 'Image de fond retirée.' : 'تمت إزالة صورة الخلفية.');
    } catch (error: any) {
      notify('error', error.message || (lang === 'fr' ? 'Erreur' : 'خطأ'));
    }
  };

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
            🌐 {{fr: 'Gestion du Site Web', ar: 'إدارة الموقع الإلكتروني'}[lang]}
          </h1>
          <p className="text-saas-text-muted text-sm font-bold uppercase tracking-widest">
            {{fr: 'Gérez les offres, les contacts et les paramètres de votre site', ar: 'إدارة العروض والجهات الاتصال وإعدادات موقعك'}[lang]}
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

        {/* Notification Display */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 border rounded-2xl p-4 flex items-center justify-between ${
                notification.type === 'success'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={notification.type === 'success' ? 'text-green-500' : 'text-red-500'}>
                  {notification.type === 'success' ? '✅' : '❌'}
                </div>
                <p className={`font-medium ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {notification.message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saas-primary-via mx-auto mb-4"></div>
              <p className="text-saas-text-muted font-bold">
                {{fr: 'Chargement des données...', ar: 'جاري تحميل البيانات...'}[lang]}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
            >
              {([
                { id: 'offers',   label: { fr: '🎁 Offres', ar: '🎁 العروض' } },
                { id: 'special',  label: { fr: '⭐ Spéciales', ar: '⭐ خاصة' } },
                { id: 'promo',    label: { fr: '🎟️ Codes Promo', ar: '🎟️ رموز الخصم' } },
                { id: 'contacts', label: { fr: '📞 Contacts', ar: '📞 جهات الاتصال' } },
                { id: 'settings', label: { fr: '⚙️ Paramètres', ar: '⚙️ الإعدادات' } },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
                    activeTab === tab.id
                      ? 'bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white shadow-lg'
                      : 'bg-white border-2 border-saas-border text-saas-text-main hover:border-saas-primary-via'
                  }`}
                >
                  {tab.label[lang]}
                </button>
              ))}
            </motion.div>

            <AnimatePresence mode="wait">
          {/* OFFERS TAB — les voitures existantes s'affichent automatiquement */}
          {activeTab === 'offers' && (
            <motion.div
              key="offers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-saas-text-main flex items-center gap-3">
                    🎁 {{fr: 'Offres de Voitures', ar: 'عروض السيارات'}[lang]}
                  </h2>
                  <p className="text-saas-text-muted text-sm mt-1">
                    {{fr: 'Les voitures existantes sont affichées automatiquement sur le site. Utilisez le bouton pour masquer ou afficher une voiture.',
                      ar: 'تُعرض السيارات الموجودة تلقائيًا على الموقع. استخدم الزر لإخفاء أو إظهار سيارة.'}[lang]}
                  </p>
                </div>
                <input
                  type="text"
                  value={offerSearch}
                  onChange={e => setOfferSearch(e.target.value)}
                  placeholder={lang === 'fr' ? 'Rechercher une voiture...' : 'البحث عن سيارة...'}
                  className="input-saas lg:max-w-xs"
                />
              </div>

              {/* Compteur voitures visibles / masquées */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg">
                  <Eye size={13} />
                  {siteCars.filter(c => !c.isHiddenFromSite).length} {{fr: 'visibles sur le site', ar: 'ظاهرة على الموقع'}[lang]}
                </span>
                <span className="flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg">
                  <EyeOff size={13} />
                  {siteCars.filter(c => c.isHiddenFromSite === true).length} {{fr: 'masquées', ar: 'مخفية'}[lang]}
                </span>
              </div>

              {/* Grille de voitures — même carte que l'interface Voitures */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offerTabCars.map(car => (
                  <CarCard
                    key={car.id}
                    car={car}
                    lang={lang}
                    onToggleVisibility={handleToggleCarVisibility}
                  />
                ))}
              </div>

              {offerTabCars.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-saas-border">
                  <p className="text-saas-text-muted font-medium">
                    {{fr: 'Aucune voiture trouvée.', ar: 'لم يتم العثور على سيارات.'}[lang]}
                  </p>
                </div>
              )}
            </motion.div>
          )}


          {/* SPECIAL OFFERS TAB */}
          {activeTab === 'special' && (
            <motion.div
              key="special"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Header with Add Button */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-saas-text-main flex items-center gap-3">
                  ⭐ {{fr: 'Offres Spéciales', ar: 'عروض خاصة'}[lang]}
                </h2>
                <button
                  onClick={() => {
                    resetSpecialForm();
                    setShowSpecialModal(true);
                  }}
                  className="btn-saas-primary px-6 py-3"
                >
                  ➕ {{fr: 'Créer une offre spéciale', ar: 'إنشاء عرض خاص'}[lang]}
                </button>
              </div>

              {/* Special Offers Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {specialOffers.map(special => (
                  <motion.div
                    key={special.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: special.isActive ? 1 : 0.6, scale: special.isActive ? 1 : 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-2xl shadow-lg border border-saas-border overflow-hidden hover:shadow-xl transition-shadow relative group"
                  >
                    {/* Badge affichée / masquée du site */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 bg-white rounded-full px-3 py-1 shadow-md z-10">
                      {special.isActive ? (
                        <>
                          <Eye size={14} className="text-green-500" />
                          <span className="text-xs font-bold text-green-500">
                            {{fr: 'Affichée', ar: 'ظاهرة'}[lang]}
                          </span>
                        </>
                      ) : (
                        <>
                          <EyeOff size={14} className="text-slate-500" />
                          <span className="text-xs font-bold text-slate-500">
                            {{fr: 'Masquée', ar: 'مخفية'}[lang]}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Car Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={special.car.images[0]}
                        alt={`${special.car.brand} ${special.car.model}`}
                        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${special.isActive ? '' : 'grayscale'}`}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 bg-saas-primary-start/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm shadow-lg">
                        {special.car.year}
                      </div>
                      {special.label && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg">
                          <Tag size={11} />
                          {special.label}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-black text-lg text-saas-text-main">
                          {special.car.brand} {special.car.model}
                        </h3>
                        <p className="text-sm text-saas-text-muted">{special.car.registration}</p>
                      </div>

                      {/* Price Comparison */}
                      <div className="bg-saas-bg p-3 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-saas-text-muted line-through">
                            💰 {special.oldPrice.toLocaleString()} {{fr: 'DA', ar: 'د.ج'}[lang]}
                          </p>
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                            -{Math.round((1 - special.newPrice / special.oldPrice) * 100)}%
                          </span>
                        </div>
                        <p className="font-black text-2xl text-green-600">
                          {special.newPrice.toLocaleString()} {{fr: 'DA', ar: 'د.ج'}[lang]}
                        </p>
                      </div>

                      {/* Période de validité (optionnelle) */}
                      {(special.startDate || special.endDate) && (
                        <div className="flex items-center gap-1.5 text-xs text-saas-text-muted font-medium">
                          <Calendar size={12} className="text-saas-primary-via" />
                          {special.startDate && special.endDate
                            ? (lang === 'fr'
                                ? `Du ${new Date(special.startDate).toLocaleDateString('fr-FR')} au ${new Date(special.endDate).toLocaleDateString('fr-FR')}`
                                : `من ${new Date(special.startDate).toLocaleDateString('fr-FR')} إلى ${new Date(special.endDate).toLocaleDateString('fr-FR')}`)
                            : special.startDate
                              ? (lang === 'fr' ? `À partir du ${new Date(special.startDate).toLocaleDateString('fr-FR')}` : `ابتداءً من ${new Date(special.startDate).toLocaleDateString('fr-FR')}`)
                              : (lang === 'fr' ? `Jusqu'au ${new Date(special.endDate!).toLocaleDateString('fr-FR')}` : `حتى ${new Date(special.endDate!).toLocaleDateString('fr-FR')}`)}
                        </div>
                      )}

                      {special.note && (
                        <div className="text-xs text-saas-text-muted">
                          <p className="font-bold">📝 {{fr: 'Note', ar: 'ملاحظة'}[lang]}</p>
                          <p>{special.note}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-3 border-t border-saas-border flex-wrap">
                        <button
                          onClick={() => handleToggleSpecialStatus(special.id)}
                          className={`flex-1 font-bold py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-1.5 ${
                            special.isActive
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
                          }`}
                        >
                          {special.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                          {{fr: special.isActive ? 'Masquer du site' : 'Afficher sur le site', ar: special.isActive ? 'إخفاء من الموقع' : 'إظهار على الموقع'}[lang]}
                        </button>
                        <button
                          onClick={() => handleEditSpecial(special)}
                          className="flex-1 btn-saas-secondary py-2 px-3 text-sm"
                        >
                          ✏️ {{fr: 'Éditer', ar: 'تحرير'}[lang]}
                        </button>
                        <button
                          onClick={() => handleDeleteSpecial(special.id)}
                          className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-3 rounded-lg transition-colors text-sm"
                        >
                          🗑️ {{fr: 'Supprimer', ar: 'حذف'}[lang]}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Add/Edit Special Modal */}
              <AnimatePresence>
                {showSpecialModal && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-saas-border"
                    >
                      <div className="p-8 border-b border-saas-border flex items-center justify-between bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white">
                        <div>
                          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                            {editingSpecial ? '✏️ Modifier l\'offre spéciale' : '⭐ Nouvelle offre spéciale'}
                          </h2>
                          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
                            {lang === 'fr' ? 'Gestion des offres spéciales' : 'إدارة العروض الخاصة'}
                          </p>
                        </div>
                        <button onClick={() => setShowSpecialModal(false)} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
                          <X size={24} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-saas-bg">
                        {/* Sélection de Voiture */}
                        <section className="space-y-6">
                          <h3 className="text-xs font-black text-saas-primary-via flex items-center gap-3 uppercase tracking-[0.2em]">
                            <span className="p-2 bg-saas-primary-via/10 rounded-lg">🚗</span>
                            Sélection de Voiture
                          </h3>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="label-saas">
                                {lang === 'fr' ? 'Rechercher une voiture' : 'البحث عن مركبة'}
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={specialSearch}
                                  onChange={e => handleSpecialSearch(e.target.value)}
                                  placeholder={lang === 'fr' ? 'Marque, modèle, immatriculation...' : 'الماركة، الموديل، رقم التسجيل...'}
                                  className="input-saas"
                                  autoComplete="off"
                                />
                                {filteredCars.length > 0 && (
                                  <div className="absolute top-full left-0 right-0 bg-white border border-saas-border rounded-lg mt-1 max-h-48 overflow-y-auto z-50 shadow-lg">
                                    {filteredCars.map(car => (
                                      <button
                                        key={car.id}
                                        onClick={() => handleSelectCarSpecial(car)}
                                        className="w-full text-left p-4 hover:bg-saas-bg transition-colors border-b border-saas-border last:border-b-0"
                                      >
                                        <div className="flex items-center gap-3">
                                          <img
                                            src={car.images[0]}
                                            alt={`${car.brand} ${car.model}`}
                                            className="w-12 h-12 rounded-lg object-cover"
                                            referrerPolicy="no-referrer"
                                          />
                                          <div>
                                            <p className="font-bold">{car.brand} {car.model}</p>
                                            <p className="text-xs text-saas-text-muted">{car.registration} • {car.year} • {car.priceDay.toLocaleString()} DZD/jour</p>
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {selectedCarSpecial && (
                              <div className="bg-white p-4 rounded-2xl border border-saas-border">
                                <div className="flex items-center gap-4">
                                  <img
                                    src={selectedCarSpecial.images[0]}
                                    alt={`${selectedCarSpecial.brand} ${selectedCarSpecial.model}`}
                                    className="w-16 h-16 rounded-xl object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div>
                                    <h4 className="font-black text-lg">{selectedCarSpecial.brand} {selectedCarSpecial.model}</h4>
                                    <p className="text-sm text-saas-text-muted">{selectedCarSpecial.registration}</p>
                                    <p className="text-xs text-saas-primary-via font-bold">{selectedCarSpecial.priceDay.toLocaleString()} DZD/jour</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </section>

                        {/* Configuration de la Remise */}
                        <section className="space-y-6">
                          <h3 className="text-xs font-black text-saas-primary-via flex items-center gap-3 uppercase tracking-[0.2em]">
                            <span className="p-2 bg-saas-primary-via/10 rounded-lg">💰</span>
                            {lang === 'fr' ? 'Configuration de la Remise' : 'إعداد الخصم'}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <label className="label-saas">
                                {lang === 'fr' ? 'Prix original (DZD/jour)' : 'السعر الأصلي (دج/يوم)'}
                              </label>
                              <input
                                type="number"
                                value={specialOldPrice}
                                onChange={e => setSpecialOldPrice(e.target.value)}
                                placeholder="0"
                                className="input-saas"
                                min="0"
                              />
                              {selectedCarSpecial && (
                                <p className="text-xs text-saas-text-muted">
                                  {lang === 'fr' ? 'Prix normal' : 'السعر العادي'}: {selectedCarSpecial.priceDay.toLocaleString()} DZD/jour
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="label-saas">
                                {lang === 'fr' ? 'Type de remise' : 'نوع الخصم'}
                              </label>
                              <select
                                value={specialDiscountType}
                                onChange={e => setSpecialDiscountType(e.target.value as 'percentage' | 'fixed')}
                                className="input-saas"
                              >
                                <option value="percentage">{lang === 'fr' ? 'Pourcentage (%)' : 'نسبة مئوية (%)'}</option>
                                <option value="fixed">{lang === 'fr' ? 'Montant fixe (DZD)' : 'مبلغ ثابت (دج)'}</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="label-saas">
                                {lang === 'fr'
                                  ? (specialDiscountType === 'percentage' ? 'Remise (%)' : 'Remise (DZD)')
                                  : (specialDiscountType === 'percentage' ? 'الخصم (%)' : 'الخصم (دج)')}
                              </label>
                              <input
                                type="number"
                                value={specialDiscountValue}
                                onChange={e => setSpecialDiscountValue(e.target.value)}
                                placeholder="0"
                                className="input-saas"
                                min="0"
                                max={specialDiscountType === 'percentage' ? 99 : undefined}
                              />
                            </div>
                          </div>

                          {/* Prix promotionnel calculé */}
                          {computedSpecialNewPrice ? (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between"
                            >
                              <div>
                                <p className="text-xs font-bold text-green-700 uppercase tracking-wider">
                                  {lang === 'fr' ? 'Prix promotionnel' : 'السعر الترويجي'}
                                </p>
                                <p className="font-black text-2xl text-green-600">
                                  {computedSpecialNewPrice.toLocaleString()} DZD/jour
                                  <span className="text-sm text-saas-text-muted line-through ml-3">
                                    {parseFloat(specialOldPrice).toLocaleString()} DZD
                                  </span>
                                </p>
                              </div>
                              <span className="bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg">
                                -{Math.round((1 - computedSpecialNewPrice / parseFloat(specialOldPrice)) * 100)}%
                              </span>
                            </motion.div>
                          ) : (specialDiscountValue && specialOldPrice ? (
                            <p className="text-xs text-red-600 font-bold">
                              {lang === 'fr'
                                ? 'Remise invalide : le prix promotionnel doit rester supérieur à 0 et inférieur au prix original.'
                                : 'خصم غير صالح: يجب أن يبقى السعر الترويجي أكبر من 0 وأقل من السعر الأصلي.'}
                            </p>
                          ) : null)}
                        </section>

                        {/* Détails de la Promotion */}
                        <section className="space-y-6">
                          <h3 className="text-xs font-black text-saas-primary-via flex items-center gap-3 uppercase tracking-[0.2em]">
                            <span className="p-2 bg-saas-primary-via/10 rounded-lg">🏷️</span>
                            {lang === 'fr' ? 'Détails de la Promotion' : 'تفاصيل العرض'}
                          </h3>

                          <div className="space-y-2">
                            <label className="label-saas">
                              {lang === 'fr' ? 'Titre / label (optionnel)' : 'العنوان (اختياري)'}
                            </label>
                            <input
                              type="text"
                              value={specialLabel}
                              onChange={e => setSpecialLabel(e.target.value)}
                              placeholder={lang === 'fr' ? 'Ex : Promo été, Offre week-end...' : 'مثال: عرض الصيف...'}
                              className="input-saas"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="label-saas">
                                {lang === 'fr' ? 'Date de début (optionnel)' : 'تاريخ البدء (اختياري)'}
                              </label>
                              <input
                                type="date"
                                value={specialStartDate}
                                onChange={e => setSpecialStartDate(e.target.value)}
                                className="input-saas"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="label-saas">
                                {lang === 'fr' ? 'Date de fin (optionnel)' : 'تاريخ الانتهاء (اختياري)'}
                              </label>
                              <input
                                type="date"
                                value={specialEndDate}
                                onChange={e => setSpecialEndDate(e.target.value)}
                                className="input-saas"
                                min={specialStartDate || undefined}
                              />
                            </div>
                          </div>
                          {!specialDatesValid && (
                            <p className="text-xs text-red-600 font-bold">
                              {lang === 'fr'
                                ? 'La date de fin doit être postérieure ou égale à la date de début.'
                                : 'يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء أو مساويًا له.'}
                            </p>
                          )}

                          <div className="space-y-2">
                            <label className="label-saas">
                              {lang === 'fr' ? 'Note (optionnel)' : 'ملاحظة (اختياري)'}
                            </label>
                            <textarea
                              value={specialNote}
                              onChange={e => setSpecialNote(e.target.value)}
                              placeholder={lang === 'fr' ? 'Ajouter une note pour cette offre spéciale...' : 'أضف ملاحظة لهذا العرض الخاص...'}
                              rows={3}
                              className="input-saas resize-none"
                            />
                          </div>
                        </section>
                      </div>

                      <div className="p-8 border-t border-saas-border flex items-center justify-between gap-4 bg-white">
                        <div>
                          {editingSpecial && (
                            <button
                              onClick={() => handleDeleteSpecial(editingSpecial.id)}
                              className="btn-saas-danger px-6"
                            >
                              {lang === 'fr' ? 'Supprimer' : 'حذف'}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setShowSpecialModal(false)}
                            className="btn-saas-outline px-8"
                          >
                            {lang === 'fr' ? 'Annuler' : 'إلغاء'}
                          </button>
                          <button
                            onClick={handleAddSpecial}
                            disabled={!isSpecialFormValid}
                            className="btn-saas-primary px-12 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {editingSpecial ? (lang === 'fr' ? 'Modifier l\'offre' : 'تعديل العرض') : (lang === 'fr' ? 'Créer l\'offre spéciale' : 'إنشاء العرض الخاص')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* PROMO CODES TAB */}
          {activeTab === 'promo' && (
            <motion.div
              key="promo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-saas-text-main flex items-center gap-3">
                  🎟️ {{fr: 'Codes Promo', ar: 'رموز الخصم'}[lang]}
                </h2>
                <p className="text-saas-text-muted text-sm mt-1">
                  {{fr: 'Générez des codes de réduction à usage unique. Le client les saisit à la dernière étape de la réservation sur le site — le code devient "Utilisé" automatiquement.',
                    ar: 'أنشئ رموز خصم للاستخدام مرة واحدة. يدخلها العميل في الخطوة الأخيرة من الحجز على الموقع — يصبح الرمز "مستخدمًا" تلقائيًا.'}[lang]}
                </p>
              </div>

              {/* Migration manquante */}
              {promoError && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-sm font-medium">
                  ⚠️ {promoError}
                </div>
              )}

              {/* Créer un code */}
              <div className="bg-white rounded-2xl shadow-lg border border-saas-border p-6 space-y-4">
                <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em] flex items-center gap-2">
                  <Ticket size={16} /> {{fr: 'Nouveau code', ar: 'رمز جديد'}[lang]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-4 items-end">
                  <div className="space-y-2">
                    <label className="label-saas">{{fr: 'Code', ar: 'الرمز'}[lang]}</label>
                    <input
                      type="text"
                      value={newPromoCode}
                      onChange={e => setNewPromoCode(e.target.value.toUpperCase())}
                      className="input-saas font-mono font-bold tracking-widest"
                      placeholder="EX: A7KP93QD"
                      maxLength={20}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewPromoCode(generateRandomPromoCode())}
                    className="btn-saas-secondary py-3 px-4 flex items-center gap-2 whitespace-nowrap"
                    title={lang === 'fr' ? 'Générer un code aléatoire' : 'إنشاء رمز عشوائي'}
                  >
                    <RefreshCw size={16} />
                    {{fr: 'Aléatoire', ar: 'عشوائي'}[lang]}
                  </button>
                  <div className="space-y-2">
                    <label className="label-saas">{{fr: 'Réduction (%)', ar: 'الخصم (%)'}[lang]}</label>
                    <input
                      type="number"
                      value={newPromoPct}
                      onChange={e => setNewPromoPct(e.target.value)}
                      className="input-saas"
                      min={1}
                      max={100}
                      placeholder="10"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreatePromo}
                    disabled={creatingPromo}
                    className="btn-saas-primary py-3 px-8 whitespace-nowrap disabled:opacity-50"
                  >
                    {creatingPromo
                      ? <Loader2 size={16} className="animate-spin" />
                      : <>➕ {{fr: 'Créer le code', ar: 'إنشاء الرمز'}[lang]}</>}
                  </button>
                </div>
              </div>

              {/* Liste des codes */}
              {promoCodes.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-saas-border">
                  <div className="text-5xl opacity-20 mb-3">🎟️</div>
                  <p className="text-saas-text-muted font-medium">
                    {{fr: 'Aucun code promo pour le moment.', ar: 'لا توجد رموز خصم بعد.'}[lang]}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {promoCodes.map(promo => (
                    <motion.div
                      key={promo.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`bg-white rounded-2xl shadow-md border p-5 space-y-3 ${
                        promo.isUsed ? 'border-slate-200 opacity-70' : promo.isActive ? 'border-green-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono font-black text-lg tracking-[0.2em] text-saas-text-main">{promo.code}</p>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                          promo.isUsed
                            ? 'bg-slate-100 text-slate-600'
                            : promo.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}>
                          {promo.isUsed
                            ? {fr: '✔ Utilisé', ar: '✔ مستخدم'}[lang]
                            : promo.isActive
                              ? {fr: '● Actif', ar: '● نشط'}[lang]
                              : {fr: '⏸ Désactivé', ar: '⏸ معطل'}[lang]}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="font-black text-3xl text-saas-primary-via">−{promo.discountPercentage}%</p>
                        <div className="text-right text-xs text-saas-text-muted">
                          <p>{{fr: 'Créé le', ar: 'أنشئ في'}[lang]} {new Date(promo.createdAt).toLocaleDateString('fr-FR')}</p>
                          {promo.isUsed && promo.usedAt && (
                            <p className="font-bold">{{fr: 'Utilisé le', ar: 'استخدم في'}[lang]} {new Date(promo.usedAt).toLocaleDateString('fr-FR')}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-saas-border">
                        <button
                          onClick={() => handleCopyPromo(promo)}
                          className="flex-1 bg-saas-bg hover:bg-slate-100 text-saas-text-main font-bold py-2 px-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Copy size={13} /> {{fr: 'Copier', ar: 'نسخ'}[lang]}
                        </button>
                        {!promo.isUsed && (
                          <button
                            onClick={() => handleTogglePromoActive(promo)}
                            className={`flex-1 font-bold py-2 px-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors ${
                              promo.isActive
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                                : 'bg-green-100 hover:bg-green-200 text-green-700'
                            }`}
                          >
                            {promo.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                            {promo.isActive ? {fr: 'Désactiver', ar: 'تعطيل'}[lang] : {fr: 'Activer', ar: 'تفعيل'}[lang]}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePromo(promo)}
                          className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Trash2 size={13} /> {{fr: 'Supprimer', ar: 'حذف'}[lang]}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* CONTACTS TAB */}
          {activeTab === 'contacts' && (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-[2rem] shadow-lg border border-saas-border overflow-hidden"
            >
              <div className="p-6 border-b border-saas-border bg-linear-to-r from-blue-500 via-blue-600 to-blue-700 text-white">
                <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  📞 {{fr: 'Paramètres de Contact', ar: 'إعدادات جهات الاتصال'}[lang]}
                </h2>
              </div>

              <form onSubmit={handleSaveContacts} className="p-8 space-y-6">
                {/* Facebook */}
                <div className="space-y-2">
                  <label className="label-saas">👍 Facebook</label>
                  <input
                    type="text"
                    name="facebook"
                    value={contacts.facebook || ''}
                    onChange={handleContactChange}
                    placeholder="https://facebook.com/..."
                    className="input-saas"
                  />
                </div>

                {/* Instagram */}
                <div className="space-y-2">
                  <label className="label-saas">📷 Instagram</label>
                  <input
                    type="text"
                    name="instagram"
                    value={contacts.instagram || ''}
                    onChange={handleContactChange}
                    placeholder="@username"
                    className="input-saas"
                  />
                </div>

                {/* TikTok */}
                <div className="space-y-2">
                  <label className="label-saas">🎵 TikTok</label>
                  <input
                    type="text"
                    name="tiktok"
                    value={contacts.tiktok || ''}
                    onChange={handleContactChange}
                    placeholder="@username"
                    className="input-saas"
                  />
                </div>

                {/* WhatsApp */}
                <div className="space-y-2">
                  <label className="label-saas">💬 WhatsApp</label>
                  <input
                    type="tel"
                    name="whatsapp"
                    value={contacts.whatsapp || ''}
                    onChange={handleContactChange}
                    placeholder="+213 5 1234 5678"
                    className="input-saas"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="label-saas">☎️ {{fr: 'Téléphone', ar: 'الهاتف'}[lang]}</label>
                  <input
                    type="tel"
                    name="phone"
                    value={contacts.phone || ''}
                    onChange={handleContactChange}
                    placeholder="+213 5 1234 5678"
                    className="input-saas"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="label-saas">📧 {{fr: 'E-mail', ar: 'البريد الإلكتروني'}[lang]}</label>
                  <input
                    type="email"
                    name="email"
                    value={contacts.email || ''}
                    onChange={handleContactChange}
                    placeholder="contact@luxdrive.com"
                    className="input-saas"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="label-saas">📍 {{fr: 'Adresse', ar: 'العنوان'}[lang]}</label>
                  <input
                    type="text"
                    name="address"
                    value={contacts.address || ''}
                    onChange={handleContactChange}
                    placeholder="Alger, Algeria"
                    className="input-saas"
                  />
                </div>

                {/* Save Button */}
                <div className="flex gap-3 pt-6 border-t border-saas-border">
                  <button
                    type="button"
                    className="flex-1 py-3 px-4 rounded-lg font-bold text-sm bg-white border-2 border-saas-border hover:bg-saas-bg-light transition-colors"
                  >
                    {{fr: 'Annuler', ar: 'إلغاء'}[lang]}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-saas-primary py-3"
                  >
                    {{fr: 'Enregistrer les contacts', ar: 'حفظ جهات الاتصال'}[lang]}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-[2rem] shadow-lg border border-saas-border overflow-hidden"
            >
              <div className="p-6 border-b border-saas-border bg-linear-to-r from-purple-500 via-purple-600 to-purple-700 text-white">
                <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  ⚙️ {{fr: 'Paramètres du Site', ar: 'إعدادات الموقع'}[lang]}
                </h2>
              </div>

              <form onSubmit={handleSaveSettings} className="p-8 space-y-6">
                {/* Website Name */}
                <div className="space-y-2">
                  <label className="label-saas">🌐 {{fr: 'Nom du site web', ar: 'اسم الموقع'}[lang]}</label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={e => setSettings({ ...settings, name: e.target.value })}
                    className="input-saas"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="label-saas">📝 {{fr: 'Description', ar: 'الوصف'}[lang]}</label>
                  <textarea
                    value={settings.description}
                    onChange={e => setSettings({ ...settings, description: e.target.value })}
                    rows={4}
                    className="input-saas resize-none"
                  />
                </div>

                {/* Logo */}
                <div className="space-y-4">
                  <label className="label-saas">🖼️ {{fr: 'Logo du site', ar: 'شعار الموقع'}[lang]}</label>
                  <div className="flex gap-6 items-start">
                    <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-saas-border bg-saas-bg flex items-center justify-center flex-shrink-0">
                      {settings.logo ? (
                        <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-4xl">🌐</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={uploadingLogo}
                        />
                        <span className={`btn-saas-primary px-6 py-3 inline-flex items-center gap-2 cursor-pointer ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                          {uploadingLogo && <Loader2 size={15} className="animate-spin" />}
                          {{fr: 'Changer le logo', ar: 'تغيير الشعار'}[lang]}
                        </span>
                      </label>
                      <p className="text-xs text-saas-text-muted mt-2">
                        {{fr: 'Format recommandé: PNG ou JPG (500x500px)', ar: 'الصيغة الموصى بها: PNG أو JPG (500x500px)'}[lang]}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Image de fond du landing (même bucket "website" que le logo) */}
                <div className="space-y-4">
                  <label className="label-saas flex items-center gap-2">
                    <ImageIcon size={15} /> {{fr: 'Image de fond du landing', ar: 'صورة خلفية الصفحة الرئيسية'}[lang]}
                  </label>
                  <div className="rounded-2xl overflow-hidden border-2 border-saas-border bg-saas-bg relative h-44">
                    {settings.landing_background ? (
                      <>
                        {/* Aperçu flouté = rendu réel sur le site */}
                        <img
                          src={settings.landing_background}
                          alt="Background"
                          className="w-full h-full object-cover"
                          style={{ filter: 'blur(6px)', transform: 'scale(1.08)' }}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-white/30" />
                        <span className="absolute bottom-2 left-3 text-[10px] font-bold uppercase tracking-widest bg-white/85 text-saas-text-main px-2 py-1 rounded-lg">
                          {{fr: 'Aperçu flouté (comme sur le site)', ar: 'معاينة مموهة (كما في الموقع)'}[lang]}
                        </span>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-saas-text-muted gap-2">
                        <ImageIcon size={32} className="opacity-30" />
                        <p className="text-xs font-medium">
                          {{fr: 'Aucune image de fond — le landing garde son fond par défaut', ar: 'لا توجد صورة خلفية — تحتفظ الصفحة بخلفيتها الافتراضية'}[lang]}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBackgroundUpload}
                        className="hidden"
                        disabled={uploadingBackground}
                      />
                      <span className={`btn-saas-primary px-6 py-3 inline-flex items-center gap-2 cursor-pointer ${uploadingBackground ? 'opacity-50 pointer-events-none' : ''}`}>
                        {uploadingBackground && <Loader2 size={15} className="animate-spin" />}
                        {{fr: 'Charger une image de fond', ar: 'تحميل صورة خلفية'}[lang]}
                      </span>
                    </label>
                    {settings.landing_background && (
                      <button
                        type="button"
                        onClick={handleRemoveBackground}
                        className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-3 px-5 rounded-lg text-sm transition-colors"
                      >
                        🗑️ {{fr: 'Retirer', ar: 'إزالة'}[lang]}
                      </button>
                    )}
                    <p className="text-xs text-saas-text-muted">
                      {{fr: 'Enregistrée dans le même bucket que le logo, affichée floutée derrière le hero.', ar: 'تُحفظ في نفس مساحة تخزين الشعار وتُعرض مموهة خلف الواجهة.'}[lang]}
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-3 pt-6 border-t border-saas-border">
                  <button
                    type="button"
                    className="flex-1 py-3 px-4 rounded-lg font-bold text-sm bg-white border-2 border-saas-border hover:bg-saas-bg-light transition-colors"
                  >
                    {{fr: 'Annuler', ar: 'إلغاء'}[lang]}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-saas-primary py-3"
                  >
                    {{fr: 'Enregistrer les paramètres', ar: 'حفظ الإعدادات'}[lang]}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}
      </div>
    </div>
  );
};
