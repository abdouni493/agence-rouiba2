import React from 'react';
import { Worker, Language, WorkerPayment } from '../types';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface WorkerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker;
  lang: Language;
  onCreatePayment?: (payment: WorkerPayment) => Promise<void>;
}

export const WorkerPaymentModal: React.FC<WorkerPaymentModalProps> = ({ isOpen, onClose, worker, lang, onCreatePayment }) => {
  if (!isOpen) return null;

  const totalAdvances = worker.advances.reduce((sum, a) => sum + a.amount, 0);
  const totalAbsences = worker.absences.reduce((sum, a) => sum + a.cost, 0);
  const netSalary = worker.baseSalary - totalAdvances - totalAbsences;

  const handleCreatePayment = async () => {
    const newPayment: WorkerPayment = {
      id: Date.now().toString(),
      amount: netSalary,
      date: new Date().toISOString().split('T')[0],
      baseSalary: worker.baseSalary,
      advances: totalAdvances,
      absences: totalAbsences,
      netSalary: netSalary,
    };
    try {
      await onCreatePayment?.(newPayment);
      onClose();
    } catch (err) {
      console.error('Error creating payment:', err);
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
            💸 {{fr: 'Calcul de Paiement', ar: 'حساب الراتب'}[lang]}
          </h2>
          <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* Worker Info */}
          <div className="bg-saas-bg p-4 rounded-lg">
            <h3 className="font-bold text-saas-text-main text-sm mb-1">{worker.fullName}</h3>
            <p className="text-xs text-saas-text-muted">
              {{fr: 'Salaire de base', ar: 'الراتب الأساسي'}[lang]}: <span className="font-bold text-saas-text-main">{worker.baseSalary.toLocaleString('fr-FR')} DZ</span>
            </p>
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-saas-primary-via uppercase tracking-[0.2em]">
              📊 {{fr: 'Détail du Calcul', ar: 'تفاصيل الحساب'}[lang]}
            </h3>

            {/* Base Salary */}
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-blue-700">💵 {{fr: 'Salaire de base', ar: 'الراتب الأساسي'}[lang]}</span>
                <span className="text-sm font-bold text-blue-700">{worker.baseSalary.toLocaleString('fr-FR')} DZ</span>
              </div>
            </div>

            {/* Advances */}
            <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-orange-700">💳 {{fr: 'Avances', ar: 'السلف'}[lang]}</span>
                <span className="text-sm font-bold text-orange-700">- {totalAdvances.toLocaleString('fr-FR')} DZ</span>
              </div>
              {worker.advances.length > 0 && (
                <div className="text-xs text-orange-600 mt-2 space-y-1">
                  {worker.advances.map(adv => (
                    <p key={adv.id}>• {new Date(adv.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}: {adv.amount.toLocaleString('fr-FR')} DZ</p>
                  ))}
                </div>
              )}
            </div>

            {/* Absences */}
            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-red-700">⚠️ {{fr: 'Absences', ar: 'الغيابات'}[lang]}</span>
                <span className="text-sm font-bold text-red-700">- {totalAbsences.toLocaleString('fr-FR')} DZ</span>
              </div>
              {worker.absences.length > 0 && (
                <div className="text-xs text-red-600 mt-2 space-y-1">
                  {worker.absences.map(abs => (
                    <p key={abs.id}>• {new Date(abs.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}: {abs.cost.toLocaleString('fr-FR')} DZ</p>
                  ))}
                </div>
              )}
            </div>

            {/* Net Salary */}
            <div className={`p-4 rounded-lg border-2 ${netSalary >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-black ${netSalary >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  💰 {{fr: 'Salaire Net', ar: 'الراتب الصافي'}[lang]}
                </span>
                <span className={`text-lg font-black ${netSalary >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {netSalary.toLocaleString('fr-FR')} DZ
                </span>
              </div>
              {netSalary < 0 && (
                <p className="text-xs text-red-600 mt-2">⚠️ {{fr: 'Dû par le travailleur', ar: 'مستحق من العامل'}[lang]}</p>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-saas-bg p-4 rounded-lg space-y-2 border border-saas-border">
            <p className="text-xs font-bold text-saas-text-muted uppercase">{{fr: 'Récapitulatif', ar: 'الملخص'}[lang]}</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-saas-text-muted">{{fr: 'Avances enregistrées', ar: 'السلف المسجلة'}[lang]}:</span>
                <span className="font-bold">{worker.advances.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-saas-text-muted">{{fr: 'Absences enregistrées', ar: 'الغيابات المسجلة'}[lang]}:</span>
                <span className="font-bold">{worker.absences.length}</span>
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
          <button 
            onClick={handleCreatePayment}
            className="flex-1 btn-saas-primary py-2"
          >
            💸 {{fr: 'Créer Paiement', ar: 'إنشاء الدفع'}[lang]}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
