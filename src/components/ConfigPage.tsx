import React, { useState, useEffect } from 'react';
import { Language, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { DatabaseService } from '../services/DatabaseService';
import { supabase } from '../supabase';

interface ConfigPageProps {
  lang: Language;
  user: User;
}

export const ConfigPage: React.FC<ConfigPageProps> = ({ lang, user }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'database'>('general');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // General Settings - Load from website settings
  const [generalData, setGeneralData] = useState({
    agencyName: '',
    slogan: '',
    address: '',
    phone: '',
    phoneNumber2: '',
    bankNumber: '',
    logo: '',
  });

  // Profile Settings - Load from workers table
  const [profileData, setProfileData] = useState({
    name: user.name,
    profilePhoto: user.avatar,
  });

  // Security Settings - Load from workers table
  const [securityData, setSecurityData] = useState({
    username: '',
    email: user.email,
    newPassword: '',
    confirmPassword: '',
  });

  // Database
  const [lastBackup] = useState('Aujourd\'hui à 10:45');

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load website settings for general tab
        const websiteSettings = await DatabaseService.getWebsiteSettings();
        setGeneralData({
          agencyName: websiteSettings.name || 'Luxdrive Premium',
          slogan: websiteSettings.description || 'Votre partenaire de confiance en location de véhicules',
          address: websiteSettings.address || 'Alger, Algeria',
          phone: websiteSettings.phone || '+213 5 1234 5678',
          phoneNumber2: websiteSettings.phone_number_2 || '',
          bankNumber: websiteSettings.bank_number || '',
          logo: websiteSettings.logo || 'https://picsum.photos/seed/logo/200/200',
        });

        // Load worker data for profile and security
        if (user.email) {
          try {
            const { data: workerData, error } = await supabase
              .from('workers')
              .select('full_name, profile_photo, username, email')
              .eq('email', user.email)
              .maybeSingle();

            if (!error && workerData) {
              setProfileData({
                name: workerData.full_name,
                profilePhoto: workerData.profile_photo || '',
              });

              setSecurityData(prev => ({
                ...prev,
                username: workerData.username,
                email: workerData.email,
              }));
            }
          } catch (workerError) {
            console.warn('Could not load worker data:', workerError);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading config data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [user.email]);

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGeneralData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSecurityData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveAgencyInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Save to website settings
      await DatabaseService.updateWebsiteSettings({
        name: generalData.agencyName,
        description: generalData.slogan,
        logo: generalData.logo,
        phone_number_2: generalData.phoneNumber2,
        bank_number: generalData.bankNumber,
        address: generalData.address,
        phone: generalData.phone,
      });

      // Le nom de l'agence pilote le nom du site : on met à jour le titre de
      // l'onglet immédiatement (même convention 3 mots que App.tsx) sans reload.
      if (generalData.agencyName?.trim()) {
        document.title = `${generalData.agencyName.trim().split(/\s+/).slice(0, 3).join(' ')} | Location de Voitures`;
      }

      setNotification({ type: 'success', message: lang === 'fr' ? 'Informations de l\'agence mises à jour avec succès!' : 'تم تحديث معلومات الوكالة بنجاح!' });
      setTimeout(() => setNotification(null), 4000);
    } catch (error) {
      console.error('Error updating agency info:', error);
      setNotification({ type: 'error', message: lang === 'fr' ? 'Erreur lors de la mise à jour des informations' : 'خطأ في تحديث المعلومات' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setNotification({ type: 'error', message: lang === 'fr' ? 'Veuillez sélectionner une image valide' : 'يرجى تحديد صورة صحيحة' });
        setTimeout(() => setNotification(null), 4000);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setNotification({ type: 'error', message: lang === 'fr' ? 'La taille du fichier ne doit pas dépasser 5MB' : 'حجم الملف لا يجب أن يتجاوز 5MB' });
        setTimeout(() => setNotification(null), 4000);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target?.result as string;

        try {
          // Update local state
          setGeneralData(prev => ({
            ...prev,
            logo: imageData,
          }));

          // Save to website settings
          await DatabaseService.updateWebsiteSettings({
            name: generalData.agencyName,
            description: generalData.slogan,
            logo: imageData,
          });

          setNotification({ type: 'success', message: lang === 'fr' ? 'Logo mis à jour avec succès!' : 'تم تحديث الشعار بنجاح!' });
          setTimeout(() => setNotification(null), 4000);
        } catch (error) {
          console.error('Error updating logo:', error);
          setNotification({ type: 'error', message: lang === 'fr' ? 'Erreur lors de la mise à jour du logo' : 'خطأ في تحديث الشعار' });
          setTimeout(() => setNotification(null), 4000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setNotification({ type: 'error', message: lang === 'fr' ? 'Veuillez sélectionner une image valide' : 'يرجى تحديد صورة صحيحة' });
        setTimeout(() => setNotification(null), 4000);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setNotification({ type: 'error', message: lang === 'fr' ? 'La taille du fichier ne doit pas dépasser 5MB' : 'حجم الملف لا يجب أن يتجاوز 5MB' });
        setTimeout(() => setNotification(null), 4000);
        return;
      }

      try {
        // Upload to Supabase storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.email}_profile.${fileExt}`;
        const filePath = `workers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('workers')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('workers')
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // Update local state
        setProfileData(prev => ({
          ...prev,
          profilePhoto: publicUrl,
        }));

        // Update worker profile in database
        const { error: updateError } = await supabase
          .from('workers')
          .update({ profile_photo: publicUrl })
          .eq('email', user.email);

        if (updateError) throw updateError;

        setNotification({ type: 'success', message: lang === 'fr' ? 'Photo de profil mise à jour avec succès!' : 'تم تحديث صورة الملف بنجاح!' });
        setTimeout(() => setNotification(null), 4000);
      } catch (error) {
        console.error('Error updating profile photo:', error);
        setNotification({ type: 'error', message: lang === 'fr' ? 'Erreur lors de la mise à jour de la photo' : 'خطأ في تحديث الصورة' });
        setTimeout(() => setNotification(null), 4000);
      }
    }
  };

  const handleExportDatabase = async () => {
    try {
      setNotification({ type: 'success', message: lang === 'fr' ? 'Exportation en cours...' : 'جاري التصدير...' });
      setTimeout(() => setNotification(null), 2000);

      // Export all data from main tables
      const [
        cars,
        clients,
        agencies,
        workers,
        specialOffers,
        storeExpenses,
        vehicleExpenses,
        websiteContacts,
        websiteSettings
      ] = await Promise.all([
        DatabaseService.getCars(),
        DatabaseService.getClients(),
        DatabaseService.getAgencies(),
        DatabaseService.getWorkers(),
        DatabaseService.getSpecialOffers(),
        DatabaseService.getStoreExpenses(),
        DatabaseService.getVehicleExpenses(),
        DatabaseService.getWebsiteContacts(),
        DatabaseService.getWebsiteSettings(),
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          cars,
          clients,
          agencies,
          workers,
          specialOffers,
          storeExpenses,
          vehicleExpenses,
          websiteContacts,
          websiteSettings,
        }
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `luxdrive_backup_${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      setNotification({ type: 'success', message: lang === 'fr' ? 'Sauvegarde téléchargée avec succès!' : 'تم تنزيل النسخة الاحتياطية بنجاح!' });
      setTimeout(() => setNotification(null), 4000);
    } catch (error) {
      console.error('Error exporting database:', error);
      setNotification({ type: 'error', message: lang === 'fr' ? 'Erreur lors de l\'exportation' : 'خطأ في التصدير' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleRestoreDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target?.result as string);

          if (!backupData.data) {
            throw new Error('Invalid backup file format');
          }

          setNotification({ type: 'success', message: lang === 'fr' ? 'Restauration en cours...' : 'جاري الاستعادة...' });
          setTimeout(() => setNotification(null), 2000);

          // Restore data in order (respecting foreign key constraints)
          const { data } = backupData;

          // Clear existing data first (optional - uncomment if you want to replace all data)
          // await clearAllData();

          // Restore agencies first (no dependencies)
          if (data.agencies?.length > 0) {
            for (const agency of data.agencies) {
              await DatabaseService.createAgency(agency);
            }
          }

          // Restore workers (no dependencies)
          if (data.workers?.length > 0) {
            for (const worker of data.workers) {
              await DatabaseService.createWorker(worker);
            }
          }

          // Restore cars (no dependencies)
          if (data.cars?.length > 0) {
            for (const car of data.cars) {
              await DatabaseService.createCar(car);
            }
          }

          // Restore clients (depends on agencies)
          if (data.clients?.length > 0) {
            for (const client of data.clients) {
              await DatabaseService.createClient(client);
            }
          }

          // Les "offres ordinaires" (data.offers) des anciennes sauvegardes sont
          // dépréciées : les voitures s'affichent automatiquement sur le site,
          // il n'y a donc plus rien à restaurer pour elles.

          // Restore special offers (depends on cars)
          if (data.specialOffers?.length > 0) {
            for (const specialOffer of data.specialOffers) {
              await DatabaseService.createSpecialOffer(specialOffer);
            }
          }

          // Restore store expenses (no dependencies)
          if (data.storeExpenses?.length > 0) {
            for (const expense of data.storeExpenses) {
              await DatabaseService.createStoreExpense(expense);
            }
          }

          // Restore vehicle expenses (depends on cars)
          if (data.vehicleExpenses?.length > 0) {
            for (const expense of data.vehicleExpenses) {
              await DatabaseService.createVehicleExpense(expense);
            }
          }

          // Restore website settings
          if (data.websiteSettings) {
            await DatabaseService.updateWebsiteSettings(data.websiteSettings);
          }

          // Restore website contacts
          if (data.websiteContacts) {
            await DatabaseService.updateWebsiteContacts(data.websiteContacts);
          }

          setNotification({ type: 'success', message: lang === 'fr' ? 'Restauration terminée avec succès!' : 'تمت الاستعادة بنجاح!' });
          setTimeout(() => setNotification(null), 4000);

          // Reload page to reflect changes
          setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
          console.error('Error restoring database:', error);
          setNotification({ type: 'error', message: lang === 'fr' ? 'Erreur lors de la restauration' : 'خطأ في الاستعادة' });
          setTimeout(() => setNotification(null), 4000);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading backup file:', error);
      setNotification({ type: 'error', message: lang === 'fr' ? 'Fichier de sauvegarde invalide' : 'ملف نسخة احتياطية غير صالح' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-saas-bg via-saas-bg-light to-saas-bg p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black uppercase tracking-tighter text-saas-text-main mb-2 flex items-center gap-3">
            🛠️ {{fr: 'Configuration', ar: 'الإعدادات'}[lang]}
          </h1>
          <p className="text-saas-text-muted text-sm font-bold uppercase tracking-widest">
            {{fr: 'Gérez les paramètres de votre application', ar: 'إدارة إعدادات التطبيق'}[lang]}
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'general'
                ? 'bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white shadow-lg'
                : 'bg-white border-2 border-saas-border text-saas-text-main hover:border-saas-primary-via'
            }`}
          >
            🏢 {{fr: 'Général', ar: 'عام'}[lang]}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white shadow-lg'
                : 'bg-white border-2 border-saas-border text-saas-text-main hover:border-saas-primary-via'
            }`}
          >
            👤 {{fr: 'Profil & Sécurité', ar: 'الملف والأمان'}[lang]}
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'database'
                ? 'bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white shadow-lg'
                : 'bg-white border-2 border-saas-border text-saas-text-main hover:border-saas-primary-via'
            }`}
          >
            💾 {{fr: 'Base de données', ar: 'قاعدة البيانات'}[lang]}
          </button>
        </motion.div>

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

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saas-primary-via mx-auto mb-4"></div>
              <p className="text-saas-text-muted font-bold">
                {{fr: 'Chargement des paramètres...', ar: 'جاري تحميل الإعدادات...'}[lang]}
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-[2rem] shadow-lg border border-saas-border overflow-hidden"
            >
              <div className="p-6 border-b border-saas-border bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white">
                <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  🏢 {{fr: 'Informations de l\'agence', ar: 'معلومات الوكالة'}[lang]}
                </h2>
              </div>

              <form className="p-8 space-y-6" onSubmit={handleSaveAgencyInfo}>
                {/* Agency Name */}
                <div className="space-y-2">
                  <label className="label-saas">{{fr: 'Nom de l\'enseigne *', ar: 'اسم الإشارة *'}[lang]}</label>
                  <input
                    type="text"
                    name="agencyName"
                    value={generalData.agencyName}
                    onChange={handleGeneralChange}
                    className="input-saas"
                  />
                </div>

                {/* Slogan */}
                <div className="space-y-2">
                  <label className="label-saas">{{fr: 'Slogan commercial', ar: 'الشعار التجاري'}[lang]}</label>
                  <textarea
                    name="slogan"
                    value={generalData.slogan}
                    onChange={handleGeneralChange}
                    rows={2}
                    className="input-saas resize-none"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="label-saas">{{fr: 'Adresse du siège', ar: 'عنوان المقر'}[lang]}</label>
                  <input
                    type="text"
                    name="address"
                    value={generalData.address}
                    onChange={handleGeneralChange}
                    className="input-saas"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="label-saas">📞 {{fr: 'Téléphone', ar: 'الهاتف'}[lang]}</label>
                  <input
                    type="tel"
                    name="phone"
                    value={generalData.phone}
                    onChange={handleGeneralChange}
                    className="input-saas"
                  />
                </div>

                {/* Second Phone Number */}
                <div className="space-y-2">
                  <label className="label-saas">📱 {{fr: 'Deuxième numéro de téléphone', ar: 'رقم الهاتف الثاني'}[lang]}</label>
                  <input
                    type="tel"
                    name="phoneNumber2"
                    value={generalData.phoneNumber2}
                    onChange={handleGeneralChange}
                    className="input-saas"
                  />
                </div>

                {/* Bank Number */}
                <div className="space-y-2">
                  <label className="label-saas">🏦 {{fr: 'Numéro de compte bancaire', ar: 'رقم الحساب البنكي'}[lang]}</label>
                  <input
                    type="text"
                    name="bankNumber"
                    value={generalData.bankNumber}
                    onChange={handleGeneralChange}
                    className="input-saas"
                  />
                </div>

                {/* Logo */}
                <div className="space-y-4">
                  <label className="label-saas">🖼️ {{fr: 'Logo de l\'agence', ar: 'شعار الوكالة'}[lang]}</label>
                  <div className="flex gap-6 items-start">
                    <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-saas-border bg-saas-bg flex items-center justify-center flex-shrink-0">
                      {generalData.logo ? (
                        <img src={generalData.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-4xl">🏢</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <span className="btn-saas-primary px-6 py-3 inline-block cursor-pointer">
                          {{fr: 'Changer le logo', ar: 'تغيير الشعار'}[lang]}
                        </span>
                      </label>
                      <p className="text-xs text-saas-text-muted mt-2">
                        {{fr: 'Format recommandé: PNG ou JPG (500x500px)', ar: 'الصيغة الموصى بها: PNG أو JPG (500x500px)'}[lang]}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-3 pt-6 border-t border-saas-border">
                  <button
                    type="button"
                    className="flex-1 py-3 px-4 rounded-lg font-bold text-sm bg-white border-2 border-saas-border hover:bg-saas-bg-light transition-colors text-saas-text-main"
                  >
                    {{fr: 'Annuler', ar: 'إلغاء'}[lang]}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-saas-primary py-3"
                  >
                    {{fr: 'Enregistrer les modifications', ar: 'حفظ التغييرات'}[lang]}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* PROFILE & SECURITY TAB */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Profile Section */}
              <div className="bg-white rounded-[2rem] shadow-lg border border-saas-border overflow-hidden">
                <div className="p-6 border-b border-saas-border bg-linear-to-r from-blue-500 via-blue-600 to-blue-700 text-white">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">👤 {{fr: 'Mon Profil', ar: 'ملفي الشخصي'}[lang]}</h2>
                </div>

                <form className="p-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
                  {/* Profile Photo */}
                  <div className="space-y-4">
                    <label className="label-saas">📸 {{fr: 'Photo de profil', ar: 'صورة الملف'}[lang]}</label>
                    <div className="flex gap-6 items-start">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-saas-primary-via shadow-lg flex items-center justify-center flex-shrink-0 bg-saas-bg">
                        {profileData.profilePhoto ? (
                          <img src={profileData.profilePhoto} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-4xl">👤</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePhotoUpload}
                            className="hidden"
                          />
                          <span className="btn-saas-primary px-6 py-3 inline-block cursor-pointer">
                            {{fr: 'Changer la photo', ar: 'تغيير الصورة'}[lang]}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <label className="label-saas">👤 {{fr: 'Nom complet', ar: 'الاسم الكامل'}[lang]}</label>
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      className="input-saas"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-6 border-t border-saas-border">
                    <button
                      type="button"
                      className="flex-1 py-3 px-4 rounded-lg font-bold text-sm bg-white border-2 border-saas-border hover:bg-saas-bg-light transition-colors text-saas-text-main"
                    >
                      {{fr: 'Annuler', ar: 'إلغاء'}[lang]}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn-saas-primary py-3"
                    >
                      {{fr: 'Enregistrer', ar: 'حفظ'}[lang]}
                    </button>
                  </div>
                </form>
              </div>

              {/* Security Section */}
              <div className="bg-white rounded-[2rem] shadow-lg border border-saas-border overflow-hidden">
                <div className="p-6 border-b border-saas-border bg-linear-to-r from-red-500 via-red-600 to-red-700 text-white">
                  <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                    🛡️ {{fr: 'Informations de Connexion', ar: 'معلومات تسجيل الدخول'}[lang]}
                  </h2>
                </div>

                <form className="p-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
                  {/* Username */}
                  <div className="space-y-2">
                    <label className="label-saas">👤 {{fr: 'Nom d\'utilisateur', ar: 'اسم المستخدم'}[lang]}</label>
                    <input
                      type="text"
                      name="username"
                      value={securityData.username}
                      onChange={handleSecurityChange}
                      className="input-saas"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="label-saas">📧 {{fr: 'E-mail de récupération', ar: 'البريد الإلكتروني للاستعادة'}[lang]}</label>
                    <input
                      type="email"
                      name="email"
                      value={securityData.email}
                      onChange={handleSecurityChange}
                      className="input-saas"
                    />
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <label className="label-saas">🔐 {{fr: 'Nouveau mot de passe', ar: 'كلمة المرور الجديدة'}[lang]}</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={securityData.newPassword}
                      onChange={handleSecurityChange}
                      placeholder="••••••••"
                      className="input-saas"
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="label-saas">🔐 {{fr: 'Confirmer le mot de passe', ar: 'تأكيد كلمة المرور'}[lang]}</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={securityData.confirmPassword}
                      onChange={handleSecurityChange}
                      placeholder="••••••••"
                      className="input-saas"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-6 border-t border-saas-border">
                    <button
                      type="button"
                      className="flex-1 py-3 px-4 rounded-lg font-bold text-sm bg-white border-2 border-saas-border hover:bg-saas-bg-light transition-colors text-saas-text-main"
                    >
                      {{fr: 'Annuler', ar: 'إلغاء'}[lang]}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn-saas-primary py-3"
                    >
                      {{fr: 'Mettre à jour', ar: 'تحديث'}[lang]}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* DATABASE TAB */}
          {activeTab === 'database' && (
            <motion.div
              key="database"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-[2rem] shadow-lg border border-saas-border overflow-hidden">
                <div className="p-6 border-b border-saas-border bg-linear-to-r from-green-500 via-green-600 to-green-700 text-white">
                  <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                    💾 {{fr: 'Gestion des données', ar: 'إدارة البيانات'}[lang]}
                  </h2>
                </div>

                <div className="p-8 space-y-6">
                  {/* Backup Section */}
                  <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-black text-green-700 text-lg flex items-center gap-2">
                          📤 {{fr: 'Sauvegarder', ar: 'قياس النسخ الاحتياطية'}[lang]}
                        </h3>
                        <p className="text-sm text-green-600 mt-1">
                          {{fr: 'Dernière sauvegarde : ', ar: 'آخر نسخة احتياطية : '}[lang]}<span className="font-bold">{lastBackup}</span>
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-green-700 mb-4">
                      {{fr: 'Téléchargez une copie complète de vos données au format JSON/SQL.', ar: 'قم بتنزيل نسخة كاملة من بياناتك بصيغة JSON / SQL.'}[lang]}
                    </p>
                    <button
                      onClick={handleExportDatabase}
                      className="btn-saas-primary py-3 px-6"
                    >
                      {{fr: 'Lancer l\'exportation', ar: 'ابدأ التصدير'}[lang]}
                    </button>
                  </div>

                  {/* Restore Section */}
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-black text-blue-700 text-lg flex items-center gap-2">
                          📥 {{fr: 'Restaurer une sauvegarde', ar: 'استعادة نسخة احتياطية'}[lang]}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-blue-700 mb-4">
                      {{fr: 'Importez un fichier de sauvegarde pour restaurer vos informations.', ar: 'استيراد ملف نسخة احتياطية لاستعادة معلوماتك.'}[lang]}
                    </p>
                    <div className="flex gap-3">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept=".json,.sql"
                          onChange={handleRestoreDatabase}
                          className="hidden"
                        />
                        <span className="btn-saas-primary py-3 px-6 inline-block cursor-pointer w-full text-center">
                          {{fr: 'Choisir un fichier', ar: 'اختر ملف'}[lang]}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
