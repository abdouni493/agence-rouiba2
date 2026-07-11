import React from 'react';
import { Worker, Language } from '../types';
import { motion } from 'motion/react';

interface WorkerCardProps {
  worker: Worker;
  index: number;
  lang: Language;
  onDetails: () => void;
  onPayment: () => void;
  onAdvance: () => void;
  onAbsence: () => void;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const WorkerCard: React.FC<WorkerCardProps> = ({
  worker,
  index,
  lang,
  onDetails,
  onPayment,
  onAdvance,
  onAbsence,
  onHistory,
  onEdit,
  onDelete,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-[2rem] shadow-lg hover:shadow-xl transition-all border border-saas-border overflow-hidden max-w-sm w-full"
    >
      {/* Header with Photo */}
      <div className="p-6 border-b border-saas-border flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-saas-primary-via shadow-lg bg-saas-bg flex items-center justify-center flex-shrink-0">
          {worker.profilePhoto ? (
            <img src={worker.profilePhoto} alt={worker.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-2xl">👤</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-saas-text-main text-sm truncate">{worker.fullName}</h3>
          <p className="text-xs text-saas-text-muted font-bold">
            {worker.type === 'admin' && (lang === 'fr' ? 'Admin' : 'مسؤول')}
            {worker.type === 'driver' && (lang === 'fr' ? 'Chauffeur' : 'سائق')}
            {worker.type === 'worker' && (lang === 'fr' ? 'Travailleur' : 'عامل')}
          </p>
          <p className="text-xs text-saas-text-muted mt-1">
            📱 {worker.phone}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="px-6 py-4 space-y-2 text-xs border-b border-saas-border">
        <p className="text-saas-text-muted">
          <span className="font-bold">📧</span> {worker.email}
        </p>
        {worker.baseSalary > 0 && (
          <p className="text-saas-text-muted font-semibold">
            <span className="font-bold">💵</span> {worker.baseSalary.toLocaleString('fr-FR')} DZ/{worker.paymentType === 'monthly' ? lang === 'fr' ? 'mois' : 'شهر' : lang === 'fr' ? 'jour' : 'يوم'}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 space-y-3">
        <div className="flex gap-2 flex-wrap justify-center">
          <button onClick={onDetails} className="text-xs font-bold px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">🔍 {{fr: 'Détails', ar: 'التفاصيل'}[lang]}</button>
          <button onClick={onPayment} className="text-xs font-bold px-3 py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">💸 {{fr: 'Paiement', ar: 'الدفع'}[lang]}</button>
          <button onClick={onAdvance} className="text-xs font-bold px-3 py-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">💳 {{fr: 'Avance', ar: 'سلفة'}[lang]}</button>
          <button onClick={onAbsence} className="text-xs font-bold px-3 py-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">⚠️ {{fr: 'Absences', ar: 'الغيابات'}[lang]}</button>
          <button onClick={onHistory} className="text-xs font-bold px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">📜 {{fr: 'Historique', ar: 'السجل'}[lang]}</button>
          <button onClick={onEdit} className="text-xs font-bold px-3 py-2 rounded-lg bg-cyan-50 text-cyan-600 hover:bg-cyan-100 transition-colors">✏️ {{fr: 'Modifier', ar: 'تعديل'}[lang]}</button>
          <button onClick={onDelete} className="text-xs font-bold px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">🗑️ {{fr: 'Supprimer', ar: 'حذف'}[lang]}</button>
        </div>
      </div>
    </motion.div>
  );
};
