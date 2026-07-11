/**
 * RenderService: Handles template rendering with placeholder replacement
 * Replaces {{variable_name}} placeholders with actual data values
 */
export class RenderService {
  /**
   * Force a phone number to render strictly left-to-right, even inside an RTL (Arabic)
   * document, so it prints in the same order as the French layout.
   */
  static ltrPhone(value: any): string {
    return `<span dir="ltr" style="unicode-bidi:bidi-override;direction:ltr;display:inline-block">${value ?? ''}</span>`;
  }

  /**
   * Render a template HTML string by replacing placeholders with data values
   * Placeholders format: {{variable_name}}
   * 
   * @param html - Template HTML with placeholders
   * @param data - Object containing data to replace placeholders
   * @returns Rendered HTML with placeholders replaced
   */
  static renderTemplate(html: string, data: Record<string, any>): string {
    if (!html) {
      return '';
    }

    return html.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const trimmedKey = key.trim();
      const value = this.getNestedValue(data, trimmedKey);
      return this.formatValue(value);
    });
  }

  /**
   * Get a value from nested object using dot notation
   * e.g., "client.name" will return data.client.name
   */
  private static getNestedValue(obj: any, path: string): any {
    if (!path || typeof path !== 'string') {
      return '';
    }

    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return '';
      }
    }

    return value;
  }

  /**
   * Format a value for display
   * Handles null, undefined, objects, arrays, etc.
   */
  private static formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non';
    }

    if (value instanceof Date) {
      return value.toLocaleDateString('fr-FR');
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Build data object from reservation details
   * Used to prepare data for template rendering
   */
  static buildDocumentData(
    client: any,
    reservation: any,
    car: any,
    payments?: any[],
    agencySettings?: any
  ): Record<string, any> {
    const totalPaid = payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    const remaining = (reservation?.total_price || 0) - totalPaid;

    return {
      // Client info
      client_name: `${client?.first_name || ''} ${client?.last_name || ''}`.trim(),
      client_first_name: client?.first_name || '',
      client_last_name: client?.last_name || '',
      client_phone: client?.phone ? this.ltrPhone(client.phone) : '',
      client_email: client?.email || '',
      client_address: client?.address || '',
      
      // Car info
      car_model: `${car?.brand || ''} ${car?.model || ''}`.trim(),
      car_brand: car?.brand || '',
      car_model_name: car?.model || '',
      car_year: car?.year || '',
      car_color: car?.color || '',
      car_registration: car?.registration || '',
      car_vin: car?.vin || '',
      
      // Reservation info
      start_date: this.formatDate(reservation?.departure_date),
      end_date: this.formatDate(reservation?.return_date),
      departure_date: this.formatDate(reservation?.departure_date),
      return_date: this.formatDate(reservation?.return_date),
      total_price: this.formatPrice(reservation?.total_price),
      daily_rate: this.formatPrice(reservation?.daily_rate),
      
      // Quote info
      quote_number: reservation?.id?.substring(0, 8).toUpperCase() || '',
      validity_date: this.formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      
      // Invoice info
      invoice_number: reservation?.id?.substring(0, 8).toUpperCase() || '',
      invoice_date: this.formatDate(new Date()),
      amount: this.formatPrice(reservation?.total_price),
      payment_terms: 'Net 30',
      
      // Receipt info
      receipt_number: reservation?.id?.substring(0, 8).toUpperCase() || '',
      receipt_date: this.formatDate(new Date()),
      amount_paid: this.formatPrice(totalPaid),
      remaining_amount: this.formatPrice(remaining),
      payment_method: 'Cash/Card',
      
      // Engagement info
      engagement_number: reservation?.id?.substring(0, 8).toUpperCase() || '',
      commitment_date: this.formatDate(new Date()),
      
      // Agency info
      agency_name: agencySettings?.agency_name || '',
      agency_phone: agencySettings?.phone ? this.ltrPhone(agencySettings.phone) : '',
      agency_address: agencySettings?.address || '',
      agency_logo: agencySettings?.logo || '',
    };
  }

  /**
   * Format a date value
   */
  private static formatDate(date: any): string {
    if (!date) return '';

    try {
      if (typeof date === 'string') {
        date = new Date(date);
      }
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }

    return String(date);
  }

  /**
   * Format a price value
   */
  private static formatPrice(price: any): string {
    if (price === null || price === undefined) return '0';

    try {
      const num = Number(price);
      if (isNaN(num)) return '0';
      return num.toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } catch (error) {
      console.error('Error formatting price:', error);
      return String(price);
    }
  }

  /**
   * Validate template HTML for required placeholders
   */
  static extractPlaceholders(html: string): string[] {
    const placeholders: string[] = [];
    const regex = /\{\{(.*?)\}\}/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      placeholders.push(match[1].trim());
    }

    return [...new Set(placeholders)]; // Remove duplicates
  }

  /**
   * Check if all required placeholders have values
   */
  static validateData(
    html: string,
    data: Record<string, any>
  ): { valid: boolean; missing: string[] } {
    const placeholders = this.extractPlaceholders(html);
    const missing: string[] = [];

    for (const placeholder of placeholders) {
      const value = this.getNestedValue(data, placeholder);
      if (value === '' || value === null || value === undefined) {
        missing.push(placeholder);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
