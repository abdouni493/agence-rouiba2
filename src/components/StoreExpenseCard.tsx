import React from 'react';
import { StoreExpense, Language } from '../types';
import { motion } from 'motion/react';

interface StoreExpenseCardProps {
  expense: StoreExpense;
  index: number;
  lang: Language;
  onEdit: () => void;
  onDelete: () => void;
}

export const StoreExpenseCard: React.FC<StoreExpenseCardProps> = ({
  expense,
  index,
  lang,
  onEdit,
  onDelete,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-[2rem] shadow-lg hover:shadow-xl transition-all border border-saas-border overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-saas-border">
        <div className="flex items-start justify-between gap-4">
          <div className="text-5xl">{expense.icon || '🏪'}</div>
          <div className="text-right flex-1">
            <p className="text-3xl font-black text-blue-600">{expense.cost.toLocaleString('fr-FR')}</p>
            <p className="text-xs text-blue-600 font-bold">DZ</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-3">
        <div>
          <p className="text-sm text-saas-text-muted font-bold uppercase tracking-wider">{{fr: 'Nom', ar: 'الاسم'}[lang]}</p>
          <p className="text-lg font-black text-saas-text-main">{expense.name}</p>
        </div>

        <div>
          <p className="text-sm text-saas-text-muted font-bold uppercase tracking-wider">📅 {{fr: 'Date', ar: 'التاريخ'}[lang]}</p>
          <p className="text-sm font-bold text-saas-text-main">{expense.date}</p>
        </div>

        {expense.note && (
          <div>
            <p className="text-sm text-saas-text-muted font-bold uppercase tracking-wider">📝 {{fr: 'Note', ar: 'ملاحظة'}[lang]}</p>
            <p className="text-sm text-saas-text-main">{expense.note}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-saas-border bg-saas-bg flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 text-xs font-bold px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
        >
          ✏️ {{fr: 'Modifier', ar: 'تعديل'}[lang]}
        </button>
        <button
          onClick={onDelete}
          className="flex-1 text-xs font-bold px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
        >
          🗑️ {{fr: 'Supprimer', ar: 'حذف'}[lang]}
        </button>
      </div>
    </motion.div>
  );
};
