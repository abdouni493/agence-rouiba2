import React, { useState, useEffect } from 'react';
import { StoreExpense, Language } from '../types';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface StoreExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<StoreExpense>) => void;
  expense?: StoreExpense;
  lang: Language;
}

const ICONS = ['🏪', '📋', '☕', '🛠️', '🧹', '💡', '🔧', '📦', '🧴', '🪜'];

export const StoreExpenseModal: React.FC<StoreExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  expense,
  lang,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    cost: 0,
    date: new Date().toISOString().split('T')[0],
    note: '',
    icon: '🏪',
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name,
        cost: expense.cost,
        date: expense.date,
        note: expense.note || '',
        icon: expense.icon || '🏪',
      });
    } else {
      setFormData({
        name: '',
        cost: 0,
        date: new Date().toISOString().split('T')[0],
        note: '',
        icon: '🏪',
      });
    }
  }, [expense, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cost' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-saas-border max-h-[90vh]"
      >
        <div className="p-6 border-b border-saas-border flex items-center justify-between bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white">
          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
            🏪 {{fr: 'Dépense Magasin', ar: 'نفقة المتجر'}[lang]}
          </h2>
          <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* Icon Selection */}
          <div className="space-y-2">
            <label className="label-saas">🎨 {{fr: 'Icône', ar: 'الرمز'}[lang]}</label>
            <div className="flex gap-2 flex-wrap">
              {ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className={`text-2xl p-2 rounded-lg transition-all ${
                    formData.icon === icon
                      ? 'bg-saas-primary-via/20 scale-125'
                      : 'bg-saas-bg hover:bg-saas-bg-light'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="label-saas">📝 {{fr: 'Nom de la dépense *', ar: 'اسم النفقة *'}[lang]}</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Fournitures de bureau"
              className="input-saas"
              required
            />
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <label className="label-saas">💵 {{fr: 'Coût (DZ) *', ar: 'التكلفة (دينار) *'}[lang]}</label>
            <input
              type="number"
              name="cost"
              value={formData.cost || ''}
              onChange={handleChange}
              placeholder="2500"
              className="input-saas"
              required
              min="0"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="label-saas">📅 {{fr: 'Date *', ar: 'التاريخ *'}[lang]}</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="input-saas"
              required
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="label-saas">📌 {{fr: 'Note (optionnel)', ar: 'ملاحظة (اختياري)'}[lang]}</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="Détails supplémentaires..."
              className="input-saas resize-none"
              rows={3}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-saas-border flex items-center gap-3 bg-saas-bg">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-lg font-bold text-sm bg-white border-2 border-saas-border hover:bg-saas-bg-light transition-colors text-saas-text-main"
          >
            {{fr: 'Annuler', ar: 'إلغاء'}[lang]}
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 btn-saas-primary py-3"
          >
            {{fr: expense ? 'Modifier' : 'Ajouter', ar: expense ? 'تعديل' : 'إضافة'}[lang]}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
