import React, { useState } from 'react';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { useWizard } from './WizardContext';
import { uploadClientProfilePhoto, uploadClientDocument } from '../../../services/uploadClientImage';
import { SectionCard, SectionTitle, FieldLabel, inputClass, inputStyle, focusInput, blurInput, C, ALGERIAN_WILAYAS } from './wizardUi';

/**
 * Étape 5 — Informations personnelles.
 * Reprend exactement les champs, libellés et validations du flux existant
 * (photo, identité, permis, document additionnel, documents scannés, adresse).
 */
export const StepPersonalInfo: React.FC = () => {
  const { lang, personal, setPersonal } = useWizard();

  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPersonal(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadingProfile(true);
    try {
      const result = await uploadClientProfilePhoto(file);
      if (result.success && result.url) {
        setPersonal(prev => ({ ...prev, photo: result.url }));
      } else {
        setUploadError(result.error || 'Upload failed');
      }
    } catch {
      setUploadError('Upload error');
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    setUploadError(null);
    for (const file of Array.from(fileList) as File[]) {
      setUploadingDocument(true);
      try {
        const result = await uploadClientDocument(file);
        if (result.success && result.url) {
          setPersonal(prev => ({ ...prev, scannedDocuments: [...(prev.scannedDocuments || []), result.url] }));
        } else {
          setUploadError(result.error || 'Upload failed');
        }
      } catch {
        setUploadError('Upload error');
      } finally {
        setUploadingDocument(false);
      }
    }
  };

  const removeDocument = (index: number) => {
    setPersonal(prev => ({ ...prev, scannedDocuments: prev.scannedDocuments?.filter((_, i) => i !== index) || [] }));
  };

  return (
    <div className="space-y-6">
      {/* Photo */}
      <SectionCard>
        <SectionTitle>📸 {{ fr: 'Photo (optionnelle)', ar: 'صورة (اختياري)' }[lang]}</SectionTitle>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.16)' }}>
            {personal.photo
              ? <img src={personal.photo} alt="Photo" className="w-full h-full object-cover" />
              : <span className="text-3xl">📷</span>
            }
          </div>
          <label>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingProfile} />
            <span className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${uploadingProfile ? 'opacity-50' : ''}`}
              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: C.accent, fontFamily: 'var(--font-display)' }}>
              {uploadingProfile ? <><Loader2 size={16} className="animate-spin" /> {lang === 'fr' ? 'Envoi…' : 'جاري…'}</> : <><Upload size={16} /> {lang === 'fr' ? 'Charger' : 'تحميل'}</>}
            </span>
          </label>
        </div>
        {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}
      </SectionCard>

      {/* Personal info */}
      <SectionCard>
        <SectionTitle>👤 {{ fr: 'Informations Personnelles', ar: 'معلومات شخصية' }[lang]}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: { fr: 'Nom de famille *', ar: 'الاسم الأخير *' }, name: 'lastName', type: 'text' },
            { label: { fr: 'Prénom *', ar: 'الاسم الأول *' }, name: 'firstName', type: 'text' },
            { label: { fr: 'Téléphone *', ar: 'الهاتف *' }, name: 'phone', type: 'tel' },
            { label: { fr: 'Email *', ar: 'البريد الإلكتروني *' }, name: 'email', type: 'email' },
            { label: { fr: 'Date de naissance', ar: 'تاريخ الميلاد' }, name: 'dateOfBirth', type: 'date' },
            { label: { fr: 'Lieu de naissance', ar: 'مكان الميلاد' }, name: 'placeOfBirth', type: 'text' },
          ].map(f => (
            <div key={f.name}>
              <FieldLabel>{f.label[lang]}</FieldLabel>
              <input type={f.type} name={f.name} value={(personal as any)[f.name]}
                onChange={handleChange} className={inputClass} style={inputStyle}
                onFocus={focusInput} onBlur={blurInput} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* License */}
      <SectionCard>
        <SectionTitle>🪪 {{ fr: 'Permis de conduire', ar: 'رخصة القيادة' }[lang]}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: { fr: 'N° Permis *', ar: 'رقم الرخصة *' }, name: 'licenseNumber', type: 'text' },
            { label: { fr: 'Expiration', ar: 'انتهاء الصلاحية' }, name: 'licenseExpiration', type: 'date' },
            { label: { fr: 'Date de délivrance', ar: 'تاريخ الإصدار' }, name: 'licenseDelivery', type: 'date' },
            { label: { fr: 'Lieu de délivrance', ar: 'مكان الإصدار' }, name: 'licenseDeliveryPlace', type: 'text' },
          ].map(f => (
            <div key={f.name}>
              <FieldLabel>{f.label[lang]}</FieldLabel>
              <input type={f.type} name={f.name} value={(personal as any)[f.name]}
                onChange={handleChange} className={inputClass} style={inputStyle}
                onFocus={focusInput} onBlur={blurInput} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Additional document */}
      <SectionCard>
        <SectionTitle>🎫 {{ fr: 'Document additionnel', ar: 'وثيقة إضافية' }[lang]}</SectionTitle>
        <div>
          <FieldLabel>{{ fr: 'Type de document', ar: 'نوع الوثيقة' }[lang]}</FieldLabel>
          <select name="additionalDocType" value={personal.additionalDocType}
            onChange={handleChange} className={inputClass} style={{ ...inputStyle, cursor: 'pointer' }}
            onFocus={focusInput} onBlur={blurInput}>
            <option value="none">{{ fr: 'Aucun', ar: 'بدون' }[lang]}</option>
            <option value="id_card">{{ fr: "Carte d'identité", ar: 'بطاقة الهوية' }[lang]}</option>
            <option value="passport">{{ fr: 'Passeport', ar: 'جواز سفر' }[lang]}</option>
          </select>
        </div>
        {personal.additionalDocType !== 'none' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: { fr: 'N° Document', ar: 'رقم الوثيقة' }, name: 'additionalDocNumber', type: 'text' },
              { label: { fr: 'Date délivrance', ar: 'تاريخ الإصدار' }, name: 'additionalDocDelivery', type: 'date' },
              { label: { fr: 'Expiration', ar: 'الانتهاء' }, name: 'additionalDocExpiration', type: 'date' },
              { label: { fr: 'Adresse délivrance', ar: 'عنوان الإصدار' }, name: 'additionalDocDeliveryAddress', type: 'text' },
            ].map(f => (
              <div key={f.name}>
                <FieldLabel>{f.label[lang]}</FieldLabel>
                <input type={f.type} name={f.name} value={(personal as any)[f.name]}
                  onChange={handleChange} className={inputClass} style={inputStyle}
                  onFocus={focusInput} onBlur={blurInput} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Scanned docs */}
      <SectionCard>
        <SectionTitle>📄 {{ fr: 'Documents scannés', ar: 'الوثائق الممسوحة' }[lang]}</SectionTitle>
        <p className="text-vel-muted text-sm -mt-2">
          {{ fr: "Permis de conduire, carte d'identité, etc.", ar: 'رخصة القيادة، بطاقة الهوية، إلخ' }[lang]}
        </p>
        <label>
          <input type="file" multiple accept="image/*,.pdf" onChange={handleDocumentUpload} className="hidden" disabled={uploadingDocument} />
          <span className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${uploadingDocument ? 'opacity-50' : ''}`}
            style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.28)', color: C.amber, fontFamily: 'var(--font-display)' }}>
            {uploadingDocument ? <><Loader2 size={16} className="animate-spin" /> {lang === 'fr' ? 'Envoi…' : 'جاري…'}</> : <><Upload size={16} /> {{ fr: 'Télécharger', ar: 'تحميل' }[lang]}</>}
          </span>
        </label>
        {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}

        {personal.scannedDocuments && personal.scannedDocuments.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {personal.scannedDocuments.map((docUrl, index) => (
              <div key={index} className="relative group aspect-square rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(217,119,6,0.28)' }}>
                {docUrl.includes('data:application/pdf') ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: 'rgba(217,119,6,0.08)' }}>
                    <FileText size={28} style={{ color: C.amber }} />
                    <p className="text-xs font-bold" style={{ color: C.amber }}>PDF</p>
                  </div>
                ) : (
                  <img src={docUrl} alt={`Doc ${index + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(docUrl, '_blank')} />
                )}
                <button onClick={() => removeDocument(index)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: '#EF4444' }}>
                  <X size={12} color="white" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-vel-dim">
            <FileText size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{{ fr: 'Aucun document téléchargé', ar: 'لم يتم تحميل أي وثيقة' }[lang]}</p>
          </div>
        )}
      </SectionCard>

      {/* Address */}
      <SectionCard>
        <SectionTitle>🏠 {{ fr: 'Adresse & Localisation', ar: 'العنوان والموقع' }[lang]}</SectionTitle>
        <div>
          <FieldLabel>{{ fr: 'Wilaya *', ar: 'الولاية *' }[lang]}</FieldLabel>
          <select name="wilaya" value={personal.wilaya} onChange={handleChange}
            className={inputClass} style={{ ...inputStyle, cursor: 'pointer' }}
            onFocus={focusInput} onBlur={blurInput}>
            {ALGERIAN_WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>{{ fr: 'Adresse complète', ar: 'العنوان الكامل' }[lang]}</FieldLabel>
          <textarea name="completeAddress" value={personal.completeAddress} onChange={handleChange}
            rows={3} className={`${inputClass} resize-none`} style={inputStyle}
            placeholder={lang === 'fr' ? 'Rue, N°, Quartier…' : 'الشارع، الرقم، المنطقة…'}
            onFocus={focusInput} onBlur={blurInput} />
        </div>
      </SectionCard>
    </div>
  );
};
