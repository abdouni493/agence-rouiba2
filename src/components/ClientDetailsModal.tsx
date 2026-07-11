import React from 'react';
import { motion } from 'motion/react';
import { Client, Language } from '../types';
import { X } from 'lucide-react';

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  lang: Language;
}

export const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ isOpen, onClose, client, lang }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-saas-border max-h-[90vh]"
      >
        <div className="p-6 border-b border-saas-border flex items-center justify-between bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              👁️ {{fr: 'Détails', ar: 'تفاصيل'}[lang]}
            </h2>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
              {client.firstName} {client.lastName}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* Profile Photo */}
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-saas-primary-via shadow-lg bg-saas-bg flex items-center justify-center mb-3">
              {client.profilePhoto ? (
                <img src={client.profilePhoto} alt={`${client.firstName} ${client.lastName}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              👤 {{fr: 'Informations Personnelles', ar: 'المعلومات الشخصية'}[lang]}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-saas-bg p-3 rounded-lg">
                <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">✍️ {{fr: 'Prénom', ar: 'الاسم الأول'}[lang]}</p>
                <p className="text-saas-text-main font-semibold text-sm">{client.firstName}</p>
              </div>
              <div className="bg-saas-bg p-3 rounded-lg">
                <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">✍️ {{fr: 'Nom', ar: 'الاسم الأخير'}[lang]}</p>
                <p className="text-saas-text-main font-semibold text-sm">{client.lastName}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="bg-saas-bg p-3 rounded-lg">
                <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">📱 {{fr: 'Téléphone', ar: 'الهاتف'}[lang]}</p>
                <a href={`tel:${client.phone}`} className="text-saas-primary-via font-semibold text-sm hover:underline">{client.phone}</a>
              </div>
              {client.email && (
                <div className="bg-saas-bg p-3 rounded-lg">
                  <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">📧 {{fr: 'Email', ar: 'البريد الإلكتروني'}[lang]}</p>
                  <a href={`mailto:${client.email}`} className="text-saas-primary-via font-semibold text-sm hover:underline truncate">{client.email}</a>
                </div>
              )}
              {client.dateOfBirth && (
                <div className="bg-saas-bg p-3 rounded-lg">
                  <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">🎂 {{fr: 'Naissance', ar: 'الميلاد'}[lang]}</p>
                  <p className="text-saas-text-main font-semibold text-sm">{new Date(client.dateOfBirth).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}</p>
                </div>
              )}
              {client.placeOfBirth && (
                <div className="bg-saas-bg p-3 rounded-lg">
                  <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">📍 {{fr: 'Lieu Naissance', ar: 'مكان الميلاد'}[lang]}</p>
                  <p className="text-saas-text-main font-semibold text-sm">{client.placeOfBirth}</p>
                </div>
              )}
            </div>

          </div>

          {/* Official Documents */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              🆔 {{fr: 'Documents Officiels', ar: 'الوثائق الرسمية'}[lang]}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-saas-bg p-3 rounded-lg">
                <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">🚗 {{fr: 'Permis', ar: 'الرخصة'}[lang]}</p>
                <p className="text-saas-text-main font-semibold text-sm">{client.licenseNumber}</p>
              </div>
              <div className="bg-saas-bg p-3 rounded-lg">
                <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">⏱️ {{fr: 'Expiration', ar: 'الانتهاء'}[lang]}</p>
                <p className="text-saas-text-main font-semibold text-sm">{client.licenseExpirationDate ? new Date(client.licenseExpirationDate).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ') : 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-saas-bg p-3 rounded-lg">
                <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">📅 {{fr: 'Délivrance', ar: 'الاستخراج'}[lang]}</p>
                <p className="text-saas-text-main font-semibold text-sm">{client.licenseDeliveryDate ? new Date(client.licenseDeliveryDate).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ') : 'N/A'}</p>
              </div>
              <div className="bg-saas-bg p-3 rounded-lg">
                <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">📍 {{fr: 'Lieu', ar: 'المكان'}[lang]}</p>
                <p className="text-saas-text-main font-semibold text-sm truncate">{client.licenseDeliveryPlace || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Additional Documents */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              🎫 {{fr: 'Type Document Additionnel', ar: 'نوع الوثيقة الإضافية'}[lang]}
            </h3>
            <div className="bg-saas-bg p-3 rounded-lg">
              <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">🎫 {{fr: 'Type', ar: 'النوع'}[lang]}</p>
              <p className="text-saas-text-main font-semibold text-sm">
                {client.documentType === 'id_card' && (lang === 'fr' ? 'Carte d\'Identité' : 'بطاقة هوية')}
                {client.documentType === 'passport' && (lang === 'fr' ? 'Passeport' : 'جواز السفر')}
                {client.documentType === 'autre' && (lang === 'fr' ? 'Autre' : 'أخرى')}
                {(!client.documentType || client.documentType === 'none') && (lang === 'fr' ? 'Aucun' : 'لا يوجد')}
              </p>
            </div>
            <div className="bg-saas-bg p-3 rounded-lg">
              <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">🔢 {{fr: 'N° Document', ar: 'رقم الوثيقة'}[lang]}</p>
              <p className="text-saas-text-main font-semibold text-sm">{client.documentNumber || 'Numéro...'}</p>
            </div>
            {(client.documentDeliveryDate || client.documentExpirationDate) && (
              <div className="grid grid-cols-2 gap-2">
                {client.documentDeliveryDate && (
                  <div className="bg-saas-bg p-3 rounded-lg">
                    <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">📅 {{fr: 'Délivrance', ar: 'الاستخراج'}[lang]}</p>
                    <p className="text-saas-text-main font-semibold text-sm">{new Date(client.documentDeliveryDate).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}</p>
                  </div>
                )}
                {client.documentExpirationDate && (
                  <div className="bg-saas-bg p-3 rounded-lg">
                    <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">⏰ {{fr: 'Expiration', ar: 'الانتهاء'}[lang]}</p>
                    <p className="text-saas-text-main font-semibold text-sm">{new Date(client.documentExpirationDate).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}</p>
                  </div>
                )}
              </div>
            )}
            <div className="bg-saas-bg p-3 rounded-lg">
              <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">📍 {{fr: 'Adresse Délivrance', ar: 'عنوان الاستخراج'}[lang]}</p>
              <p className="text-saas-text-main font-semibold text-sm">{client.documentDeliveryAddress || 'N/A'}</p>
            </div>
          </div>

          {/* Address & Location */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              🏠 {{fr: 'Adresse & Localisation', ar: 'العنوان والموقع'}[lang]}
            </h3>
            <div className="bg-saas-bg p-3 rounded-lg">
              <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">🏙️ {{fr: 'Wilaya', ar: 'الولاية'}[lang]}</p>
              <p className="text-saas-text-main font-semibold text-sm">{client.wilaya}</p>
            </div>
            {client.completeAddress && (
              <div className="bg-saas-bg p-3 rounded-lg">
                <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">📮 {{fr: 'Adresse Complète', ar: 'العنوان الكامل'}[lang]}</p>
                <p className="text-saas-text-main font-semibold text-sm">{client.completeAddress}</p>
              </div>
            )}
          </div>

          {/* Scanned Documents */}
          {client.scannedDocuments && client.scannedDocuments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
                📄 {{fr: 'Documents Scannés', ar: 'المستندات الممسوحة ضوئياً'}[lang]}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {client.scannedDocuments.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-video rounded-lg overflow-hidden border-2 border-saas-border hover:border-saas-primary-via transition-all group"
                  >
                    <img src={doc} alt={`Doc ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-saas-border flex items-center gap-2 bg-saas-bg">
          <button 
            onClick={onClose}
            className="flex-1 btn-saas-outline py-2"
          >
            {{fr: 'Fermer', ar: 'إغلاق'}[lang]}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
