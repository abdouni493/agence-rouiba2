import React, { useState, useEffect } from 'react';
import { DocumentType } from '../types';
import { TemplateService, DocumentTemplateRow } from '../services/TemplateService';
import { RenderService } from '../services/RenderService';
import { PrintService } from '../services/PrintService';
import { TemplateSelector } from './TemplateSelector';
import { TemplateSaveModal } from './TemplateSaveModal';
import { Printer, Plus, AlertCircle, CheckCircle, Download } from 'lucide-react';

interface DynamicDocumentPrinterProps {
  documentType: DocumentType;
  agencyId: string;
  documentData: {
    client?: any;
    reservation?: any;
    car?: any;
    payments?: any[];
    agencySettings?: any;
  };
  onPrint?: () => void;
  customTitle?: string;
}

export const DynamicDocumentPrinter: React.FC<DynamicDocumentPrinterProps> = ({
  documentType,
  agencyId,
  documentData,
  onPrint,
  customTitle,
}) => {
  const [template, setTemplate] = useState<DocumentTemplateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    loadDefaultTemplate();
  }, [documentType, agencyId]);

  const loadDefaultTemplate = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get default template from database (STRICT: throws if not found)
      const defaultTemplate = await TemplateService.getDefaultTemplate(
        documentType,
        agencyId
      );

      setTemplate(defaultTemplate);
    } catch (err) {
      console.error('Error loading template:', err);
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement du modèle';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const buildDocumentTitle = (): string => {
    if (customTitle) return customTitle;

    const titles: Record<DocumentType, string> = {
      contrat: 'Contrat de Location',
      devis: 'Devis',
      facture: 'Facture',
      engagement: 'Engagement de Location',
      recu: 'Reçu de Versement',
    };

    return titles[documentType] || 'Document';
  };

  const handlePrint = async () => {
    if (!template) {
      setError('Aucun modèle sélectionné');
      return;
    }

    try {
      setPrinting(true);
      setError(null);

      // STRICT: Use unified PrintService.printDocument pipeline
      // This is the ONLY print method - all documents use identical path
      await PrintService.printDocument({
        type: documentType,
        reservation: documentData.reservation,
        templateId: template.id,
        agencyId: agencyId,
        lang: 'fr',
      });

      if (onPrint) {
        onPrint();
      }
    } catch (err) {
      console.error('Error printing:', err);
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'impression';
      setError(msg);
    } finally {
      setPrinting(false);
    }
  };

  const buildCustomStyles = (styles?: any): string => {
    if (!styles) return '';

    let css = '';

    if (styles.font) {
      css += `body { font-family: ${styles.font}, Arial, sans-serif; }`;
    }

    if (styles.fontSize) {
      css += `body { font-size: ${styles.fontSize}; }`;
    }

    return css;
  };

  const handlePreview = async () => {
    if (!template) {
      setError('Aucun modèle sélectionné');
      return;
    }

    try {
      setError(null);
      
      // For preview, just open template HTML in new window
      const previewWindow = window.open('', '', 'width=900,height=700');
      if (!previewWindow) {
        setError('Impossible d\'ouvrir l\'aperçu - vérifier les popups bloqués');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${buildDocumentTitle()}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; padding: 20px; }
              ${template.template.styles || ''}
            </style>
          </head>
          <body>
            ${template.template.html}
            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
              <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #0066cc; color: white; border: none; border-radius: 4px;">
                🖨️ Imprimer
              </button>
              <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #666; color: white; border: none; border-radius: 4px; margin-left: 10px;">
                ✕ Fermer
              </button>
            </div>
          </body>
        </html>
      `;
      previewWindow.document.write(html);
      previewWindow.document.close();
    } catch (err) {
      console.error('Error previewing:', err);
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'aperçu';
      setError(msg);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-red-700">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Success Message - Show when template is loaded */}
      {!loading && template && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 text-green-700">
          <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Modèle chargé: {template.name}</p>
            <p className="text-sm">Prêt à imprimer ou sélectionner un autre modèle</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Action Buttons */}
      {!loading && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePrint}
            disabled={!template || printing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
            title="Imprimer le document"
          >
            {printing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Impression...
              </>
            ) : (
              <>
                <Printer size={18} />
                Imprimer
              </>
            )}
          </button>

          <button
            onClick={() => setShowSelector(true)}
            disabled={!template}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
            title="Choisir un autre modèle"
          >
            Autre modèle
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
            title="Enregistrer ce modèle"
          >
            <Plus size={18} />
            Enregistrer modèle
          </button>

          <button
            onClick={handlePreview}
            disabled={!template}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
            title="Prévisualiser"
          >
            Aperçu
          </button>
        </div>
      )}

      {/* Template Selector Modal */}
      {showSelector && (
        <TemplateSelector
          documentType={documentType}
          agencyId={agencyId}
          onSelectTemplate={(selectedTemplate) => {
            setTemplate(selectedTemplate);
            setShowSelector(false);
          }}
          onClose={() => setShowSelector(false)}
        />
      )}

      {/* Template Save Modal */}
      {showSaveModal && template && (
        <TemplateSaveModal
          documentType={documentType}
          agencyId={agencyId}
          templateHtml={template.template.html}
          templateStyles={template.template.styles}
          onSave={() => {
            loadDefaultTemplate(); // Reload to show saved template
          }}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {/* Template Info */}
      {!loading && template && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Modèle actuel</h3>
          <p className="text-sm text-gray-600">
            <strong>Nom:</strong> {template.name}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Type:</strong> {template.template_type}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Par défaut:</strong> {template.is_default ? 'Oui' : 'Non'}
          </p>
        </div>
      )}
    </div>
  );
};
