import React from 'react';
import { Worker, Language } from '../types';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface WorkerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker;
  lang: Language;
}

export const WorkerDetailsModal: React.FC<WorkerDetailsModalProps> = ({ isOpen, onClose, worker, lang }) => {
  if (!isOpen) return null;

  const getWorkerTypeLabel = () => {
    switch (worker.type) {
      case 'admin': return lang === 'fr' ? 'Admin' : 'مسؤول';
      case 'driver': return lang === 'fr' ? 'Chauffeur' : 'سائق';
      case 'worker': return lang === 'fr' ? 'Travailleur' : 'عامل';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-saas-border max-h-[90vh]"
      >
        <div className="p-6 border-b border-saas-border flex items-center justify-between bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white">
          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
            🔍 {{fr: 'Détails', ar: 'التفاصيل'}[lang]}
          </h2>
          <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* Profile Photo */}
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-saas-primary-via shadow-lg bg-saas-bg flex items-center justify-center mb-3">
              {worker.profilePhoto ? (
                <img src={worker.profilePhoto} alt={worker.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
            <div className="bg-saas-bg p-3 rounded-lg">
              <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">👤 {{fr: 'Nom Complet', ar: 'الاسم الكامل'}[lang]}</p>
              <p className="text-saas-text-main font-semibold text-sm">{worker.fullName}</p>
            </div>
            {worker.dateOfBirth && (
              <div className="bg-saas-bg p-3 rounded-lg">
                <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">🎂 {{fr: 'Date de naissance', ar: 'تاريخ الميلاد'}[lang]}</p>
                <p className="text-saas-text-main font-semibold text-sm">{new Date(worker.dateOfBirth).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}</p>
              </div>
            )}
            <div className="bg-saas-bg p-3 rounded-lg">
              <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">📱 {{fr: 'Téléphone', ar: 'الهاتف'}[lang]}</p>
              <a href={`tel:${worker.phone}`} className="text-saas-primary-via font-semibold text-sm hover:underline">{worker.phone}</a>
            </div>
            <div className="bg-saas-bg p-3 rounded-lg">
              <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">📧 {{fr: 'Email', ar: 'البريد الإلكتروني'}[lang]}</p>
              <a href={`mailto:${worker.email}`} className="text-saas-primary-via font-semibold text-sm hover:underline truncate">{worker.email}</a>
            </div>
            {worker.address && (
              <div className="bg-saas-bg p-3 rounded-lg">
                <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">📍 {{fr: 'Adresse', ar: 'العنوان'}[lang]}</p>
                <p className="text-saas-text-main font-semibold text-sm">{worker.address}</p>
              </div>
            )}
          </div>

          {/* Work Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              👨‍💼 {{fr: 'Informations de Travail', ar: 'معلومات العمل'}[lang]}
            </h3>
            <div className="bg-saas-bg p-3 rounded-lg">
              <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">👨‍💼 {{fr: 'Type de travailleur', ar: 'نوع العامل'}[lang]}</p>
              <p className="text-saas-text-main font-semibold text-sm">{getWorkerTypeLabel()}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-saas-bg p-3 rounded-lg">
                <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">💰 {{fr: 'Type Paiement', ar: 'نوع الدفع'}[lang]}</p>
                <p className="text-saas-text-main font-semibold text-sm">
                  {worker.paymentType ? (worker.paymentType === 'monthly' ? (lang === 'fr' ? 'Par mois' : 'شهرياً') : (lang === 'fr' ? 'Par jour' : 'يومياً')) : 'N/A'}
                </p>
              </div>
              <div className="bg-saas-bg p-3 rounded-lg">
                <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">💵 {{fr: 'Salaire', ar: 'الراتب'}[lang]}</p>
                <p className="text-saas-text-main font-semibold text-sm">{worker.baseSalary.toLocaleString('fr-FR')} DZ</p>
              </div>
            </div>
          </div>

          {/* Login Credentials */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              🔐 {{fr: 'Identifiants', ar: 'بيانات المستخدم'}[lang]}
            </h3>
            <div className="bg-saas-bg p-3 rounded-lg">
              <p className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">🔐 {{fr: 'Nom d\'utilisateur', ar: 'اسم المستخدم'}[lang]}</p>
              <p className="text-saas-text-main font-semibold text-sm">{worker.username}</p>
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              📊 {{fr: 'Statistiques', ar: 'الإحصائيات'}[lang]}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mb-1">💳 {{fr: 'Avances', ar: 'السلف'}[lang]}</p>
                <p className="text-emerald-700 font-semibold text-sm">{worker.advances.length}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <p className="text-[9px] text-orange-600 font-bold uppercase tracking-widest mb-1">⚠️ {{fr: 'Absences', ar: 'الغيابات'}[lang]}</p>
                <p className="text-orange-700 font-semibold text-sm">{worker.absences.length}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mb-1">💸 {{fr: 'Paiements', ar: 'الدفعات'}[lang]}</p>
                <p className="text-blue-700 font-semibold text-sm">{worker.payments.length}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <p className="text-[9px] text-purple-600 font-bold uppercase tracking-widest mb-1">📅 {{fr: 'Créé le', ar: 'تاريخ الإنشاء'}[lang]}</p>
                <p className="text-purple-700 font-semibold text-xs">{new Date(worker.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}</p>
              </div>
            </div>
          </div>
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
