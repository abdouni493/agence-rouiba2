import React, { useState, useEffect } from 'react';
import { Worker, Language, PaymentType } from '../types';
import { motion } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import { uploadWorkerProfilePhoto } from '../services/uploadWorkerImage';

interface WorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (worker: Partial<Worker>) => void;
  worker?: Worker;
  lang: Language;
}

export const WorkerModal: React.FC<WorkerModalProps> = ({ isOpen, onClose, onSave, worker, lang }) => {
  const [formData, setFormData] = useState<Partial<Worker>>({
    fullName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    address: '',
    profilePhoto: '',
    type: 'worker',
    paymentType: 'monthly',
    baseSalary: 0,
    username: '',
    password: '',
  });
  const [paymentEnabled, setPaymentEnabled] = useState(!!worker?.baseSalary);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (worker) {
      setFormData(worker);
      setPaymentEnabled(!!worker.baseSalary);
    } else {
      setFormData({
        fullName: '',
        dateOfBirth: '',
        phone: '',
        email: '',
        address: '',
        profilePhoto: '',
        type: 'worker',
        paymentType: 'monthly',
        baseSalary: 0,
        username: '',
        password: '',
      });
      setPaymentEnabled(false);
    }
  }, [worker, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'baseSalary' ? parseFloat(value) || 0 : value
    }));
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  const handlePaymentTypeToggle = (type: PaymentType) => {
    setFormData(prev => ({
      ...prev,
      paymentType: prev.paymentType === type ? undefined : type
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploading(true);
      setUploadError(null);
      try {
        const result = await uploadWorkerProfilePhoto(file, worker?.id);
        if (result.success && result.url) {
          setFormData(prev => ({
            ...prev,
            profilePhoto: result.url
          }));
        } else {
          setUploadError(result.error || 'Upload failed');
        }
      } catch (err) {
        console.error('Upload failed:', err);
        setUploadError('Upload failed');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation
    const errors: string[] = [];

    if (!formData.fullName?.trim()) {
      errors.push(lang === 'fr' ? 'Nom complet est requis' : 'الاسم الكامل مطلوب');
    }
    if (!formData.phone?.trim()) {
      errors.push(lang === 'fr' ? 'Téléphone est requis' : 'الهاتف مطلوب');
    }
    if (!formData.email?.trim()) {
      errors.push(lang === 'fr' ? 'Email est requis' : 'البريد الإلكتروني مطلوب');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push(lang === 'fr' ? 'Email invalide' : 'بريد إلكتروني غير صحيح');
    }
    if (!formData.username?.trim()) {
      errors.push(lang === 'fr' ? 'Nom d\'utilisateur est requis' : 'اسم المستخدم مطلوب');
    }
    if (!formData.password?.trim()) {
      errors.push(lang === 'fr' ? 'Mot de passe est requis' : 'كلمة المرور مطلوبة');
    } else if (formData.password.length < 6) {
      errors.push(lang === 'fr' ? 'Mot de passe doit avoir au moins 6 caractères' : 'كلمة المرور يجب أن تكون على الأقل 6 أحرف');
    }
    if (paymentEnabled && (!formData.baseSalary || formData.baseSalary <= 0)) {
      errors.push(lang === 'fr' ? 'Salaire de base est requis' : 'الراتب الأساسي مطلوب');
    }

    if (errors.length > 0) {
      setValidationError(errors.join(', '));
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      // Success - modal will be closed by parent
    } catch (err: any) {
      console.error('Error saving worker:', err);
      let errorMsg = lang === 'fr' ? 'Erreur lors de l\'enregistrement du travailleur' : 'خطأ في حفظ العامل';

      // Supabase errors expose the DB/RPC message on .message (and sometimes .details).
      const raw = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`;

      if (raw.includes('EMAIL_ALREADY_EXISTS') || raw.includes('already registered') || raw.includes('duplicate')) {
        errorMsg = lang === 'fr' ? 'Cet email est déjà utilisé' : 'هذا البريد الإلكتروني مستخدم بالفعل';
      } else if (raw.includes('ADMIN_SESSION_REQUIRED') || raw.includes('ONLY_ADMIN_CAN_CREATE_WORKER')) {
        errorMsg = lang === 'fr'
          ? 'Session administrateur expirée. Veuillez vous reconnecter puis réessayer.'
          : 'انتهت جلسة المسؤول. يرجى إعادة تسجيل الدخول ثم المحاولة مرة أخرى.';
      } else if (raw.includes('does not exist') || raw.includes('gen_salt') || raw.includes('crypt(')) {
        errorMsg = lang === 'fr'
          ? 'Configuration Supabase manquante : exécutez la migration de la base de données.'
          : 'إعداد Supabase مفقود: يرجى تشغيل ترحيل قاعدة البيانات.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      setValidationError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-saas-border max-h-[90vh]"
      >
        <div className="p-6 border-b border-saas-border flex items-center justify-between bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              {worker ? '✏️' : '➕'} 
              {worker 
                ? (lang === 'fr' ? 'Modifier' : 'تعديل')
                : (lang === 'fr' ? 'Ajouter un membre' : 'إضافة عضو')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Photo */}
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-saas-primary-via shadow-lg bg-saas-bg flex items-center justify-center mb-3">
              {formData.profilePhoto ? (
                <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </div>
            <label className={`btn-saas-primary px-4 py-2 text-sm cursor-pointer flex items-center justify-center gap-2 ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {lang === 'fr' ? 'Téléchargement...' : 'جاري الرفع...'}
                </>
              ) : (
                <>
                  📷 {lang === 'fr' ? 'Photo (optionnel)' : 'الصورة (اختياري)'}
                </>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
            </label>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <label className="label-saas">👤 {{fr: 'Nom Complet *', ar: 'الاسم الكامل *'}[lang]}</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Ahmed Boudjellal"
              className="input-saas"
              required
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <label className="label-saas">🎂 {{fr: 'Date de naissance', ar: 'تاريخ الميلاد'}[lang]}</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth || ''}
              onChange={handleChange}
              className="input-saas"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="label-saas">📱 {{fr: 'Téléphone *', ar: 'الهاتف *'}[lang]}</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+213 5 1234 5678"
              className="input-saas"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="label-saas">📧 {{fr: 'E-mail', ar: 'البريد الإلكتروني'}[lang]}</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ahmed@email.com"
              className="input-saas"
              required
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="label-saas">📍 {{fr: 'Adresse', ar: 'العنوان'}[lang]}</label>
            <input
              type="text"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              placeholder="Alger, Algeria"
              className="input-saas"
            />
          </div>

          {/* Worker Type */}
          <div className="space-y-2">
            <label className="label-saas">👨‍💼 {{fr: 'Type de travailleur *', ar: 'نوع العامل *'}[lang]}</label>
            <select name="type" value={formData.type || 'worker'} onChange={handleChange} className="input-saas" required>
              <option value="admin">{{fr: 'Admin', ar: 'مسؤول'}[lang]}</option>
              <option value="worker">{{fr: 'Travailleur', ar: 'عامل'}[lang]}</option>
              <option value="driver">{{fr: 'Chauffeur', ar: 'سائق'}[lang]}</option>
            </select>
          </div>

          {/* Payment Enabled Toggle */}
          <div className="space-y-2">
            <label className="label-saas">💰 {{fr: 'Appliquer le paiement ?', ar: 'تطبيق الدفع؟'}[lang]}</label>
            <button
              type="button"
              onClick={() => setPaymentEnabled(!paymentEnabled)}
              className={`w-full py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                paymentEnabled
                  ? 'btn-saas-primary'
                  : 'btn-saas-outline'
              }`}
            >
              {paymentEnabled ? '✅ ' : '❌ '} {{fr: 'Paiement activé', ar: 'الدفع مفعل'}[lang]}
            </button>
          </div>

          {paymentEnabled && (
            <>
              {/* Payment Type Toggle */}
              <div className="space-y-2">
                <label className="label-saas">💰 {{fr: 'Type de paiement', ar: 'نوع الدفع'}[lang]}</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeToggle('daily')}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all ${
                      formData.paymentType === 'daily'
                        ? 'btn-saas-primary'
                        : 'btn-saas-outline'
                    }`}
                  >
                    {{fr: 'Par jour', ar: 'يومياً'}[lang]}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeToggle('monthly')}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all ${
                      formData.paymentType === 'monthly'
                        ? 'btn-saas-primary'
                        : 'btn-saas-outline'
                    }`}
                  >
                    {{fr: 'Par mois', ar: 'شهرياً'}[lang]}
                  </button>
                </div>
              </div>

              {/* Base Salary */}
              <div className="space-y-2">
                <label className="label-saas">💵 {{fr: 'Montant du salaire (DZ) *', ar: 'مبلغ الراتب (دينار) *'}[lang]}</label>
                <input
                  type="number"
                  name="baseSalary"
                  value={formData.baseSalary || 0}
                  onChange={handleChange}
                  placeholder="3500"
                  className="input-saas"
                  required={paymentEnabled}
                />
              </div>
            </>
          )}

          {/* Username */}
          <div className="space-y-2">
            <label className="label-saas">🔐 {{fr: 'Nom d\'utilisateur *', ar: 'اسم المستخدم *'}[lang]}</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="ahmed.boudj"
              className="input-saas"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="label-saas">🔒 {{fr: 'Mot de passe *', ar: 'كلمة المرور *'}[lang]}</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="input-saas"
              required
            />
          </div>
        </form>

        {/* Actions */}
        {(validationError || uploadError) && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200">
            <p className="text-red-600 text-sm font-medium">
              ⚠️ {validationError || uploadError}
            </p>
          </div>
        )}
        <div className="p-6 border-t border-saas-border flex items-center gap-4 bg-saas-bg">
          <button 
            onClick={onClose} 
            className="flex-1 btn-saas-outline py-3"
            disabled={saving}
          >
            {{fr: 'Annuler', ar: 'إلغاء'}[lang]}
          </button>
          <button 
            onClick={handleSubmit}
            className="flex-1 btn-saas-primary py-3 flex items-center justify-center gap-2"
            disabled={saving || uploading}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {lang === 'fr' ? 'Enregistrement...' : 'جاري الحفظ...'}
              </>
            ) : (
              lang === 'fr' ? 'Enregistrer' : 'حفظ'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
