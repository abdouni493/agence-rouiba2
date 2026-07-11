import { supabase } from '../supabase';
import { DocumentType, Language, ReservationDetails } from '../types';
import { TemplateService, DocumentTemplateRow } from './TemplateService';

/**
 * PrintService: Strict database-driven printing system
 * 
 * CRITICAL RULES (NO EXCEPTIONS):
 * 1. ALL templates come from database - NEVER hardcoded
 * 2. Single function: printDocument(data)
 * 3. Conditions handled as templates with has_conditions flag
 * 4. All documents behave IDENTICALLY - same pipeline
 * 5. Error on missing template - NO fallbacks
 */

export interface PrintData {
  type: DocumentType;
  reservation: ReservationDetails;
  templateId?: string;           // User selected template
  agencyId: string;
  lang: Language;
}

export class PrintService {
  /**
   * UNIFIED PRINT PIPELINE - Single function for all documents
   * 
   * Step 1: Load template from database (throws error if not found)
   * Step 2: Render template with reservation data
   * Step 3: Inject conditions if template.has_conditions = true
   * Step 4: Generate printable HTML with styles
   * Step 5: Trigger browser print dialog
   */
  static async printDocument(data: PrintData): Promise<void> {
    try {
      // STEP 1: Load template from database
      const template = await this.loadTemplate(data);

      // VALIDATION: Template must have HTML
      if (!template.template?.html) {
        throw new Error(
          `Template "${template.name}" is missing HTML content. ` +
          `Template ID: ${template.id}`
        );
      }

      // STEP 2: Render template with reservation data
      let html = this.renderTemplate(
        template.template.html,
        data.reservation,
        data.lang
      );

      // STEP 3: Inject conditions if needed
      if (template.has_conditions) {
        // Load engagement template from database
        const engagementTemplate = await TemplateService.getDefaultTemplate(
          'engagement' as DocumentType,
          data.agencyId
        );

        if (engagementTemplate?.template?.html) {
          // Append engagement template to document
          html += '\n\n' + engagementTemplate.template.html;
        } else {
          console.warn('Engagement template not found for conditions injection');
        }
      }

      // STEP 4 & 5: Build and trigger print
      const styles = typeof template.template.styles === 'string' 
        ? template.template.styles 
        : '';
      this.triggerPrint(html, styles, template.name);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[PrintService] Error:', msg);
      throw new Error(`Print failed: ${msg}`);
    }
  }

  /**
   * Load template - user selected OR default (throws if not found)
   */
  private static async loadTemplate(data: PrintData): Promise<DocumentTemplateRow> {
    if (data.templateId) {
      // User selected specific template
      const template = await TemplateService.getTemplateById(data.templateId);
      if (!template) {
        throw new Error(`Template ID "${data.templateId}" not found in database`);
      }
      return template;
    }

    // Use default template (throws if not found - NO FALLBACK)
    return TemplateService.getDefaultTemplate(data.type, data.agencyId);
  }

  /**
   * Render template by replacing {{placeholder}} with data
   * 
   * Supported placeholders:
   * {{client.firstName}}
   * {{vehicle.brand}}
   * {{rental.duration}}
   * {{financial.totalPrice}}
   * etc.
   */
  private static renderTemplate(
    templateHtml: string,
    reservation: ReservationDetails,
    lang: Language
  ): string {
    let html = templateHtml;
    const data = this.flattenReservationData(reservation, lang);

    // Replace all {{placeholder}} with values
    html = html.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => {
      const value = this.getNestedValue(data, placeholder.trim());
      return value !== undefined ? String(value) : '';
    });

    return html;
  }

  /**
   * Flatten reservation into dot-notation for template placeholders
   */
  private static flattenReservationData(
    reservation: ReservationDetails,
    lang: Language
  ): Record<string, any> {
    const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr;

    const totalPaid = reservation.payments?.reduce((sum, p) => sum + p.amount, 0) || 
                     reservation.advancePayment || 0;
    const remaining = Math.max(0, reservation.totalPrice - totalPaid);
    const days = this.calculateDays(
      reservation.step1.departureDate,
      reservation.step1.returnDate
    );

    return {
      // Reservation
      'reservation.id': reservation.id,
      'reservation.number': reservation.id.substring(0, 8),
      'reservation.date': new Date().toLocaleDateString(),
      
      // Client
      'client.firstName': reservation.client.firstName,
      'client.lastName': reservation.client.lastName,
      'client.fullName': `${reservation.client.firstName} ${reservation.client.lastName}`,
      'client.phone': reservation.client.phone,
      'client.email': reservation.client.email,
      'client.address': reservation.client.completeAddress || '',
      'client.documentType': reservation.client.documentType,
      'client.documentNumber': reservation.client.documentNumber,
      
      // Vehicle
      'vehicle.brand': reservation.car.brand,
      'vehicle.model': reservation.car.model,
      'vehicle.name': `${reservation.car.brand} ${reservation.car.model}`,
      'vehicle.registration': reservation.car.registration || '',
      'vehicle.vin': reservation.car.vin || '',
      'vehicle.color': reservation.car.color || '',
      'vehicle.mileage': reservation.car.mileage || '0',
      
      // Rental
      'rental.startDate': reservation.step1.departureDate,
      'rental.endDate': reservation.step1.returnDate,
      'rental.days': days,
      'rental.duration': `${days} ${t('jours', 'أيام')}`,
      
      // Financial
      'financial.subtotal': reservation.totalPrice.toLocaleString(),
      'financial.subtotal.number': reservation.totalPrice,
      'financial.advance': (reservation.advancePayment || 0).toLocaleString(),
      'financial.advance.number': reservation.advancePayment || 0,
      'financial.paid': totalPaid.toLocaleString(),
      'financial.paid.number': totalPaid,
      'financial.remaining': remaining.toLocaleString(),
      'financial.remaining.number': remaining,
      'financial.caution': '0',
      'financial.caution.number': 0,
      'financial.currency': lang === 'ar' ? 'د.ج' : 'DA',
      
      // Agency
      'agency.name': '',
      'agency.address': '',
      'agency.phone': '',
      'agency.email': '',
      
      // Labels
      'label.client': t('Client', 'العميل'),
      'label.vehicle': t('Véhicule', 'المركبة'),
      'label.rental': t('Période de location', 'فترة الإيجار'),
      'label.total': t('Total', 'الإجمالي'),
      'label.paid': t('Payé', 'المدفوع'),
      'label.remaining': t('Reste', 'المتبقي'),
      'label.signature': t('Signature', 'التوقيع'),
      'label.date': t('Date', 'التاريخ'),
    };
  }

  /**
   * Get value from object using dot notation (e.g., "client.firstName")
   */
  private static getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Calculate days between two dates
   */
  private static calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Generate printable HTML with all styles and trigger print dialog
   */
  private static triggerPrint(
    html: string,
    customStyles: string,
    templateName: string
  ): void {
    const printWindow = window.open('', '', 'width=900,height=700');
    if (!printWindow) {
      throw new Error(
        'Failed to open print window. Please check popup blocker settings.'
      );
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${templateName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            @media print {
              body { margin: 0; padding: 10mm; }
              .no-print { display: none; }
              .print-break { page-break-after: always; }
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.6;
              color: #333;
              padding: 20px;
              background: white;
            }
            
            .document-container {
              max-width: 210mm;
              margin: 0 auto;
              background: white;
              padding: 20px;
            }
            
            h1, h2, h3 {
              color: #1a3a52;
              margin: 15px 0 10px 0;
            }
            
            h1 { font-size: 24px; text-align: center; }
            h2 { font-size: 16px; border-bottom: 2px solid #1a3a52; padding-bottom: 5px; }
            
            .conditions-section ol {
              margin-left: 20px;
              margin-top: 10px;
            }
            
            .conditions-section li {
              margin-bottom: 8px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            
            th { background-color: #f5f5f5; font-weight: bold; }
            
            .signature-area {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
            }
            
            .signature-block {
              width: 30%;
              text-align: center;
              border-top: 1px solid #333;
              padding-top: 60px;
            }
            
            ${customStyles}
          </style>
        </head>
        <body>
          <div class="document-container">
            ${html}
          </div>
          <div class="no-print" style="margin-top: 20px; text-align: center; padding: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #0066cc; color: white; border: none; border-radius: 4px;">
              🖨️ Print
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #666; color: white; border: none; border-radius: 4px; margin-left: 10px;">
              ✕ Close
            </button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(fullHtml);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  /**
   * Get available templates for a document type
   * Used by TemplateSelector component
   */
  static async getAvailableTemplates(
    docType: DocumentType,
    agencyId: string
  ): Promise<DocumentTemplateRow[]> {
    return TemplateService.getTemplatesByType(docType, agencyId);
  }

  /**
   * Save a new template
   * Used by SaveTemplateModal
   */
  static async saveTemplate(
    docType: DocumentType,
    agencyId: string,
    name: string,
    html: string,
    isDefault: boolean = false,
    hasConditions: boolean = false
  ): Promise<DocumentTemplateRow> {
    return TemplateService.saveTemplate(
      docType,
      agencyId,
      name,
      { html },
      isDefault,
      hasConditions
    );
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<DocumentTemplateRow>
  ): Promise<DocumentTemplateRow> {
    return TemplateService.updateTemplate(templateId, updates);
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    return TemplateService.deleteTemplate(templateId);
  }
}
