import React, { useState } from 'react';
import { DocumentType } from '../types';
import { TemplateService } from '../services/TemplateService';
import { X, Save, AlertCircle } from 'lucide-react';

interface TemplateSaveModalProps {
  documentType: DocumentType;
  agencyId: string;
  templateHtml: string;
  templateStyles?: any;
  onSave: () => void;
  onClose: () => void;
}

export const TemplateSaveModal: React.FC<TemplateSaveModalProps> = ({
  documentType,
  agencyId,
  templateHtml,
  templateStyles,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(`${documentType} - ${new Date().toLocaleDateString()}`);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      if (!name.trim()) {
        setError('Veuillez entrer un nom pour le modèle');
        return;
      }

      setLoading(true);
      setError(null);

      await TemplateService.saveTemplate(
        documentType,
        agencyId,
        name.trim(),
        {
          html: templateHtml,
          styles: templateStyles,
        },
        isDefault
      );

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Enregistrer le modèle</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-red-700">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nom du modèle
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Ex: Contrat Standard"
              disabled={loading}
            />
          </div>

          {/* Document Type Display */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type de document
            </label>
            <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-800 font-medium">
              {documentType === 'contrat'
                ? 'Contrat'
                : documentType === 'devis'
                ? 'Devis'
                : documentType === 'facture'
                ? 'Facture'
                : documentType === 'engagement'
                ? 'Engagement'
                : 'Reçu de Versement'}
            </div>
          </div>

          {/* Default Template Checkbox */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="isDefault" className="flex-1 text-sm text-gray-700 cursor-pointer">
              Définir comme modèle par défaut
            </label>
          </div>

          {isDefault && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              Ce modèle deviendra le modèle par défaut pour le type "{documentType}". Les autres modèles par défaut seront désactivés.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Enregistrement...
              </>
            ) : (
              <>
                <Save size={18} />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
