/**
 * UNIFIED RenderService
 * 
 * Single responsibility: Replace {{placeholders}} with data
 * NO special logic per document type
 */
export class RenderService {
  /**
   * CORE FUNCTION: Render template HTML with data
   * 
   * Replaces all {{key}} with data[key]
   * 
   * @param html - Template HTML with {{placeholders}}
   * @param data - Object with key-value pairs
   * @returns Rendered HTML
   */
  static renderTemplate(html: string, data: Record<string, any>): string {
    if (!html) return '';

    return html.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const trimmed = key.trim();
      const value = this.getNestedValue(data, trimmed);
      return this.formatValue(value);
    });
  }

  /**
   * Get value from nested object (e.g., "client.name" → data.client.name)
   */
  private static getNestedValue(obj: any, path: string): any {
    if (!path || typeof path !== 'string') return '';

    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return '';
      }
    }

    return value ?? '';
  }

  /**
   * Format any value for display
   */
  private static formatValue(value: any): string {
    if (value === null || value === undefined || value === '') {
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

    return '';
  }

  /**
   * Extract all placeholders from template HTML
   */
  static extractPlaceholders(html: string): string[] {
    const placeholders: string[] = [];
    const regex = /\{\{(.*?)\}\}/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      placeholders.push(match[1].trim());
    }

    return [...new Set(placeholders)];
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
      if (!value && value !== 0) {
        missing.push(placeholder);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
