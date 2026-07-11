import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader, Save, X } from 'lucide-react';
import { PrintService } from '../services/PrintService';
import { DocumentType, Language } from '../types';

interface SaveTemplateModalProps {
  isOpen: boolean;
  docType: DocumentType;
  agencyId: string;
  templateHtml: string;
  lang: Language;
  onSuccess?: () => void;
  onClose: () => void;
}

/**
 * SaveTemplateModal: Allows users to save a template to the database
 * 
 * Strictly database-driven:
 * - Saves to document_templates table
 * - Can set as default (automatically unsets other defaults)
 * - Can specify has_conditions flag
 * - Shows success message on save
 */
export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({
  isOpen,
  docType,
  agencyId,
  templateHtml,
  lang,
  onSuccess,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [hasConditions, setHasConditions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr;

  const handleSave = async () => {
    setError(null);

    // Validation
    if (!name.trim()) {
      setError(t('Entrez un nom de modèle', 'أدخل اسم النموذج'));
      return;
    }

    if (name.length > 100) {
      setError(t('Le nom ne peut pas dépasser 100 caractères', 'لا يمكن أن يتجاوز الاسم 100 حرف'));
      return;
    }

    if (!templateHtml.trim()) {
      setError(t('Le modèle ne peut pas être vide', 'النموذج لا يمكن أن يكون فارغاً'));
      return;
    }

    setLoading(true);

    try {
      await PrintService.saveTemplate(
        docType,
        agencyId,
        name.trim(),
        templateHtml,
        isDefault,
        hasConditions
      );

      setSuccess(true);
      setName('');
      setIsDefault(false);
      setHasConditions(false);

      // Call callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Close after 1.5 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(t(`Erreur: ${msg}`, `خطأ: ${msg}`));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setIsDefault(false);
      setHasConditions(false);
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {t('Enregistrer le modèle', 'حفظ النموذج')}
              </h2>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-8"
                >
                  <div className="bg-green-100 text-green-600 rounded-full p-3 mb-3">
                    <Save size={32} />
                  </div>
                  <p className="text-lg font-semibold text-green-700">
                    {t('Modèle enregistré!', 'تم حفظ النموذج!')}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {t('Votre modèle a été sauvegardé avec succès.', 'تم حفظ نموذجك بنجاح.')}
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
                    >
                      <p className="text-red-700 text-sm">{error}</p>
                    </motion.div>
                  )}

                  {/* Template Name Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('Nom du modèle *', 'اسم النموذج *')}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError(null);
                      }}
                      placeholder={t('ex: Contrat Standard 2024', 'مثال: عقد قياسي 2024')}
                      disabled={loading}
                      maxLength={100}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {name.length}/100
                    </p>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3 mb-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => {
                          setIsDefault(e.target.checked);
                          setError(null);
                        }}
                        disabled={loading}
                        className="w-4 h-4 text-green-600 rounded cursor-pointer"
                      />
                      <span className="text-sm text-gray-700">
                        {t('Définir comme modèle par défaut', 'تعيين كنموذج افتراضي')}
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasConditions}
                        onChange={(e) => {
                          setHasConditions(e.target.checked);
                          setError(null);
                        }}
                        disabled={loading}
                        className="w-4 h-4 text-green-600 rounded cursor-pointer"
                      />
                      <span className="text-sm text-gray-700">
                        {t('Ce modèle inclut les conditions', 'هذا النموذج يتضمن الشروط')}
                      </span>
                    </label>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                    <p className="text-xs text-blue-700 leading-relaxed">
                      {t(
                        'Ce modèle sera enregistré dans la base de données et disponible pour tous les documents de ce type.',
                        'سيتم حفظ هذا النموذج في قاعدة البيانات وسيكون متاحاً لجميع المستندات من هذا النوع.'
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      disabled={loading}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      {t('Annuler', 'إلغاء')}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading || !name.trim()}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          {t('Enregistrement...', 'جاري الحفظ...')}
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          {t('Enregistrer', 'حفظ')}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
