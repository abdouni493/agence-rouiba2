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
 * STRICT DATABASE-ONLY TemplateService
 * 
 * CRITICAL RULES:
 * - ALL templates MUST come from database
 * - NO fallbacks to hardcoded templates
 * - If template not found → throw error
 * - No special cases per document type
 */
export class TemplateService {
  /**
   * Get a template by ID
   * Throws error if not found
   */
  static async getTemplateById(templateId: string): Promise<DocumentTemplateRow> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !data) {
      throw new Error(`Template with ID "${templateId}" not found in database`);
    }

    return data;
  }

  /**
   * Get all templates for a specific document type and agency
   * Throws error if none found
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
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(
        `No templates found for type "${documentType}" in agency "${agencyId}". ` +
        `Create at least one template in the database.`
      );
    }

    return data;
  }

  /**
   * Get the DEFAULT template for a document type
   * STRICT: Throws error if not found
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

    if (error || !data) {
      throw new Error(
        `No default template found for type "${documentType}" in agency "${agencyId}". ` +
        `Please set a default template in the database.`
      );
    }

    return data;
  }

  /**
   * Save a new template
   * If is_default=true, unsets other defaults for this type
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

    if (error || !data) {
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
      await supabase
        .from('document_templates')
        .update({ is_default: false })
        .eq('template_type', template.template_type)
        .eq('agency_id', template.agency_id)
        .neq('id', templateId);
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

    if (error || !data) {
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

  /**
   * Mark template as default for its type
   */
  static async setAsDefault(templateId: string): Promise<DocumentTemplateRow> {
    const template = await this.getTemplateById(templateId);

    // Unset other defaults for this type
    await supabase
      .from('document_templates')
      .update({ is_default: false })
      .eq('template_type', template.template_type)
      .eq('agency_id', template.agency_id)
      .neq('id', templateId);

    // Set this one as default
    return this.updateTemplate(templateId, { is_default: true });
  }

  /**
   * Check if a template exists for a type
   */
  static async templateExists(
    documentType: DocumentType,
    agencyId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('id')
      .eq('template_type', documentType)
      .eq('agency_id', agencyId)
      .limit(1);

    if (error) {
      throw new Error(`Failed to check template existence: ${error.message}`);
    }

    return (data?.length ?? 0) > 0;
  }
}
