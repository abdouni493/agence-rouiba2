import React, { useState } from 'react';
import { Worker, Language, WorkerAbsence } from '../types';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface WorkerAbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker;
  onAddAbsence: (absence: WorkerAbsence) => Promise<void>;
  lang: Language;
}

export const WorkerAbsenceModal: React.FC<WorkerAbsenceModalProps> = ({ isOpen, onClose, worker, onAddAbsence, lang }) => {
  const [formData, setFormData] = useState({
    cost: 0,
    date: new Date().toISOString().split('T')[0],
    note: '',
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cost' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAddAbsence({
        id: Date.now().toString(),
        ...formData
      });
      setFormData({
        cost: 0,
        date: new Date().toISOString().split('T')[0],
        note: '',
      });
      onClose();
    } catch (err) {
      console.error('Error adding absence:', err);
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
            ⚠️ {{fr: 'Enregistrer Absence', ar: 'تسجيل غياب'}[lang]}
          </h2>
          <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* Worker Info */}
          <div className="bg-saas-bg p-4 rounded-lg">
            <p className="text-xs text-saas-text-muted font-bold uppercase">👤 {{fr: 'Travailleur', ar: 'العامل'}[lang]}</p>
            <p className="text-sm font-bold text-saas-text-main mt-1">{worker.fullName}</p>
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <label className="label-saas">💰 {{fr: 'Coût de l\'absence (DZ) *', ar: 'تكلفة الغياب (دينار) *'}[lang]}</label>
            <input
              type="number"
              name="cost"
              value={formData.cost || ''}
              onChange={handleChange}
              placeholder="350"
              className="input-saas"
              required
              min="0"
              step="100"
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
            <label className="label-saas">📝 {{fr: 'Note (optionnel)', ar: 'ملاحظة (اختياري)'}[lang]}</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="Raison de l'absence..."
              className="input-saas min-h-[80px] resize-none"
            />
          </div>

          {/* Summary */}
          <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
            <p className="text-xs text-red-600 font-bold uppercase">⚠️ {{fr: 'Absence à enregistrer', ar: 'الغياب المراد تسجيله'}[lang]}</p>
            <p className="text-2xl font-black text-red-700 mt-2">- {formData.cost.toLocaleString('fr-FR')} DZ</p>
          </div>
        </form>

        {/* Actions */}
        <div className="p-6 border-t border-saas-border flex items-center gap-4 bg-saas-bg">
          <button 
            onClick={onClose} 
            className="flex-1 btn-saas-outline py-3"
          >
            {{fr: 'Annuler', ar: 'إلغاء'}[lang]}
          </button>
          <button 
            onClick={handleSubmit}
            className="flex-1 btn-saas-primary py-3"
          >
            {{fr: 'Enregistrer', ar: 'حفظ'}[lang]}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
