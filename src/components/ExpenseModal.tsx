import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Car, Expense, ExpenseType, Language } from '../types';
import { X } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Partial<Expense>) => void;
  car: Car;
  lang: Language;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSave, car, lang }) => {
  const [type, setType] = useState<ExpenseType>('vidange');
  const [formData, setFormData] = useState<Partial<Expense>>({
    cost: 0,
    date: new Date().toISOString().split('T')[0],
    note: '',
    nextVidangeKm: 0,
    expirationDate: '',
    name: '',
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cost' || name === 'nextVidangeKm' ? Number(value) : value
    }));
  };

  const handleSave = () => {
    onSave({ ...formData, type, carId: car.id });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-saas-border"
      >
        <div className="p-8 border-b border-saas-border flex items-center justify-between bg-linear-to-r from-saas-secondary-start via-saas-secondary-via to-saas-secondary-end text-white">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              📉 Nouvelle Dépense: {car.brand}
            </h2>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
              {lang === 'fr' ? 'Enregistrer une nouvelle charge' : 'تسجيل مصاريف جديدة'}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-saas-bg">
          <div className="space-y-4">
            <label className="label-saas">🔧 Type de Dépense</label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'vidange', label: '🛢️ Vidange', color: 'blue' },
                { id: 'assurance', label: '🛡️ Assurance', color: 'indigo' },
                { id: 'controle', label: '🛠️ Contrôle', color: 'amber' },
                { id: 'autre', label: '❓ Autre', color: 'slate' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id as ExpenseType)}
                  className={`p-5 rounded-2xl border-2 text-sm font-black transition-all duration-300 flex flex-col items-center gap-2 ${
                    type === t.id 
                      ? `bg-white border-saas-secondary-via text-saas-secondary-via shadow-xl shadow-saas-secondary-via/10 scale-[1.02]` 
                      : 'bg-white border-saas-border text-saas-text-muted hover:border-saas-secondary-via/30'
                  }`}
                >
                  <span className="text-2xl">{t.label.split(' ')[0]}</span>
                  <span>{t.label.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {type === 'autre' && (
              <div className="space-y-2">
                <label className="label-saas">📝 Nom de la dépense</label>
                <input name="name" value={formData.name} onChange={handleChange} className="input-saas" placeholder="ex: Réparation pneu" />
              </div>
            )}

            {type === 'vidange' && (
              <div className="p-6 bg-white rounded-2xl border border-saas-border flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">Kilométrage Actuel</p>
                  <p className="text-2xl font-black text-saas-primary-via tracking-tighter">{car.mileage.toLocaleString()} KM</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-saas-primary-via/10 flex items-center justify-center text-2xl">🚗</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="label-saas">💵 Coût (DZD)</label>
                <input name="cost" type="number" value={formData.cost} onChange={handleChange} className="input-saas" />
              </div>
              <div className="space-y-2">
                <label className="label-saas">📅 Date</label>
                <input name="date" type="date" value={formData.date} onChange={handleChange} className="input-saas" />
              </div>
            </div>

            {type === 'vidange' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="label-saas">↩️ Km pour Prochaine Vidange</label>
                  <input name="nextVidangeKm" type="number" value={formData.nextVidangeKm} onChange={handleChange} className="input-saas" />
                </div>
                <div className="bg-saas-success-start/5 p-5 rounded-2xl border border-saas-success-start/20 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-saas-success-start uppercase tracking-widest">🏁 Prochain</p>
                  <p className="text-xl font-black text-saas-success-start tracking-tighter">{(formData.nextVidangeKm || 0) + car.mileage} KM</p>
                </div>
              </div>
            )}

            {(type === 'assurance' || type === 'controle') && (
              <div className="space-y-2">
                <label className="label-saas">
                  {type === 'assurance' ? '🛡️' : '🛠️'} Date d'expiration
                </label>
                <input name="expirationDate" type="date" value={formData.expirationDate} onChange={handleChange} className="input-saas" />
              </div>
            )}

            <div className="space-y-2">
              <label className="label-saas">📄 Note (optionnel)</label>
              <textarea name="note" value={formData.note} onChange={handleChange} className="input-saas h-28 resize-none" />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-saas-border flex items-center justify-end gap-4 bg-white">
          <button onClick={onClose} className="btn-saas-outline px-8">
            {lang === 'fr' ? 'Annuler' : 'إلغاء'}
          </button>
          <button onClick={handleSave} className="btn-saas-secondary px-12">
            {lang === 'fr' ? 'Enregistrer' : 'حفظ'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
