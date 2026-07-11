import React from 'react';
import { Agency, Language } from '../types';
import { motion } from 'motion/react';
import { MapPin, Phone, Mail } from 'lucide-react';

interface AgencyCardProps {
  agency: Agency;
  lang: Language;
  onEdit: () => void;
  onDelete: () => void;
}

export const AgencyCard: React.FC<AgencyCardProps> = ({
  agency,
  lang,
  onEdit,
  onDelete,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass-card overflow-hidden bg-white flex flex-col group hover:shadow-lg transition-shadow duration-300"
    >
      {/* Header */}
      <div className="p-6 bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white">
        <h3 className="text-xl font-black uppercase tracking-tighter">
          🏢 {agency.name}
        </h3>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
          {lang === 'fr' ? 'Agence de location' : 'وكالة إيجار'}
        </p>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col gap-4">
        {/* Address */}
        <div className="flex items-start gap-3">
          <div className="text-saas-primary-via text-lg flex-shrink-0">📍</div>
          <div className="flex-1">
            <p className="text-[10px] text-saas-text-muted font-bold uppercase tracking-widest mb-1">
              {lang === 'fr' ? 'Adresse' : 'العنوان'}
            </p>
            <p className="text-saas-text-main font-semibold">
              {agency.address}
            </p>
            <p className="text-[12px] text-saas-text-muted mt-1">
              {agency.city}
            </p>
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-2 border-t border-saas-border pt-4">
          {agency.phone && (
            <div className="flex items-center gap-3">
              <span className="text-lg">📱</span>
              <a
                href={`tel:${agency.phone}`}
                className="text-[12px] text-saas-primary-via font-semibold hover:underline"
              >
                {agency.phone}
              </a>
            </div>
          )}
          {agency.email && (
            <div className="flex items-center gap-3">
              <span className="text-lg">📧</span>
              <a
                href={`mailto:${agency.email}`}
                className="text-[12px] text-saas-primary-via font-semibold hover:underline truncate"
              >
                {agency.email}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 p-4 bg-saas-bg border-t border-saas-border">
        <button
          onClick={onEdit}
          className="p-2.5 rounded-xl bg-white hover:bg-saas-secondary-start/10 text-saas-text-muted transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-border hover:border-saas-secondary-start/20"
          title={lang === 'fr' ? 'Modifier' : 'تعديل'}
        >
          <span className="text-lg">✏️</span>
          <span className="text-[8px] uppercase font-bold">{lang === 'fr' ? 'Edit' : 'تعديل'}</span>
        </button>
        <button
          onClick={onDelete}
          className="p-2.5 rounded-xl bg-white hover:bg-saas-danger-start hover:text-white text-saas-danger-start transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-danger-start/10"
          title={lang === 'fr' ? 'Supprimer' : 'حذف'}
        >
          <span className="text-lg">🗑️</span>
          <span className="text-[8px] uppercase font-bold">{lang === 'fr' ? 'Delete' : 'حذف'}</span>
        </button>
      </div>
    </motion.div>
  );
};
