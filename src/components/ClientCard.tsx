import React from 'react';
import { Client, Language } from '../types';
import { motion } from 'motion/react';

interface ClientCardProps {
  client: Client;
  lang: Language;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  onHistory: () => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  lang,
  onEdit,
  onDelete,
  onViewDetails,
  onHistory,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass-card overflow-hidden bg-white flex flex-col items-center group hover:shadow-lg transition-shadow duration-300 p-6"
    >
      {/* Circular Profile Photo - Centered & Prominent */}
      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-saas-primary-via shadow-lg bg-saas-bg flex items-center justify-center mb-4 flex-shrink-0">
        {client.profilePhoto ? (
          <img src={client.profilePhoto} alt={`${client.firstName} ${client.lastName}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="text-5xl">👤</span>
        )}
      </div>

      {/* Client Name */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-black uppercase tracking-tighter">
          {client.firstName} {client.lastName}
        </h3>
        <p className="text-[10px] font-bold uppercase tracking-widest text-saas-text-muted mt-1">
          {lang === 'fr' ? 'Client' : 'عميل'}
        </p>
      </div>

      {/* Contact Information */}
      <div className="w-full space-y-2 text-center mb-4 pb-4 border-b border-saas-border">
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg">📱</span>
          <a href={`tel:${client.phone}`} className="text-[12px] text-saas-primary-via font-semibold hover:underline">
            {client.phone}
          </a>
        </div>
        {client.email && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg">📧</span>
            <a href={`mailto:${client.email}`} className="text-[12px] text-saas-primary-via font-semibold hover:underline truncate">
              {client.email}
            </a>
          </div>
        )}
      </div>

      {/* Document Details */}
      <div className="w-full space-y-2 text-[10px] mb-4 pb-4 border-b border-saas-border">
        <div className="flex justify-between">
          <span className="text-saas-text-muted">🚗 {lang === 'fr' ? 'Permis' : 'الرخصة'}:</span>
          <span className="font-semibold text-saas-text-main">{client.licenseNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-saas-text-muted">📅 {lang === 'fr' ? 'Délivrance Permis' : 'استخراج الرخصة'}:</span>
          <span className="font-semibold text-saas-text-main">{client.licenseDeliveryDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-saas-text-muted">⏱️ {lang === 'fr' ? 'Expiration Permis' : 'انتهاء الرخصة'}:</span>
          <span className="font-semibold text-saas-text-main">{client.licenseExpirationDate}</span>
        </div>
        {client.wilaya && (
          <div className="flex justify-between">
            <span className="text-saas-text-muted">📍 {lang === 'fr' ? 'Wilaya' : 'الولاية'}:</span>
            <span className="font-semibold text-saas-text-main truncate ml-2">{client.wilaya}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="w-full grid grid-cols-4 gap-2">
        <button
          onClick={onViewDetails}
          className="p-3 rounded-lg bg-white hover:bg-saas-secondary-start/10 text-saas-text-muted transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-border hover:border-saas-secondary-start/20"
          title={lang === 'fr' ? 'Détails' : 'تفاصيل'}
        >
          <span className="text-xl">👁️</span>
          <span className="text-[7px] uppercase font-bold">{lang === 'fr' ? 'Détails' : 'تفاصيل'}</span>
        </button>
        <button
          onClick={onEdit}
          className="p-3 rounded-lg bg-white hover:bg-saas-secondary-start/10 text-saas-text-muted transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-border hover:border-saas-secondary-start/20"
          title={lang === 'fr' ? 'Modifier' : 'تعديل'}
        >
          <span className="text-xl">✏️</span>
          <span className="text-[7px] uppercase font-bold">{lang === 'fr' ? 'Edit' : 'تعديل'}</span>
        </button>
        <button
          onClick={onHistory}
          className="p-3 rounded-lg bg-white hover:bg-saas-warning-start/10 text-saas-text-muted transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-border hover:border-saas-warning-start/20"
          title={lang === 'fr' ? 'Historique' : 'السجل'}
        >
          <span className="text-xl">📜</span>
          <span className="text-[7px] uppercase font-bold text-saas-warning-start">{lang === 'fr' ? 'Hist' : 'السجل'}</span>
        </button>
        <button
          onClick={onDelete}
          className="p-3 rounded-lg bg-white hover:bg-saas-danger-start hover:text-white text-saas-danger-start transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-danger-start/10"
          title={lang === 'fr' ? 'Supprimer' : 'حذف'}
        >
          <span className="text-xl">🗑️</span>
          <span className="text-[7px] uppercase font-bold">{lang === 'fr' ? 'Delete' : 'حذف'}</span>
        </button>
      </div>
    </motion.div>
  );
};
