import { supabase } from '../supabase';
import { DocumentType } from '../types';

export interface DocumentTemplateRow {
  id: string;
  agency_id: string;
  template_type: DocumentType;
  name: string;
  template: {
    html: string;
    styles?: {
      font?: string;
      fontSize?: string;
      [key: string]: any;
    };
  };
  is_default: boolean;
  has_conditions: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * TemplateService: Strict database-only operations for document templates
 * CRITICAL: All templates MUST come from database. No fallbacks to hardcoded defaults.
 */
export class TemplateService {
  /**
   * Get a template by ID
   */
  static async getTemplateById(templateId: string): Promise<DocumentTemplateRow | null> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Error fetching template by ID:', error);
      return null;
    }

    return data;
  }

  /**
   * Get all templates for a specific document type and agency
   */
  static async getTemplatesByType(
    documentType: DocumentType,
    agencyId: string
  ): Promise<DocumentTemplateRow[]> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('template_type', documentType)
      .eq('agency_id', agencyId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates by type:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get the default template for a document type and agency
   * STRICT: Throws error if not found (no fallback)
   */
  static async getDefaultTemplate(
    documentType: DocumentType,
    agencyId: string
  ): Promise<DocumentTemplateRow> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('template_type', documentType)
      .eq('agency_id', agencyId)
      .eq('is_default', true)
      .single();

    if (error) {
      throw new Error(
        `No default template found for type "${documentType}" in agency "${agencyId}". ` +
        `Please create and set a default template in the database.`
      );
    }

    if (!data) {
      throw new Error(`No template data returned for type "${documentType}"`);
    }

    return data;
  }

  /**
   * Save a new template
   * If is_default = true, unsets other defaults for this type
   */
  static async saveTemplate(
    documentType: DocumentType,
    agencyId: string,
    name: string,
    template: { html: string; styles?: any },
    isDefault: boolean = false,
    hasConditions: boolean = false
  ): Promise<DocumentTemplateRow> {
    // If marking as default, unset other defaults for this type
    if (isDefault) {
      await supabase
        .from('document_templates')
        .update({ is_default: false })
        .eq('template_type', documentType)
        .eq('agency_id', agencyId);
    }

    const { data, error } = await supabase
      .from('document_templates')
      .insert({
        agency_id: agencyId,
        template_type: documentType,
        name,
        template,
        is_default: isDefault,
        has_conditions: hasConditions,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save template: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<Omit<DocumentTemplateRow, 'id' | 'created_at'>>
  ): Promise<DocumentTemplateRow> {
    // If marking as default, unset other defaults
    if (updates.is_default) {
      const template = await this.getTemplateById(templateId);
      if (template) {
        await supabase
          .from('document_templates')
          .update({ is_default: false })
          .eq('template_type', template.template_type)
          .eq('agency_id', template.agency_id)
          .neq('id', templateId);
      }
    }

    const { data, error } = await supabase
      .from('document_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }


}
