import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';
import { Language } from '../types';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string | { fr: string; ar: string };
  message: string | { fr: string; ar: string };
  lang: Language;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  lang 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-saas-border"
      >
        <div className="p-6 border-b border-saas-border flex items-center justify-between bg-saas-danger-start text-white">
          <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3">
            <AlertTriangle size={20} />
            {typeof title === 'string' ? title : title[lang]}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 text-center">
          <div className="w-20 h-20 bg-saas-danger-start/10 rounded-full flex items-center justify-center mx-auto text-saas-danger-start">
            <AlertTriangle size={40} />
          </div>
          <p className="text-saas-text-main font-medium">
            {typeof message === 'string' ? message : message[lang]}
          </p>
        </div>

        <div className="p-8 border-t border-saas-border flex items-center gap-3 bg-saas-bg">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 px-4 rounded-lg font-bold text-sm bg-white border-2 border-saas-border hover:bg-saas-bg-light transition-colors text-saas-text-main"
          >
            {lang === 'fr' ? 'Annuler' : 'إلغاء'}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className="flex-1 py-3 px-4 rounded-lg font-bold text-sm bg-red-500 hover:bg-red-600 transition-colors text-white"
          >
            {lang === 'fr' ? 'Supprimer' : 'حذف'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
