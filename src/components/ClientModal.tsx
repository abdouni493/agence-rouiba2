import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Client, Language } from '../types';
import { X, Loader2 } from 'lucide-react';
import { uploadClientProfilePhoto, uploadClientDocument } from '../services/uploadClientImage';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Partial<Client>) => Promise<void>;
  client?: Client;
  lang: Language;
}

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSave, client, lang }) => {
  const [formData, setFormData] = useState<Partial<Client>>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    placeOfBirth: '',
    licenseNumber: '',
    licenseExpirationDate: '',
    licenseDeliveryDate: '',
    licenseDeliveryPlace: '',
    documentType: 'none',
    documentNumber: '',
    documentDeliveryDate: '',
    documentExpirationDate: '',
    documentDeliveryAddress: '',
    wilaya: '16 - Alger',
    completeAddress: '',
    profilePhoto: '',
    scannedDocuments: [],
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData(client);
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        dateOfBirth: '',
        placeOfBirth: '',
        licenseNumber: '',
        licenseExpirationDate: '',
        licenseDeliveryDate: '',
        licenseDeliveryPlace: '',
        documentType: 'none',
        documentNumber: '',
        documentDeliveryDate: '',
        documentExpirationDate: '',
        documentDeliveryAddress: '',
        wilaya: '16 - Alger',
        completeAddress: '',
        profilePhoto: '',
        scannedDocuments: [],
      });
    }
  }, [client, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploading(true);
      setUploadError(null);
      try {
        const result = await uploadClientProfilePhoto(file, client?.id);
        if (result.success && result.url) {
          setFormData(prev => ({ ...prev, profilePhoto: result.url }));
        } else {
          setUploadError(result.error || 'Upload failed');
        }
      } catch (err) {
        console.error('Upload error:', err);
        setUploadError('Erreur lors du téléchargement');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploading(true);
      setUploadError(null);
      try {
        const result = await uploadClientDocument(file, client?.id);
        if (result.success && result.url) {
          setFormData(prev => ({
            ...prev,
            scannedDocuments: [...(prev.scannedDocuments || []), result.url]
          }));
        } else {
          setUploadError(result.error || 'Upload failed');
        }
      } catch (err) {
        console.error('Upload error:', err);
        setUploadError('Erreur lors du téléchargement');
      } finally {
        setUploading(false);
      }
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      scannedDocuments: (prev.scannedDocuments || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    // Validation
    const errors: string[] = [];
    
    if (!formData.firstName?.trim()) {
      errors.push(lang === 'fr' ? 'Prénom est requis' : 'الاسم الأول مطلوب');
    }
    if (!formData.lastName?.trim()) {
      errors.push(lang === 'fr' ? 'Nom de famille est requis' : 'اسم العائلة مطلوب');
    }
    if (!formData.phone?.trim()) {
      errors.push(lang === 'fr' ? 'Téléphone est requis' : 'الهاتف مطلوب');
    }
    if (!formData.licenseNumber?.trim()) {
      errors.push(lang === 'fr' ? 'N° Permis est requis' : 'رقم الرخصة مطلوب');
    }
    
    if (errors.length > 0) {
      setValidationError(errors.join(', '));
      return;
    }
    
    try {
      setSaving(true);
      await onSave(formData);
      // Success - modal will be closed by parent
    } catch (err) {
      console.error('Error saving client:', err);
      setValidationError(lang === 'fr' ? 'Erreur lors de l\'enregistrement du client' : 'خطأ في حفظ العميل');
    } finally {
      setSaving(false);
    }
  };

  const wilayas = [
    '01 - Adrar', '02 - Chlef', '03 - Laghouat', '04 - Oum El Bouaghi', '05 - Batna',
    '06 - Béjaïa', '07 - Biscrra', '08 - Béchar', '09 - Blida', '10 - Boumerdès',
    '11 - Tébessa', '12 - Tlemcen', '13 - Tiaret', '14 - Tizi Ouzou', '15 - Alger',
    '16 - Alger', '17 - Sétif', '18 - Saïda', '19 - Skikda', '20 - Sidi-Bel-Abbès',
    '21 - Annaba', '22 - Guelma', '23 - Constantine', '24 - Médéa', '25 - Mostaganem',
    '26 - M\'Sila', '27 - Mascara', '28 - Ouargla', '29 - Oran', '30 - El Asnam',
    '31 - Oran', '32 - El Bayad', '33 - Illizi', '34 - Bordj Bou Arréridj',
    '35 - Boumerdès', '36 - El Taraf', '37 - Tindouf', '38 - Tissemsilt',
    '39 - El Oued', '40 - Khenchela', '41 - Souk Ahras', '42 - Tipaza',
    '43 - Mila', '44 - Aïn Defla', '45 - Naâma', '46 - Aïn Témouchent',
    '47 - Ghardaïa', '48 - Relizane', '49 - Draa Ben Stita', '50 - Moughla',
    '51 - Beni Ounif', '52 - Hassi Messaoud', '53 - El Hadjira', '54 - Ain Salah',
    '55 - In Aménas', '56 - Timimoun', '57 - Ouled Driss', '58 - Zaouatellah'
  ];

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
              {client ? '✏️' : '👤'} 
              {client 
                ? (lang === 'fr' ? 'Modifier Client' : 'تعديل العميل')
                : (lang === 'fr' ? 'Nouveau Client' : 'عميل جديد')}
            </h2>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
              {lang === 'fr' ? 'Informations complètes' : 'المعلومات الكاملة'}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Photos & Médias */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              📸 {lang === 'fr' ? 'Photos & Médias' : 'الصور والوسائط'}
            </h3>
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-saas-primary-via shadow-lg bg-saas-bg flex items-center justify-center mb-3">
                {formData.profilePhoto ? (
                  <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em] mb-2">
                  👤 {lang === 'fr' ? 'Photo de Profil' : 'صورة الملف الشخصي'}
                </p>
                {uploadError && (
                  <p className="text-xs text-red-600 mb-2">{uploadError}</p>
                )}
                <label className={`btn-saas-primary px-4 py-2 text-sm cursor-pointer flex items-center justify-center gap-2 ${uploading ? 'opacity-50' : ''}`}>
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {lang === 'fr' ? 'Téléchargement...' : 'جاري...'}
                    </>
                  ) : (
                    <>
                      📷 {lang === 'fr' ? 'Charger Photo' : 'تحميل الصورة'}
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" disabled={uploading} />
                </label>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              👤 {lang === 'fr' ? 'Informations Personnelles' : 'المعلومات الشخصية'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="label-saas">✍️ {lang === 'fr' ? 'Nom de Famille *' : 'اسم العائلة *'}</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Boudjellal"
                  className="input-saas"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="label-saas">✍️ {lang === 'fr' ? 'Prénom *' : 'الاسم الأول *'}</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Ahmed"
                  className="input-saas"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="label-saas">📱 {lang === 'fr' ? 'Téléphone *' : 'الهاتف *'}</label>
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

            <div className="space-y-2">
              <label className="label-saas">📧 {lang === 'fr' ? 'Email (optionnel)' : 'البريد الإلكتروني (اختياري)'}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="client@email.com"
                className="input-saas"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="label-saas">🎂 {lang === 'fr' ? 'Date Naissance' : 'تاريخ الميلاد'}</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="input-saas"
                />
              </div>
              <div className="space-y-2">
                <label className="label-saas">📍 {lang === 'fr' ? 'Lieu Naissance' : 'مكان الميلاد'}</label>
                <input
                  type="text"
                  name="placeOfBirth"
                  value={formData.placeOfBirth}
                  onChange={handleChange}
                  placeholder="Alger"
                  className="input-saas"
                />
              </div>
            </div>
          </div>

          {/* Official Documents */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              🆔 {lang === 'fr' ? 'Documents Officiels' : 'الوثائق الرسمية'}
            </h3>
            <div className="space-y-2">
              <label className="label-saas">🚗 {lang === 'fr' ? 'N° Permis *' : 'رقم الرخصة *'}</label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="DZA12345678"
                className="input-saas"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="label-saas">📅 {{fr: 'Délivrance Permis', ar: 'استخراج الرخصة'}[lang]}</label>
                <input
                  type="date"
                  name="licenseDeliveryDate"
                  value={formData.licenseDeliveryDate}
                  onChange={handleChange}
                  className="input-saas"
                />
              </div>
              <div className="space-y-2">
                <label className="label-saas">⏱️ {lang === 'fr' ? 'Expiration Permis' : 'انتهاء الرخصة'}</label>
                <input
                  type="date"
                  name="licenseExpirationDate"
                  value={formData.licenseExpirationDate}
                  onChange={handleChange}
                  className="input-saas"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="label-saas">📍 {{fr: 'Lieu Délivrance Permis', ar: 'مكان استخراج الرخصة'}[lang]}</label>
              <input
                type="text"
                name="licenseDeliveryPlace"
                value={formData.licenseDeliveryPlace}
                onChange={handleChange}
                placeholder="Alger"
                className="input-saas"
              />
            </div>
          </div>

          {/* Additional Documents */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              🎫 {{fr: 'Type Document Additionnel', ar: 'نوع الوثيقة الإضافية'}[lang]}
            </h3>
            <div className="space-y-2">
              <label className="label-saas">🎫 {{fr: 'Type Doc', ar: 'نوع الوثيقة'}[lang]}</label>
              <select name="documentType" value={formData.documentType || 'none'} onChange={handleChange} className="input-saas">
                <option value="none">{{fr: 'Aucun', ar: 'لا يوجد'}[lang]}</option>
                <option value="id_card">{{fr: 'Carte d\'Identité', ar: 'بطاقة هوية'}[lang]}</option>
                <option value="passport">{{fr: 'Passeport', ar: 'جواز السفر'}[lang]}</option>
                <option value="autre">{{fr: 'Autre', ar: 'أخرى'}[lang]}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="label-saas">🔢 {{fr: 'N° Document', ar: 'رقم الوثيقة'}[lang]}</label>
              <input
                type="text"
                name="documentNumber"
                value={formData.documentNumber}
                onChange={handleChange}
                placeholder={{fr: 'Numéro...', ar: 'الرقم...'}[lang]}
                className="input-saas"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="label-saas">📅 {{fr: 'Délivrance', ar: 'الاستخراج'}[lang]}</label>
                <input
                  type="date"
                  name="documentDeliveryDate"
                  value={formData.documentDeliveryDate}
                  onChange={handleChange}
                  className="input-saas"
                />
              </div>
              <div className="space-y-2">
                <label className="label-saas">⏰ {{fr: 'Expiration', ar: 'الانتهاء'}[lang]}</label>
                <input
                  type="date"
                  name="documentExpirationDate"
                  value={formData.documentExpirationDate}
                  onChange={handleChange}
                  className="input-saas"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="label-saas">📍 {{fr: 'Adresse Délivrance', ar: 'عنوان الاستخراج'}[lang]}</label>
              <input
                type="text"
                name="documentDeliveryAddress"
                value={formData.documentDeliveryAddress}
                onChange={handleChange}
                placeholder={{fr: 'Adresse...', ar: 'العنوان...'}[lang]}
                className="input-saas"
              />
            </div>
          </div>

          {/* Address & Location */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              🏠 {{fr: 'Adresse & Localisation', ar: 'العنوان والموقع'}[lang]}
            </h3>
            <div className="space-y-2">
              <label className="label-saas">🏙️ {{fr: 'Wilaya *', ar: 'الولاية *'}[lang]}</label>
              <select name="wilaya" value={formData.wilaya || '16 - Alger'} onChange={handleChange} className="input-saas">
                {wilayas.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-saas">📮 {{fr: 'Adresse Complète', ar: 'العنوان الكامل'}[lang]}</label>
              <input
                type="text"
                name="completeAddress"
                value={formData.completeAddress}
                onChange={handleChange}
                placeholder={{fr: '123 Rue Principal, Alger', ar: 'العنوان الكامل'}[lang]}
                className="input-saas"
              />
            </div>
          </div>

          {/* Scanned Documents */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              📄 {lang === 'fr' ? 'Documents Scannés' : 'المستندات الممسوحة ضوئياً'}
            </h3>
            {uploadError && (
              <p className="text-xs text-red-600">{uploadError}</p>
            )}
            <label className={`btn-saas-primary px-4 py-2 text-sm cursor-pointer flex items-center justify-center gap-2 ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {lang === 'fr' ? 'Téléchargement...' : 'جاري...'}
                </>
              ) : (
                <>
                  📄 {lang === 'fr' ? 'Ajouter Documents' : 'إضافة المستندات'}
                </>
              )}
              <input type="file" accept="image/*,.pdf" onChange={handleDocumentUpload} className="hidden" disabled={uploading} />
            </label>
            
            {/* Document Preview Grid */}
            {formData.scannedDocuments && formData.scannedDocuments.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {formData.scannedDocuments.map((doc, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-saas-border">
                    <img src={doc} alt={`Document ${idx + 1}`} className="w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeDocument(idx)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <span className="text-white text-2xl">✕</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
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
