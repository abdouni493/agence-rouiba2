import { TemplateService, DocumentTemplateRow } from './TemplateService_v2';
import { RenderService } from './RenderService_v2';
import { ConditionsService } from './ConditionsService';
import { DocumentType } from '../types';

/**
 * UNIFIED PrintService
 * 
 * Single entry point for all document printing
 * Works identically for all document types (no special cases)
 */
export class PrintService {
  /**
   * MAIN ENTRY POINT: Print a document
   * 
   * Complete workflow:
   * 1. Fetch template (user-selected or default)
   * 2. Render with data
   * 3. Append conditions if needed
   * 4. Open print window
   */
  static async printDocument(
    documentType: DocumentType,
    agencyId: string,
    data: Record<string, any>,
    selectedTemplateId?: string
  ): Promise<void> {
    try {
      // Step 1: Get template
      let template: DocumentTemplateRow;

      if (selectedTemplateId) {
        template = await TemplateService.getTemplateById(selectedTemplateId);
      } else {
        template = await TemplateService.getDefaultTemplate(documentType, agencyId);
      }

      // Step 2: Build complete document (with conditions if needed)
      const finalHtml = await ConditionsService.buildCompleteDocument(
        template,
        data,
        agencyId
      );

      // Step 3: Open print window
      this.openPrintWindow(documentType, finalHtml, template.template.styles);
    } catch (error) {
      console.error('Print error:', error);
      throw new Error(
        `Failed to print ${documentType}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Open print window with HTML
   */
  private static openPrintWindow(
    documentType: DocumentType,
    html: string,
    styles?: any
  ): void {
    try {
      const printWindow = window.open('', '_blank');

      if (!printWindow) {
        throw new Error('Print window blocked. Check popup blocker settings.');
      }

      const title = this.getDocumentTitle(documentType);
      const printHtml = this.buildPrintHtml(title, html, styles);

      printWindow.document.write(printHtml);
      printWindow.document.close();

      // Trigger print dialog
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 100);
      };
    } catch (error) {
      console.error('Print window error:', error);
      throw error;
    }
  }

  /**
   * Build complete printable HTML document
   */
  private static buildPrintHtml(
    title: string,
    html: string,
    styles?: any
  ): string {
    const customStyles = styles?.font
      ? `body { font-family: ${styles.font}, Arial, sans-serif; }`
      : '';

    const fontSize = styles?.fontSize
      ? `body { font-size: ${styles.fontSize}; }`
      : '';

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 12px; 
            line-height: 1.6; 
            color: #333;
            padding: 20px;
          }
          @media print {
            body { margin: 0; padding: 10mm; }
          }
          h1, h2, h3 { margin-top: 15px; margin-bottom: 10px; }
          p { margin-bottom: 8px; }
          hr { margin: 15px 0; border: none; border-top: 1px solid #ddd; }
          ${customStyles}
          ${fontSize}
        </style>
      </head>
      <body>
        ${html}
        <p style="text-align: center; font-size: 10px; color: #999; margin-top: 30px;">
          Document généré le ${new Date().toLocaleString('fr-FR')}
        </p>
      </body>
      </html>
    `;
  }

  /**
   * Get human-readable document title
   */
  private static getDocumentTitle(documentType: DocumentType): string {
    const titles: Record<DocumentType, string> = {
      contrat: 'Contrat de Location',
      devis: 'Devis',
      facture: 'Facture',
      engagement: 'Engagement',
      recu: 'Reçu de Versement',
    };
    return titles[documentType] || documentType;
  }

  /**
   * Preview document (opens in new window without printing)
   */
  static async previewDocument(
    documentType: DocumentType,
    agencyId: string,
    data: Record<string, any>,
    selectedTemplateId?: string
  ): Promise<Window | null> {
    try {
      // Get template
      let template: DocumentTemplateRow;

      if (selectedTemplateId) {
        template = await TemplateService.getTemplateById(selectedTemplateId);
      } else {
        template = await TemplateService.getDefaultTemplate(documentType, agencyId);
      }

      // Build document
      const finalHtml = await ConditionsService.buildCompleteDocument(
        template,
        data,
        agencyId
      );

      // Open preview
      const title = this.getDocumentTitle(documentType);
      const printHtml = this.buildPrintHtml(title, finalHtml, template.template.styles);

      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(printHtml);
        previewWindow.document.close();
      }

      return previewWindow;
    } catch (error) {
      console.error('Preview error:', error);
      throw error;
    }
  }

  /**
   * Validate document before printing
   * Returns missing placeholders
   */
  static validateDocument(
    template: DocumentTemplateRow,
    data: Record<string, any>
  ): { valid: boolean; missing: string[] } {
    return RenderService.validateData(template.template.html, data);
  }

  /**
   * Check print support
   */
  static isPrintSupported(): boolean {
    return typeof window !== 'undefined' && window.print !== undefined;
  }
}
